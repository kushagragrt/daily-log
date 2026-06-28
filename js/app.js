// ============================================================
// APP — rendering + navigation + interactions
// ============================================================

let currentUser = null;
let activeTab = "today";

const MOODS = [
  { key: "great", emoji: "😄", label: "great" },
  { key: "good", emoji: "🙂", label: "good" },
  { key: "okay", emoji: "😐", label: "okay" },
  { key: "low", emoji: "😕", label: "low" },
  { key: "rough", emoji: "😣", label: "rough" },
];

const HABIT_COLORS = ["moss", "slate", "ochre", "clay"];

function fmtDateLong(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}
function fmtDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Squiggle streak SVG ----------
// Draws a wavy line; the portion corresponding to "checked" days is
// solid/colored, the rest is faint. A simple, charming streak visual.
function squiggleSvg(checkedRatio, colorVar) {
  const w = 280, h = 6;
  let path = "M0,3";
  const step = 20;
  for (let x = step; x <= w; x += step) {
    const up = (x / step) % 2 === 0;
    path += ` Q${x - step / 2},${up ? 0 : 6} ${x},3`;
  }
  const dashLen = w; // full length approx
  const solidLen = Math.max(0, Math.min(1, checkedRatio)) * dashLen;
  return `
    <svg class="squiggle" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${path}" stroke="var(--hairline)" stroke-width="2" fill="none"/>
      <path d="${path}" stroke="${colorVar}" stroke-width="2" fill="none"
        stroke-dasharray="${solidLen} ${dashLen}"/>
    </svg>`;
}

// ---------- Boot ----------
window.addEventListener("DOMContentLoaded", async () => {
  const session = Auth.getSession();
  if (session) {
    currentUser = session;
    renderApp();
  } else {
    renderLogin();
  }
});

