# Shape Lab Version 4 — security upgrade

This document is the Version 4 security and privacy record. It is not a legal compliance statement.

## NOT YET READY FOR PRODUCTION

Do not point the current working production gym at this branch until Ryan explicitly approves it.

Important protections are in place on `shape-lab-v4`, but the following are still incomplete:

- Older public Vercel Blob URLs created before this phase may still work if someone already has the exact URL. New plays go through the signed-in file routes. The app no longer mints or redirects to a public CDN link for gym photos, feed clips, or athlete videos.
- Class-attendance-only coach relationships are loaded from disk when those files exist; a brand-new class store may not yet grant access until `worksWithCoachIds` is set.
- Parent consent is recorded in More → Consent and honored on feed / stories / public profile. `unknown` is not permission. This is still not a legal-compliance system.
- Email delivery of invites is optional. Set SMTP on the gym computer (`SHAPE_LAB_SMTP_HOST` + `SHAPE_LAB_MAIL_FROM`). Copy the one-time sign-in link from More → Accounts still works. The recipient opens the URL and sets their own password. The token is never written to the audit log.
- More → Watch is a gym log, not a legal-compliance system. Routine roster opens, roster saves, and photo opens are hidden by default.
- Write pacing is per Node process (40 account changes / 15 minutes, 180 gym saves / minute, 12 sign-in tries / 15 minutes). It is not a WAF. After a 429 this browser pauses gym PUTs for a minute and only runs one roster save at a time. Writes with a foreign `Origin` are 403. Missing Origin is still allowed on gym saves. Cookie-backed account writes also need the gym mark from `GET /api/auth/me` (`X-Shape-Lab-Csrf`). Session cookies are SameSite=Lax.
- Away lock covers this browser's screen only. The session cookie still works until sign-out or Watch ends the login. It is not a substitute for floor mode on the shared iPad. When Watch or a password change ends this cookie, this tab returns to sign-in instead of polling 401s.
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
- Additive consent fields are stored. Defaults are conservative. More → Consent lets a parent, the athlete, or gym admin set them. Coaches cannot. Feed and stories hide posts about an athlete from people who are not assigned / family unless that athlete allowed that channel. Class, homework, and lessons do not read these flags.
- Health fields (`hasBackPain`, `injuryActive`, injury/pain journals, intake) are stripped from viewers who should not see them.
- Hard-coded gym admin PIN `2223` was removed from client JavaScript.
- Profile PINs remain as a device convenience after a real login.
- Match stills admin tool was removed. Shape still add / rename / delete / description edits still save on the gym API and poll across devices.
- `data/roster.json` is gitignored going forward. `data/roster.example.json` is fictional only. Startup does not copy the example over a live file.
- Tiny audit log in gitignored `data/audit.json`.
- **Phase 2:** More → Accounts lets admin create / link / reset logins. Anyone signed in can change their own password. Other sessions are signed out on a password change. Authorized roster photos stream privately when the bytes are on disk instead of minting a new public Blob URL.
- **Phase 3 (Ask build):** `GET`/`PATCH /api/consent` for parents, the athlete, and admin. Gym feed and stories are filtered per viewer. Coaches can still post wins; people without a relationship do not see them unless the family allowed that channel.
- **Phase 4 (Floor build):** More → Accounts → “Use this iPad on the floor” marks only this browser as a kiosk. The account stays signed in. Contacts, accounts, consent, research, password changes, and injury journals lock until the admin password leaves floor mode. Class, homework, and lessons stay. Signing out also ends floor mode.
- **Phase 5 (Seal build):** Feed, roster photos, and athlete videos stream through `/api/…-file` after sign-in. The server writes those bytes privately, does not mint a public Blob URL on read, and does not 302 the browser to an old public link. Instagram instructional stills may still use a public copy. Existing leaked URLs are not deleted from Vercel.
- **Phase 6 (Link build):** Admin copies a one-time `/?invite=` URL from More → Accounts (or when creating a login with a blank password). Tokens are SHA-256 hashed in gitignored `data/invites.json`, last 7 days, and burn on first use. The person who opens the link sets their own password. No email is sent. Coaches and floor iPads cannot mint links.
- **Phase 7 (Watch build):** More → Watch shows who is signed in and the last office actions (sign-in, links, floor, contacts, password/role changes). Admin can end another login. Session ids stay on the server. Coaches and floor iPads cannot open Watch. A new sign-in on the same email still ends the previous one.
- **Phase 8 (Pace build):** Sign-in, invite peek/redeem, account writes, and gym saves are rate-limited on this process. Watch only records a roster save when the file actually changed. CSRF tokens are not added; cookies are SameSite=Lax.
- **Phase 9 (Away build):** More → Accounts → “Lock this gym” covers this browser until that email’s password is typed (`POST /api/auth/unlock`). Idle taps pause 20 minutes. Floor iPads skip Away. JSON APIs send `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`. No strict CSP (MediaPipe wasm / blob clips). Gym PUTs stop retrying 401 / 403 / 429.
- **Phase 10 (Quiet build):** After a 429 this tab pauses gym PUTs for a minute (roster, lessons, classes, chalkboards, skill paths, camp lists). Overlapping roster saves collapse into one in-flight PUT, then one more with the latest local file. This is still not a WAF.
- **Phase 11 (Clear build):** A 401 on revision, roster, gym writes, or Away unlock (missing cookie, not a wrong password) returns this tab to the sign-in screen and stops the 4-second gym poll. Wrong passwords stay on the lock overlay.
- **Phase 12 (Bind build):** POST / PUT / PATCH / DELETE with an `Origin` whose host does not match this gym is 403. Node tests and some iPad fetches omit Origin and still work on gym saves.
- **Phase 13 (Mail build):** More → Accounts can email a one-time sign-in link when SMTP is set on this gym. Copy-link stays. Without SMTP, email is off and the link is still copied. The invite token is not stored in Watch.
- **Phase 14 (Mark build):** Cookie-backed account writes (`/api/auth/*` except login, first admin, and invite redeem) require `X-Shape-Lab-Csrf` from this session. `GET /api/auth/me` and login return `csrf`. The mark is not the session cookie and is not written to Watch. Roster PUTs still use Origin (Bind) only.

