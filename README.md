# Shape Lab

Free, browser-based gymnastics coaching prototype. Uses your device camera and **MediaPipe Pose** (runs locally in the browser — no paid APIs) to:

- Detect body landmarks and draw a skeleton overlay
- Calculate live joint angles
- Grade gymnastics shapes from **0–100** with per-criterion scores
- Track **total hold time** vs **quality hold time** (only while above a score threshold)
- Run a **12-task athlete curriculum** (Tasks tab) with adaptive 5s→3s holds, voice coaching, and reference photos
- Save attempts, athlete profiles, and task progress in the browser (`localStorage` / IndexedDB)
- Run simple multi-shape **sequences** (Coach tab)

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

## Athlete tasks (primary mode)

1. Open the **Tasks** tab (default).
2. Create / select an athlete.
3. Work through the locked pathway — each task unlocks after the previous is completed once.
4. First clears use **5s** quality holds; after ~2 completions, holds drop to **3s**.
5. Toggle **Voice coaching** for spoken corrections (throttled ~4s), especially on lunges.
6. Upload a **reference photo** (per athlete or shared per shape) for athletes to match.

Curriculum order lives in `src/config/curriculum.ts` (stand clean → FTOS → passé → starting lunge → lever → handstand → landing lunge → sequences → C shape → mountain climber → final MC sequence with pass-through lever).

## First test: Handstand (Coach tab)

1. Create an athlete under **Athlete profile**.
2. Open **Coach**, leave **Shape** on **Handstand**.
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

- Sequences: `src/config/sequences.ts`
- Curriculum pathway: `src/config/curriculum.ts`

## Project layout

```text
src/
  config/shapes.ts      ← edit scoring standards here
  config/sequences.ts   ← edit drill sequences here
  config/curriculum.ts  ← athlete task pathway (12 tasks)
  lib/scoring.ts        scoring engine
  lib/angles.ts         joint / segment math
  lib/pose.ts           MediaPipe setup
  lib/storage.ts        localStorage athletes, progress, refs
  hooks/useSpeechCoach.ts  throttled voice cues
  components/           camera, scores, TaskTrainer, …
  App.tsx               main UI (Tasks / Coach / Athletes)
```

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4
- `@mediapipe/tasks-vision` Pose Landmarker (lite model; prefer `/public/models/pose_landmarker_lite.task`)

## Roadmap (architecture hooks)

Cartwheel gaze/hands, roundoff segmentation, rolls, V-ups, drills library, progression roadmaps, education pages, athlete folders/groups, parent sharing — shape/sequence/curriculum config is designed so new shapes drop in without rewriting the app.
