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
