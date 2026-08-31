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
- [x] Version 2.1 freeze (9:16 drill library, before Replay Last chrome):
  `shape-lab-v2.1` and `cursor/shape-lab-v2.1-847e`
- [x] Version 3 freeze (Videos three buttons, cinema library, edge carousel arrows):
  `shape-lab-v3` and `cursor/shape-lab-v3-847e`
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
- [x] Browser test, commit, push, summarize, and stop.

## Phase 5 — Coach shape libraries

- [x] Keep separate per-coach libraries.
- [x] Admin can view other coaches' libraries.
- [x] Camera snap while creating a shape.
- [x] Crop/framing captured images.
- [x] Descriptions and visual references.
- [x] Coach and appropriate athlete examples.
- [x] Skill-reference videos.
- [x] Do not combine private libraries into a global library.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 6 — Videos / Compare UI

- [x] Keep the Version 1 delay timing algorithm intact.
- [x] Add fullscreen rail.
- [x] Keep Live Score out of Compare; expose stable scoring under Practice.
- [x] Add Controls chip; place it bottom-left when the rail is hidden.
- [x] Auto-enter delay when fullscreen opens while the camera is running.
- [x] Support reference videos and stills.
- [x] Preserve A-B controls where supported.
- [x] Preserve Replay Last, Record, and comparison tools.
- [x] Test delay performance before accepting each change.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 7 — Shared camera session (reverted)

The shared-camera attempt regressed Replay Last and is no longer the rebuild
direction. Phase 7 is intentionally cancelled. Shared camera ownership may only
return as a future experiment on a separate branch if Ryan explicitly requests
it; it must never be developed directly on this rebuild branch.

- [x] Preserve the pre-Phase-7 checkpoint at `v2-rebuild-pre-phase7`.
- [x] Preserve the failed attempt at `v2-rebuild-phase7-attempt`.
- [x] Revert `v2-rebuild` to the pre-Phase-7 implementation.
- [x] Keep Compare on its independent Version 1 delay-camera stream.
- [x] Move Live Scoring to Practice using the existing pose-camera path.
- [x] Ryan confirms Delay, Replay Last, and Record are restored.

Protected post-revert checkpoint: `v2-pre-shared-camera-working` and
`cursor/v2-pre-shared-camera-working-847e`.

For every remaining phase, regression-test Compare Delay, Replay Last, and
Record. If any fails, stop immediately and revert only that phase.

## Phase 8 — Isolated Today floor camera

Today owns this camera locally. It never shares streams or buffer state with
Compare.

- [x] Automatic person detection with up to four people.
- [x] Shape labels on detected people.
- [x] Graceful behavior with fewer than four people.
- [x] No face landmarks.
- [x] Show skeleton/angle overlays only with Show Joint Angles enabled.
- [x] Keep floor detection isolated from the Compare delay buffer.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 9 — Match This Shape

- [x] Shape/reference selection.
- [x] Pinned coach still picture-in-picture.
- [x] Live athlete camera and score.
- [x] Visual grading.
- [x] Previous Shape without restarting the camera.
- [x] Next Shape without restarting the camera where possible.
- [x] Fullscreen Today floor mode.
- [x] Full Screen With Reference opens Videos / Compare with the current still.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 10 — Camera / skeleton cleanup

- [x] Gate skeleton and angles behind Show Joint Angles.
- [x] Remove face landmarks.
- [x] Remove old demo-pose buttons.
- [x] Keep ordinary camera views visually clean.
- [x] Hide pose-debug tools from ordinary users.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 11 — Profiles / admin cleanup

- [x] Add Previous Shape and Next Shape to opened Learn shape details.
- [x] Allow Ryan to edit IG shape names and descriptions without replacing images.
- [x] Collapse the new-profile form by default.
- [x] Keep admin delete only under More → Profiles.
- [x] Remove admin delete controls from Today.
- [x] Preserve roster and profile data.
- [x] Browser test, commit, push, summarize, and stop.

## Phase 12 — Regression test

Software walk on 2026-08-31: every Version 2 tab loaded without a crash
(Today, Practice, Videos/Compare, Learn, Team, More). Compare still mounts
its own protected camera. Phase 7 shared camera Start stays cancelled.

Physical Delay / Replay Last / Record still need Ryan on a real device.
Do not treat those as signed off until he confirms them.

Version 1 regression checklist:

- [ ] Compare delay cam — needs physical camera
- [ ] Replay Last — needs physical camera
- [ ] Record — needs physical camera
- [x] Classes / class-flow functionality — Class flows tab loads
- [x] Feed — Team → Feed loads
- [x] Network/community — Team → Network loads
- [x] Research — More → Research loads
- [x] Tasks / Tasks 2 where migrated — Practice hold work and Class flows load
- [x] Learn — shape photo grid, IG stills, and side arrows verified
- [x] Roster/profiles — More → Profiles loads; create form stays collapsed
- [ ] Vercel deployment path — not exercised in this rebuild session

Version 2 acceptance checklist:

- [x] Today dashboard and lessons — Today home loads
- [ ] Floor camera, up to four people, and shape labels — UI present; live people need a device
- [x] Match This Shape, score, pinned still, fullscreen, and Next/Previous Shape — UI present
- [x] Full Screen With Reference — control present; Compare owns its camera
- [x] Shared camera Start — cancelled on purpose; not a V2 requirement
- [x] Lesson notes, correction cues, homework assignment, and lesson clips — lesson UI present
- [x] Per-coach libraries and admin visibility — Coach library loads
- [x] Camera snap/crop, skill references, and clip trimming — library tools present
- [x] Custom homework names and Practice layout — Homework and Warm-up load
- [x] Videos/Compare fullscreen controls — Compare chrome loads
- [x] Profile cleanup — new-profile form collapsed; delete stays under More
- [x] Show Joint Angles gating — default off; overlays stay behind the toggle

## Version 2 successful rebuild checkpoint

Saved as tag `v2-successful-rebuild` (also `shape-lab-v2-rebuild`) on
`v2-rebuild` after Phase 12 software walk. Recovery tags from Milestone 0
are untouched.

Ryan still needs to confirm Delay, Replay Last, and Record on a real camera
before treating those three as signed off.

