# Coach stills (shipped in the app)

The pictures Ryan provided live in **two places so every link shows them**:

- `src/assets/references/` — bundled into the app (this is the source of truth)
- `public/references/` — same files served at `/references/...`

Written body-position copy lives in `src/config/shapes.ts` (`bodyPosition`, `coachNotes`).

Hit snapshots from the camera go in the athlete **hit folder**, not here.

Included:

- `c_shape.jpg`
- `passe.jpg`
- `feet_together_open_shoulders.jpg`
- `lunge_start.jpg`
- `lunge_land.jpg` (also used for Lunge · open shoulders — same position)
- `lever.jpg`
- `handstand.jpg`
- `arch.jpg`
- `candlestick.jpg`
- `candlestick_drill.jpg`
- `tucked_candle.jpg` (main)
- `tucked_candle_b.jpg`
- `hollow_arms_down.jpg`
- `hollow_arms_up.jpg`
- `zombie.jpg`
- `pike_zombie_arms.jpg`
- `hands_push_through.jpg`
- `pike_open_shoulders.jpg`
- `pike_open_shoulders_class.jpg`
- `tuck_open_shoulders.jpg`
- `tuck_open_shoulders_b.jpg`
- `tuck_open_shoulders_class.jpg`
- `mountain_climber.jpg`
- `stand_clean.jpg`
- `superman.jpg`
- `rainbow_bridge.jpg`
- `long_bridge.jpg`
- `side_plank_left.jpg`
- `side_plank_right.jpg`

To add another still: drop a JPG in both folders, add the shape id in
`src/lib/shippedRefs.ts` (`SHIPPED_FILES`).
