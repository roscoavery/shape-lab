# Coach education: status report

Scope: injury science, an injury library, injury response, movement science, flexibility and stretching, and assessments, built on the existing Learn and Coach study stack. This report is the honest state of the build, including what is not done.

Audience of the feature: coaches and gym admin only. Athletes, parents, and the floor kiosk never see it (menu, Learn sub-nav, search) and the server refuses them (HTTP 403).

Everything below ships as **Draft, not yet medically reviewed**. Nothing in this build has been signed off by a physician, athletic trainer, or physical therapist.

## 1. Existing features reused

- Session cookie auth, CSRF marks, role gate (`server/auth/gate.ts`, `permissions.ts`). New `/api/coach-ed/*` routes sit behind the same gate. Admin-only writes are also listed in `ADMIN_WRITE_PATHS`.
- JSON persistence (`server/persist.ts`) for `data/coach-ed.json` and `data/coach-ed-progress.json`. `coach-ed.json` is in `HISTORY_FILES`, so every overwrite is snapshotted.
- Navigation: `APP_TABS`, `SECTION_SUBNAV`, `sectionForTab`, `subnavForSection`, mobile nav drawer (built from the sub-nav), app search index and its `FEATURE_WORDS`, one-shot search jump (`mobileSearchNav`).
- Learn > Coach study: the new "Coach education" card links in. Existing lessons (`ANATOMY_LESSONS`: movement-names, struggle-hypermobile, tissues-grades, injury-prevention) are wrapped, not copied or rewritten (`adaptLegacyLesson`, ids kept in `legacyId`). The old Coach study room, quizzes, and physics lessons are untouched.
- Existing ShapeLab shape ids (`SHAPES`) are attached to movement terms.
- Visual language: existing CSS variables and Tailwind styles, same segmented-chip pattern.

## 2. New pages and components

Pages and routes
- Tab `coached` ("Coach education") under Learn, lazy loaded (`CoachEdPanel` chunk about 194 kB, condition regions and lessons are further chunks).
- Segments: **Study**, **Quick reference**, **Injury response**, **Progress**. The segment bar is sticky and Injury response is red and one tap from anywhere. App search finds "Injury response" for emergency, concussion, head, neck, spine.

Components (`src/components/coachEd/`)
- `ConditionCardView` (21-field standard injury card, four priority sections open), `ConditionLibrary` (search by name, alias, tag, region), `QuickReference`, `InjuryResponse`, `LessonView`, `StudyView`, `ComparisonTableView` (phone: one column at a time), `ScenarioRunner`, `FlashcardDeckView`, `MatchingExercise`, `AssessmentRunner`, `ProgressView`, `AdminTools`, `SafetyBanner` (educational note, emergency banner, draft banner, review badge), `SourceList`, `VerifiedFigure` (attribution always visible, hotspot overlay, "Verified visual pending" placeholder, admin preview with approve and reject).

Content and data (`src/content/coachEd/`)
- Typed model with stable ids (`types.ts`), 66 sources (`sources.ts`), conditions by region (lazy), 30 lessons across six modules, 5 comparison tables, 5 scenarios, 3 flashcard decks, 2 matching sets, 26 movement terms, 6 stretch methods, a media library with 6 slots and 9 asset records, 13 assessments with mastery levels.
- After the expansion (see "Expansion" at the end): 113 sources, 37 lessons across seven modules, 27 complete condition cards, 12 comparison tables, 10 scenarios, 4 matching sets, 35 movement terms, 11 exercise records, 12 media slots and 12 asset records, 14 assessments.

Server (`server/coachEd/`)
- `model.ts` (review overlay, media workflow rules, attempts, progress), `grading.ts`, `routes.ts`, `store.ts`, generated answers and manifest.
- Tooling: `npm run coach-ed:gen` (condition index, question bank split, server manifest, image audit), `npm run test:coach-ed`.

## 3. Injury topics

Complete cards (20, all draft, all 21 fields filled; each claim has a real source or is labeled "Not well established" or "ShapeLab policy"):

- Muscle and tendon: hamstring strain, Achilles tendinopathy.
- Ankle and foot: lateral ankle sprain, high ankle (syndesmosis) sprain, medial ankle (deltoid) sprain, Sever's disease.
- Knee: ACL injury, meniscus tear, Osgood-Schlatter disease.
- Spine and pelvis: spondylolysis, spondylolisthesis, spondylosis, spondylitis (with a four-way comparison table and a matching exercise), suspected neck or spine injury (emergency).
- Upper limb: gymnast's wrist, ganglion cyst (own lesson).
- Bone: scaphoid fracture, growth plate fracture (Salter-Harris), stress fracture.
- Head: concussion (CDC HEADS UP steps and danger signs).

