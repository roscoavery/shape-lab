# Shape Lab V4 — family experience

This is the family onboarding / role-navigation record for `shape-lab-v4`. It is **not** a COPPA, FERPA, medical, or other legal-compliance statement.

Related: `V4_SECURITY_UPGRADE.md`.

## Role navigation

After email/password sign-in, the desk is chosen from the **session role**, not from hidden buttons on one giant nav.

| Role | Home | Main areas |
| --- | --- | --- |
| Admin | Coach Today | Full gym desk (Today, Practice, Videos, Learn, Team, More including Accounts, Consent, Watch) |
| Coach | Coach Today | Coaching desk without Watch |
| Athlete | Simple Home | Home, Practice, Progress, Videos, Learn, Profile |
| Parent | Family Home | Home, My Athletes, Learn, My Wellness, Settings |
| Floor iPad | Today | Practice, Replay, Shapes — no accounts, consent, contacts, Watch |

Leaving Floor Mode still requires the admin password.

Athlete profiles exist without an athlete login. Coaches can start lessons, assign homework, and log holds without signing into the athlete account.

## Age logic

Preferred field: `dateOfBirth` as `YYYY-MM-DD`. Age is calculated with `getAgeFromDateOfBirth()`. Thresholds live in `src/lib/age.ts` (`ATHLETE_ACCESS_THRESHOLDS`) so they can change later.

Bands: `child` / `teen` / `adult`. Access levels from `getAthleteAccessLevel(age)`:

- `parentPrimary` — parent is the primary account relationship
- `shared` — more athlete independence
- `independent` — athlete can manage more of their own profile

Unknown / missing birthday is treated conservatively as parent-primary. Existing profiles without a birthday keep working. Coaches/admins see **Birthday needed** and can add it later. The app does not guess a birthday.

UI copy does not claim a legal age or COPPA status.

## Date of birth privacy

Full `dateOfBirth` is returned only to:

- gym admin
- the athlete (own profile)
- a linked parent

Assigned coaches may receive `birthdayNeeded` and `ageYears` without the calendar date. It is not shown on the feed, public profiles, or generic search. Unrelated coaches do not receive it.

## Parent linking

1. Admin or coach creates the **existing** athlete profile (with birthday when known).
2. Parent email / invite is created on More → Accounts.
3. Parent sets a password from the invite.
4. The parent account is linked to that athlete via `linkedAthleteIds` (account + parent roster row).
5. Additive `guardianRelationships` are stamped on the athlete so more than one parent/guardian can exist later.
6. Parent reviews **separate** consent flags, then uses the parent desk.

Do not create a second child profile. Same-name create is blocked and points toward linking.

Multiple children per parent: one parent login, several linked athlete ids, switcher on Home / My Athletes.

`linkedAthleteIds` is not removed. `guardianRelationships` is additive.

## Consent structure

Each flag is stored separately (`server/auth/consent.ts`):

- Profile visibility (default private)
- Wins / feed
- Profile photo
- Stories / social
- **Coaching media** (`mediaConsent`) — private lesson/class video for coaching this athlete
- **Instructional / reference media** (`instructionalMediaConsent`) — approved teaching material
- Research (deidentified contribution; not a research program by itself)

Coaching media consent does **not** grant instructional/reference use.

Coaches cannot patch consent. Parents (linked) and admin can.

## Parent wellness privacy

`parentWellnessProfile` lives in gitignored `data/parent-wellness.json`, keyed by **parent account id**, not by the child athlete.

Readable/writable by:

- that parent
- gym admin (optional `?accountId=`)

A coach who works with the child **cannot** read the parent's journal. Athlete injury / pain journals stay on the athlete roster row and are separate.

Copy in the UI: general exercise and wellness guidance, plus a notice that persistent, severe, worsening, neurologic, traumatic, or concerning symptoms should be evaluated by an appropriate healthcare professional. Shape Lab does not diagnose or treat back pain.

## Coach-entered athlete results

`POST /api/hold-logs` appends a homework log for an athlete the caller is allowed to coach (or the athlete/parent for their own linked row). The athlete does not need to be signed in.

Stored: athleteId, exercise/shape, duration, date/time, source, coachId, lessonId / classId when present.

UI:

- Athlete profile → Older hold (collapsed)
- Live lesson → Log this time for today; **Log an older hold** is a closed details panel
- Class clock → present roster when a class is open; search-to-log when it is not. No rapid roster list. Historical dates are not on Today.

## Private still tags

Admin/coach can privately tag an athlete on a Shape Library still. The still does **not** show the name. Tags live in additive `athleteTags` on `data/coach-stills.json` and are stripped from `GET /api/coach-stills`.

`GET/PATCH /api/still-tags` is the authorized surface:

- Admin: tagged stills plus instructional/reference consent (More → Stills)
- Parent: shapes where a linked child is tagged (Consent)
- Coach: can tag; does not receive consent flags here
- Public: 401

Instructional media consent is still a separate flag from coaching media.

## Migration behavior

Additive only: `dateOfBirth`, `guardianRelationships`, `parentWellnessProfile` file, `athleteTags` on coach stills, consent fields already present. Missing fields are allowed. No destructive rewrite of athletes, lessons, homework, holds, videos, wins, or profiles.

## Known limitations

- Age thresholds are product defaults, not legal rules.
- Parent invite email still depends on optional SMTP; copy-link works without it.
- Class clock logs present athletes when a class is open; search-to-log when it is not. Older holds are in lessons.
- Floor Mode leave still uses the admin password.
- This is not medical advice, not a diagnosis tool, and not COPPA/FERPA compliance.

## Remaining legal / privacy questions

- Whether a given gym's parent consent language meets studio policy or applicable children's-privacy law.
- Whether instructional-media consent should require a written studio form in addition to the in-app flag.
- Whether parent wellness notes should ever be visible to an authorized clinician (they are not, today).
- Retention and deletion of parent wellness files vs athlete coaching records.
