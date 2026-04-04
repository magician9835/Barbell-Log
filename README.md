# Barbell Log

Olympic lifting tracker built for Brian Dearing. Single HTML file, iPhone Safari optimised, syncs to Google Sheets.

**Live app:** https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html

---

## Rebuild specification for Claude

Share this file with Claude and say: *"I have an Olympic lifting tracker at the GitHub URL above. Here is the rebuild spec. Please help me continue developing it."*

---

## Stack

Single self-contained HTML file. Vanilla HTML/CSS/JS. No build step, no dependencies beyond Google Fonts. localStorage for data (`barbell_log_v1`, `barbell_settings_v1`). Google Sheets sync via Apps Script POST/GET endpoint. Google Fonts: Syne + DM Mono. iPhone 16 Pro Safari optimised.

---

## Design system

Dark theme. Background `#111111`. Accent `#c8f55a` (yellow-green). Surfaces `#1a1a1a` / `#222222` / `#2a2a2a`. Borders `#333333`. Text `#f0f0f0` / `#aaaaaa` / `#777777`. Red `#ff5252`. Blue `#5ab4ff`. Orange `#ff9a3c`. Syne for UI text, DM Mono for numbers and monospace. Grain texture overlay. Card depth with box-shadow. Live clock in header. Modifier separator is ` · `. Safe area insets for Dynamic Island. Modals use `dvh`.

---

## Five tabs

**Log** — sub-views: Log | Analytics  
Filter bar: All, Snatch, C&J, Clean, Jerk, Squat, Pull, Row, Deadlift, Bench. Entries grouped by date, newest first. Session colour left borders: blue=Coached Class, orange=1:1, green=Solo, gold=Competition. COMP LIFT gold badge on pure Snatch/C&J entries (no modifiers, floor only). + Log a Set button.

Analytics sub-view: lift selector + period filter (All time / YTD / Last Year / 12m / 6m / 3m), progress chart (session max line + individual set dots), AI Insights (Generate button → Claude API), Volume & Frequency stats, Bodyweight Trend chart with CSV import button.

**Planner** — unlimited lift blocks, collapsible, dynamic modifier chips per lift type, target % input (onblur), coach notes field per lift, reference weight lookup, warmup ladder with tappable rows → barbell plate diagram (IWF colours, one side, no collar, fractional plates to 0.25kg), rest timer with presets. Finish Session → review modal → Session Summary modal (PB badges, volume, quality avg).

**PBs** — sub-views: Records | Goals  
Records: side-by-side Competition (gold) vs Training (green) columns — Snatch, C&J, Total, Sinclair. Sinclair uses bodyweight at time of lift. All Records: Jerk, Squat, Pull, Deadlift, Row, Bench — session type tag shown.  
Goals: strength standards table (C&J and Snatch), editable multiples, progress bars, custom goal field.

**Comp** — sub-views: Plan | History  
Plan: competition name/date/location fields, dynamic section title from data, attempt planner (auto-suggests %, editable), projected total, context stats (training best with date, best comp total, best theoretical total using highest of comp or training). Competition countdown banner.  
History: meet log cards (name, date, location, BW, per-attempt ✅/❌, best per lift, total, Sinclair).

**Settings** — Units toggle (kg/lbs). Athlete bodyweight field with "Log today" quick button. Weight class display (IWF + BWL) in three-column grid: class below / your class / class above, with kg-to-limit. Bodyweight Log. Bodyweight CSV import (supports Withings). Google Sheets sync (URL, auto-sync toggle, Sync Now). Coefficients (editable).

---

## Lift configuration

Lift names displayed as: Base · Receiving · Grip · Technique · Position (base first, position last).

| Lift | Positions | Receiving | Grip | Technique |
|---|---|---|---|---|
| Snatch | Floor / Hang Below Knee / Hang Above Knee / Hang Mid-Thigh / Deficit / Blocks | Squat / Power / Muscle | — | Pause / Balance / Complex |
| Clean | Same as Snatch | Squat / Power / Muscle | — | Pause / Complex |
| Jerk | Rack / Blocks | Split / Squat | — | Pause / Balance / Complex |
| Clean and Jerk | Rack / Blocks | Split / Squat / Power | — | Pause / Complex |
| Squat | — | — | — | Type (Back/Front/Overhead/Zercher) + Pause/Tempo/Box/Pin/Banded |
| Pull | All positions | — | Snatch/Clean/Overhand/Underhand | High Pull / Pause / Complex |
| Deadlift | Floor / Deficit / Blocks | — | Overhand/Underhand/Mixed | Pause/Tempo/Sumo/Romanian/Stiff-Leg |
| Pendlay Row | — | — | Overhand / Underhand | — |
| Barbell Row | — | — | Overhand / Underhand | — |
| Bench Press | Flat / Incline / Decline | — | Overhand / Close Grip / Wide Grip | Pause/Tempo/Banded/Pin/Dumbbell |
| Other | — | — | — | — |

