# Training overhaul — release 2026-10-30.8

## Main workflow

Open **Train → Start a class** for the owner's whiteboard program. It expands to
17 working sets across snatch pull + hang snatch, clean and front squat. Enter or
check the reference max for each block, adjust prescriptions and start.

- Percentages use the full movement by default, including hang variants.
- Session reference changes affect future prescribed weights, not PB history or
  completed weights. Saved templates retain their explicitly chosen references.
- Each Complete action first persists a stable-ID pending write locally, then
  records the set in the current workout and starts the rest deadline.
- Complexes preserve their component names and rep counts in Notes and use the
  Complex technique marker, compatible with the currently deployed backend.
  Their Reps column is the total number of bar movements in the complex.
- Only completed sets are sent. Skipped/missed sets are explicitly not logged.
- Accessories are an optional completion checklist, not lift rows.
- Build a workout supports custom prescriptions; save as template or repeat a
  finished workout. Session types remain Class, 1:1, Solo, Competition.
- Log a 1:1 lesson opens the existing retrospectively dated logging form with
  the 1:1 session selected. The classic planner/warm-ups remain accessible.

## Data and compatibility

The original Log/Meets/Bodyweight structure is preserved. A connected-source audit
found 60 lift rows, no missing IDs and no repeated IDs. A native spreadsheet copy
was created and verified before this release. No historical rows were rewritten.

The app uses existing Apps Script actions. Lift upserts avoid the old log action's
same-date/lift/weight deduplication. Reads verify written lift fields, absent IDs
for deletions, meet records and bodyweight additions. Unknown or failed writes
remain pending. Pending destinations stay bound to the endpoint they were queued
against. Changing endpoints does not silently send another sheet's records there.

An outbox, current plan, recent workout summaries, templates and last fetched
lift history are stored in this browser's localStorage. JSON backup/restore in
Settings includes these records; restore retains current pending writes. A
backup can contain the private connection URL and should be kept private.

In-progress plans and templates do not sync between devices. Completed sets and
compatible meet/bodyweight additions sync to Sheets. This release does not add
a service worker: opening a completely closed app without network is not
promised, though local pending data survives reloads when the app can load.

## Other changes

- Red primary actions, black surfaces, white main text and readable secondary
  text; removed grain and low-opacity background photo.
- Larger controls and zoom support, visible focus states and keyboard-accessible
  log entries. Opaque status bar requested to avoid content beneath system blur;
  real iPhone rendering still needs owner verification.
- Fixed deleted ID being cleared before use and PB-recalculation function scope.
- Corrected pounds-to-kg editing, local calendar defaults, same-meet competition
  totals and meet-specific Sinclair. Training record cards exclude hang/power/
  complex variants; log PB badges distinguish full modifier sets.
- Escaped log note text, safely bound entry IDs and correctly quoted CSV exports.
- Bodyweight/meet additions use the confirmed outbox rather than opaque success.

## Still to address

- Actual Apps Script authentication, locking, schema migration and stable IDs for
  bodyweight need a backend deployment path. No Apps Script deployment is part of
  this release. The unreliable legacy meet-delete control is disabled until a backend
  delete action is available; meet records are preserved.
- Existing seeded PB history/provenance needs a separate migration; it was not
  silently deleted or reinterpreted during this release.
- The class template is editable text input, not automatic image recognition.
- No native iPhone Live Activity or dependable background/lock-screen alarm.
  Rest deadlines remain accurate on returning to the app; screen wake lock is
  optional and device dependent.
- The previous app's hardcoded bar/plate inventory remains in classic tools.

## Validation

`npm run check` runs syntax and domain/outbox regression tests without contacting
Google. `python3 scripts/training-browser-check.py` uses Playwright/Chromium and a
fake endpoint to exercise the whiteboard program, per-day max override, reopening,
confirmed sync, actual edit/delete forms, private-lesson route, all main tabs and
320/393/430px screen widths. No test writes to the live spreadsheet.
