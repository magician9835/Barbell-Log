# Barbell Log

Olympic lifting tracker. Single HTML file, iPhone Safari optimised, Google Sheets sync.

**Live app:** https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html  
**Repo:** https://github.com/magician9835/Barbell-Log

---

## Rebuilding with Claude

Share this file with a new Claude session:

> "I have an Olympic lifting tracker at the GitHub URL above. Here is the full rebuild spec. Please help me continue developing it."

---

## Stack

Single self-contained HTML file. Vanilla HTML/CSS/JS. No build step. localStorage for data (`barbell_log_v1`, `barbell_settings_v1`). Google Sheets sync via Apps Script POST/GET endpoint. Google Fonts: Syne + DM Mono. iPhone 16 Pro Safari optimised. Safe area insets for Dynamic Island.

---

## Design system

Dark theme. `#111111` background. Accent `#c8f55a` (yellow-green). Surfaces `#1a1a1a` / `#222222` / `#2a2a2a`. Borders `#333333`. Red `#ff5252`. Blue `#5ab4ff`. Orange `#ff9a3c`. Gold `#ffd700`. Syne for UI, DM Mono for numbers. Grain texture overlay. Modifier separator ` · `. Modals use `dvh`.

---

## Five tabs

**Log** — sub-views: Log | Analytics

Filter bar: All, Snatch, C&J, Clean, Jerk, Squat, Pull, Row, Deadlift, Bench. Entries grouped by date, newest first. Session colour left borders: blue=Coached Class, orange=1:1, green=Solo, gold=Competition. COMP LIFT gold badge on pure Snatch/C&J (no modifiers). 🏆 PB badge on entries that are best ever for base + position[0] + receiving. Tap any entry to open full Edit modal.

Analytics: lift selector, period filter (All time / YTD / Last Year / 12m / 6m / 3m), progress chart (session max line + individual set dots), AI Insights (Generate → Claude API), Volume & Frequency stats, Bodyweight Trend chart.

**Planner** — unlimited lift blocks, collapsible, modifier chips, target % (onblur), coach notes per lift, reference weight lookup, warmup ladder with tappable rows → barbell plate diagram (IWF colours, one side, no collar, fractional plates to 0.25kg), rest timer with sound + vibration. Finish Session → review modal → Session Summary modal.

**PBs** — sub-views: Records | Goals

Records: side-by-side Competition (gold) vs Training (green) — Snatch, C&J, Total, Sinclair. Sinclair uses bodyweight at time of lift. All Records: Jerk, Squat, Pull, Deadlift, Row, Bench — session tag shown.

Goals: strength standards (Snatch first, then C&J), editable multiples, colour-coded progress bars (red→amber→yellow-green→green), custom goal per lift.

**Comp** — sub-views: Plan | History

Plan: name/date/location fields, dynamic section title from data, attempt planner, projected total, context stats. Competition countdown banner.

History: meet log cards with per-attempt ✅/❌, total, Sinclair, location.

**Settings** — units (kg/lbs), athlete bodyweight + Log today button, weight class (IWF + BWL) three-column grid with kg-to-limit, bodyweight log (collapsible, Show all N), CSV import, Google Sheets sync, coefficients.

---

## Lift configuration

Name order: Base · Receiving · Grip · Technique · Position (base first, position last).

| Lift | Positions | Receiving | Grip | Technique |
|---|---|---|---|---|
| Snatch | Floor/Hang Below Knee/Hang Above Knee/Hang Mid-Thigh/Deficit/Blocks | Squat/Power/Muscle | — | Pause/Balance/Complex |
| Clean | Same | Squat/Power/Muscle | — | Pause/Complex |
| Jerk | Rack/Blocks | Split/Squat | — | Pause/Balance/Complex |
| Clean and Jerk | Rack/Blocks | Split/Squat/Power | — | Pause/Complex |
| Squat | — | — | — | Type (Back/Front/Overhead/Zercher) + Pause/Tempo/Box/Pin/Banded |
| Pull | All positions | — | Snatch/Clean/Overhand/Underhand | High Pull/Pause/Complex |
| Deadlift | Floor/Deficit/Blocks | — | Overhand/Underhand/Mixed | Pause/Tempo/Sumo/Romanian/Stiff-Leg |
| Pendlay Row | — | — | Overhand/Underhand | — |
| Barbell Row | — | — | Overhand/Underhand | — |
| Bench Press | Flat/Incline/Decline | — | Overhand/Close Grip/Wide Grip | Pause/Tempo/Banded/Pin/Dumbbell |
| Other | — | — | — | — |

COMP LIFT badge: Snatch or C&J, position empty or Floor only, technique empty, receiving Squat Full/Split/empty.