COMP LIFT badge logic: base is Snatch or Clean and Jerk AND position empty or Floor only AND technique empty AND receiving is Squat Full, Split, or empty.

---

## Session types and colours

| Session | Border colour | Tag |
|---|---|---|
| Coached Class | Blue `#5ab4ff` | Class |
| 1:1 Session | Orange `#ff9a3c` | 1:1 |
| Solo | Green `#c8f55a` | Solo |
| Competition | Gold `#ffd700` | Comp |

Note: Competition is NOT in the Log a Set modal. Competition data goes in the Meets tab.

---

## Data model

**Log entry:** id, date, session, base, position[], receiving, grip[], technique[], weight (kg), sets, reps, quality (1-5), notes.

**Meet:** id, name, date, location, bw, snatch[{weight, made}×3], cj[{weight, made}×3], notes.

**Settings keys (localStorage `barbell_settings_v1`):** athleteBW, bwLog[], pbs[], meets[], comp{name, date, location, snatch[], cj[], pcts{}}, sheetsUrl, autoSync, unit, coefficients{}, customGoals{}, standardMultiples{}.

---

## Coefficients (multiplicative, user-editable)

Position: Floor 1.0, Hang Below Knee 0.90, Hang Above Knee 0.95, Hang Mid-Thigh 0.92, Blocks 0.97, Deficit 1.03, Rack 1.0  
Receiving: Squat 1.0, Power 0.85, Muscle 0.70, Split 1.0  
Technique: Pause 0.95, Tempo 0.93, Balance 0.98, Complex 0.95, High Pull 1.0

---

## Sinclair

2025–2028 IWF men: A=0.722762521, b=175.508. Formula: Total × 10^(A × log₁₀(BW/b)²). Uses bodyweight at date of lift — meet BW for competition bests, closest bwLog entry for training bests.

---

## IWF weight classes (men, effective August 1 2026)

60, 65, 70, 75, 85, 95, 110, +110kg  
(*same classes adopted by BWL — British Weightlifting*)

---

## Strength standards (× bodyweight)

C&J: Beginner 0.5, Novice 0.75, Intermediate 1.25, Advanced 1.5, Elite 2.0  
Snatch: Beginner 0.5, Novice 0.75, Intermediate 1.0, Advanced 1.25, Elite 1.75

---

## Plate colours (IWF, one side shown, no collar)

25kg red, 20kg blue, 15kg yellow, 10kg green, 5kg white, 2.5kg black, 2kg blue (small), 1.5kg yellow (small), 1kg green (small), 0.5kg white (small), 0.25kg silver. Bar = 20kg. Fractional plates available (0.25kg minimum). Plastic collars not counted.

---

## Seeded data

**Competition:** Lift Off, 29 Nov 2025, London, BW 80.5kg. Snatch 50✅ 53❌ 53❌. C&J 70✅ 75❌ 75✅. Total 125kg, Sinclair 159.184.  
**Athlete BW:** 79.8kg. IWF class 85kg (Aug 2026). BWL class 85kg.  
**PBs:** Snatch 56kg, C&J 82kg, Clean 100kg, Jerk 65kg.

---

## Google Sheets sync

Apps Script handles 4 tabs: Log, Meets, Bodyweight, PBs. `syncFull` action pushes all data in one call. `getAll` GET endpoint returns entries + meets + bw for two-way merge on sync. Sheets URL stored in settings. Auto-sync on save available. Each new deployment generates a new URL — update in Settings on all devices.

---

## AI Insights

Generate button in Analytics tab. Sends a full training data snapshot to `claude-sonnet-4-20250514` via the Anthropic API. Snapshot includes: bodyweight, weight class, competition and training PBs, Snatch:C&J ratio, sessions per week, session breakdown, most trained lifts, average quality rating, days to competition. Returns 3–5 personalised coaching insights as prose paragraphs.

---

## Deployment

1. Upload `olympic-lifting-tracker.html` to GitHub repo (replace existing file)
2. For data model changes: replace Apps Script → new deployment → new URL in Settings on all devices
3. GitHub Pages URL: https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html
4. Competition photo: upload as `photo.jpg` to repo root for PBs background

**Rule of thumb:** UI/feature changes = replace HTML only. New data fields or new sheet tabs = full deploy including new Apps Script deployment.
