# Tracking Diary

A minimal, responsive headache and migraine diary. Quick logging comes first: the start time is filled in automatically, severity is one tap, and duration presets log completed episodes ending now. Ongoing episodes keep their timestamps across reloads and can be ended later.

## Features

- Headache / migraine entries with the RCH diary’s three severity levels.
- Automatic local timestamps; editable start and end times; ongoing episodes.
- Quick durations: 15 minutes, 30 minutes, 1 hour, 2 hours, 4 hours, or custom.
- Optional triggers, symptoms, relief, medication / dose, activity impact, and notes.
- Search and type / date filters, editing, deletion with undo.
- Descriptive summaries for 30, 90, or 365 days; printable episode details.
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
  sw.js                App-shell caching (no health records)
  manifest.webmanifest Home-screen metadata
  icon.svg             Local app icon
tests/model.test.js    Timing, imports, merge, CSV and summary checks
```

The versioned envelope is `{ schemaVersion: 1, entries: [...] }`. Each record has shared `id`, `trackerType`, `startedAt`, `endedAt`, `createdAt` and `updatedAt` metadata. This version implements `trackerType: "headache"` with `kind: "headache" | "migraine"`, severity 1–3, and category-specific observations.

To add a new category, introduce a tracker definition with its form fields, validation, and summary behavior, and route it using `trackerType`. Keep shared timing and persistence code reusable. Unsupported categories are deliberately rejected by the current importer; introduce a version migration when adding new record shapes rather than silently dropping fields. A later cloud persistence adapter can replace the local adapter without changing episode IDs or timestamps. Cross-device sync should add authentication, per-user authorization, conflict handling, and deletion handling as an explicit follow-up.

Average duration uses completed episodes only. “Days with a headache” counts distinct local dates on which episodes **started**, rather than every date a multi-day episode overlaps. Trigger counts describe recorded observations and do not infer causation.

## Reference

The form’s severity guide and base observations were informed by the [Royal Children’s Hospital Headache Diary](https://www.rch.org.au/uploadedfiles/main/content/clinicalguide/headachediary.pdf). Duration shortcuts, local digital storage, symptoms, backups, and summaries extend that paper format. No personal or sample health records are included in the repository.

## Deployment

Host the contents of `dist/` on any HTTPS static host. The `.openai/hosting.json` file configures the private Sites deployment for this project. Changing the deployment origin does not move browser-local entries; export and import a backup when migrating.

## Verification

`npm test` covers ongoing duration, invalid timing, backup round trips, invalid imports, merge conflict handling, CSV escaping, and summary calculations. JavaScript syntax checks are also run. Interactive browser and mobile layout QA were unavailable in the development environment because its preview relay was missing, so those flows still need a browser pass on the deployment.
