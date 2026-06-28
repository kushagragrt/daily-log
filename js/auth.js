// ============================================================
// AUTH — simple name + 4-digit PIN
// NOTE: this is lightweight identification for 2-3 trusted people
// sharing one app, NOT secure authentication. The PIN is hashed
// before storage/comparison, but there's no rate-limiting, email
// recovery, or protection against someone guessing a 4-digit PIN.
// ============================================================

const Auth = (() => {
  const SESSION_KEY = "daily_log_session_v1";

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // Returns { user } on success, or { error } on failure
  async function loginOrRegister(name, pin) {
    const cleanName = name.trim();
    if (!cleanName) return { error: "Enter your name." };
    if (!/^\d{4}$/.test(pin)) return { error: "PIN must be exactly 4 digits." };

    const pinHash = await sha256(pin + "::" + cleanName.toLowerCase());

    // exact case-insensitive match (ilike with no wildcards still does
    // substring-safe equality here since cleanName has no % or _ chars,
    // but we escape just in case a name contains them)
    const escaped = cleanName.replace(/[%_]/g, "\\$&");
    const { data: existing, error: fetchErr } = await sb
      .from("app_users")
      .select("*")
      .ilike("name", escaped)
      .maybeSingle();

    if (fetchErr) return { error: "Could not reach the server. Check your connection." };

    if (existing) {
      if (existing.pin_hash !== pinHash) {
        return { error: "Wrong PIN for that name." };
      }
      setSession(existing);
      return { user: existing };
    }

    // New person — create their account
    const { data: created, error: insertErr } = await sb
      .from("app_users")
      .insert({ name: cleanName, pin_hash: pinHash })
      .select()
      .single();

    if (insertErr) {
      return { error: "Could not create account. That name might already be taken." };
    }
    setSession(created);
    return { user: created };
  }

  function logout() {
    clearSession();
    location.reload();
  }

  return { getSession, loginOrRegister, logout };
})();
