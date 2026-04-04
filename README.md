# Barbell Log

Olympic lifting tracker built for Brian Dearing. Single HTML file, iPhone Safari optimised, syncs to Google Sheets.

**Live app:** https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html  
**GitHub repo:** https://github.com/magician9835/Barbell-Log

---

## Rebuild specification for Claude

Share this file with Claude and say: *"I have an Olympic lifting tracker at the GitHub URL above. Here is the full rebuild spec. Please help me continue developing it."*

---

## Stack

Single self-contained HTML file. Vanilla HTML/CSS/JS. No build step, no dependencies beyond Google Fonts. localStorage for data (`barbell_log_v1`, `barbell_settings_v1`). Google Sheets sync via Apps Script POST/GET endpoint. Google Fonts: Syne + DM Mono. iPhone 16 Pro Safari optimised. Installable as home screen app with custom icon.

---

## Design system

Dark theme. Background `#111111`. Accent `#c8f55a` (yellow-green). Competition gold `#ffd700`. Surfaces `#1a1a1a` / `#222222` / `#2a2a2a`. Borders `#333333`. Text `#f0f0f0` / `#aaaaaa` / `#777777`. Red `#ff5252`. Blue `#5ab4ff`. Orange `#ff9a3c`. Syne for UI text, DM Mono for numbers. Grain texture overlay. Card depth with box-shadow. Live clock in header (second row). Modifier separator is ` · `. Safe area insets for Dynamic Island and home indicator. Modals use `dvh`.

---

## Five tabs

### Log — sub-views: Log | Analytics

Filter bar: All, Snatch, C&J, Clean, Jerk, Squat, Pull, Row, Deadlift, Bench. Entries grouped by date newest first. Session colour left borders: blue=Coached Class, orange=1:1 Session, green=Solo, gold=Competition (legacy data only). COMP LIFT gold badge on plain Snatch/C&J entries (no modifiers, floor only, standard receiving). + Log a Set button. Competition countdown banner at top when a comp date is set.

Analytics sub-view: lift selector (all lifts) + period filter (All time / YTD / Last Year / 12m / 6m / 3m). Progress chart: session max trend line + individual set dots, date labels with year. AI Insights: Generate button sends full training snapshot to Claude API, returns personalised coaching paragraphs. Volume & Frequency stats (sessions/week, volume trend vs prior period, most trained lift, total entries). Bodyweight Trend chart with area fill.

### Planner

Unlimited lift blocks, collapsible. Each block: base lift selector, modifier chips (position, receiving, grip, technique), target % input (onblur), coach notes textarea, reference weight display, warmup ladder. Warmup rows tappable → barbell plate diagram (IWF colours, one side, no collar, fractional plates to 0.25kg). Rest timer with presets. Finish Session → review modal (per-lift actual weight/sets/reps/quality/notes) → Session Summary modal (PB badges, total volume, heaviest lift, quality average).

### PBs — sub-views: Records | Goals

Records: side-by-side two-column card. Competition column (gold, `#ffd700` tint): Snatch, C&J, Total, Sinclair. Training column (green, `#c8f55a` tint): same. Sinclair uses bodyweight at time of lift (meet BW for competition, closest bwLog entry for training). All Records below: Jerk, Squat, Pull, Deadlift, Row, Bench — session type tag shown.

Goals: strength standards table (C&J and Snatch only, not Bench), editable multiples, progress bars, checkmark + green text when achieved. Custom goal field per lift (placeholder = competition best).

### Comp — sub-views: Plan | History

Plan: name/date/location fields. Section label builds dynamically: "Liftoff May 2026 · 2 May 2026 · London". Competition countdown banner. Attempt planner (3 Snatch + 3 C&J, auto-suggests % of PB, editable weights and %). Projected total. Context section: Competition PB + date, Training best + date + session, Best competition total, Best theoretical total (highest of comp or training per lift, with source labels).

History: meet cards showing name, date, location, bodyweight, per-attempt ✅/❌, best Snatch, best C&J, total, Sinclair. + Log a Meet button.

### Settings