In preparation (36, visibly marked, no medical content, no claims): muscle contusion, general muscle strain, general tendinopathy, Achilles rupture, peroneal tendon, plantar fasciitis, fifth metatarsal fracture, talus osteochondral lesion, patellofemoral pain, patellar tendinopathy, patellar dislocation, MCL and LCL sprain, PCL injury, Sinding-Larsen-Johansson, lumbar disc, SI joint pain, pelvic avulsion, hip labrum, snapping hip, neck muscle strain, scoliosis, shoulder instability, shoulder labrum, rotator cuff, elbow dislocation, elbow OCD, elbow hyperextension, TFCC, wrist sprain, finger injuries, buckle and greenstick fractures, clavicle fracture, forearm fracture, stinger, exertional heat illness. These need real sources and a clinician reviewer before they can be written.

Recovery ranges: 40 range fields on the complete cards. 38 are marked "Not well established" because no verified source gave a defensible range. The two with sources are the ganglion cyst (AAOS OrthoInfo) and concussion (CDC). No range is presented as a prediction.

## 4. Movement and stretching

Movement science lessons: planes and axes, joint actions (wraps the existing "Joint actions and cues" lesson), scapula and pelvis, kinetic chain and contraction types, loading concepts. Loading concepts (compression, tension, shear, torsion, bending) are separate records marked "load, not a joint action" and a test enforces that no loading term is flagged as a joint action. 26 terms, each with a tumbling example, linked to existing ShapeLab shape ids where one exists.

Flexibility and stretching lessons: why athletes stretch, methods (static, dynamic, ballistic, PNF, reciprocal inhibition, and active range training, each with what the research says, gym use, and cautions), stretching and power, splits, hypermobility (wraps the existing "Limited range and extra range" lesson, adds Beighton score context), warm-up and preparation. Statements about stretching and performance are tied to the systematic reviews they came from, and "evidence does not clearly show stretching prevents injury" is stated as such.

## 5. Tests and progress

- 98 questions across 21 topics (22 safety-critical) at first release; 144 across 28 topics (27 safety-critical) after the expansion, each with difficulty tag, at least one verified source, and an explanation. 13 assessments. Pass mark 85 percent, configurable by admin between 50 and 100 (default 85). Every critical question in an assessment is always drawn and must be right regardless of score.
- Server-side grading. The browser bundle holds questions and choices only. Answer keys and explanations live in `server/coachEd/answers.generated.ts`, are returned only after a submission closes, and a test fails if anything under `src/` imports them. A built bundle search for explanation text found nothing.
- Attempts expire after 3 hours, can be submitted once, and are per account.
- Mastery levels: Foundations, Working knowledge, Proficient, Advanced. Always labeled as internal ShapeLab achievements, not credentials or certifications. Coach progress sits in its own server file, separate from athlete records and medical history. Admin sees a coach dashboard.
- Practice (not graded): flashcards and matching.

## 6. Sources verified

66 sources, each checked on 2026-10-23 against its public record: PubMed (PMID, title, authors, journal, year), agency and publisher pages fetched and read (CDC HEADS UP, AAOS OrthoInfo, HSS, MedlinePlus), and textbook ISBNs against Open Library. Includes consensus statements (Amsterdam 2022 concussion, Berlin 2016, Bern 2016 return to sport, IOC REDs 2023, NATA spine and ankle), clinical practice guidelines (ankle, knee ligament, meniscus, Achilles, hamstring, AHA BLS 2020), and primary reviews. No citation, statistic, or recovery estimate was written from memory: where a source was not found the claim is marked uncertain or left out. Source records show "Record checked" with the date.

Limit: "verified" means the record exists and says what the claim says at the level I read it (abstract or agency page). It is not a full-text critical appraisal.

## 7. Needs qualified medical review

Before the Draft label can come off, a qualified clinician (sports medicine physician, athletic trainer, or physical therapist) should review:
- All 20 complete injury cards, especially: concussion and suspected spine injury (emergency steps), spondylolysis and spondylolisthesis (return-to-tumbling wording), growth plate and scaphoid fracture (what a coach should and should not say), ganglion cyst, Sever's and Osgood-Schlatter.
- All 22 safety-critical questions and the scenarios' "safest choice" calls.
- The 38 uncertain recovery ranges: either supply sources or keep them as "not well established".
- The Injury response lessons against the gym's own emergency action plan and local protocols (911 versus local number, AED location).
- Two existing, unchanged lessons that contain wording this build does not endorse. "Muscle, tendon, and ligament" (`tissues-grades`) says sprain severity can be judged by "some give when you test it" and a gap "you can feel" on the floor. "Injury prevention" (`injury-prevention`) also predates this work and has not been reviewed against sources. The first is called out in the new tissue lesson, and both are shown in Coach education with a "shown unchanged, not reviewed" note, because existing content is not silently replaced. They should be rewritten or retired after review.
- Image labels: see section 9.
- Admin approvals record whatever name and role the admin types. The app cannot verify credentials, and the card says so.

