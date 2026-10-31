# Working on Barbell Log

The installed phone app uses the existing GitHub Pages address:
https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html

Keep the repository, filename and origin stable so the phone shortcut and its
locally stored settings continue to work. Settings are stored separately in each
browser/installed app; a localhost preview will not inherit the phone's settings.

## Everyday updates

1. Describe the desired change in this workspace.
2. Work on a branch and run `npm run check` (Node 22 or newer; no npm install needed).
3. Run `npm start` and visit http://127.0.0.1:8000/olympic-lifting-tracker.html
   to inspect the app locally. Test layout and interactions at phone width.
4. Open a pull request so changes and automated checks are reviewable.
5. Merge the reviewed change to `main`. Confirm the existing GitHub Pages
   publishing settings use that branch; GitHub Pages then publishes the update.
6. Verify the existing live address, then close and reopen the phone app.
   If it still shows an older version, refresh/reopen it before changing any data.

UI-only updates do not require uploading files manually or changing Apps Script.
Revert a faulty website commit through a new revert commit to restore the previous
version. A code rollback does not undo spreadsheet writes.

## Backend updates

`barbell-log-apps-script.js` records the backend supplied by the owner. This first
version preserves its behaviour. Storing it on GitHub does not update Apps Script.
For backend changes, follow DEPLOY.md to update the existing deployment and keep
its URL. Automated Apps Script publishing is not configured yet.

Before testing writes, use a **copy** of the spreadsheet and a separate test
Apps Script deployment. Enter that test endpoint only in the preview browser.
The automated checks use fake sheets and never contact Google.

## Reliability work identified during review

- The browser uses `no-cors` POST requests: it cannot read the backend response.
  It currently announces success even when a write fails. A robust save flow
  needs durable pending changes, confirmation by reading back, and retry handling.
- `appendLogEntry` deduplicates by date + base + weight as well as ID. This can
  discard a legitimate second set at the same weight or a different variation.
- Older rows without IDs receive a different temporary ID on each read, which
  can prevent edits/deletes from finding the original row.
- `syncAll`, `syncMeets`, `syncBW`, `syncPBs`, and `syncFull` clear data before
  rewriting it. The current phone sync button only pulls, but those backend
  actions still exist. Replace or explicitly constrain bulk replacement before use.
- Writes do not use Apps Script locks; concurrent saves can race.
- Unknown POST actions return `success: true` with an error field.
- The bodyweight "Log today" action currently saves locally without calling
  the backend. Meet saves POST without confirmation; meet edits/deletes and
  local-vs-sheet merges also need review.

`npm run check` currently checks JavaScript syntax and exercises log
append/retry/read/edit/delete, legacy log reading, and meet history round trips
against fake sheets. It does not verify Safari behaviour, real Apps Script
permissions, browser CORS, deployment or network/offline recovery.

## Delivering fresh versions to the phone

For each website release, change `app-version.json` and both version values in
its `app-updates.js` script tag in the HTML to the same new release string.
The app checks for a new version on startup and when returning to the foreground
(with a 15-second cooldown). A timestamp in the small version-file URL avoids a
cached response. An **Update app** button reloads the existing page with a new
version query parameter. Saved settings stay on the same origin. No automatic
reload interrupts a workout. Initial installation of this updater still requires
loading the updated HTML once. Updates become available after Pages deployment
finishes; this does not eliminate build/deployment time.

## Release 2026-10-30.8

Read OVERHAUL.md for the current class training workflow and data guarantees.
`training-core.js` owns program expansion and reference calculations;
`training.js` owns the runner and local plans; `pending-lifts.js` owns confirmed
writes. `training.css` overrides the original app presentation. The public HTML
path and existing Apps Script actions remain compatible. Change the version in
app-version.json, all versioned asset URLs, the updater data-version attribute
and the Settings version label together. Browser integration is optional locally
when Playwright and Chromium are installed; required Node checks remain
independent of external packages and Google.

## iPhone viewport layout (2026-10-30.10)

`phone-layout.css` owns installed-app chrome spacing. `phone-layout.js` gives the
shell an explicit measured height instead of asking WebKit to resolve both
fixed edges inside its installed-app insets. Header and navigation consume safe
areas exactly once; neither reduces the shell height. The keyboard can reduce
the shell to the visible viewport while a field is focused. No screen-model
height or user-agent-specific pixel offset is hardcoded.