// ============================================================
// LOGIN SCREEN
// ============================================================
function renderLogin() {
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="login-screen">
      <h1>Daily Log</h1>
      <p>Habits, workouts, money, and mood — in one quiet place.</p>
      <div class="login-card">
        <div class="field">
          <label for="login-name">Your name</label>
          <input id="login-name" type="text" placeholder="e.g. Asha" autocomplete="name" />
        </div>
        <div class="field">
          <label>4-digit PIN</label>
          <div class="pin-dots" id="pin-dots">
            ${[0, 1, 2, 3].map(() => '<div class="pin-dot"></div>').join("")}
          </div>
          <input id="login-pin" type="tel" inputmode="numeric" maxlength="4"
            style="position:absolute; opacity:0; pointer-events:none;" />
        </div>
        <p class="error-text hidden" id="login-error"></p>
        <button class="btn btn-primary" id="login-btn">Continue</button>
        <p style="font-size:12px; color:var(--ink-soft); margin-top:14px; text-align:center;">
          New here? Just enter a name and pick any 4-digit PIN — your account is created automatically.
        </p>
      </div>
    </div>
  `;

  const pinInput = document.getElementById("login-pin");
  const dotsWrap = document.getElementById("pin-dots");
  const nameInput = document.getElementById("login-name");

  dotsWrap.addEventListener("click", () => pinInput.focus());
  nameInput.addEventListener("keydown", e => { if (e.key === "Enter") pinInput.focus(); });

  pinInput.addEventListener("input", () => {
    pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4);
    [...dotsWrap.children].forEach((dot, i) => {
      dot.classList.toggle("filled", i < pinInput.value.length);
    });
    if (pinInput.value.length === 4) attemptLogin();
  });

  document.getElementById("login-btn").addEventListener("click", attemptLogin);

  async function attemptLogin() {
    const errEl = document.getElementById("login-error");
    errEl.classList.add("hidden");
    const name = nameInput.value;
    const pin = pinInput.value;
    const btn = document.getElementById("login-btn");
    btn.textContent = "Checking…";
    const res = await Auth.loginOrRegister(name, pin);
    btn.textContent = "Continue";
    if (res.error) {
      errEl.textContent = res.error;
      errEl.classList.remove("hidden");
      pinInput.value = "";
      [...dotsWrap.children].forEach(d => d.classList.remove("filled"));
      return;
    }
    currentUser = res.user;
    renderApp();
  }

  setTimeout(() => nameInput.focus(), 50);
}

// ============================================================
// APP SHELL
// ============================================================
function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
function setTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    document.getElementById("theme-color-meta").setAttribute("content", "#161412");
  } else {
    document.documentElement.removeAttribute("data-theme");
    document.getElementById("theme-color-meta").setAttribute("content", "#FAF8F4");
  }
  localStorage.setItem("dl-theme", theme);
  const icon = document.querySelector("#theme-toggle-btn i");
  if (icon) icon.className = `ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`;
}
function toggleTheme() { setTheme(getTheme() === "dark" ? "light" : "dark"); }

function renderApp() {
  const root = document.getElementById("root");
  const isDark = getTheme() === "dark";
  root.innerHTML = `
    <header class="app-header">
      <div class="app-header-text">
        <p class="greeting" id="greeting"></p>
        <p class="date" id="date-line"></p>
      </div>
      <button class="theme-toggle" id="theme-toggle-btn" aria-label="Toggle dark mode">
        <i class="ti ${isDark ? "ti-sun" : "ti-moon"}" aria-hidden="true"></i>
      </button>
    </header>
    <main class="app-main" id="main-content"></main>
    <button class="btn-fab hidden" id="fab"><i class="ti ti-plus" aria-hidden="true"></i></button>
    <nav class="tab-bar">
      <button class="tab-btn" data-tab="today"><i class="ti ti-sun-2" aria-hidden="true"></i>Today</button>
      <button class="tab-btn" data-tab="journal"><i class="ti ti-feather" aria-hidden="true"></i>Journal</button>
      <button class="tab-btn" data-tab="stats"><i class="ti ti-chart-bar" aria-hidden="true"></i>Stats</button>
    </nav>
  `;

  document.getElementById("greeting").textContent = `Hey, ${currentUser.name}`;
  document.getElementById("date-line").textContent = fmtDateLong();
  document.getElementById("theme-toggle-btn").addEventListener("click", toggleTheme);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  switchTab("today");
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  const fab = document.getElementById("fab");
  fab.classList.remove("hidden");
  fab.onclick = null;

  if (tab === "today") { renderToday(); fab.onclick = openAddSheet; }
  else if (tab === "journal") { renderJournal(); fab.classList.add("hidden"); }
  else if (tab === "stats") { renderStats(); fab.classList.add("hidden"); }
}

// ============================================================
// TODAY TAB
// ============================================================
async function renderToday() {
  const main = document.getElementById("main-content");
  main.innerHTML = `<p style="color:var(--ink-soft); font-size:13px;">Loading…</p>`;

  const feed = await Data.getTodayFeed(currentUser.id);

  let habitsHtml = "";
  if (feed.habits.length === 0) {
    habitsHtml = `<p style="font-size:13px; color:var(--ink-soft); margin:4px 2px 12px;">No habits yet — tap + to add one.</p>`;
  } else {
    for (const h of feed.habits) {
      const checked = feed.doneHabitIds.includes(h.id);
      const streakDates = await Data.getHabitStreak(h.id, 14);
      const ratio = streakDates.length / 14;
      habitsHtml += `
        <div class="card accent-habit" data-habit-id="${h.id}">
          <div class="card-row">
            <span class="card-title">${escapeHtml(h.name)}</span>
            <button class="habit-check" data-habit-id="${h.id}" data-checked="${checked}"
              aria-label="${checked ? 'Mark not done' : 'Mark done'}"
              style="background:none; border:none; padding:0;">
              <i class="ti ${checked ? 'ti-square-rounded-check-filled' : 'ti-square-rounded'}"
                 style="font-size:24px; color:${checked ? 'var(--moss)' : 'var(--ink-soft)'};" aria-hidden="true"></i>
            </button>
          </div>
          ${squiggleSvg(ratio, "var(--moss)")}
        </div>`;
    }
  }

  let workoutsHtml = feed.recentWorkouts.length
    ? feed.recentWorkouts.map(w => `
        <div class="card accent-workout">
          <div class="card-row">
            <div>
              <div class="card-title">${escapeHtml(w.title)}</div>
              ${w.duration_min ? `<div class="card-sub">${w.duration_min} min</div>` : ""}
            </div>
            <span class="card-tag tag-workout">workout</span>
          </div>
        </div>`).join("")
    : `<p style="font-size:13px; color:var(--ink-soft); margin:4px 2px 12px;">Nothing logged today.</p>`;

  let expensesHtml = feed.recentExpenses.length
    ? feed.recentExpenses.map(e => `
        <div class="card accent-expense">
          <div class="card-row">
            <div>
              <div class="card-title">${escapeHtml(e.note) || escapeHtml(e.category)}</div>
              <div class="card-sub">${escapeHtml(e.category)}</div>
            </div>
            <span class="card-tag tag-expense">₹${Number(e.amount).toLocaleString()}</span>
          </div>
        </div>`).join("")
    : `<p style="font-size:13px; color:var(--ink-soft); margin:4px 2px 12px;">Nothing logged today.</p>`;

  main.innerHTML = `
    <div class="section-label">Habits</div>
    ${habitsHtml}
    <div class="section-label">Workouts today</div>
    ${workoutsHtml}
    <div class="section-label">Expenses today</div>
    ${expensesHtml}
  `;

  main.querySelectorAll(".habit-check").forEach(btn => {
    btn.addEventListener("click", async () => {
      const habitId = btn.dataset.habitId;
      const wasChecked = btn.dataset.checked === "true";
      btn.disabled = true;
      await Data.toggleHabitToday({ id: habitId }, currentUser.id, wasChecked);
      btn.disabled = false;
      renderToday();
    });
  });
}

// ---------- Add sheet (habit / workout / expense) ----------
function openAddSheet() {
  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";
  overlay.innerHTML = `
    <div class="sheet">
      <p class="sheet-title">Add to today</p>
      <div style="display:flex; gap:8px; margin-bottom:16px;">
        <button class="btn btn-ghost" data-kind="habit" style="flex:1;"><i class="ti ti-checkbox" aria-hidden="true"></i>&nbsp;Habit</button>
        <button class="btn btn-ghost" data-kind="workout" style="flex:1;"><i class="ti ti-barbell" aria-hidden="true"></i>&nbsp;Workout</button>
        <button class="btn btn-ghost" data-kind="expense" style="flex:1;"><i class="ti ti-currency-rupee" aria-hidden="true"></i>&nbsp;Expense</button>
      </div>
      <div id="sheet-form"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll("[data-kind]").forEach(btn => {
    btn.addEventListener("click", () => renderSheetForm(btn.dataset.kind, overlay));
  });
}