**Gym-open look:** header chip and fallback banner say **Mark build** / **MARK BUILD**. Health `holdBuild` is `"mark"`. The HUD on camera still reads **shapelab**.

## Authentication architecture

1. `POST /api/auth/login` with email + password.
2. Server verifies scrypt hash from `data/accounts.json`.
3. Random session id stored in `data/sessions.json` and set as `shape_lab_session` (HttpOnly, SameSite=Lax, Secure on HTTPS, 7 days).
4. `GET /api/auth/me` returns the session user without hashes.
5. `POST /api/auth/logout` clears the cookie.
6. First admin: `SHAPE_LAB_BOOTSTRAP_ADMIN_EMAIL` + `SHAPE_LAB_BOOTSTRAP_ADMIN_PASSWORD`, or the first-run form when `GYM_HOME=1` / `SHAPE_LAB_ALLOW_FIRST_ADMIN=1`.
7. Admin can `POST /api/auth/accounts` to create coach / athlete / parent / gymOwner accounts. A blank password returns `inviteUrl`.
8. Admin can `POST /api/auth/invites` with `{ accountId }` to copy a one-time `/?invite=` URL (7 days, hashed in `data/invites.json`).
9. Anyone with the URL can `GET /api/auth/invite?token=` then `POST /api/auth/invite` with `{ token, password }` to set a password and start a session. The token burns.
10. Admin can `GET /api/auth/audit` and `GET /api/auth/sessions`. `POST /api/auth/sessions` with `{ accountId }` ends that login. You cannot end your own.
11. Account writes (create/reset/invite/kiosk/end-login) share a 40 / 15-minute cap per account. Gym writes share 180 / minute. Unknown-email sign-in tries cap at 12 / 15 minutes.
12. `POST /api/auth/unlock` with `{ password }` unlocks the Away overlay. The cookie stays. Floor kiosk is 403. Wrong passwords cap at 12 / 15 minutes per account.
13. Gym PUTs from this browser pause for a minute after a 429. Roster saves run one at a time.
14. A dead session (401, not a wrong password) raises `shape-lab-session-lost` and this tab shows sign-in.
15. Cookie writes whose `Origin` host does not match this gym are 403. GET is not origin-checked.
16. `POST /api/auth/invites` with `{ accountId, sendEmail: true }` emails the link when SMTP is configured. `GET /api/auth/me` includes `mailEnabled` for gym admin.
17. Cookie-backed account writes need `X-Shape-Lab-Csrf` matching this session. Login, first admin, and invite redeem do not. Gym roster PUTs do not.

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

- `/api/roster-photo-file`, `/api/athlete-video-file`, `/api/feed-file`, and `/api/story-file` require a session. Feed and story files also honor consent visibility.
- Client URLs for gym photos, wins, and athlete clips are the authenticated file routes.
- If bytes exist on disk they are streamed privately. If only an old public URL exists, the server fetches it and streams it — the browser does not get a 302.
- Older public Blob objects may still exist in storage if someone already copied the URL. That is a leftover, not a new leak.

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
5. Look for **Mark build** on the header. `/api/health` should include `"holdBuild":"mark"`. If you still see Mail, Bind, Clear, Quiet, Away, Pace, Watch, Link, Seal, or Floor, this window is still old. After sign-in, More → Accounts still copies a sign-in link. Email is off until SMTP is set on that Mac. Lock / unlock and Watch still work; account changes from this browser carry a gym mark.
6. Optional in `.env` on that Mac (never commit it):

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

- Shared gym iPad: turn on floor mode for that browser. Away lock is this screen only — the cookie still works if someone copies it. Without floor mode, an admin session is still a full admin session. Sign out when the device leaves the gym.
- Historical Git may contain real athlete JSON. Do not rewrite history in this project. A later, separate history-cleanup pass may be needed.
- Public Blob URLs created before V4.
- 4-digit PINs are still SHA-256 convenience hashes, not account passwords.
- Facial recognition attendance was **not** built.

## Recommended next security / privacy tasks

1. Rotate any Blob tokens that were ever in a shell history.
2. Point SMTP at this gym (`SHAPE_LAB_SMTP_HOST` + `SHAPE_LAB_MAIL_FROM` in `.env` on the Mac). Copy-link already works.
3. Separate historical Git cleanup, only with an explicit backup and written approval.
4. CSRF on gym PUTs if Shape Lab is ever embedded on another site. Account writes already carry a gym mark. SameSite=Lax cookies and Origin checks are already in place.
5. Away lock is not floor mode. Keep the shared iPad in floor mode; Away only covers the office browser. Clear returns a dead cookie to sign-in; it does not lock the office screen.

## Tests

```bash
npm run lint
npx tsc -b --pretty false
npm run test:v4-security
```