The status bar requests full-bleed black-translucent mode; opaque header colour
and safe-area padding protect the app title. Native system blur requires a real
iPhone check. Settings → Phone layout details exposes local geometry and a copy
button, with no remote telemetry. `scripts/iphone-layout-check.py` exercises
402×874 with simulated 62px/34px safe areas and keyboard resize recovery.

## Page zoom preference

Release 2026-10-30.11 follows the owner's explicit preference for fixed page
scale in the installed app. Viewport limits, Safari gesture cancellation and
pan-only touch action prevent page zoom; form controls use at least 16px text
to avoid iPhone focus zoom. Normal vertical/horizontal scrolling remains
available. Revisit this trade-off if an accessibility zoom option is requested.

## Training record variants (2026-10-30.12)

The main Training record card selects the highest logged weight for the base
lift across its variations, excluding Competition sessions. It retains and
renders the exact source entry's movement modifiers, date and session. Tied
weights select the most recent date. This display rule is separate from the
workout percentage reference, which still defaults to the full movement.

## Record source context (2026-10-30.13)

All-record summaries retain the originating entry's session, ID and modifiers.
An equally weighted seeded PB no longer overrides the known log source.
Historical records with no recoverable session display Session not recorded;
they are never guessed as Class, Solo or 1:1.

## Measured installed iPhone correction (2026-10-30.14)

The owner's installed iPhone 16 Pro reported screen 402×874, inner/visible
viewport 402×812, top safe area 62px and bottom safe area 34px. The old explicit
innerHeight sizing therefore ended the shell at 812px. Correct only the
standalone portrait case where screen minus viewport equals the top safe area,
the reported width matches, visual/layout viewports agree and scale is one.
Add the reported top inset once to the shell height; do not change the existing
header/footer safe-area padding. Full 874px viewports do not get another inset,
and focused keyboard viewports use their visible height.

`tests/phone-viewport.test.mjs` covers the exact supplied report and exclusions.
`scripts/reported-iphone-check.py` compares the previous published layout at
commit d5d514e with current code under those reported metrics. This is a
reproduction, not a physical iPhone test. Real-device confirmation remains
necessary. Phone layout details now includes statusBarCompensated and scale.

## Native-view clipping and deprecated status-bar mode (2026-10-30.15)

The owner's physical screenshot after .14 proves that the 62px extension is
clipped: the navigation is cut off at the reported 812px native viewport. This
supersedes the .14 simulated inference. Restore the 812px visible bound. Never
add screen-minus-viewport height to the shell.

Remove apple-mobile-web-app-status-bar-style=black-translucent in accordance
with WebKit guidance: https://bugs.webkit.org/show_bug.cgi?id=317153#c2 . The
native system can apply blur above Home Screen content and installation-time
status bar metadata can be retained. A standard standalone web manifest now
uses the same canonical URL, dark background and icon. A fresh Home Screen
installation must be compared on the owner's device while retaining the old
installation and backing up local data. Do not claim that a page reload updates
installation-time native chrome, or that browser simulation proves the frame.

Phone layout details now includes available/outer/document dimensions and actual
CSS vh/svh/lvh/dvh probe heights. No data is sent automatically. Existing local
workouts/settings are untouched; a new installed app can have separate local
storage and may need the existing JSON backup restored.


## Supabase and accessory release (2026-10-31.1)

DATABASE.md supersedes legacy backend guidance above. The live project is now
provisioned with two migrations, owner RLS, transactional/idempotent write RPCs,
version conflict detection and append-only plan snapshots. Active phone connections
remain on Sheets until the owner signs into an app account and completes cutover.
Never silently route pending writes between accounts or backends.

The initial owner still needs to supply the email for staged historical data and
set hosted Auth confirmation/reset URLs. The MCP connection can manage database
schemas but does not expose Auth URL configuration. Matching local config.toml
is not evidence that the hosted Auth settings changed. No unsolicited auth email
was sent. Do not report the owner's phone as migrated until its cutover succeeds.

