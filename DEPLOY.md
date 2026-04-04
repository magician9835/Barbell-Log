# Barbell Log — Deployment Instructions

**Live URL:** https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html  
**GitHub repo:** https://github.com/magician9835/Barbell-Log

---

## Files in this package

| File | What it is |
|---|---|
| `olympic-lifting-tracker.html` | The app — upload to GitHub to deploy |
| `barbell-log-apps-script.js` | Google Sheets middleware — paste into Apps Script |
| `README.md` | Repo readme with rebuild spec for future Claude sessions |
| `DEPLOY.md` | This file |

---

## Step 1 — Update the app (GitHub)

1. Go to **github.com/magician9835/Barbell-Log**
2. Click `olympic-lifting-tracker.html`
3. Click the **three dots menu (...)** → **Upload new version** (or Delete then re-upload)
4. Upload the new `olympic-lifting-tracker.html`
5. Click **Commit changes**
6. Wait ~60 seconds, then open the live URL in Safari to confirm it loads

> This is the only step needed for most UI/feature updates.

---

## Step 2 — Update the Google Sheets middleware

Do this step whenever the data model has changed (new fields, new tabs). This session adds: `location` to meets, `notes` field improvements, and ensures all four sheet tabs exist.

1. Open your **Google Sheet**
2. Click **Extensions → Apps Script**
3. Select all existing code (Cmd+A) and delete it
4. Open `barbell-log-apps-script.js` from this package and paste the entire contents
5. Press **Cmd+S** to save
6. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** and authorise when prompted
8. **Copy the new deployment URL**

> Important: each new deployment generates a new URL. The old URL stops working.

---

## Step 3 — Update the URL in the app (both devices)

After deploying new Apps Script:

1. Open the app on **iPhone**
2. Go to **Settings tab** → scroll to **Google Sheets Sync**
3. Clear the old URL, paste the new one
4. Tap **Sync Now** — you should see "Synced" toast
5. Repeat on **Mac**

---

## Step 4 — Verify Google Sheet tabs

After first sync the sheet should have four tabs. If any are missing they'll be created automatically on sync.

| Tab | Contents |
|---|---|
| **Log** | All training entries — date, session, lift, weight, sets, reps, quality, notes |
| **Meets** | Competition records — attempts, make/miss, total, Sinclair, location |
| **Bodyweight** | Weigh-in log with dates |
| **PBs** | Personal bests in kg and lbs |

---

## Step 5 — Verify your data after sync

After syncing, open the app and check:

- **Log tab** → entries present
- **Comp tab → History** → Lift Off (London, 29 Nov 2025) present
- **PBs tab** → Competition column shows Snatch 50kg, C&J 75kg from Lift Off
- **Settings** → Weight class shows 85kg (IWF, Aug 2026 classes)
- **Analytics** → switch to Snatch, chart renders

---

## When to do a full deploy (Steps 1–4) vs HTML only (Step 1)

| Change | Steps needed |
|---|---|
| UI fix, new feature, styling | Step 1 only |
| New data field (e.g. location on meets) | Steps 1–4 |
| New sheet tab | Steps 1–4 |
| Weight class / coefficient update | Step 1 only |

---

## Rebuilding from scratch with Claude

If you ever lose this conversation, share `README.md` with a new Claude session and say:

> "I have an Olympic lifting tracker at https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html — here is the full rebuild spec. Please help me continue developing it."

The README contains the full technical specification of everything built so far.

---

## What's new in this version

**Features added:**
- Analytics tab (Log → Analytics) with progress charts, period filters (All time / YTD / Last Year / 12m / 6m / 3m), volume stats, bodyweight trend chart
- AI Insights — Generate button in Analytics sends training data to Claude for personalised coaching observations
- Competition countdown — shown in header badge, Log tab banner, and Comp tab
- Session summary modal after finishing a planner session
- Coach notes per lift in the Session Planner
- Bodyweight CSV import in Settings (supports Withings and standard CSV)
- Bench Press added as a base lift with position, grip and technique variants
- COMP LIFT gold badge on plain Snatch and C&J log entries (no modifiers)
- Location field on meets (Log a Meet modal and Comp Plan section)
- Dynamic Comp Plan title builds from name, date, location
- "Log today" quick button next to bodyweight field in Settings
- AI Insights generates personalised analysis from your full data snapshot

**Fixes and improvements:**
- IWF weight classes updated to August 2026 (60/65/70/75/85/95/110/+110kg)
- Sinclair now uses bodyweight at time of lift (meet BW for comp, closest log entry for training)
- Competition removed from Log a Set session types (use Meets tab instead)
- PBs competition column gold, training column green — visually distinct
- Weight class display shows class below / your class / class above with kg-to-limit
- BWL (British Weightlifting) labelling corrected throughout
- Barbell Row and Pendlay Row — no position or technique modifiers
- Analytics lift selector includes all lifts (Deadlift, Rows, Bench)
- Period filter labels: All time / YTD / Last Year / 12 Months / 6 Months / 3 Months
- Lift name order reversed: Base first, position last (e.g. Snatch · Pause · Hang Above Knee)
- Header layout fixed — title, clock, badge and sync button no longer overlap on narrow screens
- Mobile optimised for iPhone 16 Pro — safe area insets, dvh modals, overflow handling
- All modals have ✕ close button and tap-overlay-to-close
- Font-family quote conflicts resolved (were causing full script failure)
