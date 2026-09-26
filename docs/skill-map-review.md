# Skill map review — Phase 0 (2026-09-26)

One row per unified skill. Ryan: the **Review notes** column is what needs your eyes.
Anything marked "—" merged cleanly with no judgment calls.

- Records: 34
- Flagged for review: 33
- Sources: catalog = athlete goal picker (`skillGoalCatalog.ts`), seed = coach progression data (`skillPathSeed.ts`), guide = Learn guide cards (`ryanSkillPath.ts`)
- Track source is shown in the review notes when it was inferred or conflicted.

| Unified ID | Name | Guide ID | Sources | Track | Review notes |
|---|---|---|---|---|---|
| `skl_ro_bhs_tuck` | Round-off handspring back tuck | `back-tuck` | catalog + seed + guide | running | Bare "back tuck" resolves here (running), not standing tuck, per Ryan 2026-09-26. |
| `skl_ro_bhs_full` | Round-off handspring full twisting layout | `full` | catalog + seed + guide | running | Catalog label "Ro hs full" kept as alias. |
| `skl_standing_tuck` | Standing back tuck | `standing-tuck` | catalog + seed + guide | standing | Bare "back tuck" moved to ro_bhs_tuck per Ryan 2026-09-26. |
| `skl_standing_full` | Standing full | `standing-full` | catalog + seed + guide | standing | Catalog label "Full" kept as alias. |
| `skl_layout` | Layout | `layout` | catalog + seed + guide | running | Confirmed by Ryan 2026-09-26. |
| `skl_ro_bhs_series` | Round-off back handspring series | `ro-bhs-series` | catalog + seed + guide | running | — |
| `skl_ro_bhs` | Round-off back handspring | `ro-bhs` | catalog + seed + guide | running | Catalog label "Round off back handspring" kept as alias. |
| `skl_standing_bhs` | Standing back handspring | `standing-bhs` | catalog + seed + guide | standing | Catalog label "Back Handspring" kept as alias. |
| `skl_standing_layout` | Standing layout | — | seed | standing | No guide card yet and no catalog choice. Ryan to write a card or confirm it stays progression-only. |
| `skl_standing_double` | Standing double | — | seed | standing | No guide card yet and no catalog choice. |
| `skl_ro_bhs_rebound` | Round-off handspring that can rebound | — | seed | running | No guide card yet. Track inferred as running. |
| `skl_tramp_tuck_from_hs` | Back tuck on tramp from a handspring or round-off | — | seed | running | No guide card yet. Track inferred as running. |
| `skl_tramp_bounce_tuck` | Standalone back tuck from bounces on tramp | — | seed | running | No guide card yet. Track inferred as running. |
| `skl_tramp_full` | Full on trampoline | — | seed | running | No guide card yet. Track inferred as running. |
| `skl_standing_open_tuck` | Standing open tuck | — | seed | standing | No guide card yet. Track inferred as standing. |
| `skl_tuck_up_raised` | Back tuck up a knee-high raised surface | — | seed | standing | No guide card yet. Track inferred as standing. |
| `skl_back_walkover` | Back walkover | `back-walkover` | catalog + guide | standing | No structured progression data yet (needs/conditioning). Confirm unified name "Back walkover". |
| `skl_front_walkover` | Front walkover | `front-walkover` | catalog + guide | walking | Track conflict resolved: walking (guide wins). Ryan: walkovers are their own thing, nobody specifies standing/walking. No progression data yet. |
| `skl_strong_round_off` | Round off | `round-off` | catalog + guide | running | Confirmed by Ryan 2026-09-26: the skill is Round off, "strong" is a qualifier not a separate skill. No progression data yet. |
| `skl_double_full` | Double full | `double-full` | catalog + guide | running | Catalog label "Ro hs double full" kept as alias. No progression data yet. |
| `skl_front_handspring` | Front handspring | — | catalog | running | No guide card and no progression data yet. |
| `skl_arabian` | Arabian | — | catalog | running | No guide card and no progression data yet. |
| `skl_front_tuck` | Front tuck | — | catalog (as punch front) | running | Punch front = front tuck per Ryan 2026-09-26, merged. No guide card yet. |
| `skl_back_bend` | Back bend | — | catalog | foundation | Moved to foundation track per Ryan 2026-09-26. Its own skill, not just a foundation drill. No guide card and no progression data yet. |
| `skl_standing_bhs_series` | Back handspring series | — | catalog | standing | No guide card and no progression data yet. |
| `skl_double_back` | Double back | `double-back` | guide | running | No catalog choice and no progression data yet. |
| `skl_triple_full` | Triple full | `triple-full` | guide | running | No catalog choice and no progression data yet. |
| `skl_back_half` | Back layout with half to feet | `back-half` | guide | running | No catalog choice and no progression data yet. |
| `skl_barani` | Front barani (front layout half) | `barani` | guide | running | No catalog choice and no progression data yet. |
| `skl_cart_double_full` | Cart double full | `cart-dub` | guide | walking | No catalog choice and no progression data yet. |
| `skl_cart_full` | Cart full | `cart-full` | guide | walking | No catalog choice and no progression data yet. |
| `skl_cart_tuck` | Cart tuck | `cart-tuck` | guide | walking | No catalog choice and no progression data yet. |
| `skl_cartwheel_handspring` | Cartwheel handspring | `cartwheel-handspring` | guide | walking | No catalog choice and no progression data yet. |
| `skl_foundations` | Foundations | `basics` | guide | foundation | Guide id is "basics", display name is "Foundations". No catalog choice and no progression data yet. |