New modules: database.js (adapter, Auth, cutover), database-ui.js (account/conflict
review), accessory-model.js/accessory.js (provided overhead session and editable
dumbbell/superset records). The SDK is vendored and pinned, with its lockfile and
license. npm audit reported no vulnerabilities at release. Browser CI uses fake
Auth/RPC; live SQL contract/import tests were rolled back. The unchanged Sheet
is the historical fallback. Keep independent exports; Free Supabase does not
include managed daily database backups.


## Sync status (2026-10-31.2)

sync-status.js owns the conditional header indicator and manual Settings refresh.
Header syncBtn/pending-lifts-button were removed; do not recreate them in feature
modules. renderPendingLifts delegates to SyncStatus. fetchEntries emits
datasyncchange on completion, and cloud backup errors are exposed to the status
view. Background refresh does not replace active workout form fields.


## Confirmed cutover and plate accessories (2026-10-31.3)

The owner completed phone sign-in. Live verification on 31 October 2026 confirmed
60 historical lifts, 2 meets, 156 bodyweights and backups from two installations.
The protected import archive is now linked to that verified account. Earlier
notes about waiting for an app account describe the initial setup and are no
longer the current owner status. Read live records for current counts.

AccessoryModel.loadBasis/loadLabel/loadShort retain equipment and per-plate
metadata in actuals, summaries and editing. Keep plate count unknown when
it was not reported; never reinterpret a 5 kg plate as a 5 kg dumbbell or infer
total load from an unknown number of plates.

## Phone editor spacing (2026-10-31.4)

Date and session now stack at phone widths in both the session builder and log editor. Native date fields use an explicit 48px height and constrained appearance, matching the session selector. Movement actions wrap rather than compress their labels. The training browser workflow checks control bounds, vertical separation, and equal heights at 320, 375, 402 and 430px, with an edit-complex screenshot. Physical iPhone Safari remains the final native-control check.

## Structured record programmes (2026-10-31.5)

Train previews and saved-record programme details share ProgrammeView stage rows. Log cards show recorded sets and component rep counts without printing the entire notes field. Expand Programme for prescribed stages and explicitly labelled recorded/target/unknown loads; expand Notes for the original text. New training entries carry their planned stages without claiming target loads were performed. Manual edits preserve programme and source metadata. Browser checks cover details clicks/keyboard, unknown loads and metadata survival through editing. Thursday's photo metadata was attached to current records without replacing the user's edits.

## Restore logged-set rating (2026-10-31.6)

The shared manual log/edit dialog now exposes the existing optional 1–5 quality field. Existing ratings are selected when reopening; changing notes preserves the rating; choosing Not rated clears it to null. Training browser checks exercise set, change, preserve, clear and a blank new record.

## Analytics smooth trend and calendar labels (2026-10-31.7)

Recorded daily heaviest weights remain the red line and tappable points. A contrasting 30-day exponential average appears after three training days, using elapsed calendar days for the smoothing factor. Monotone cubic interpolation smooths its shape without introducing extrema between averaged values. The chart adds weight grid labels and spaced month/year ticks, including year transitions. Existing lift/variation/session/period filters apply before charting. Node checks cover constant loads, spikes, irregular gaps, sparse records and date labels; mobile browser checks cover the overlay, actual-point editing and non-overlapping ticks at 320–430px.

## Data-backed coaching notes (2026-10-31.8)

Analytics automatically renders up to three coaching cards with more observations expandable. Every card includes an action, scoped evidence, an explicit rule, and a linked source. Lift-specific comparisons follow chart filters and match component modifiers/reps; training rhythm and upcoming meets use the whole log. Comparisons use consecutive 28-day windows, at least three distinct days per period, day-balanced rating means, and median daily top weights. Thresholds (0.75 rating points / 2.5kg) are app heuristics and are labelled as such. No fatigue diagnosis, max-readiness claim, ideal ratio prescription or unlogged-training assumption remains in the old generator. Complex components count towards exercise coverage. Future/competition entries do not create training comparisons.

Sources: athlete self-report systematic review (PubMed 26423706); competitive-weightlifter taper survey (35976755); Greg Everett, Finding the Limiter (Catalyst Athletics). The sources support the general coaching principles, not the exact app thresholds or a validated 1–5 fatigue test. No external model calls or credentials are needed. Tests cover sparse data, grouping, unequal rating density, future records, competition dates, filters, evidence expansion and opener navigation.

