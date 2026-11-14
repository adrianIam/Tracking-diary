# Tracking Diary

A minimal, responsive headache and migraine diary. The default **Record** tab has one hold-to-record button: press and hold for each burst of pain. Each release appends its exact interval to the current session without opening a form. Press **Add details & save** when finished to choose headache or migraine and a severity, then save all bursts as one episode. Pain-free gaps are excluded from total pain duration. Other details and timing adjustments are optional. Mouse and touch are supported; interrupted holds are cancelled. Released bursts stay available until the session is submitted or discarded during the current visit; drafts are not retained after a page reload. Nothing is saved until you submit. Quick logging comes first: the start time is filled in automatically, severity is one tap, and duration presets log completed episodes ending now. Ongoing episodes keep their timestamps across reloads and can be ended later.

## Features

- Headache / migraine entries with the RCH diary’s three severity levels.
- Automatic local timestamps; editable start and end times; ongoing episodes.
- Quick durations: 15 minutes, 30 minutes, 1 hour, 2 hours, 4 hours, or custom.
- Optional triggers, symptoms, relief, medication / dose, activity impact, and notes.
- Search and type / date filters, editing, deletion with undo.
- Descriptive summaries for 30, 90, or 365 days; printable episode details.
- Stacked duration chart for the last 30 local calendar days, with intensity colours and pain-free gaps excluded.
- Stacked hourly onset frequency for the selected period: each burst counts once; manual episodes count once at their start. Both charts include accessible data tables.
- CSV export and versioned JSON backup / merge import.
- Offline app-shell caching and an installable web manifest where supported.
- No analytics, external fonts, runtime dependencies, or server upload of diary records.

## Run locally

Use Node.js 20+ for tests:

```sh
npm test
```

Serve `dist/` with any static HTTP server, for example:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. There is no build or dependency installation step. Service workers require localhost or HTTPS. Offline support must be verified on the final host; authenticated hosts can impose additional constraints.

## Privacy and data ownership

Entries are saved to `localStorage` under `tracking-diary:v1` on the current browser profile and origin. They do **not** sync across devices. Clearing browser data can delete them; switching app addresses or browsers creates a separate diary. This is not encrypted storage: people with access to the same browser profile may be able to read entries. Export backups regularly. Backups and CSV files contain health information and should be stored privately. This is an observation journal, not diagnostic or treatment software.

Imports validate the schema and entries before any write, merge by stable ID, and keep the entry with the newest `updatedAt` value. Multiple ongoing episodes and invalid timing are rejected. Invalid existing storage is preserved for recovery instead of silently overwritten. Cross-tab changes refresh the diary and close stale editing forms. CSV fields escape quotes, line breaks, and formula-leading characters.

## Structure and future trackers

```text
dist/
  index.html           Accessible app shell and entry form
  style.css            Responsive layout and print styles
  app.js               Views, form interactions, local persistence adapter
  model.js             Record validation, calculations, backups and CSV
  recorder.js          Pointer hold lifecycle and precise timer display
  sw.js                App-shell caching (no health records)
  manifest.webmanifest Home-screen metadata
  icon.svg             Local app icon
tests/model.test.js    Timing, imports, merge, CSV and summary checks
```

The current envelope is `{ schemaVersion: 2, entries: [...] }`. Version 1 data and backups are still accepted without losing existing entries. The local storage key remains unchanged. Each record has shared `id`, `trackerType`, `startedAt`, `endedAt`, `createdAt` and `updatedAt` metadata. This version implements `trackerType: "headache"` with `kind: "headache" | "migraine"`, severity 1–3, and category-specific observations. Recorded sessions also retain a `bursts` array of exact `{ startedAt, endedAt }` intervals. The outer start/end mark the first and last bursts, while duration is the sum of the individual intervals. Burst sessions keep their timings intact when editing shared details. JSON backups preserve the array; CSV includes burst count, intervals, total pain duration and overall session span.

To add a new category, introduce a tracker definition with its form fields, validation, and summary behavior, and route it using `trackerType`. Keep shared timing and persistence code reusable. Unsupported categories are deliberately rejected by the current importer; introduce a version migration when adding new record shapes rather than silently dropping fields. A later cloud persistence adapter can replace the local adapter without changing episode IDs or timestamps. Cross-device sync should add authentication, per-user authorization, conflict handling, and deletion handling as an explicit follow-up.

Average duration uses completed episodes only and excludes gaps within burst sessions. Each saved session counts as one episode. “Days with a headache” counts distinct local dates on which episodes **started**, rather than every date a multi-day episode overlaps. Trigger counts describe recorded observations and do not infer causation.

## Reference

The form’s severity guide and base observations were informed by the [Royal Children’s Hospital Headache Diary](https://www.rch.org.au/uploadedfiles/main/content/clinicalguide/headachediary.pdf). Duration shortcuts, local digital storage, symptoms, backups, and summaries extend that paper format. No personal or sample health records are included in the repository.

## Deployment

GitHub Pages publishes a root redirect and the app at `dist/` automatically from `main` through `.github/workflows/pages.yml`. All asset paths and service-worker scope are relative for repository-subpath hosting. Host the contents of `dist/` on any HTTPS static host. The `.openai/hosting.json` file configures the private Sites deployment for this project. Changing the deployment origin does not move browser-local entries; export and import a backup when migrating.

## Verification

`npm test` also covers precise pointer holds, multi-pointer input, cancellation on interruption, and late release protection. `npm test` covers ongoing duration, invalid timing, backup round trips, invalid imports, merge conflict handling, CSV escaping, and summary calculations. JavaScript syntax checks are also run. The local preview relay is unavailable; browser smoke checks run against the deployed Pages app. Burst-specific checks cover grouping, exact durations without gaps, version 1 compatibility, backup/merge preservation, CSV output and invalid intervals.
