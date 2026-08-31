# Shape Lab Version 2 Rebuild Plan

This branch rebuilds Version 2 incrementally around the known-good Version 1
delay camera. Stable Version 1 features are preserved and reused rather than
rewritten.

## Recovery points

- [x] Version 1 source snapshot: `shape-lab-v1` and
  `cursor/shape-lab-v1-847e` at `2443d10`
- [x] Exact pre-rebuild working tree and local data:
  `v1-working-delaycam` and `cursor/v1-working-delaycam-847e` at `26e2a23`
- [x] Earlier Version 2 history: `shape-lab-v2` and
  `cursor/shape-lab-v2-847e` at `087bf53`
- [x] Rebuild branch created: `v2-rebuild`
- [x] Reflogs, stashes, unreachable objects, local branches, tags, and remote
  refs inspected before editing

Do not delete, retarget, or force-update any recovery tag or checkpoint branch.
Earlier Version 2 is reference material only; changes must be selectively
reimplemented and tested rather than blindly restored.

## Development rules

- [ ] Keep Compare delay cam, Replay Last, Record, and existing camera behavior
  working throughout the rebuild.
- [ ] Do not refactor the Version 1 camera core merely for code style.
- [ ] Make small, targeted, backward-compatible changes.
- [ ] Preserve local storage, roster, saved videos, homework, libraries, and
  user content.
- [ ] Keep old components until replacements are proven.
- [ ] Commit and push after every major milestone.
- [ ] At each camera milestone, stop for browser verification before proceeding.
- [ ] If delay performance regresses, revert only the offending change to the
  latest known-good checkpoint.

## Milestone 0 — Safety and documentation

- [x] Inspect Git status, branch, recent commits, branches, tags, reflogs,
  stashes, remotes, and unreachable objects.
- [x] Permanently preserve the exact working Version 1 tree and data.
- [x] Verify the earlier Version 2 branch, tag, and full commit chain.
- [x] Create and push `v2-rebuild`.
- [x] Add this rebuild plan.
- [x] Document the protected camera architecture in `CAMERA_ARCHITECTURE.md`.
- [x] Ryan confirms the recovery points and authorizes Phase 1.

## Phase 1 — Navigation and safe shell

Target navigation:

- Today
- Practice
- Videos
- Learn
- Team
- More

Checklist:

- [x] Add the new shell without deleting Version 1 screens or data.
- [x] Map Homework, Warm-up boards, Class flows, hold challenges, and
  body-position work into Practice.
- [x] Map Compare, delay camera, Replay Last, Record, references, saved clips,
  and IG/reference library into Videos.
- [x] Map shape library, descriptions, references, quizzes, and skill education
  into Learn.
- [x] Map athlete/coach profiles, progress, assignments, and appropriate
  feed/network views into Team.
- [x] Map Research, profile/admin management, About, and administration into
  More.
- [x] Confirm direct access to migrated Version 1 functionality.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 2 — Today dashboard

- [x] Open the app into Today rather than Tasks.
- [x] Add today/lesson board and active lesson access.
- [x] Show recent athlete or lesson context.
- [x] Add quick access to camera/session tools.
- [x] Add lesson-plan and current-lesson entry points.
- [x] Preserve all Version 1 features.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 3 — Lesson system

- [x] Lesson plans.
- [x] Live lesson workspace.
- [x] Lesson review.
- [x] Notes filed by skill.
- [x] Tap-to-file correction cues.
- [x] Assign homework directly from a lesson.
- [x] Associate lesson clips with athlete, skill, and date.
- [x] Trim lesson clips into named references.
- [x] Skill-reference videos in coach libraries.
- [x] Hide generic lunge, bridge, and arm-position lesson picks where
  appropriate without removing those shapes elsewhere.
- [x] Keep data models backward-compatible.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 4 — Practice

- [x] Homework.
- [x] Warm-up boards.
- [x] Class flows.
- [x] Hold tracking.
- [x] Assigned shape work.
- [x] Existing shape/task homework selection.
- [x] Typed custom homework using `custom:` names.
- [x] Athlete assignment and progress tracking.
- [x] Preserve existing homework data.
- [ ] Browser test, commit, push, summarize, and stop.

## Phase 5 — Coach shape libraries

