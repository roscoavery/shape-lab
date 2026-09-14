# Shape Lab Version 4 — security upgrade

This document is the Version 4 security and privacy record. It is not a legal compliance statement.

## NOT YET READY FOR PRODUCTION

Do not point the current working production gym at this branch until Ryan explicitly approves it.

Important protections are in place on `shape-lab-v4`, but the following are still incomplete:

- Existing public Vercel Blob URLs for some photos/videos may still work if someone already has the exact URL.
- Class-attendance-only coach relationships are loaded from disk when those files exist; a brand-new class store may not yet grant access until `worksWithCoachIds` is set.
- Parent consent UX is not built. Consent fields exist and default to `unknown`.
- Account invites by email and magic-link login are not built. Admin can create a login and reset a password in More → Accounts.
- Historical Git still contains older copies of `data/roster.json`. Adding the file to `.gitignore` does not erase history.
- This upgrade is technical. It does not make Shape Lab COPPA / GDPR / studio-policy compliant by itself.

## Phase 0 freeze (do not modify)

The working application at the start of this project is **Shape Lab Version 3**.

| Item | Value |
| --- | --- |
| V3 backup branch | `shape-lab-v3-frozen` |
| V3 Git tag | `v3-working-backup` |
| Frozen commit | `3791d6fab8d26d0b1f858fe7ef279030ead4b349` |
| V4 branch | `shape-lab-v4` |
| Production deployment | **not changed** |

Uncommitted gym files on the machine (`data/roster.json`, lessons, coach-content, training-events) were **not** committed into the freeze. Those files contain live athlete records. The frozen commit is the working **code** plus the last tracked snapshot already in Git. Returning to `shape-lab-v3-frozen` restores that exact application.

```bash
git checkout shape-lab-v3-frozen
# or
git checkout v3-working-backup
```

Do not force-push, squash, rewrite, or delete `shape-lab-v3-frozen` or `v3-working-backup`.

## What changed

- Email + password accounts with scrypt hashes and HTTP-only session cookies.
- Server-side roles: `admin`, `coach`, `athlete`, `parent`, plus `gymOwner`.
- Central helpers in `server/auth/`: `requireAuthenticatedUser`, `requireAdmin`, `canAccessAthlete`, `canCoachAthlete`, `canParentAccessAthlete`, `canEditAthlete`, `sanitizeAthleteForViewer`.
- `/api/roster` no longer returns the private gym to anonymous callers (HTTP 401).
- Coaches only receive assigned athletes and never receive parent phones or other athletes’ passcode hashes.
- `/api/contacts` and `/api/contacts.csv` are admin-only.
- Writes to roster, photos, videos, lessons, classes, stills, and related stores require a session. The server ignores browser-supplied admin flags.
- Athlete photos and videos are authorized per athlete id. Changing `athleteId` in a URL does not grant access.
- New athletes default to private. Existing `profilePublic: true` stays public.
- Additive consent fields are stored. Defaults are conservative. **CONSENT UX INCOMPLETE.**
- Health fields (`hasBackPain`, `injuryActive`, injury/pain journals, intake) are stripped from viewers who should not see them.
- Hard-coded gym admin PIN `2223` was removed from client JavaScript.
- Profile PINs remain as a device convenience after a real login.
- Match stills admin tool was removed. Shape still add / rename / delete / description edits still save on the gym API and poll across devices.
- `data/roster.json` is gitignored going forward. `data/roster.example.json` is fictional only. Startup does not copy the example over a live file.
- Tiny audit log in gitignored `data/audit.json`.
- **Phase 2:** More → Accounts lets admin create / link / reset logins. Anyone signed in can change their own password. Other sessions are signed out on a password change. Authorized roster photos stream privately when the bytes are on disk instead of minting a new public Blob URL.

## Authentication architecture

1. `POST /api/auth/login` with email + password.
2. Server verifies scrypt hash from `data/accounts.json`.
3. Random session id stored in `data/sessions.json` and set as `shape_lab_session` (HttpOnly, SameSite=Lax, Secure on HTTPS, 7 days).
4. `GET /api/auth/me` returns the session user without hashes.
5. `POST /api/auth/logout` clears the cookie.
6. First admin: `SHAPE_LAB_BOOTSTRAP_ADMIN_EMAIL` + `SHAPE_LAB_BOOTSTRAP_ADMIN_PASSWORD`, or the first-run form when `GYM_HOME=1` / `SHAPE_LAB_ALLOW_FIRST_ADMIN=1`.
7. Admin can `POST /api/auth/accounts` to create coach / athlete / parent / gymOwner accounts.