## 8. Limitations and next steps

- Small banks. Assessments with 5 or 6 questions (concussion, ankle, wrist, return to tumbling) need 5 of 5 or 6 of 6 at an 85 percent pass mark. The bank should grow so that retakes draw different questions, and so a learner cannot memorize it from the review screen.
- Questions are single-answer multiple choice. No free text, no image questions yet.
- Review is by an admin typing a name. No external reviewer sign-in, no per-reviewer permissions, no diff view of content changes (the change log records status, not text).
- Content edits are code changes. The admin workflow covers review status and image approval, not editing lesson text.
- 36 library entries are not written. Module 2 library lessons exist for the spondylo family, ganglion cysts, ankle sprains, and growth plate and overuse injuries only.
- Search: the injury library searches names, aliases, tags, and body region. It does not yet match free-text symptoms ("hurts when landing") beyond the tags authored.
- Mobile layout was tested at phone width in a browser. No native app, no offline mode.
- Pushing: see "Integration notes" in the Expansion section for where the branch was pushed.

## 9. Visuals

Imported (hosted under `public/coach-ed/media/`, license record per file in `media.ts`, raw license API responses and hashes in `media-verification-log.json`):

| Image | Source | License | Status |
| --- | --- | --- | --- |
| Lateral ankle ligaments (Gray 1918 plate 356) | Wikimedia Commons | Public domain | approved |
| Medial ankle ligaments (Gray 1918 plate 354) | Wikimedia Commons | Public domain | approved |
| Salter-Harris types I to V (F. Gaillard) | Wikimedia Commons | CC BY-SA 3.0 | anatomy review pending |
| Planes of the body (OpenStax) | Wikimedia Commons | CC BY 4.0 | anatomy review pending |
| Lumbar vertebra side view (Gray 1918 plate 92) | Wikimedia Commons | Public domain | anatomy review pending |

"Approved" for the two ankle plates means the build agent compared the plate to its printed labels. That is not a clinician review. Admins can withdraw approval in Progress > Review > Visuals, and approving a pending image requires a reviewer name and note (the server refuses otherwise, and refuses unknown or non-commercial licenses).

Rejected (4): a Welsh-language Salter-Harris diagram, a spondylolysis illustration that does not show the pars, a cell-level synovial schematic, and a blurry ganglion photograph. Reasons are in `image-audit.md`.

Sources searched: Wikimedia Commons (used). Servier Medical Art: site license confirmed as CC BY 4.0, nothing imported yet. AnatomyTOOL and CDC PHIL: not searched.

Lessons still showing "Verified visual pending": tissue types at a joint (`fund-tissues`), Salter-Harris (`fund-fractures`, until an admin approves the pending diagram), ganglion cyst diagram (`lib-ganglion`), lumbar pars (`lib-spondylo`, until approval), planes (`mov-planes`, until approval). No existing asset was replaced. The existing shape photos, coach stills, and infographics are unrelated to medical content and are listed in `image-audit.md`.

## 10. Tests run and failures

Run on this branch:
- `npm run test:coach-ed`: 20 of 20 pass. Covers content references, sources, 21-field completeness, generated-file freshness, answer keys versus public bank, no answer leakage into `src/`, critical-question draw, the 85 percent boundary (17 of 20 passes, 16 of 20 fails), critical miss fails at 95 percent, unanswered counts wrong, pass percent clamp, review and media approval rules, attempt lifecycle, mastery, role access, injury search, legacy lessons preserved, loading versus joint action, approved-media file existence.
- `npx tsc -b` and `npm run build`: clean.
- `npx oxlint`: no errors. Two new "set state in effect" warnings in the same style as existing code.
- `npm run test:calendar`: 24 of 24 pass.
- API checks against the dev server with real sessions: coach reads state (200) but cannot approve (403); parent and athlete get 403 on every route; admin attempt flow (fail, then pass at 100 percent), a second submit returns 409.

Failing, not caused by this work (identical on the commit before this feature, checked in clean worktrees on a fresh data directory):
- `npm run test:v4-family` (8 checks) and `npm run test:v4-access` (4 checks) need seeded example athletes and accounts.
- `npm run test:v4-security` and `npm run test:family-units` fail on `Cannot find module '.../parentPin'` (an extensionless import in existing code under this Node version).
- `npm run test:v4-skill-goal` points at a script that does not exist.
- `npm run test:v4-desk` passes.

