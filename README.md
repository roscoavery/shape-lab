# Shape Lab

Free, browser-based gymnastics coaching prototype. Uses your device camera and **MediaPipe Pose** (runs locally in the browser — no paid APIs) to:

- Detect body landmarks and draw a skeleton overlay
- Calculate live joint angles
- Grade gymnastics shapes from **0–100** with per-criterion scores
- Track **total hold time** vs **quality hold time** (only while above a score threshold)
- Run an ordered **athlete Tasks curriculum** (5s holds → 3s after mastery)
- **Learn** shapes and pathways without a camera (Education tab)
- **Compare** reference videos side-by-side with a delay cam, attempt recording, and frame-by-frame replay
- Speak live corrections (toggleable voice coaching)
- Save attempts, progress, and reference photos in the browser (`localStorage`)
- Run simple multi-shape **sequences**

## Quick start

```bash
npm install
npm run dev
```

Then open **http://127.0.0.1:43127** on your computer.

Allow camera permission when the browser asks. Click **Start camera**.

### On your phone (same Wi‑Fi)

1. Run `npm run dev` on your computer.
2. Note the Network URL Vite prints (e.g. `http://192.168.x.x:43127`).
3. Open that URL on your phone.

**Camera note:** Browsers require a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) for `getUserMedia`. `localhost` works on the computer. Over a LAN IP, many phones block the camera on plain `http`. Options:

