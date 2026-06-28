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

const MUSCLE_GROUPS = ["Chest","Back","Shoulders","Biceps","Triceps","Legs","Core","Full Body"];
const CARDIO_TYPES = [
  { key:"run",   label:"Run",   emoji:"🏃" },
  { key:"cycle", label:"Cycle", emoji:"🚴" },
  { key:"walk",  label:"Walk",  emoji:"🚶" },
  { key:"swim",  label:"Swim",  emoji:"🏊" },
  { key:"hiit",  label:"HIIT",  emoji:"⚡" },
  { key:"other", label:"Other", emoji:"🏅" },
];

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

// ---------- Toast ----------
function showToast(msg, duration = 1800) {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.id = "toast";
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("toast-show"));
  setTimeout(() => {
    t.classList.remove("toast-show");
    t.addEventListener("transitionend", () => t.remove(), { once: true });
  }, duration);
}

// Haptic feedback
function vibrate(pattern = [10]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// Confetti burst at a DOM element's position
function spawnConfetti(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const colors = ["#7EA86E","#C97A5E","#6290A8","#C4A05A","#FFD700","#FF6B9D","#A78BFA"];
  const particles = Array.from({ length: 55 }, () => ({
    x: cx, y: cy,
    vx: (Math.random() - 0.5) * 14,
    vy: -(Math.random() * 12 + 4),
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 7 + 3,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 14,
    life: 1,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.45;
      p.vx *= 0.98; p.rotation += p.rotSpeed; p.life -= 0.018;
      if (p.life <= 0) continue;
      alive = true;
      ctx.save();
      ctx.globalAlpha = Math.min(p.life * 2, 1);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      if (p.shape === "circle") {
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }
      ctx.restore();
    }
    if (alive) requestAnimationFrame(tick); else canvas.remove();
  }
  requestAnimationFrame(tick);
}

// Animate a number counter
function animateCounter(el, target, prefix = "", suffix = "", duration = 900) {
  const isFloat = !Number.isInteger(target);
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 4);
    const val = target * ease;
    el.textContent = prefix + (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Consecutive day streak from sorted date strings
function calcStreak(dates) {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 0;
  let check = new Date().toISOString().slice(0, 10);
  for (const d of sorted) {
    if (d === check) {
      streak++;
      const prev = new Date(check + "T00:00:00");
      prev.setDate(prev.getDate() - 1);
      check = prev.toISOString().slice(0, 10);
    } else if (d < check) break;
  }
  return streak;
}

// ---------- Inline SVG icons (no CDN dependency) ----------
const ICONS = {
  sun:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  today:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 12a5 5 0 1 0-10 0"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="4.22" y1="5.22" x2="6.34" y2="7.34"/><line x1="19.78" y1="5.22" x2="17.66" y2="7.34"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>`,
  journal: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  stats:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="17" y="9" width="4" height="11" rx="1"/></svg>`,
  logout:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  check:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  barbell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 12h12"/></svg>`,
  rupee:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="3" x2="18" y2="3"/><path d="M6 8h12M6 13l6 8M6 13h3a4 4 0 0 0 0-8"/></svg>`,
};

// ---------- Boot ----------
window.addEventListener("DOMContentLoaded", async () => {
  const session = Auth.getSession();
  if (session) {
    currentUser = session;
    renderApp();
  } else {
    renderLogin();
  }
  setTimeout(checkReminder, 2000);
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
          <input id="login-name" type="text" placeholder="e.g. Darshi" autocomplete="name" />
        </div>
        <div class="field">
          <label>4-digit PIN</label>
          <div class="pin-boxes" id="pin-boxes">
            ${[0, 1, 2, 3].map(i => `<input class="pin-box" id="pin-box-${i}" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off" />`).join("")}
          </div>
        </div>
        <p class="error-text hidden" id="login-error"></p>
        <button class="btn btn-primary" id="login-btn">Continue</button>
        <p style="font-size:12px; color:var(--ink-soft); margin-top:14px; text-align:center;">
          New here? Just enter a name and pick any 4-digit PIN — your account is created automatically.
        </p>
      </div>
    </div>
  `;

  const pinBoxes = [0, 1, 2, 3].map(i => document.getElementById(`pin-box-${i}`));
  const nameInput = document.getElementById("login-name");

  nameInput.addEventListener("keydown", e => { if (e.key === "Enter") pinBoxes[0].focus(); });

  function getPin() { return pinBoxes.map(b => b.value).join(""); }
  function clearPin() { pinBoxes.forEach(b => (b.value = "")); pinBoxes[0].focus(); }

  pinBoxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(0, 1);
      if (box.value && i < 3) pinBoxes[i + 1].focus();
      if (getPin().length === 4) attemptLogin();
    });
    box.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !box.value && i > 0) pinBoxes[i - 1].focus();
    });
    box.addEventListener("paste", e => {
      e.preventDefault();
      const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4).split("");
      digits.forEach((d, j) => { if (pinBoxes[j]) pinBoxes[j].value = d; });
      if (digits.length === 4) attemptLogin();
      else if (pinBoxes[digits.length]) pinBoxes[digits.length].focus();
    });
  });

  document.getElementById("login-btn").addEventListener("click", attemptLogin);

  async function attemptLogin() {
    const errEl = document.getElementById("login-error");
    errEl.classList.add("hidden");
    const name = nameInput.value.trim();
    const pin = getPin();
    if (pin.length !== 4) return;
    const btn = document.getElementById("login-btn");
    btn.textContent = "Checking…";
    const res = await Auth.loginOrRegister(name, pin);
    btn.textContent = "Continue";
    if (res.error) {
      errEl.textContent = res.error;
      errEl.classList.remove("hidden");
      clearPin();
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
  const btn = document.querySelector("#theme-toggle-btn");
  if (btn) btn.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
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
        ${isDark ? ICONS.sun : ICONS.moon}
      </button>
    </header>
    <main class="app-main" id="main-content"></main>
    <button class="btn-fab hidden" id="fab" aria-label="Add">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <line x1="11" y1="2" x2="11" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </button>
    <nav class="tab-bar">
      <button class="tab-btn" data-tab="today">${ICONS.today}<span>Today</span></button>
      <button class="tab-btn" data-tab="journal">${ICONS.journal}<span>Journal</span></button>
      <button class="tab-btn" data-tab="stats">${ICONS.stats}<span>Stats</span></button>
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

const TAB_ORDER = ["today", "journal", "stats"];
let prevTabIdx = 0;

function switchTab(tab) {
  const newIdx = TAB_ORDER.indexOf(tab);
  const direction = newIdx > prevTabIdx ? 1 : -1;
  prevTabIdx = newIdx;
  activeTab = tab;

  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  // sliding pill position
  const bar = document.querySelector(".tab-bar");
  if (bar) bar.style.setProperty("--pill-x", `${newIdx * 33.333}%`);

  const fab = document.getElementById("fab");
  fab.classList.remove("hidden");
  fab.onclick = null;

  const main = document.getElementById("main-content");
  if (main) {
    main.style.transition = "none";
    main.style.transform = `translateX(${-direction * 40}px)`;
    main.style.opacity = "0";
    requestAnimationFrame(() => {
      main.style.transition = "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease";
      main.style.transform = "translateX(0)";
      main.style.opacity = "1";
    });
  }

  if (tab === "today") { renderToday(); fab.onclick = openAddSheet; }
  else if (tab === "journal") { renderJournal(); fab.classList.add("hidden"); }
  else if (tab === "stats") { renderStats(); fab.classList.add("hidden"); }
}

// ============================================================
// TODAY TAB
// ============================================================
async function renderToday() {
  const main = document.getElementById("main-content");
  main.innerHTML = `<div class="skeleton-wrap">${[1,2,3].map(() => `<div class="skel-card"><div class="skel-line w60"></div><div class="skel-line w40"></div></div>`).join("")}</div>`;

  const feed = await Data.getTodayFeed(currentUser.id);

  let habitsHtml = "";
  if (feed.habits.length === 0) {
    habitsHtml = `<button class="empty-state empty-state-tap" data-add="habit">${ICONS.check}<span>No habits yet</span><span class="empty-add-hint">Tap to add your first habit →</span></button>`;
  } else {
    for (const h of feed.habits) {
      const checked = feed.doneHabitIds.includes(h.id);
      const streakDates = await Data.getHabitStreak(h.id, 30);
      const ratio = streakDates.length / 14;
      const streak = calcStreak(streakDates);
      const streakBadge = streak >= 2
        ? `<span class="streak-badge">${streak >= 7 ? "🔥" : "⚡"} ${streak}d</span>`
        : "";
      habitsHtml += `
        <div class="card accent-habit habit-card" data-habit-id="${h.id}">
          <div class="card-row">
            <div class="habit-info">
              <span class="card-title">${escapeHtml(h.name)}</span>
              ${streakBadge}
            </div>
            <button class="habit-check${checked ? " is-checked" : ""}" data-habit-id="${h.id}" data-checked="${checked}"
              aria-label="${checked ? 'Mark not done' : 'Mark done'}">
              <svg class="check-ring" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="var(--hairline)" stroke-width="2.5"/>
                <circle cx="18" cy="18" r="16" fill="none" stroke="var(--moss)" stroke-width="2.5"
                  stroke-dasharray="100.5" stroke-dashoffset="${checked ? 0 : 100.5}"
                  stroke-linecap="round" transform="rotate(-90 18 18)"
                  style="transition:stroke-dashoffset 0.5s cubic-bezier(0.34,1.56,0.64,1)"/>
                ${checked ? `<path d="M11 18l5 5 9-9" stroke="var(--moss)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
              </svg>
            </button>
          </div>
          ${squiggleSvg(ratio, "var(--moss)")}
        </div>`;
    }
  }

  let workoutsHtml = feed.recentWorkouts.length
    ? feed.recentWorkouts.map(w => {
        const isCardio = w.type === "cardio";
        const sub = [
          isCardio ? "Cardio" : "Strength",
          w.duration_min ? `${w.duration_min} min` : null,
          w.distance_km  ? `${w.distance_km} km`  : null,
        ].filter(Boolean).join(" · ");
        return `
        <div class="card accent-workout">
          <div class="card-row">
            <div>
              <div class="card-title">${escapeHtml(w.title)}</div>
              <div class="card-sub">${sub}</div>
            </div>
            <span class="card-tag tag-workout">${isCardio ? "🏃" : "🏋️"}</span>
          </div>
        </div>`;
      }).join("")
    : `<button class="empty-state empty-state-tap" data-add="workout">${ICONS.barbell}<span>No workouts yet today</span><span class="empty-add-hint">Tap to log a workout →</span></button>`;

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
    : `<button class="empty-state empty-state-tap" data-add="expense">${ICONS.rupee}<span>No expenses today</span><span class="empty-add-hint">Tap to log an expense →</span></button>`;

  main.innerHTML = `
    <div class="section-label">Habits</div>
    ${habitsHtml}
    <div class="section-label">Workouts today</div>
    ${workoutsHtml}
    <div class="section-label">Expenses today</div>
    ${expensesHtml}
  `;

  main.querySelectorAll(".empty-state-tap").forEach(btn => {
    btn.addEventListener("click", () => openAddSheet(btn.dataset.add));
  });

  main.querySelectorAll(".habit-check").forEach(btn => {
    btn.addEventListener("click", async () => {
      const habitId = btn.dataset.habitId;
      const wasChecked = btn.dataset.checked === "true";
      btn.disabled = true;
      vibrate([8, 30, 8]);
      // optimistic UI
      btn.classList.toggle("is-checked", !wasChecked);
      if (!wasChecked) {
        spawnConfetti(btn);
        showToast("✓ Habit done! Keep it up 🎯");
        btn.style.transform = "scale(1.25)";
        setTimeout(() => { btn.style.transform = "scale(1)"; btn.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)"; }, 10);
      }
      await Data.toggleHabitToday({ id: habitId }, currentUser.id, wasChecked);
      btn.disabled = false;
      renderToday();
    });
  });
}

// ---------- Add sheet (habit / workout / expense) ----------
function openAddSheet(preselect = null) {
  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";
  overlay.innerHTML = `
    <div class="sheet">
      <p class="sheet-title">Add to today</p>
      <div style="display:flex; gap:8px; margin-bottom:16px;">
        <button class="btn btn-ghost kind-btn${preselect === "habit" ? " kind-active" : ""}" data-kind="habit" style="flex:1;">${ICONS.check}&nbsp;Habit</button>
        <button class="btn btn-ghost kind-btn${preselect === "workout" ? " kind-active" : ""}" data-kind="workout" style="flex:1;">${ICONS.barbell}&nbsp;Workout</button>
        <button class="btn btn-ghost kind-btn${preselect === "expense" ? " kind-active" : ""}" data-kind="expense" style="flex:1;">${ICONS.rupee}&nbsp;Expense</button>
      </div>
      <div id="sheet-form"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll(".kind-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      overlay.querySelectorAll(".kind-btn").forEach(b => b.classList.remove("kind-active"));
      btn.classList.add("kind-active");
      renderSheetForm(btn.dataset.kind, overlay);
    });
  });

  if (preselect) renderSheetForm(preselect, overlay);
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
    openWorkoutSheet(formWrap, overlay);
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
// WORKOUT SHEET — strength + cardio logger
// ============================================================
function openWorkoutSheet(formWrap, overlay) {
  formWrap.innerHTML = `
    <p style="font-size:13px; color:var(--ink-soft); margin:0 0 12px;">What kind of session?</p>
    <div class="wtype-grid">
      <button class="wtype-btn" data-type="strength">
        <span class="wtype-emoji">🏋️</span>
        <strong>Strength</strong>
        <span>Exercises, sets & reps</span>
      </button>
      <button class="wtype-btn" data-type="cardio">
        <span class="wtype-emoji">🏃</span>
        <strong>Cardio</strong>
        <span>Run, cycle, swim…</span>
      </button>
    </div>`;

  formWrap.querySelectorAll(".wtype-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.type === "strength") renderStrengthForm(formWrap, overlay);
      else renderCardioForm(formWrap, overlay);
    });
  });
}

async function renderStrengthForm(formWrap, overlay) {
  const library = await Data.listExercises(currentUser.id);
  const exercises = [];
  let selectedGroup = null;
  let currentSets = [];

  function libraryForGroup(g) {
    return library.filter(e => e.muscle_group === g).map(e => e.name);
  }

  function setsTableHtml(sets) {
    if (!sets.length) return `<p class="sets-empty">No sets yet — tap "Add set".</p>`;
    return `<table class="sets-table">
      <thead><tr><th>Set</th><th>Reps</th><th>kg</th><th></th></tr></thead>
      <tbody>${sets.map((s, i) => `<tr>
        <td class="set-num">${i + 1}</td>
        <td><input class="set-input" data-field="reps" data-idx="${i}" type="number" inputmode="numeric" value="${s.reps || ""}" placeholder="10" min="1" /></td>
        <td><input class="set-input" data-field="weight" data-idx="${i}" type="number" inputmode="decimal" value="${s.weight || ""}" placeholder="0" min="0" step="0.5" /></td>
        <td><button class="set-remove" data-idx="${i}">×</button></td>
      </tr>`).join("")}</tbody>
    </table>`;
  }

  function exerciseChipsHtml() {
    if (!exercises.length) return "";
    return `<div class="ex-chips">${exercises.map((e, i) => `
      <div class="ex-chip">
        <span class="ex-chip-group">${e.muscle_group}</span>
        <span class="ex-chip-name">${escapeHtml(e.name)}</span>
        <span class="ex-chip-sets">${e.sets.length} set${e.sets.length !== 1 ? "s" : ""}</span>
        <button class="ex-chip-remove" data-idx="${i}">×</button>
      </div>`).join("")}
    </div>`;
  }

  function syncSets() {
    formWrap.querySelectorAll(".set-input").forEach(inp => {
      const idx = parseInt(inp.dataset.idx);
      if (!currentSets[idx]) return;
      currentSets[idx][inp.dataset.field] = inp.value;
    });
  }

  function bindSetControls() {
    formWrap.querySelectorAll(".set-input").forEach(inp => inp.addEventListener("input", syncSets));
    formWrap.querySelectorAll(".set-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        syncSets();
        currentSets.splice(parseInt(btn.dataset.idx), 1);
        formWrap.querySelector("#sets-wrap").innerHTML = setsTableHtml(currentSets);
        bindSetControls();
      });
    });
  }

  function render() {
    const suggestions = selectedGroup ? libraryForGroup(selectedGroup) : [];
    formWrap.innerHTML = `
      <div class="field">
        <label for="w-session">Session name</label>
        <input id="w-session" placeholder="e.g. Push Day, Leg Day" />
      </div>
      ${exerciseChipsHtml()}
      <div class="section-label" style="margin-top:${exercises.length ? 16 : 4}px;">Add exercise</div>
      <div class="mg-chips">${MUSCLE_GROUPS.map(g =>
        `<button class="mg-chip${g === selectedGroup ? " active" : ""}" data-g="${g}">${g}</button>`
      ).join("")}</div>
      <div class="field" style="margin-top:10px;">
        <label for="w-exname">Exercise name</label>
        <input id="w-exname" placeholder="${selectedGroup ? (suggestions[0] || "e.g. Bench Press") : "Pick a muscle group first"}"
          list="ex-dl" ${!selectedGroup ? "disabled" : ""} autocomplete="off" />
        <datalist id="ex-dl">${suggestions.map(s => `<option value="${escapeHtml(s)}">`).join("")}</datalist>
      </div>
      <div id="sets-wrap" style="${!selectedGroup ? "display:none" : ""}">${setsTableHtml(currentSets)}</div>
      <div style="display:flex; gap:8px; margin-top:8px; ${!selectedGroup ? "display:none" : ""}">
        <button class="btn btn-ghost" id="add-set-btn" style="flex:1;" ${!selectedGroup ? "disabled" : ""}>+ Add set</button>
        <button class="btn btn-ghost" id="add-ex-btn" style="flex:1;" ${!selectedGroup ? "disabled" : ""}>Add exercise →</button>
      </div>
      <button class="btn btn-primary" id="save-strength-btn" style="margin-top:16px; ${!exercises.length ? "opacity:0.45;" : ""}" ${!exercises.length ? "disabled" : ""}>
        Log ${exercises.length || ""} exercise${exercises.length !== 1 ? "s" : ""}
      </button>`;

    formWrap.querySelectorAll(".mg-chip").forEach(c => {
      c.addEventListener("click", () => { syncSets(); selectedGroup = c.dataset.g; render(); });
    });
    formWrap.querySelectorAll(".ex-chip-remove").forEach(b => {
      b.addEventListener("click", () => { exercises.splice(parseInt(b.dataset.idx), 1); render(); });
    });

    const addSetBtn = formWrap.querySelector("#add-set-btn");
    if (addSetBtn) addSetBtn.addEventListener("click", () => {
      syncSets();
      currentSets.push({ reps: "", weight: "" });
      formWrap.querySelector("#sets-wrap").innerHTML = setsTableHtml(currentSets);
      bindSetControls();
    });

    const addExBtn = formWrap.querySelector("#add-ex-btn");
    if (addExBtn) addExBtn.addEventListener("click", () => {
      const nameInput = formWrap.querySelector("#w-exname");
      const name = nameInput?.value.trim();
      if (!name) { nameInput?.focus(); return; }
      syncSets();
      exercises.push({ name, muscle_group: selectedGroup, sets: currentSets.filter(s => s.reps) });
      Data.saveExercise(currentUser.id, name, selectedGroup);
      currentSets = [];
      selectedGroup = null;
      render();
    });

    const saveBtn = formWrap.querySelector("#save-strength-btn");
    if (saveBtn && exercises.length) {
      saveBtn.addEventListener("click", async () => {
        const title = formWrap.querySelector("#w-session").value.trim() || "Strength";
        saveBtn.textContent = "Saving…"; saveBtn.disabled = true;
        const { data: w } = await Data.addWorkout(currentUser.id, { title, type: "strength" });
        if (w) await Data.addWorkoutExercises(w.id, exercises.map((e, i) => ({
          exercise_name: e.name, muscle_group: e.muscle_group, sets: e.sets, sort_order: i,
        })));
        overlay.remove();
        showToast("💪 Workout logged!");
        renderToday();
      });
    }

    bindSetControls();
  }

  render();
}

function renderCardioForm(formWrap, overlay) {
  let selectedType = "run";
  formWrap.innerHTML = `
    <div class="cardio-grid">${CARDIO_TYPES.map(t =>
      `<button class="cardio-btn${t.key === "run" ? " active" : ""}" data-key="${t.key}">
        <span>${t.emoji}</span><span>${t.label}</span>
      </button>`).join("")}
    </div>
    <div class="field" style="margin-top:14px;">
      <label for="c-dur">Duration (minutes)</label>
      <input id="c-dur" type="number" inputmode="numeric" placeholder="30" min="1" />
    </div>
    <div class="field">
      <label for="c-dist">Distance (km) — optional</label>
      <input id="c-dist" type="number" inputmode="decimal" placeholder="5.0" step="0.1" min="0" />
    </div>
    <div class="field">
      <label for="c-notes">Notes — optional</label>
      <input id="c-notes" placeholder="e.g. Morning park run" />
    </div>
    <button class="btn btn-primary" id="save-cardio-btn">Log cardio</button>`;

  formWrap.querySelectorAll(".cardio-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedType = btn.dataset.key;
      formWrap.querySelectorAll(".cardio-btn").forEach(b => b.classList.toggle("active", b === btn));
    });
  });

  formWrap.querySelector("#save-cardio-btn").addEventListener("click", async () => {
    const duration_min = parseInt(formWrap.querySelector("#c-dur").value) || null;
    const distance_km  = parseFloat(formWrap.querySelector("#c-dist").value) || null;
    const notes        = formWrap.querySelector("#c-notes").value.trim();
    const typeLabel    = CARDIO_TYPES.find(t => t.key === selectedType)?.label || "Cardio";
    const title        = distance_km ? `${distance_km}km ${typeLabel}` : typeLabel;
    await Data.addWorkout(currentUser.id, { title, duration_min, notes, type: "cardio", distance_km });
    overlay.remove();
    showToast("🏃 Cardio logged!");
    renderToday();
  });
}

// ============================================================
// JOURNAL TAB — today's entry on top, scrollable past entries below
// ============================================================
async function renderJournal() {
  const main = document.getElementById("main-content");
  main.innerHTML = `<div class="skeleton-wrap">${[1,2].map(() => `<div class="skel-card"><div class="skel-line w60"></div><div class="skel-line w40"></div></div>`).join("")}</div>`;

  const today = Data.todayStr();
  const [todayEntry, pastRes] = await Promise.all([
    Data.getJournalEntry(currentUser.id, today),
    Data.listJournalEntries(currentUser.id, 60),
  ]);
  const pastEntries = pastRes.data || [];

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

    <div class="section-label">Your entries</div>
    <div id="past-entries">
      ${pastEntries.length === 0
        ? `<div class="empty-state">${ICONS.journal}<span style="margin-top:6px;font-size:13.5px;">Nothing here yet — entries you save will show up here.</span></div>`
        : pastEntries.map(e => {
            const mood = MOODS.find(m => m.key === e.mood);
            const isToday = e.log_date === today;
            return `
              <div class="card accent-mood">
                <div class="card-row">
                  <span class="card-sub" style="font-size:12px;">${isToday ? "Today" : fmtDateShort(e.log_date)}</span>
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
    const btn = document.getElementById("save-journal");
    const statusEl = document.getElementById("journal-saved");
    btn.textContent = "Saving…";
    btn.disabled = true;
    statusEl.classList.add("hidden");

    const result = await Data.upsertJournalEntry(currentUser.id, today, { mood: selectedMood, entry });
    const error = result?.error;
    const data  = result?.data;

    btn.textContent = "Save entry";
    btn.disabled = false;

    if (error) {
      statusEl.textContent = "❌ " + (error.message || "Could not save");
      statusEl.style.color = "var(--clay)";
      statusEl.classList.remove("hidden");
      console.error("Journal save error:", error);
      return;
    }

    if (!data) {
      statusEl.textContent = "⚠️ Saved but couldn't confirm — check Supabase Table Editor";
      statusEl.style.color = "var(--ochre)";
      statusEl.classList.remove("hidden");
      return;
    }

    statusEl.textContent = "✓ Saved";
    statusEl.style.color = "var(--moss)";
    statusEl.classList.remove("hidden");
    vibrate([8, 40, 8]);
    showToast("📓 Entry saved");
    // reload entries list (don't wipe the textarea)
    const pastRes = await Data.listJournalEntries(currentUser.id, 60);
    const pastEntries = pastRes.data || [];
    const pastEl = document.getElementById("past-entries");
    if (pastEl) {
      pastEl.innerHTML = pastEntries.length === 0
        ? `<div class="empty-state">${ICONS.journal}<span style="margin-top:6px;font-size:13.5px;">Nothing here yet — entries you save will show up here.</span></div>`
        : pastEntries.map(e => {
            const mood = MOODS.find(m => m.key === e.mood);
            const isToday = e.log_date === today;
            return `
              <div class="card accent-mood">
                <div class="card-row">
                  <span class="card-sub" style="font-size:12px;">${isToday ? "Today" : fmtDateShort(e.log_date)}</span>
                  <span style="font-size:18px;">${mood ? mood.emoji : ""}</span>
                </div>
                ${e.entry ? `<p style="font-size:14px; margin:8px 0 0; white-space:pre-wrap;">${escapeHtml(e.entry)}</p>` : ""}
              </div>`;
          }).join("");
    }
  });
}

// ============================================================
// STATS TAB — simple summary
// ============================================================
async function renderStats() {
  const main = document.getElementById("main-content");
  main.innerHTML = `<div class="skeleton-wrap">${[1,2].map(() => `<div class="skel-card"><div class="skel-line w60"></div><div class="skel-line w40"></div></div>`).join("")}</div>`;

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
      <div class="stat-tile"><span class="num" id="s-workouts">0</span><span class="lbl">workouts</span></div>
      <div class="stat-tile"><span class="num" id="s-spend">₹0</span><span class="lbl">spent this month</span></div>
      <div class="stat-tile"><span class="num" id="s-habits">0</span><span class="lbl">active habits</span></div>
      <div class="stat-tile"><span class="num" id="s-avg">0</span><span class="lbl">avg check-ins/habit</span></div>
    </div>
    <div class="section-label">Reminders</div>
    <div class="card" style="border-left:none;">
      <p style="font-size:13px; color:var(--ink-soft); margin:0 0 12px;">Get a daily nudge to log your day.</p>
      <div class="field" style="margin-bottom:10px;">
        <label for="reminder-time">Reminder time</label>
        <input id="reminder-time" type="time" value="${localStorage.getItem('dl-reminder-time') || '20:00'}" />
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" id="save-reminder-btn" style="flex:1;">Set reminder</button>
        <button class="btn btn-ghost" id="clear-reminder-btn" style="flex:1;">Clear</button>
      </div>
      <p id="reminder-status" style="font-size:12px; color:var(--ink-soft); margin:8px 0 0; text-align:center;">
        ${localStorage.getItem('dl-reminder-time') ? `Active — ${localStorage.getItem('dl-reminder-time')} daily` : "No reminder set"}
      </p>
    </div>
    <div class="section-label">Account</div>
    <button class="btn btn-ghost" id="logout-btn" style="width:100%;">
      ${ICONS.logout}&nbsp;Switch person / log out
    </button>
  `;

  document.getElementById("save-reminder-btn").addEventListener("click", async () => {
    const time = document.getElementById("reminder-time").value;
    if (!time) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      showToast("Allow notifications in browser settings");
      return;
    }
    localStorage.setItem("dl-reminder-time", time);
    document.getElementById("reminder-status").textContent = `Active — ${time} daily`;
    showToast("🔔 Reminder set for " + time);
  });

  document.getElementById("clear-reminder-btn").addEventListener("click", () => {
    localStorage.removeItem("dl-reminder-time");
    localStorage.removeItem("dl-reminder-shown");
    document.getElementById("reminder-status").textContent = "No reminder set";
    showToast("Reminder cleared");
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    if (confirm("Log out on this device?")) Auth.logout();
  });

  // Animate counters
  animateCounter(document.getElementById("s-workouts"), workoutsLast30);
  animateCounter(document.getElementById("s-spend"), Math.round(monthTotal), "₹");
  animateCounter(document.getElementById("s-habits"), habits.length);
  animateCounter(document.getElementById("s-avg"), avgPerHabit);
}

// ---------- Reminder check on app open ----------
function checkReminder() {
  const time = localStorage.getItem("dl-reminder-time");
  if (!time || Notification.permission !== "granted") return;
  const today = new Date().toISOString().slice(0, 10);
  const shownKey = "dl-reminder-shown";
  if (localStorage.getItem(shownKey) === today) return;
  const [rh, rm] = time.split(":").map(Number);
  const now = new Date();
  if (now.getHours() > rh || (now.getHours() === rh && now.getMinutes() >= rm)) {
    new Notification("Daily Log", { body: "Time to log your day! 📓", icon: "/daily-log/icons/icon-192.png" });
    localStorage.setItem(shownKey, today);
  }
}
