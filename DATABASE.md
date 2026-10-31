# Supabase + accessory sessions — 2026-10-31.1

The installed app keeps its existing GitHub Pages origin and filename. Sheets
remains active until the owner signs into an app account and activates Supabase.
The Supabase dashboard/MCP account and app account are separate identities.

## Deployed database

Project: `cyfqbfebiwauyuygdtsi`. Two versioned migrations in `supabase/migrations/`
were applied through the authenticated Supabase MCP connection; local filenames
match verified remote migration history. No branch or paid compute was created.

- `barbell_records`: typed owner/type/date/movement/weight columns, full lossless
  movement/meet/bodyweight/accessory JSON, revisions and deletion tombstones.
- `barbell_mutations`: stable retry token and response, plus historical write
  payloads. A transaction commits the record and acknowledgement together.
- `barbell_snapshots`: append-only device snapshots. A POST response must confirm
  the exact snapshot ID. These are application history, not independent backups
  of the Supabase service.
- `barbell_documents`: materialized device plan/settings documents from snapshots.
- `barbell_private.legacy_imports`: staged historical source, inaccessible through
  the app API. Claiming checks the signed-in user's verified email against the
  administrator-bound email. The only definer helper lives in this private schema,
  checks `auth.uid()` and reads verified email from `auth.users`, not editable
  metadata. The public wrapper is an invoker.

Every exposed table has owner-scoped RLS. Unauthenticated users have no table
or RPC access. The frontend contains only the public project URL/publishable key.
The vendored Supabase JS bundle is pinned to 2.118.0; package-lock and MIT license
are committed. Regenerate it with `npm ci && npm run vendor:supabase`.

The staged source contains 60 lift entries, 2 meets and 156 bodyweight entries.
The source spreadsheet was read, not changed. A real-database rollback test
claimed and round-tripped this payload, retaining the 65 kg Hang Above Knee Snatch
and Class source labels. Its verification account and rows were rolled back.
The staging email is deliberately pending until the owner supplies their chosen
app email; update that mapping through the authenticated admin connection before
claiming from a fresh installation. Do not put the payload or owner email in Git.

## Initial owner setup

Supabase Auth is configured for confirmed email/password accounts. The SDK sends
`emailRedirectTo` pointing at the existing app. In the hosted project, set both
**Authentication → URL Configuration → Site URL** and an allowed redirect to:

`https://magician9835.github.io/Barbell-Log/olympic-lifting-tracker.html`

Direct dashboard:
https://supabase.com/dashboard/project/cyfqbfebiwauyuygdtsi/auth/url-configuration

This hosted Auth setting is not controllable by the currently exposed MCP tools.
The matching local config.toml does not silently update the hosted project.
The first browser confirmation/reset must be tested with the owner's inbox;
no unsolicited email was sent from tools. The default Supabase mail sender can
restrict recipients; using the project owner's email avoids adding SMTP setup
for this private app. Never disable confirmation to work around a redirect.

In the phone app: Settings → Your database → Create app account, confirm the email,
then return to the original phone icon → Sign in & connect. The app password is
entered only in the app and not sent in chat. Forgot-password and recovery controls
are included. Confirmation links can open Safari's separate storage; the UI tells
the owner to return to the original icon for the final migration.

## Cutover guarantees

1. Wait for any in-flight legacy write; pause further legacy drains during cutover.
2. Save a local recovery checkpoint (also included in downloadable file backups).
3. Claim administrator-staged history for the verified email. If the phone still
   has its legacy URL, read current Sheet rows and import missing IDs without
   overwriting already-edited database records. A phone without that URL can
   import its cached history and pending local changes.
4. Import locally recorded accessory sets as accessory records.
5. Read server revisions. On a fresh device, recover its existing account snapshot
   before writing the new device's first snapshot; this avoids backing up an empty
   phone over the apparent latest plan.
6. Save a confirmed snapshot, then rebind outstanding Sheet changes to the same
   owner's database endpoint with their stable retry IDs. Storage failure restores
   local connection/queue state. Source data is never cleared.
7. Drain the database queue and read the resulting history. Future writes use
   transactional JSON responses, without opaque no-cors requests or readback loops.

Existing database version expectations on recovered pending writes are retained.
A stale edit remains in Pending changes with the phone and database versions.
The owner chooses Keep database version or Use my phone change. Retries do not
resurrect deleted records. An edit queued during another edit's acknowledgement
advances its base revision only along that same local chain.

All restored plan settings preserve the legacy Sheets URL as a fallback; the
Supabase connection key is separate. The app does not switch back to Sheets
silently on a network failure. It continues to store completed sets locally.
A saved owner binding prevents signing a different account into that phone's
pending data. Startup/resume/online retry the queue.

## Accessory workout

Train → Accessory session → Overhead + Biceps. The template is the owner's provided
program, separate from blank Class. Setup edits weights per dumbbell, kg/lb, reps,
sets/rounds, rest and preparation duration. Dumbbell loads do not use barbell plate
rounding or Olympic percentage references.

- 10-minute row: timer and optional distance.
- T-spine/shoulder prep: checklists with all supplied cues and rep counts.
- Half-kneeling press: 3×8 each side at 14 kg, 3-second lowering,75 s suggested rest.
- Seated strict DB press: 3×8 at 10 kg,75 s rest.
- Curl superset: 3 rounds of incline 10 kg×10 + hammer 8 kg×10, 60 s after the round.

Actual left/right counts are separate; superset exercises are retained together
in the round record. Set notes and session cues are optional and live. Timers use
saved deadlines and never auto-log a set. The supplied shoulder-pain instruction
stays visible. Warm-up/prep completion is stored in the plan snapshot, not the lift
history. Strength sets go to kind`accessory`, so they never enter Olympic records
or percentage references. Recent accessory records can be edited/deleted. Edited
prescriptions can be saved/opened/deleted as accessory templates. Leaving offers
keep draft or discard unfinished plan; existing records remain.

Before database activation, accessory records remain on the phone and in any
supported plan snapshots; no attempt is made to put them through the legacy lift
API. Activate Supabase to sync them. Settings file backup remains independently
available. Auth session tokens are not included in Barbell file backups.

## Verification and limits

- `npm run check`: syntax and 51 pure/queue/backend checks.
- `scripts/database-browser-check.py`: real pinned SDK against fake Auth/RPC,
 including migration, pending transfer, accessory isolation, offline reload,
 conflict review, snapshots and fresh-phone recovery.
- `scripts/training-browser-check.py`: existing class/complex/template workflows.
- `scripts/iphone-layout-check.py`: simulated safe-area/keyboard constraints.
- `supabase/tests/backend-contract.sql`: rollback-only SQL contract for a test
 database; no fixture commits.
- Live SQL tests verified isolation, retry IDs, edits, conflicts, tombstones,
 snapshots and historical import. Supabase Security Advisor returned no findings.
 Browser CI runs the mobile checks in addition to Node checks.

No simulated browser test proves installed-iPhone framing or inbox delivery.
The Free plan can pause for inactivity and does not include managed daily
backups. Retain the unchanged spreadsheet and download periodic independent
file backups. The current snapshots and mutation history share the database's
failure domain. No paid resources were enabled.
