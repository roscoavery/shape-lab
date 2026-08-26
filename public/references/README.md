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
- `lunge_land.jpg`
- `lever.jpg`
- `handstand.jpg`
- `candlestick.jpg`
- `hollow_arms_down.jpg`
- `hollow_arms_up.jpg`
- `zombie.jpg`
- `mountain_climber.jpg`

To add another still: drop a JPG in both folders, add the shape id in
`src/lib/shippedRefs.ts` (`SHIPPED_FILES`).