## Coverage check

- Catalog choices (non-"Other"): 17 → all mapped above
- Seed skills: 16 → all mapped above
- Guide steps: 21 → all mapped above
- Added per Ryan 2026-09-26 (no guide card yet, placed near relatives): front tuck, front layout, side aerial, front aerial, back aerial
- Added per Ryan 2026-09-26 (aerial prerequisites): cartwheel, one-arm cartwheel, dive cartwheel, back handspring step out, back 1.5
- Punch front merged into front tuck (they are the same skill)

## Prerequisite relationships (captured 2026-09-26, to be structured in Phase 3)

- Aerials require: strong cartwheel, one-arm cartwheel close arm, one-arm cartwheel far arm, dive cartwheel
- Front aerial requires: front walkover up 4 inch raised surface, side aerial
- Back aerial requires: back handspring step out
- Front layout requires: front tuck, front pike
- Arabian sits above front tuck in progression order
- Back 1.5 sits above full twisting layout in progression order
- Coaching note (for guide cards): stepping out of a forward-landing skill (front tuck, arabian, 1.5) requires overrotating the skill

## Category structure (captured 2026-09-26)

Ryan's taxonomy for organizing skills into boxes:

- **Foundations** (bottom layer): shapes — passe, lunges, lever, handstand shapes, hollow, superman, sideplank, mad cat, front support, side support, rainbow bridge, long bridge, tucked candle, open shoulder pike, tuck shape, tight arch
- **Rolls** (own box): backward roll, back roll to push up, back extension roll (bent/straight arms as variations), fwd roll, handstand fwd roll (bent/straight as variations), dive roll, 360 dive roll, straddle fwd roll, straddle backward roll, front pike roll, back pike roll
- **Handstands** (own box): all handstand variations grouped together
- **Cartwheels** → **Aerials** above cartwheels, but aerials are terminal — not prerequisites for anything above them

Open question: foundation shapes overlap with the existing shape library (hollow, superman, etc. already exist as shapes with stills). Should foundation entries link to the shape library records instead of duplicating them?

**Resolved 2026-09-26: yes, link them.** Ryan confirmed foundations link directly to shape library records.

## Shape ladders (captured 2026-09-26)

Shapes have their own internal regression ladders. Example — hollow (easiest to hardest):
1. Curl up
2. Bent knee tucked hollow
3. Hollow arms down
4. Hollow arms up

Model implication: a skill record links to a shape library record via `shapeId`, and the shape's ladder (ordered regressions) becomes its progression. Variations aren't just a flat list — they're an ordered ladder. This is how "the hollow has its own ladder" works once the shape library and skill path connect.
- Cue swaps: intentionally excluded (separate content, not skills)
