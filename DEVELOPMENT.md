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

- Lift changes now use a durable phone outbox and readback confirmation. Meet and
  bodyweight flows still need the same treatment; they are outside this release.
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

## Lift saves and pending changes

New lifts, edits, deletions and completed planner sessions are saved to a local
outbox before sending. A new lift uses the existing backend's ID-based
`updateEntry` upsert to preserve distinct same-weight sets. A fresh `getAll` read
must match the intended fields (or confirm a deletion) before removing the pending
record. An opaque POST response alone is never treated as success.

The header shows pending changes and offers a manual retry via sync. Pending
lifts stay visible after reopening, even offline. Failed refreshes preserve the
session cache. Existing endpoint-bound pending changes never move automatically
to a different endpoint. Locally queued lifts created without an endpoint attach
to the endpoint selected when syncing. Changing endpoints with pending changes
requires restoring the original endpoint to complete those writes.

This uses the backend already deployed; no Apps Script publishing is required.
The outbox is local to this browser/device, not an additional cloud backup.
Clearing browser website data removes it. Concurrency across multiple devices
still requires backend locking. Meet saves and bodyweight syncing are follow-up
work. Validate real Apps Script connectivity on the phone after publishing;
automated tests do not write to the live spreadsheet.
