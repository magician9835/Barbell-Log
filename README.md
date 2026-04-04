# Barbell Log

Olympic lifting tracker built for Brian Dearing. Single HTML file, iPhone Safari optimised, syncs to Google Sheets.

**Live app:** https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html

---

## Files in this repo

| File | Purpose |
|---|---|
| `olympic-lifting-tracker.html` | The app |
| `barbell-log-apps-script.js` | Google Apps Script for Sheets sync |
| `photo.jpg` | Competition photo (PBs background) |
| `README.md` | This file |

---

## Deployment steps

### HTML update (UI/feature changes only)
1. Go to github.com/magician9835/Barbell-Log
2. Click `olympic-lifting-tracker.html` then the three dots menu and Upload new version
3. Commit. Wait ~60 seconds for GitHub Pages to update.

### Full update (data model changes)
1. Replace `olympic-lifting-tracker.html` as above
2. Go to Google Sheet > Extensions > Apps Script
3. Delete all code, paste contents of `barbell-log-apps-script.js`, save
4. Deploy > New deployment > Web app > Execute as Me > Anyone > Deploy
5. Copy the new URL
6. Open app on iPhone and Mac, go to Settings, paste new URL, tap Sync Now on both

---

## Rebuilding with Claude

If this conversation is lost, share this README with Claude and say:

> I have an Olympic lifting tracker app at the GitHub URL above. Here is the rebuild specification. Please help me recreate or modify it.

Then share the rebuild-spec content below.

---

## Full rebuild specification

### Stack
Single self-contained HTML file. Vanilla HTML/CSS/JS. localStorage for data (`barbell_log_v1`, `barbell_settings_v1`). Google Sheets sync via Apps Script POST endpoint. Google Fonts: Syne + DM Mono. iPhone Safari optimised.

### Design
Dark theme. Background #111111. Accent #c8f55a (yellow-green). Surfaces #1a1a1a / #222222 / #2a2a2a. Borders #333333. Text #f0f0f0 / #aaaaaa / #777777. Syne for UI text, DM Mono for numbers. Grain texture overlay. Card depth with box-shadow. Live clock in header. Modifier separator is ` · `.

### Five tabs
**Log** -- filter bar (Snatch, C&J, Clean, Jerk, Squat, Pull, Deadlift, Row), entries grouped by date newest first, session colour left border (blue=Coached Class, orange=1:1, green=Solo, gold=Competition), + Log a Set button at top.

**Planner** -- unlimited lift blocks, each collapsible, component-based lift selector, target % input, reference weight lookup, warmup ladder with tappable rows, barbell plate diagram (IWF colours, one side, no collar), rest timer with presets.

**PBs** -- two sub-views: Records (competition lifts total card, individual Snatch/C&J, all other records, Sinclair) and Goals (strength standards table with progress bars, editable multiples, custom goal per lift).

**Comp** -- two sub-views: Plan (attempt planner with auto-suggested % of PB, projected total, context stats) and History (meet log cards with per-attempt make/miss, total, Sinclair).

**Settings** -- units (kg/lbs toggle, stored in kg), athlete bodyweight + bodyweight log, weight class (IWF and BWF), Google Sheets sync, coefficients (editable with explanation).

### Data model (log entry)
id, date, session (Coached Class / 1:1 Session / Solo / Competition), base, position[], receiving, grip[], technique[], weight (always kg), sets, reps, quality (1-5), notes.

### Base lifts and their modifiers
- Snatch: positions Floor/Hang Below Knee/Hang Above Knee/Hang Mid-Thigh/Deficit/Blocks, receiving Squat/Power/Muscle, technique Pause/Balance/Complex, no grip
- Clean: same positions, same receiving, technique Pause/Complex, no grip
- Jerk: positions Rack/Blocks, receiving Split/Squat, technique Pause/Balance/Complex, no grip
- Clean and Jerk: positions Rack/Blocks, receiving Split/Squat/Power, technique Pause/Complex, no grip
- Squat: no position, no receiving, type Back/Front/Overhead/Zercher, technique Pause/Tempo/Box/Pin/Banded
- Pull: full positions, grip Snatch Grip/Clean Grip/Overhand/Underhand, technique High Pull/Pause/Complex
- Deadlift: positions Floor/Deficit/Blocks, grip Overhand/Underhand/Mixed, technique Pause/Tempo/Sumo/Romanian/Stiff-Leg
- Pendlay Row: no position, grip Overhand/Underhand, technique Pause/Tempo
- Barbell Row: hang positions, grip Overhand/Underhand, technique Pause/Tempo

### Coefficients (multiplicative, population defaults)
Position: Floor 1.0, Hang Below Knee 0.90, Hang Above Knee 0.95, Hang Mid-Thigh 0.92, Blocks 0.97, Deficit 1.03, Rack 1.0
Receiving: Squat 1.0, Power 0.85, Muscle 0.70, Split 1.0
Technique: Pause 0.95, Tempo 0.93, Balance 0.98, Complex 0.95, High Pull 1.0

### Sinclair
2025-2028 IWF men: A=0.722762521, b=175.508. Formula: Total × 10^(A × log10(bw/b)²)

### IWF weight classes (men)
55, 61, 67, 73, 81, 89, 96, 102, 109, +109

### BWF weight classes (men)
56, 62, 69, 77, 85, 94, 105, +105

### Strength standards (× bodyweight)
C&J: Beginner 0.5, Novice 0.75, Intermediate 1.25, Advanced 1.5, Elite 2.0
Snatch: Beginner 0.5, Novice 0.75, Intermediate 1.0, Advanced 1.25, Elite 1.75

### Plate colours (IWF, one side shown, no collar)
25kg red, 20kg blue, 15kg yellow, 10kg green, 5kg white, 2.5kg black, 2kg blue (small), 1.5kg yellow (small), 1kg green (small), 0.5kg white (small), 0.25kg silver. Bar = 20kg. Fractional plates available (0.25kg minimum).

### Seeded data
Competition: Lift Off 29 Nov 2025, BW 80.5kg. Snatch 50✅ 53❌ 53❌. C&J 70✅ 75❌ 75✅. Total 125kg, Sinclair 159.184.
Athlete BW: 79.8kg (competition). IWF class 81kg, BWF class 85kg.
PBs: Snatch 56kg, C&J 82kg, Clean 100kg, Jerk 65kg.