PB badge (🏆): best weight ever for base + position[0] + receiving combination.

---

## Session types and colours

| Session | Border | Tag |
|---|---|---|
| Coached Class | Blue `#5ab4ff` | Class |
| 1:1 Session | Orange `#ff9a3c` | 1:1 |
| Solo | Green `#c8f55a` | Solo |
| Competition | Gold `#ffd700` | Comp |

Competition NOT in Log a Set modal — use Meets tab.

---

## Data model

**Log entry:** id, date, session, base, position[], receiving, grip[], technique[], weight (kg), sets, reps, quality (1–5), notes.

**Meet:** id, name, date, location, bw, snatch[{weight,made}×3], cj[{weight,made}×3], notes.

**Settings (localStorage `barbell_settings_v1`):** athleteBW, bwLog[], pbs[], meets[], comp{name,date,location,snatch[],cj[],pcts{}}, sheetsUrl, autoSync, unit, coefficients{}, customGoals{}, standardMultiples{}.

---

## Sync model

Sheet is source of truth. Never overwritten.

- **⇅ SYNC** — pulls from sheet (sheet wins), appends local-only entries, never deletes sheet rows
- **Log a Set** — appends new row to sheet on save
- **Edit entry** — updates specific row by ID (`updateEntry` action)
- **Delete entry** — deletes specific row by ID (`deleteEntry` action)

Apps Script actions: `log`, `syncFull`, `updateEntry`, `deleteEntry`, `getAll` (GET).

---

## Coefficients (user-editable)

Position: Floor 1.0, Hang Below Knee 0.90, Hang Above Knee 0.95, Hang Mid-Thigh 0.92, Blocks 0.97, Deficit 1.03, Rack 1.0  
Receiving: Squat 1.0, Power 0.85, Muscle 0.70, Split 1.0  
Technique: Pause 0.95, Tempo 0.93, Balance 0.98, Complex 0.95, High Pull 1.0

---

## Sinclair

2025–2028 IWF men: A=0.722762521, b=175.508. Formula: Total × 10^(A × log₁₀(BW/b)²). Uses bodyweight at date of lift — meet BW for competition, closest bwLog entry for training.

---

## IWF weight classes (effective August 1 2026)

Men: 60, 65, 70, 75, 85, 95, 110, +110kg  
Women: 49, 53, 57, 61, 69, 77, 86, +86kg  
BWL (British Weightlifting): aligned with IWF from Aug 2026.

---

## Strength standards (× bodyweight)

C&J: Beginner 0.5, Novice 0.75, Intermediate 1.25, Advanced 1.5, Elite 2.0  
Snatch: Beginner 0.5, Novice 0.75, Intermediate 1.0, Advanced 1.25, Elite 1.75

---

## Plate colours (IWF, one side, no collar)

25kg red, 20kg blue, 15kg yellow, 10kg green, 5kg white, 2.5kg black, 2kg blue (small), 1.5kg yellow (small), 1kg green (small), 0.5kg white (small), 0.25kg silver. Bar 20kg. Plastic collars not counted.

---

## Timer

Rest timer with presets. On completion: three-tone rising beep (880→1100→1320Hz, Web Audio API) + vibration. Audio context unlocked on first user tap (iOS Safari requirement).

---

## AI Insights

Generate button in Analytics tab. Sends snapshot to `claude-sonnet-4-20250514`: bodyweight, weight class, comp/training PBs, Snatch:C&J ratio, sessions/week, session breakdown, most trained lifts, avg quality, days to competition. Returns 3–5 coaching insights as prose.

---

## Seeded data

Meet: Lift Off, 29 Nov 2025, London, BW 80.5kg. Snatch 50✅53❌53❌. C&J 70✅75❌75✅. Total 125kg.  
PBs: Snatch 56kg (23 Dec 2025), C&J 82kg (23 Dec 2025), Clean 100kg (18 Dec 2025), Jerk 65kg (14 Jan 2025).  
Athlete: 79.8kg. IWF 85kg. BWL 85kg.

---

## CSV import (bodyweight)

Settings → Import Bodyweight CSV. Parses Withings format (`"YYYY-MM-DD HH:MM:SS"` quoted timestamps, weight in column 2, kg). Also handles slash-format dates. Skips header row. Deduplicates by date.

---

## Google Sheets structure

Apps Script deployed as Web app (Execute as Me, Anyone). Four tabs auto-created on first sync: Log, Meets, Bodyweight, PBs. Log tab columns: Date, Session, Base Lift, Position, Receiving, Grip, Technique, Weight (kg), Sets, Reps, Quality, Notes, ID.