function renderSheetForm(kind, overlay) {
  const formWrap = overlay.querySelector("#sheet-form");

  if (kind === "habit") {
    formWrap.innerHTML = `
      <div class="field"><label for="habit-name">Habit name</label>
        <input id="habit-name" placeholder="e.g. Read 20 minutes" /></div>
      <button class="btn btn-primary" id="save-habit">Add habit</button>`;
    formWrap.querySelector("#save-habit").addEventListener("click", async () => {
      const name = document.getElementById("habit-name").value.trim();
      if (!name) return;
      const color = HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)];
      await Data.createHabit(currentUser.id, name, color);
      overlay.remove();
      renderToday();
    });
  }

  if (kind === "workout") {
    formWrap.innerHTML = `
      <div class="field"><label for="w-title">What did you do</label>
        <input id="w-title" placeholder="e.g. Push day" /></div>
      <div class="field"><label for="w-dur">Duration (minutes)</label>
        <input id="w-dur" type="number" inputmode="numeric" placeholder="45" /></div>
      <button class="btn btn-primary" id="save-workout">Log workout</button>`;
    formWrap.querySelector("#save-workout").addEventListener("click", async () => {
      const title = document.getElementById("w-title").value.trim();
      if (!title) return;
      const duration_min = parseInt(document.getElementById("w-dur").value) || null;
      await Data.addWorkout(currentUser.id, { title, duration_min });
      overlay.remove();
      renderToday();
    });
  }

  if (kind === "expense") {
    formWrap.innerHTML = `
      <div class="field"><label for="e-amount">Amount (₹)</label>
        <input id="e-amount" type="number" inputmode="decimal" placeholder="180" /></div>
      <div class="field"><label for="e-category">Category</label>
        <select id="e-category">
          <option>food</option><option>transport</option><option>shopping</option>
          <option>bills</option><option>health</option><option>other</option>
        </select></div>
      <div class="field"><label for="e-note">Note (optional)</label>
        <input id="e-note" placeholder="e.g. Coffee" /></div>
      <button class="btn btn-primary" id="save-expense">Log expense</button>`;
    formWrap.querySelector("#save-expense").addEventListener("click", async () => {
      const amount = parseFloat(document.getElementById("e-amount").value);
      if (!amount) return;
      const category = document.getElementById("e-category").value;
      const note = document.getElementById("e-note").value.trim();
      await Data.addExpense(currentUser.id, { amount, category, note });
      overlay.remove();
      renderToday();
    });
  }
}

