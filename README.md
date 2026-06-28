# Daily Log

A minimal, installable tracker for habits, workouts, expenses, and a daily
journal — built for 2-3 people sharing one app, each with their own
name + PIN. Free to host, works great on phones.

No build step. No server to run. Just static files + a free Supabase database.

---

## 1. Create your free database (5 min)

1. Go to [supabase.com](https://supabase.com) and sign up (free tier).
2. Click **New project**. Pick any name and password (the password is
   only for the Supabase dashboard itself — not used by the app).
3. Once it's ready, open **SQL Editor** (left sidebar) → **New query**.
4. Open `schema.sql` from this folder, copy all of it, paste it into the
   SQL editor, and click **Run**. This creates all the tables.
5. Go to **Project Settings → API Keys** (tab: "Publishable and secret API keys").
   You'll need two values:
   - **Project URL** — under Settings → General, looks like `https://abcdefgh.supabase.co`
   - **Publishable key** — starts with `sb_publishable_...`, safe to share publicly

## 2. Connect the app to your database

Open `js/config.js` and replace the placeholders:

```js
window.SUPABASE_URL = "https://abcdefgh.supabase.co";
window.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xxxxxxxxxxxx";
```

Both values are safe to commit/publish — the publishable key is meant for
browser use, and access is controlled by what the app itself does with it.

## 3. Put it on GitHub

```bash
cd tracker
git init
git add .
git commit -m "Daily Log tracker"
gh repo create daily-log --public --source=. --push
```

(No `gh` CLI? Create a new repo on github.com, then follow the
"push an existing repository" instructions it shows you.)

## 4. Turn on GitHub Pages (free hosting)

1. On your repo's GitHub page: **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Save.
4. Wait ~1 minute. Your app is live at:
   `https://YOUR-USERNAME.github.io/daily-log/`

## 5. Install it on your phone

Open that link on your phone's browser.

- **iPhone (Safari):** tap Share → "Add to Home Screen"
- **Android (Chrome):** tap the ⋮ menu → "Add to Home screen" / "Install app"

It'll behave like a normal app icon — full screen, no browser bar.

## 6. Share with the other 2-3 people

Just send them the same link. Each person opens it, types their own
name, picks their own 4-digit PIN, and gets their own private data.
Everyone's habits/expenses/journal stay separate — they all just share
the same free database behind the scenes.

---

## Notes on security

This uses a simple name + 4-digit PIN, not real authentication. It's
fine for a small group of people who trust each other and aren't
storing anything sensitive (no real account-recovery, no protection
against someone determined to guess a 4-digit PIN). Don't use this for
anything you wouldn't be okay with a determined housemate seeing.

## Free tier limits (Supabase)

The free tier comfortably covers 2-3 people logging daily for years —
limits are around 500MB database storage and the project pauses after
a week of total inactivity (just open the app and it wakes back up
within a few seconds).

## File structure

```
index.html          — the app shell
css/style.css        — all styling
js/config.js          — your Supabase keys (edit this)
js/auth.js            — name + PIN login
js/data.js            — all database reads/writes
js/app.js             — rendering + UI logic
manifest.json, sw.js  — make it installable on phones
schema.sql            — run once in Supabase SQL editor
icons/                — app icons
```

## Making changes later

Everything is plain HTML/CSS/JS — open any file and edit it directly,
then `git add . && git commit -m "..." && git push`. GitHub Pages
redeploys automatically within a minute.