Units toggle (kg/lbs, stored in kg). Athlete bodyweight field with "Log today" quick button (logs with today's date, deduplicates). Weight class display (IWF + BWL) three-column grid: class below / your class / class above, with kg-to-limit. Bodyweight Log (scrollable, dated entries). Import Bodyweight CSV (handles Withings format: `"YYYY-MM-DD HH:MM:SS"` with quoted fields, and slash-format fallback). Google Sheets sync (URL, auto-sync toggle, Sync Now). Coefficients (editable, with explanation).

---

## Lift configuration

Lift name order: Base · Receiving · Grip · Technique · Position (base first, position last).

| Lift | Positions | Receiving | Grip | Technique |
|---|---|---|---|---|
| Snatch | Floor / Hang Below Knee / Hang Above Knee / Hang Mid-Thigh / Deficit / Blocks | Squat / Power / Muscle | — | Pause / Balance / Complex |
| Clean | Same | Squat / Power / Muscle | — | Pause / Complex |
| Jerk | Rack / Blocks | Split / Squat | — | Pause / Balance / Complex |
| Clean and Jerk | Rack / Blocks | Split / Squat / Power | — | Pause / Complex |
| Squat | — | — | — | Type: Back/Front/Overhead/Zercher + Pause/Tempo/Box/Pin/Banded |
| Pull | All positions | — | Snatch/Clean/Overhand/Underhand | High Pull / Pause / Complex |
| Deadlift | Floor / Deficit / Blocks | — | Overhand/Underhand/Mixed | Pause/Tempo/Sumo/Romanian/Stiff-Leg |
| Pendlay Row | — | — | Overhand / Underhand | — |
| Barbell Row | — | — | Overhand / Underhand | — |
| Bench Press | Flat / Incline / Decline | — | Overhand / Close Grip / Wide Grip | Pause/Tempo/Banded/Pin/Dumbbell |
| Other | — | — | — | — |

COMP LIFT badge: base is Snatch or Clean and Jerk AND position empty or Floor only AND technique empty AND receiving is Squat Full, Split, or empty.

---

## Session types and colours

| Session | Left border | Tag |
|---|---|---|
| Coached Class | Blue `#5ab4ff` | Class |
| 1:1 Session | Orange `#ff9a3c` | 1:1 |
| Solo | Green `#c8f55a` | Solo |
| Competition | Gold `#ffd700` | Comp |

Competition is NOT in the Log a Set modal. Use the Meets tab for competition data.

---

## Data model

**Log entry:** id, date, session, base, position[], receiving, grip[], technique[], weight (kg), sets, reps, quality (1-5), notes.

**Meet:** id, name, date, location, bw, snatch[{weight, made}×3], cj[{weight, made}×3], notes.

**Settings keys** (`barbell_settings_v1`): athleteBW, bwLog[], pbs[], meets[], comp{name, date, location, snatch[], cj[], pcts{}}, sheetsUrl, autoSync, unit, coefficients{}, customGoals{}, standardMultiples{}.

---

## Coefficients (multiplicative, user-editable defaults)

Position: Floor 1.0, Hang Below Knee 0.90, Hang Above Knee 0.95, Hang Mid-Thigh 0.92, Blocks 0.97, Deficit 1.03, Rack 1.0  
Receiving: Squat 1.0, Power 0.85, Muscle 0.70, Split 1.0  
Technique: Pause 0.95, Tempo 0.93, Balance 0.98, Complex 0.95, High Pull 1.0

---

## Sinclair

2025–2028 IWF men: A=0.722762521, b=175.508. Formula: Total × 10^(A × log₁₀(BW/b)²). Bodyweight used: meet BW for competition bests, closest bwLog entry for training bests.

---

## IWF weight classes — men, effective August 1 2026

60, 65, 70, 75, 85, 95, 110, +110kg. BWL (British Weightlifting) aligned to same classes from Aug 2026.

---

## Strength standards (× bodyweight) — Goals tab, Oly lifts only

C&J: Beginner 0.5 / Novice 0.75 / Intermediate 1.25 / Advanced 1.5 / Elite 2.0  
Snatch: Beginner 0.5 / Novice 0.75 / Intermediate 1.0 / Advanced 1.25 / Elite 1.75

---

## Plate colours (IWF, one side, no collar)

25kg red · 20kg blue · 15kg yellow · 10kg green · 5kg white · 2.5kg black · 2kg blue · 1.5kg yellow · 1kg green · 0.5kg white · 0.25kg silver. Bar = 20kg. Fractional plates to 0.25kg. Plastic collars not counted.

---

## Seeded data

**Meet:** Lift Off, 29 Nov 2025, London, BW 80.5kg. Snatch 50✅ 53❌ 53❌. C&J 70✅ 75❌ 75✅. Total 125kg.  
**Athlete:** BW 79.8kg. IWF/BWL class 85kg (Aug 2026 classes).  
**PBs:** Snatch 56kg, C&J 82kg, Clean 100kg, Jerk 65kg.

---

## Google Sheets sync

Four tabs: Log, Meets, Bodyweight, PBs. Created automatically on first sync. `syncFull` pushes all data in one call. `getAll` GET returns entries + meets + bw for two-way merge. Sheets URL in Settings. Auto-sync on save available. Each new Apps Script deployment generates a new URL — update in Settings on all devices.

---

## AI Insights

Analytics tab → Generate button. Calls `claude-sonnet-4-20250514` via Anthropic API. Snapshot includes: bodyweight, weight class, competition and training PBs, Snatch:C&J ratio, sessions per week, session types, most trained lifts, avg quality, days to competition. Returns 3–5 personalised coaching paragraphs.

---

## Bodyweight CSV import

Settings tab → Import Bodyweight CSV. Handles Withings export format (`"YYYY-MM-DD HH:MM:SS"` quoted, weight in kg in column 2). Also handles `MM/DD/YYYY` slash formats. Deduplicates by date. Updates weight class display and bodyweight chart after import.

---

## Header structure

Row 1: BARBELL LOG (left) · competition countdown badge + SYNC button (right).  
Row 2: live clock (centred, dimmer).  
Competition badge taps through to Comp tab.

---

## Competition countdown

Shows in three places when a competition name and date are set: header badge (days count), Log tab banner (name + days), Comp tab banner (name + date + location + days). All disappear if no competition set or date passed.

---

## Deployment

1. Upload `olympic-lifting-tracker.html` to GitHub repo (replace existing)
2. Upload `icon.png` to repo root (180×180px, weightlifter emoji on black)
3. For data model changes: replace Apps Script → new deployment → new URL in Settings on all devices
4. GitHub Pages URL: https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html

**Rule:** UI/feature changes = replace HTML only. New data fields or sheet tabs = full deploy.

---

## Files in repo

| File | Purpose |
|---|---|
| `olympic-lifting-tracker.html` | The app |
| `barbell-log-apps-script.js` | Google Sheets middleware |
| `icon.png` | Home screen icon (180×180) |
| `README.md` | This file — rebuild spec |
| `DEPLOY.md` | Step-by-step deployment instructions |
