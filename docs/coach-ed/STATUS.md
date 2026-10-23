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

- 98 questions across 21 topics (22 safety-critical), each with difficulty tag, at least one verified source, and an explanation. 13 assessments. Pass mark 85 percent, configurable by admin between 50 and 100 (default 85). Every critical question in an assessment is always drawn and must be right regardless of score.
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
- Pushing: this VM has no credentials for the GitHub remote, so commits were pushed to the Cursor remote on branch `cursor/coach-education-847e`. `git push github shape-lab-v4` still needs to be run from a machine with GitHub access (4 commits ahead plus this report).

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
