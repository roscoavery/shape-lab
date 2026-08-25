# Shape Lab

Free, browser-based gymnastics coaching prototype. Uses your device camera and **MediaPipe Pose** (runs locally in the browser — no paid APIs) to:

- Detect body landmarks and draw a skeleton overlay
- Calculate live joint angles
- Grade gymnastics shapes from **0–100** with per-criterion scores
- Track **total hold time** vs **quality hold time** (only while above a score threshold)
- Run an ordered **athlete Tasks curriculum** (5s holds → 3s after mastery)
- **Learn** shapes and pathways without a camera (Education tab)
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

## Education (Learn tab)

Athletes and parents can study body positions **without setting up a camera**:

1. Open the **Learn** tab.
2. **Shape library** — browse all shapes (filter to pathway-only). Each shape shows description, tips, key criteria with coach-friendly targets/cues, quality threshold, and a reference photo when available (uploaded shared ref or `public/references/…`).
3. **Task pathways** — walk the 12 curriculum tasks in order, see unlock story (what comes next), step-by-step shapes with beginner/mastered hold times, pass-through notes, and voice-correction flags. Tap a step to open that shape’s education page.

“How to hit this shape” copy is derived from `tips` and criterion `feedbackLow` / `feedbackHigh` in `src/config/shapes.ts` — coaches still edit scoring there.

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
  hooks/useSpeechCoach.ts
  components/TaskTrainer.tsx
  components/EducationPanel.tsx  Learn tab (shapes + pathways)
  lib/educationCopy.ts   readable cues from criteria
  App.tsx                main UI (Tasks | Learn | Coach | Athletes | About)
public/references/       optional default coach photos
```

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4
- `@mediapipe/tasks-vision` Pose Landmarker (lite model)

## Roadmap (architecture hooks)

Cartwheel gaze/hands, roundoff segmentation, rolls, V-ups, drills library, richer education media, athlete folders/groups, parent sharing — not built yet; shape/sequence/curriculum config is designed so new shapes drop in without rewriting the app.