Browser pass on a phone-sized viewport: see "Mobile QA" below.

## Mobile QA

Pending at the time this report was committed. Results are appended below when the browser pass finishes.

## Expansion: impingement, kinetic chain, RICE, knees over toes, vulnerable positions

Everything added here is also **Draft, not yet medically reviewed**.

### What was added

- Impingement (library module): lesson `lib-impingement` explains what "impingement" does and does not mean. It comes with 7 complete 21-field cards: subacromial pain syndrome, internal shoulder impingement, FAI syndrome, anterior ankle impingement, posterior ankle impingement, dorsal wrist impingement, and posterior elbow impingement. Also added: 3 comparison tables (shoulder pain labels, hip shape versus FAI syndrome, back-of-wrist pain) and a matching set.
- Kinetic chain (movement module): lesson `mov-foot-chain`, "Foot pronation and the lower-limb kinetic chain". It adds 9 foot-to-pelvis terms (new term group "Foot to pelvis"), a foot-terms comparison, and a matching set. It states that pronation is normal motion, and that foot posture is only weakly and inconsistently linked to injury.
- RICE evolution (recovery module): lesson `rec-rice-evolution` has a dated timeline (Mirkin 1978, the 2004 ice review, POLICE by 2012, Mirkin's 2014 revision, PEACE and LOVE 2020, the 2024 cryotherapy review). It also has sections on inflammation and ice, a red circulation callout (signs of compartment syndrome, call emergency services), and an emergency scenario. No claim says ice definitely speeds or slows healing.
- New Training module (`training`), 4 lessons: knees over toes (`trn-knees-over-toes`), strengthening vulnerable positions (`trn-vulnerable-positions`, which says "No exercise makes athletes injury-proof"), when to progress, hold, or modify (`trn-progression`, 11 factors, and ShapeLab does not prescribe rehabilitation or override clinicians), and what each exercise can and cannot claim (`trn-exercise-evidence`).
- Exercise education: 11 records in `exercises.ts`. Each has one of four evidence labels: direct injury reduction evidence, evidence for an associated capacity, biomechanical rationale only, or insufficient or conflicting evidence. Only the Nordic hamstring curl carries the direct injury reduction label. The Jefferson curl is education only, carries the "advanced" caution, and lists 8 readiness checks and 5 contraindications. It is not in the homework catalog.
- Homework catalog additions (audience class, reps): sissy squat, sled push, sled pull (backward and forward), backward walk.
- New source kinds "practitioner" and "historical". Practitioner sources (Poliquin 1997, ATG) show a note that they are coaching opinion and not research. Historical sources (Mirkin 1978) are labeled as history, not current guidance.
- 46 new questions (144 total, 27 safety-critical) across 7 new topics: impingement, kinetic chain, RICE history, cryotherapy, knee travel, progression, and exercise evidence. The new `training_science` assessment takes 12 questions. New topics were also mapped into the injury response, ankle and foot, upper limb, return to tumbling, movement science, and comprehensive assessments.
- 47 new sources, 113 in total. Each one was checked against PubMed esummary, an Open Library ISBN record, or the publisher page on 2026-10-23. Authors, volumes, and pages were corrected wherever my first draft differed from the record.

### Unverified or uncertain claims

- **The "Duke" knees-behind-toes account is unverified.** Popular articles credit a 1978 Duke University study with the rule. Bibliographic records for McLaughlin, Lardner, and Dillman 1978 list Auburn University and the University of Illinois, and I found no primary source tying the rule to Duke. The lesson includes a callout saying so. The claim that the rule traces to that era of squat research is labeled as reasoned history, not a documented fact.
- The **Poliquin step-up** name comes from coaching tradition. I did not find a published primary description by Charles Poliquin, and the exercise sheet says so.
- **Gymnastics-specific rates and transfer are mostly unknown.** The Nordic injury reduction comes from soccer and running sports. Sled work, backward walking, back extensions, and slant-board squats have capacity evidence but no gymnastics injury outcomes. The exercise sheets mark these as "Not well established" (27 such claims in `exercises.ts`).
- **No recovery ranges** are given on the 7 impingement cards. All 14 range fields are marked "Not given" because no reviewed source publishes a range that is safe to quote for young gymnasts.
- **Mirkin's 2014 page** is a personal website (drmirkin.com/?p=421, verified as an author page), not a peer-reviewed retraction. It is cited only as the author's own revised view.
- **The ATG ("Knees Over Toes Guy") material** is practitioner opinion. It is cited only to describe the method, never as evidence that it works.

### Visuals still pending

New figures from Gray's Anatomy 1918 (Wikimedia Commons, public domain). Each hosted copy's SHA-1 matched the Commons file, and the checks are logged in `media-verification-log.json`:
- Foot skeleton, inner side (plate 290), in `mov-foot-chain`.
- Hip joint with the labrum (plate 342), in `lib-impingement`.
- Shoulder joint with the acromion and coracoacromial ligament (plate 326), in `lib-impingement`.

As with the two ankle plates, "approved" means the build agent compared each plate to its printed labels. That is not a clinician review. These plates show normal anatomy only.

Still showing "Verified visual pending":
- `media-foot-pronation`: a three-plane pronation and supination diagram.
- `media-hip-cam-pincer`: cam and pincer hip shapes.
- `media-squat-knee-travel`: knee travel past the toes in a squat.
- The anterior and posterior ankle impingement sites in `lib-impingement`.

No suitable open-license image was found for any of these.

### Needs qualified medical review

- All 7 impingement cards. Especially: how coaches should talk about FAI on imaging versus FAI syndrome, which ankle impingement symptoms to refer, and the elbow lockout and wrist extension "what a coach can change" wording.
- The RICE lesson's circulation and compartment syndrome callout and scenario `sc-compartment`, checked against the gym's emergency action plan.
- The 5 new safety-critical questions: `cr-5` (circulation after icing or wrapping), `kt-6`, `pg-2`, `pg-5`, and `ee-4` (Jefferson curl contraindications).
- The Jefferson curl readiness and contraindication lists, and whether the gym wants it taught at all.
- The progression framework (`trn-progression`) and scenarios `sc-progress-step`, `sc-jefferson-request`, and `sc-growth-spurt`, especially the advice to hold load during growth spurts.
- The evidence label on each of the 11 exercises.

### Integration notes

- The "Learn the science (coach education)" button appears only on homework items that map to an exercise record (`exerciseLinks.ts`). It shows only when the active profile is a coach or admin, because `App.tsx` passes the handler only for `isCoachProfile`. Athletes and parents never get the button, and the Coach Ed routes still refuse them on the server.
- The Foundation drill deck has none of the 11 exercises, so there is no science link from Foundation drills. Adding one needs a matching Foundation drill first.
- The Advanced mastery level now also requires passing `training_science`. Mastery is computed from passed assessments each time it is read, so a coach who was at Advanced shows Proficient until they pass `training_science`. Their earlier attempts are kept.
- The coach-ed search jump (`mobileSearchNav`) can now carry an optional `lessonId`, which `CoachEdPanel` opens directly.
- Repo hygiene: the first expansion commit accidentally included local QA data from `data/`. That included `data/.accounts-merge-snapshot.json`, which the account store merges into live accounts on every read, so it would have added throwaway `@test.dev` logins to the gym. The next commit put every `data/` file back to its pre-expansion state, and `.gitignore` now excludes the snapshot, `data/history/`, and `data/skill-card-videos.json`. The net diff of this work under `data/` is empty, so a pull on the gym computer leaves its local data alone.

### Tests run (expansion)

- `npx tsc -b` and `npm run build`: clean.
- `npm run test:coach-ed`: 27 of 27 pass. 7 new expansion tests cover: evidence labels, limits, and contraindications on every exercise; the Jefferson curl being education only, caution-labeled, and not assignable; new catalog ids; safety callouts and the circulation emergency; no "ice definitely speeds or delays healing" claim; practitioner labels and the unverified Duke account; and the training_science assessment with the Advanced requirement.
- `npm run test:family-units`: passes.
- `npx oxlint`: the same 9 errors as before this work, in `server/persist.ts` and `DrillLibraryPanel.tsx`. No warnings on lines changed here.
- The v4 integration checks need their own server: set `SHAPE_LAB_TEST_URL` (this VM uses `http://127.0.0.1:43128`), use a fresh `data/` with `roster.example.json` copied to `roster.json`, and set the bootstrap admin env vars. Run them in order: access, then security, then family. Against a clean worktree at this commit, `test:v4-access`, `test:v4-security`, `test:v4-family`, and `test:v4-desk` all pass. Two caveats:
  - `test:v4-security` must run with `npx tsx scripts/v4-security-check.mjs`. `npm run test:v4-security` uses Node's type stripping, which fails on an extensionless import in `authSession.ts`.
  - Running the security check twice in a row trips the server's account-change rate limit.
  `test:v4-skill-goal` still points at a script that does not exist.