- [ ] Keep separate per-coach libraries.
- [ ] Admin can view other coaches' libraries.
- [ ] Camera snap while creating a shape.
- [ ] Crop/framing captured images.
- [ ] Descriptions and visual references.
- [ ] Coach and appropriate athlete examples.
- [ ] Skill-reference videos.
- [ ] Do not combine private libraries into a global library.
- [ ] Browser test, commit, push, summarize, and stop.

## Phase 6 — Videos / Compare UI

- [ ] Keep the Version 1 delay timing algorithm intact.
- [ ] Add fullscreen rail.
- [ ] Add Live Score.
- [ ] Add Controls chip; place it bottom-left when the rail is hidden.
- [ ] Auto-enter delay when fullscreen opens while the camera is running.
- [ ] Support reference videos and stills.
- [ ] Preserve A-B controls where supported.
- [ ] Preserve Replay Last, Record, and comparison tools.
- [ ] Test delay performance before accepting each change.
- [ ] Browser test, commit, push, summarize, and stop.

## Phase 7 — Shared camera session

- [ ] Introduce a shared camera/session manager only after Phase 6 is reliable.
- [ ] Keep the legacy Compare-owned stream available as a fallback.
- [ ] Use one physical camera stream for Today and Compare when possible.
- [ ] Prevent duplicate `getUserMedia` calls.
- [ ] Prevent one consumer from accidentally stopping another consumer's stream.
- [ ] Keep the session safe across component mount/unmount.
- [ ] Preserve delay buffer, Replay Last, and Record.
- [ ] Expose camera-session status if useful.
- [ ] Test Compare delay after every session-layer change.
- [ ] Make frequent commits; summarize and stop at each risky camera gate.

## Phase 8 — Today floor camera

- [ ] Automatic person detection with up to four people.
- [ ] Shape labels on detected people.
- [ ] Graceful behavior with fewer than four people.
- [ ] No face landmarks.
- [ ] Show skeleton/angle overlays only with Show Joint Angles enabled.
- [ ] Keep floor detection isolated from the Compare delay buffer.
- [ ] Browser test, commit, push, summarize, and stop.

## Phase 9 — Match This Shape

- [ ] Shape/reference selection.
- [ ] Pinned coach still picture-in-picture.
- [ ] Live athlete camera and score.
- [ ] Visual grading.
- [ ] Next Shape without restarting the camera where possible.
- [ ] Fullscreen Today floor mode.
- [ ] Full Screen With Reference opens Videos / Compare with the current still.
- [ ] Browser test, commit, push, summarize, and stop.

## Phase 10 — Camera / skeleton cleanup

- [ ] Gate skeleton and angles behind Show Joint Angles.
- [ ] Remove face landmarks.
- [ ] Remove old demo-pose buttons.
- [ ] Keep ordinary camera views visually clean.
- [ ] Hide pose-debug tools from ordinary users.
- [ ] Browser test, commit, push, summarize, and stop.

## Phase 11 — Profiles / admin cleanup

- [ ] Collapse the new-profile form by default.
- [ ] Keep admin delete only under More → Profiles.
- [ ] Remove admin delete controls from Today.
- [ ] Preserve roster and profile data.
- [ ] Browser test, commit, push, summarize, and stop.

## Phase 12 — Regression test

Version 1 regression checklist:

- [ ] Compare delay cam
- [ ] Replay Last
- [ ] Record
- [ ] Classes / class-flow functionality
- [ ] Feed
- [ ] Network/community
- [ ] Research
- [ ] Tasks / Tasks 2 where migrated
- [ ] Learn
- [ ] Roster/profiles
- [ ] Vercel deployment path

Version 2 acceptance checklist:

- [ ] Today dashboard and lessons
- [ ] Floor camera, up to four people, and shape labels
- [ ] Match This Shape, score, pinned still, fullscreen, and Next Shape
- [ ] Full Screen With Reference
- [ ] Shared camera Start
- [ ] Lesson notes, correction cues, homework assignment, and lesson clips
- [ ] Per-coach libraries and admin visibility
- [ ] Camera snap/crop, skill references, and clip trimming
- [ ] Custom homework names and Practice layout
- [ ] Videos/Compare fullscreen controls
- [ ] Profile cleanup
- [ ] Show Joint Angles gating

