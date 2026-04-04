# Barbell Log — Deployment Guide

**Live URL:** https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html  
**GitHub repo:** https://github.com/magician9835/Barbell-Log

---

## Files in this package

| File | What it is |
|---|---|
| `olympic-lifting-tracker.html` | The app |
| `barbell-log-apps-script.js` | Google Sheets middleware |
| `icon.png` | Home screen icon (weightlifter emoji) |
| `README.md` | Full rebuild spec for future Claude sessions |
| `DEPLOY.md` | This file |

---

## When to do what

| Change | Steps needed |
|---|---|
| UI fix, styling, new feature (no new data fields) | Step 1 only |
| New data field, new sheet tab, new sync action | Steps 1–3 |
| Icon change | Upload `icon.png` to repo root, re-add home screen shortcut |

---

## Step 1 — Update the app (always do this)

1. Go to **github.com/magician9835/Barbell-Log**
2. Click `olympic-lifting-tracker.html`
3. Click the **three dots (...)** → **Upload new version**
4. Upload the new file and commit
5. Wait ~60 seconds, then open the live URL in Safari to confirm

---

## Step 2 — Update the Apps Script (when data model changed)

1. Open your **Google Sheet**
2. Click **Extensions → Apps Script**
3. Select all (Cmd+A), delete, paste contents of `barbell-log-apps-script.js`
4. Save (Cmd+S)
5. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorise, **copy the new URL**

> Every new deployment generates a new URL. The old one stops working.

---

## Step 3 — Update the URL in the app (after new Apps Script deployment)

1. Open the app on **iPhone** → Settings tab → Google Sheets Sync
2. Clear the old URL, paste the new one
3. Tap **Sync Now** — should show "Synced"
4. Repeat on **Mac**

---

## Step 4 — Verify after deployment

- Log tab loads entries
- Tap an entry → Edit modal opens with all fields pre-filled
- Analytics → Bodyweight Trend shows weight history
- Comp tab → countdown shows if a competition date is set
- PBs → Records shows Lift Off (London) in Competition column
- Settings → Weight Class shows 85kg (IWF Aug 2026)

---

## Re-adding the home screen shortcut (after icon change)

1. Press and hold the Barbell Log icon → Remove Bookmark
2. Open Safari → live URL
3. Share → Add to Home Screen → name it **Barbell Log** → Add

---

## Sync model (important)

The Google Sheet is the source of truth.

- **⇅ SYNC** pulls from the sheet (sheet wins on conflicts), appends any local-only entries, never overwrites or deletes sheet rows
- **Log a Set** appends a new row to the sheet immediately on save
- **Edit entry** (tap any log entry) updates the specific row in the sheet by ID
- **Delete entry** removes from the app and deletes the row from the sheet

---

## Sheet tabs

| Tab | Contents |
|---|---|
| **Log** | All training entries |
| **Meets** | Competition records with per-attempt data |
| **Bodyweight** | Weigh-in log |
| **PBs** | Personal bests snapshot (written on sync, not read back) |

Tabs are created automatically on first sync if missing.

---

## Rebuilding with Claude

Share `README.md` with a new Claude session and say:

> "I have an Olympic lifting tracker at https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html — here is the full rebuild spec. Please help me continue developing it."

---

## What changed in the latest version

- **Edit any log entry** — tap an entry to open a full edit modal (all fields, chips, quality). Save pushes the update to the sheet.
- **Delete entry** — red Delete button in the edit modal. Removes from app and deletes the sheet row.
- **Sheet is now source of truth** — sync pulls from sheet (sheet wins), never overwrites sheet data
- **New entry append** — Log a Set appends to sheet, never overwrites
- **PB trophy badge** — 🏆 appears on entries that are a PB for that base lift + first position + receiving combination
- **Colour-coded progress bars** — red → amber → yellow-green → green as you approach each goal tier
- **Timer sound** — three-tone beep when rest timer hits zero (Web Audio API)
- **Bodyweight log** — collapsible, shows 5 most recent by default, Show all (N) button
- **CSV import fixed** — correctly parses Withings format (YYYY-MM-DD HH:MM:SS)
- **compBW error fixed** — PBs Records page was crashing, now resolved
- **Goals order** — Snatch first, C&J second (competition order)
- **Records date typo fixed** — PB dates corrected from 2026 to 2025