// ============================================================
// JOURNAL TAB — today's entry on top, scrollable past entries below
// ============================================================
async function renderJournal() {
  const main = document.getElementById("main-content");
  main.innerHTML = `<p style="color:var(--ink-soft); font-size:13px;">Loading…</p>`;

  const today = Data.todayStr();
  const [todayEntry, pastRes] = await Promise.all([
    Data.getJournalEntry(currentUser.id, today),
    Data.listJournalEntries(currentUser.id, 60),
  ]);
  const pastEntries = (pastRes.data || []).filter(e => e.log_date !== today);

  main.innerHTML = `
    <div class="section-label">Today</div>
    <div class="card accent-mood" style="border-left:none; padding:16px;">
      <div class="mood-picker" id="mood-picker">
        ${MOODS.map(m => `
          <button class="mood-opt ${todayEntry?.mood === m.key ? "selected" : ""}" data-mood="${m.key}">
            ${m.emoji}<span class="label">${m.label}</span>
          </button>`).join("")}
      </div>
      <div class="field" style="margin-bottom:10px;">
        <textarea id="journal-text" placeholder="What's on your mind today?">${escapeHtml(todayEntry?.entry || "")}</textarea>
      </div>
      <button class="btn btn-primary" id="save-journal">Save entry</button>
      <p class="error-text hidden" id="journal-saved" style="color:var(--moss); margin:8px 0 0;">Saved</p>
    </div>

    <div class="section-label">Past entries</div>
    <div id="past-entries">
      ${pastEntries.length === 0
        ? `<div class="empty-state"><i class="ti ti-feather icon" aria-hidden="true"></i>Nothing here yet — entries you save will show up here.</div>`
        : pastEntries.map(e => {
            const mood = MOODS.find(m => m.key === e.mood);
            return `
              <div class="card accent-mood">
                <div class="card-row">
                  <span class="card-sub" style="font-size:12px;">${fmtDateShort(e.log_date)}</span>
                  <span style="font-size:18px;">${mood ? mood.emoji : ""}</span>
                </div>
                ${e.entry ? `<p style="font-size:14px; margin:8px 0 0; white-space:pre-wrap;">${escapeHtml(e.entry)}</p>` : ""}
              </div>`;
          }).join("")
      }
    </div>
  `;

  let selectedMood = todayEntry?.mood || null;
  document.querySelectorAll(".mood-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedMood = btn.dataset.mood;
      document.querySelectorAll(".mood-opt").forEach(b => b.classList.toggle("selected", b === btn));
    });
  });

  document.getElementById("save-journal").addEventListener("click", async () => {
    const entry = document.getElementById("journal-text").value.trim();
    await Data.upsertJournalEntry(currentUser.id, today, { mood: selectedMood, entry });
    const savedMsg = document.getElementById("journal-saved");
    savedMsg.classList.remove("hidden");
    setTimeout(() => savedMsg.classList.add("hidden"), 1800);
  });
}

// ============================================================
// STATS TAB — simple summary
// ============================================================
async function renderStats() {
  const main = document.getElementById("main-content");
  main.innerHTML = `<p style="color:var(--ink-soft); font-size:13px;">Loading…</p>`;

  const [habitsRes, workoutsRes, monthTotal] = await Promise.all([
    Data.listHabits(currentUser.id),
    Data.listWorkouts(currentUser.id, 100),
    Data.expensesTotalThisMonth(currentUser.id),
  ]);

  const habits = habitsRes.data;
  let totalChecks = 0;
  for (const h of habits) {
    const dates = await Data.getHabitStreak(h.id, 30);
    totalChecks += dates.length;
  }
  const avgPerHabit = habits.length ? Math.round((totalChecks / habits.length) * 10) / 10 : 0;

  const workoutsLast30 = workoutsRes.data.filter(w => {
    const d = new Date(w.log_date);
    return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 30;
  }).length;

  main.innerHTML = `
    <div class="section-label">Last 30 days</div>
    <div class="stat-grid">
      <div class="stat-tile"><span class="num">${workoutsLast30}</span><span class="lbl">workouts</span></div>
      <div class="stat-tile"><span class="num">₹${Math.round(monthTotal).toLocaleString()}</span><span class="lbl">spent this month</span></div>
      <div class="stat-tile"><span class="num">${habits.length}</span><span class="lbl">active habits</span></div>
      <div class="stat-tile"><span class="num">${avgPerHabit}</span><span class="lbl">avg check-ins/habit</span></div>
    </div>
    <div class="section-label">Account</div>
    <button class="btn btn-ghost" id="logout-btn" style="width:100%;">
      <i class="ti ti-logout" aria-hidden="true"></i>&nbsp;Switch person / log out
    </button>
  `;

  document.getElementById("logout-btn").addEventListener("click", () => {
    if (confirm("Log out on this device?")) Auth.logout();
  });
}