## Train builder phone layout (2026-10-31.9)

Session date/session/loading now occupy full-width rows regardless of viewport size. Short loading labels have a separate explanatory hint. The heading has a compact Switch action and a session-type title; the date remains in its labelled field. Empty plans show one Add lift action rather than Start/Save buttons which cannot work before a block exists. Guidance moves below the form. Long reference/duration selectors stack at phone widths; numeric pairs remain bounded.

A dedicated native-control bounds workflow covers blank plans and two-movement complexes at 320–430px. It runs Chromium locally and WebKit in CI, including date/select height equality and label containment. Physical installed iPhone verification still matters for browser chrome and native rendering.

## Whole-kilo competition planning (2026-10-31.10)

The competition planner uses a dedicated floor-to-whole-kilo helper instead of gym quarter-kilo rounding. Initial percentage suggestions, percentage edits, saved overrides, projected totals and warm-up opener imports follow the same rule. Manual fractional input is stored floored and its visible value normalises when committed. Weight fields step by 1kg; percentages can still be fractional. Existing fractional planned attempts normalise when the planner opens; actual meet history is untouched. The reference used during percentage edits and opener import now matches the highest best shown by the planner. Competition warm-up suggestions are whole kilos too; gym loading remains unchanged. Node and browser checks cover defaults, higher meet PBs, manual edits, percentages, totals, persistence and opener transfer.

## Supabase-first Settings (2026-10-31.11)

Account & sync and Backups & export now lead Settings. Remove the obsolete Sheets URL field, Apps Script deployment/copy instructions, project setup panel and migration explanations from the user interface. Selected accounts have no activation prompt. Preserve migration/import logic, saved connection values and recovery data internally for older installations. CSV export now sits alongside full file backup, restore and plan recovery. Optional estimate controls are collapsed, and the footer no longer claims v1.3. A scoped hidden rule prevents wide-button styling from displaying the retired activation prompt for selected accounts. New browser assertions cover the selected-account state, retired controls, settings order and actual CSV download; existing migration, offline and file-restore flows remain covered.

## Contain horizontal movement in dialogs (2026-10-31.12)

Opener rehearsal is a top-layer dialog outside the Train pane, so the pane's vertical gesture rule did not apply. Apply pan-y and horizontal overflow/overscroll containment to dialogs, legacy modals and vertical app screens. Keep the log's lift filter strip intentionally horizontal. Limit dialog width to the viewport and wrap long content. Builder browser checks now cover opener/manual-log dialog bounds, horizontal wheel/programmatic movement, working vertical wheel scroll, editable fields and a scrollable filter strip. CI runs Chromium wheel-movement checks and WebKit native bounds/scrollability checks. Mobile WebKit has no Playwright mouse-wheel API, so its scrollability check uses scrollBy plus computed gesture/overflow rules.

## Bare-bar opener warm-ups (2026-10-31.13)

Competition rehearsal now starts at 20kg with no plates/collars, rather than treating collars alone as a 25kg warm-up. Warm-up load calculation, the plate diagram, actual-weight input snapping and saved records use the same phase-aware calculation. Collars appear with loaded warm-ups. With the configured 20kg bar and 5kg collars, loaded competition setups start at 26kg (a 0.5kg plate per side), and rehearsal attempts use that minimum. Existing recorded history is untouched. Tests check both lift ladders, loaded mass accounting, saving the bare-bar set at 20kg, and changing actual warm-up weights without stale collar images.

## Working-set ratings only (2026-10-31.14)

Hide technique rating controls during warm-ups and when editing newly recorded warm-ups. Store an explicit work/warmup phase and force warm-up quality to null, including stale draft values. Recognise older generated warm-ups by their saved workout ID and exact generated phase line, without inferring phase from free-form mentions of warming up. Weight, reps and notes still log normally. Working sets/attempts retain the optional rating and editor control. Coaching comparisons and rating reminders exclude marked warm-ups. Existing historical data is preserved. Tests cover saved warm-up phase/quality, notes retention, working ratings, editor visibility and the transition from build-up to attempts.