- Use the computer’s webcam first to test scoring.
- Tunnel with something like [ngrok](https://ngrok.com/) / Cloudflare Tunnel for HTTPS on your phone.
- Or serve with HTTPS locally (advanced).

## Athlete Tasks pathway

1. Open the **Tasks** tab (primary).
2. Create / select an athlete.
3. Work through the ordered curriculum — later tasks stay locked until the previous one is completed at least once.
4. Hold times: **5 seconds** until the task is mastered (`masterAfterCompletions`), then **3 seconds**.
5. Toggle **Voice** to hear spoken corrections (~every 4s) on steps marked `speakCorrections`.
6. Upload a **reference photo** (shared for the shape, or athlete-specific) — it appears beside the camera while training.

Optional default images (if you drop files into the repo):

```text
public/references/feet_together_open_shoulders.jpg
public/references/lunge_start.jpg
public/references/lever.jpg
public/references/lunge_land.jpg
```

Curriculum order is edited in `src/config/curriculum.ts`.

## Homework (per-athlete drill library)

Every athlete automatically has **4 lifetime drills** (they can never be removed):

1. **Hollow body hold — arms down** (`hollow_arms_down`) — lower back pressed down, arms by sides. When the best **quality hold reaches 60s**, the app prompts to **level up to Hollow with arms up** (`hollow`, arms by ears) — one click switches the drill and keeps all history.
2. **Superman** — straight arms behind ears, chin off chest (head neutral), straight knees off the floor, feet & ankles together, toes pointed.
3. **Side plank** — log left / right / both sides; per-side bests are tracked.
4. **Wall handstand** — time + quality, same standards as freestanding.

On top of that, the **coach can assign** any shape from the library as homework, and the **athlete can self-select** drills too ("Coach assigns" / "Athlete picks" when adding).

**Camera sessions (primary, encouraged):**

1. Open the **Homework** tab, pick an athlete.
2. Press **Train** on a drill — the camera scores that shape live with two timers: **Total hold** and **Proper hold** (time at/above the **form standard**, default **85**, editable per drill in the session box).
3. While form drops below the standard, the app **speaks the main correction** (~4s throttle, reuses the Voice toggle in the camera bar) and records a **form-breakdown event** — seconds into the hold, which criterion failed, and the coach cue. When form is good it stays quiet apart from occasional encouragement.
4. Press **Log session** — date, total hold, proper hold, score, form standard, side, and breakdowns are saved to `localStorage`. Breakdowns are reviewable per session in history (e.g. `0:42 — Hips: Open hips / reduce pike`).

**Manual logging (secondary):** press **Log manually** on any drill to type a hold time with an editable date (defaults to today). Manual sessions are flagged `method: 'manual'`, get a **manual** badge in history, and only count total time — no proper-hold data, so they don't feed the trend or the hollow level-up.

Each drill card shows **best proper hold** (legacy v1 quality-hold logs still count), session count, a proper-hold **trend sparkline**, and the last 5 sessions.

Data lives in `src/lib/storage.ts` (`HomeworkItem` / `HomeworkLog` / `HomeworkBreakdown`); the auto drills are defined in `AUTO_HOMEWORK_DEFS`, the 60s hollow level-up gate in `HOLLOW_PROGRESS_TARGET_SECONDS`, and the default form standard in `DEFAULT_FORM_STANDARD`.

## Education (Learn tab)

Athletes and parents can study body positions **without setting up a camera**:

1. Open the **Learn** tab.
2. **Shape library** — browse all shapes (filter to pathway-only). Each shape shows description, tips, key criteria with coach-friendly targets/cues, quality threshold, and a reference photo when available (uploaded shared ref or `public/references/…`).
3. **Task pathways** — walk the 12 curriculum tasks in order, see unlock story (what comes next), step-by-step shapes with beginner/mastered hold times, pass-through notes, and voice-correction flags. Tap a step to open that shape’s education page.

“How to hit this shape” copy is derived from `tips` and criterion `feedbackLow` / `feedbackHigh` in `src/config/shapes.ts` — coaches still edit scoring there.

## Compare (video study tab)

Side-by-side technique study: a **reference video** (the technique to copy) next to the **athlete camera** (live view, delay cam, or recorded replay). Stacks vertically on phones. Everything is stored on this device (IndexedDB — video blobs are too big for localStorage).

### The Instagram constraint (honest version)

Instagram does **not** offer a free public API to log in and read your saved collections — the Basic Display API was shut down, oEmbed requires app review, and scraping violates their Terms of Service. So Compare implements the closest free, legal workflow:

1. **Paste an Instagram post/reel URL** — shown via Instagram's public embed. View-only: embeds can't be frame-scrubbed, slow-mo'd, or reliably auto-looped, and private posts won't render.
2. **Upload a video file** (mp4/mov/webm) or **paste a direct video URL** — full control: loop, frame-by-frame scrub, 0.25x/0.5x/1x speed, A/B loop region. **Recommended:** screen-record or download your own IG videos and upload them here.
3. Organize references into named **collections** (stored locally in IndexedDB).

### Athlete camera side

- **Live** — plain camera view (no pose detection needed here), mirror toggle.
- **Delay cam** — adjustable 2–10s delay (MediaRecorder timeslice chunks fed into a MediaSource buffer playing behind live). The athlete performs, then watches themselves N seconds later without touching the device. Needs a browser where MediaRecorder and MediaSource share a codec (Chrome / Edge / Firefox).
- **Record** — capture attempts with MediaRecorder; the last 12 clips are kept in IndexedDB (oldest pruned automatically).
- **Replay** — pick a recorded attempt and scrub frame-by-frame (slider + step buttons) at 0.25x/0.5x/1x, next to the looping reference.

### Recommended coach workflow

1. Screen-record (or download) the IG technique video you want athletes to copy.
2. Upload it into a Compare collection (e.g. "Back handspring refs").
3. Set an A/B loop around the key phase; slow to 0.5x.
4. Athlete performs in front of the camera with **Delay cam** at ~5s — they walk over and watch themselves hands-free.
5. For detailed review, **Record** the attempt and scrub the replay frame-by-frame beside the reference.

## First test: Handstand

1. Create an athlete under **Athlete profile**.
2. Open **Coach**, leave **Shape** on **Handstand** (default), or jump there from Tasks.
3. Click **Demo: good HS** to see scoring without a camera, or **Start camera** and film from the **side**.
4. Watch Overall + Shoulders / Elbows / Hips / Knees / Body line / Head / Feet.
5. Hold above the quality threshold (default 70) to grow **Quality hold**.
6. Click **Save attempt**, then open the **Athletes** tab for progress history.

**Demo: needs work** injects a broken handstand so you can see main corrections fire.

## Edit scoring (for coaches)

All shape standards live in one file:

```text
src/config/shapes.ts
```

Each shape has reusable criteria (`elbows straight`, `shoulders open`, `body verticality`, …) with:

| Field | Meaning |
|--------|---------|
| `target` / `targetMin`–`targetMax` | Ideal value or range |
| `tolerance` | Still scores 100 inside this band |
| `falloff` | How fast score drops outside the band |
| `weight` | Importance in the overall score |
| `feedbackLow` / `feedbackHigh` | Coach cue; use `{delta}` for degrees |

**Handstand** is the most complete example (left/right helpers + composites). Copy it when adding shapes.

- Curriculum: `src/config/curriculum.ts`
- Sequences: `src/config/sequences.ts` (legacy `lunge` id still works alongside `lunge_start` / `lunge_land`)

## Project layout

```text
src/
  config/shapes.ts       ← edit scoring standards here
  config/curriculum.ts   ← athlete task pathway
  config/sequences.ts    ← edit drill sequences here
  lib/scoring.ts         scoring engine
  lib/angles.ts          joint / segment math
  lib/pose.ts            MediaPipe setup
  lib/storage.ts         localStorage (athletes, progress, refs)
  lib/clipStore.ts       IndexedDB (Compare collections + recorded clips)
  components/compare/    Compare tab (reference player, delay cam, replay)
  hooks/useSpeechCoach.ts
  components/TaskTrainer.tsx
  components/EducationPanel.tsx  Learn tab (shapes + pathways)
  lib/educationCopy.ts   readable cues from criteria
  App.tsx                main UI (Tasks | Homework | Learn | Compare | Coach | Athletes | About)
public/references/       optional default coach photos
```

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4
- `@mediapipe/tasks-vision` Pose Landmarker (lite model)

## Roadmap (architecture hooks)

Cartwheel gaze/hands, roundoff segmentation, rolls, V-ups, drills library, richer education media, athlete folders/groups, parent sharing — not built yet; shape/sequence/curriculum config is designed so new shapes drop in without rewriting the app.
