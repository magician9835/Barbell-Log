# Barbell Log — Deployment Guide

**Live URL:** https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html  
**GitHub repo:** https://github.com/magician9835/Barbell-Log

---

**Current database setup:** see [DATABASE.md](DATABASE.md). The Apps Script steps below apply only to the retained legacy Sheets connection.

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

## Step 1 — Update the website

Follow [DEVELOPMENT.md](DEVELOPMENT.md): edit in the workspace, run checks,
review a pull request, and merge to the branch used by GitHub Pages.
Keep `olympic-lifting-tracker.html` at the same address so the installed phone
shortcut continues to work. Website-only updates need no Apps Script deployment.

---

## Step 2 — Update Apps Script only when backend code changes

1. Back up the spreadsheet and test changes using a separate copy first.
2. Open the live spreadsheet → **Extensions → Apps Script**.
3. Replace the code with the reviewed `barbell-log-apps-script.js` and save.
4. Select **Deploy → Manage deployments**.
5. Select the existing web app deployment and click **Edit** (pencil).
6. Choose **New version**, then **Deploy**.

Updating the existing deployment preserves its web app URL. Older deployments
are not automatically disabled by creating another deployment. Create a separate
new deployment only when you deliberately need another endpoint, such as testing.

---

## Step 3 — Keep the existing endpoint

The app's Settings URL can stay unchanged when the existing deployment is
updated. If you deliberately replace the endpoint, update Settings separately
on each device. Publishing the website from GitHub does not publish Apps Script.

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

The Google Sheet is the source of truth for lift entries. See DEVELOPMENT.md for
known save-confirmation issues and bulk backend actions that replace sheet data.

- **⇅ SYNC** pulls log entries from the sheet. It does not push local-only entries.
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