Never put secrets in `VITE_` variables or client source.

## Role permissions

| Role | Roster | Contacts | Health | Media | Gym stills / library writes |
| --- | --- | --- | --- | --- | --- |
| Public | 401 | 401 | none | 401 | 401 |
| Athlete | self | own contact | own | own | no |
| Parent | linked children | child phones, not emails | linked children | linked children | no |
| Coach | assigned only | no parent phone / email | assigned, when coaching | assigned | no (except coach tools) |
| Admin / gymOwner | gym | yes (audited) | yes | yes | yes |

Assigned coach means `worksWithCoachIds`, `createdByCoachId`, or a class / lesson / camp record on disk.

## Data privacy model

**Public / instructional:** shipped shape stills, Compare library items, after sign-in.

**Private athlete data:** phones, emails, parent phones, injuries, pain journals, intake, coach notes, passcode hashes, authentication records, private photos and videos.

Sanitization happens on the server before JSON is sent. Hiding a field in React is not treated as protection.

## Media security model

- `/api/roster-photo-file` and `/api/athlete-video-file` require a session and athlete access.
- Client video URLs now point at the authenticated file route instead of a raw Blob URL.
- If bytes exist on disk they are streamed privately.
- Older public Blob URLs may still exist in storage. That is a known risk, not a completed migration.

## Migration notes

- Additive only. No athlete rows, homework, wins, lessons, videos, or shape tests were deleted by this work.
- Privacy fields are filled on read. Existing `profilePublic: true` stays public.
- Runtime account / session / audit files are new and gitignored.
- `data/roster.json` remains on the gym computer. It is no longer a file that should be committed.
- Do not copy `roster.example.json` over a live gym file.

## How to open V4 on https://gym.shapelab.win

The Cursor cloud preview (`http://127.0.0.1:43127`) is only on the agent machine. Phones and your computer browser cannot open that.

`https://gym.shapelab.win` is the Cloudflare tunnel on **the gym Mac**. It serves whatever that Mac is running. A refresh on the iPad does not pull GitHub.

On the gym Mac, in a **second** Terminal tab if a gym window is already open:

1. Ctrl+C the old `gym:mac` window (closing it stops the HTTPS link).
2. In the Shape Lab folder:

```bash
git fetch origin shape-lab-v4
git checkout shape-lab-v4
npm run gym:mac:v4
```

3. Leave that window open. On the iPad / computer open **https://gym.shapelab.win**.
4. Sign in, or create the first admin account on that Mac (`GYM_HOME=1` allows it).
5. Optional in `.env` on that Mac (never commit it):

```
SHAPE_LAB_BOOTSTRAP_ADMIN_EMAIL=you@example.com
SHAPE_LAB_BOOTSTRAP_ADMIN_PASSWORD=a-long-password-you-choose
```

`npm run gym:mac` (no `:v4`) still resets the Mac to the working V3 / `v2-rebuild` gym.

## How to roll back to Version 3

```bash
git checkout shape-lab-v3-frozen
# or
git checkout v3-working-backup
npm install
npm run gym:mac   # only on the gym Mac, when you intentionally want that build
```

The live gym Mac still has its `data/` folder. Version 3 reads those files the same way it did before. Version 4 account files are ignored by Version 3.

## Known risks

- Shared gym iPad: an admin session on the floor is still an admin session. Sign out when the device leaves the gym.
- Historical Git may contain real athlete JSON. Do not rewrite history in this project. A later, separate history-cleanup pass may be needed.
- Public Blob URLs created before V4.
- 4-digit PINs are still SHA-256 convenience hashes, not account passwords.
- Facial recognition attendance was **not** built.

## Recommended next security / privacy tasks

1. Rotate any Blob tokens that were ever in a shell history.
2. Move remaining public athlete Blob objects to private storage.
3. Password reset + magic link.
4. Finish parent consent UX and block public/social features on `unknown` consent.
5. Per-device gym kiosk mode so floor iPads are not full admin browsers.
6. Separate historical Git cleanup, only with an explicit backup and written approval.
7. Rate-limit more write routes and add CSRF tokens if Shape Lab is ever embedded cross-site.

## Tests

```bash
npm run lint
npx tsc -b --pretty false
npm run test:v4-security
```
