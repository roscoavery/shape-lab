# Shape Lab

Free, browser-based gymnastics coaching prototype. Uses your device camera and **MediaPipe Pose** (runs locally in the browser — no paid APIs) to:

- Detect body landmarks and draw a skeleton overlay
- Calculate live joint angles
- Grade gymnastics shapes from **0–100** with per-criterion scores
- Track **total hold time** vs **quality hold time** (only while above a score threshold)
- Run an ordered **athlete Tasks curriculum** (standalone holds 5s → 3s after mastery; sequences always 3s)
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
4. Hold times: **standalone shapes** need **5 seconds** the first times through, then **3 seconds** after the task is mastered. **Sequences** (FTOS → passé → lunge → lever → …) always use **3 second** holds. **Freestanding handstand is not a gate** — you get **3 kick-up tries**, we grade the best line in the task analysis, and you move on. Wall handstand stays on Homework.
5. Press **Start pathway** once (Voice on). On the FTOS → passé → lunge → lever → handstand → landing lunge sequences, stay in **profile** — FTOS does not need you to face the camera. The coach talks you through the holds (including 3-2 counts and “kick up to the best handstand you can hit”). After the task you get a **written analysis** of every shape — including the handstand — with corrections to read. A yellow **App not working right? Try the next task** button stays at the top of Tasks if scoring gets stuck (plus **Skip this shape** during a run).
6. Upload a **reference photo** (shared for the shape, or athlete-specific) — it appears beside the camera while training.
7. Every quality hit is **snapshotted** into that athlete’s **shape folder** (Tasks + Learn → My shapes), grouped by position. Hold-complete also saves a **trimmed clip**. A hit still also becomes their personal reference photo for that shape.

### Learn: shape test

Open **Learn → Shape test**. Mixed multiple-choice: name the shape from a body-position description, or identify a reference picture. **My shapes** shows the athlete’s own hit photos.

You do **not** need to film from the same angle as a reference photo. Joint angles grade from any facing. Side-view shapes (lunges, lever, C) are scored in profile — you do not need to face the camera, and a guessed “front” label will not fail the pose. Standalone FTOS is easiest from the front; **sequence FTOS stays in profile**. T arms still need a front view. Lunges/levers auto-detect left vs right foot forward unless the task specifies a side.

The FTOS → lunge → lever → landing lunge and FTOS → passé → lunge → lever → HS → lunge sequences are **required on both sides**. Before those, athletes complete an **arm positions lesson** (low V back, front middle, open shoulders, T, high V chest out) and **lunge holds** in those same arm positions.

Shipped coach stills live in `src/assets/references/` (and `public/references/`) so they
show on every Preview or tunnel link. Hit snapshots go in the Tasks hit folder and
never replace these pictures.

```text
c_shape.jpg
passe.jpg
feet_together_open_shoulders.jpg
lunge_start.jpg
lunge_land.jpg
lever.jpg
handstand.jpg
candlestick.jpg
hollow_arms_down.jpg
hollow_arms_up.jpg
zombie.jpg
mountain_climber.jpg
```

Curriculum order is edited in `src/config/curriculum.ts`.

## Homework (per-athlete drill library)

Every athlete automatically has **4 lifetime drills** (they can never be removed):

1. **Hollow body hold — arms down** (`hollow_arms_down`) — start in a pike and inch back until the lower back is flat; arms by sides. When the best **quality hold reaches 60s**, the app prompts to **level up to Hollow (arms up)** (`hollow_arms_up`, arms by ears). Do not train arms-up until that minute is camera-verified. One click switches the drill and keeps all history. Both stills are shown on the homework card.
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

1. Open the **Learn** tab.
2. **Shape glossary** — one stored coach photo per practiced shape. **Need photos** lists exactly what to shoot (view + body). Upload the picture and type extra notes in the same form. **Extra shapes** is a folder for positions you will not score on camera: library extras (pike, bridge, tucked HS, …) plus any shape you add yourself (name, body position, camera hint, notes, photo).
3. **Shape library** — browse all scored shapes.
4. **Task pathways** — walk the curriculum in order.
5. **Shape test** — multiple choice from descriptions or pictures.
6. **My shapes** — the athlete’s own hit photos.

## Compare (video study tab)

Side-by-side technique study: a **reference video** (the technique to copy) next to the **athlete camera** (live view, delay cam, or recorded replay). Stacks vertically on phones. Everything is stored on this device (IndexedDB — video blobs are too big for localStorage).

### The Instagram constraint (honest version)

Instagram does **not** offer a free public API to log in and pull your saved collections. Compare still lets you **paste public post/reel URLs**. The local app resolves those to a playable video, **saves the file in IndexedDB**, and **loops them in the tab** (pause, scrub, slow-mo). Use **Save all in app** to download every pasted reel at once. **Export library** downloads a JSON of every URL and name — keep that file; Instagram post URLs do not expire, but throwaway `trycloudflare.com` preview links do (and IndexedDB is origin-scoped, so a new tunnel looks empty). Search by name, URL, or IG shortcode (hits in other collections are listed too). Drag or use ↑↓ to reorder — reorder pauses while a search is active. Private posts will not load. Optional: `pip install yt-dlp` gives a local fallback if the built-in resolver misses a clip.

You do **not** need to screen-record every reference. Upload a file only when you already have one.

### Athlete camera side

- **Live** — plain camera view (no pose detection needed here), mirror toggle.
- **Delay cam** — adjustable **6–20s** delay (MediaRecorder timeslice chunks fed into a MediaSource buffer playing behind live). The athlete performs, then watches themselves N seconds later without touching the device. Needs a browser where MediaRecorder and MediaSource share a codec (Chrome / Edge / Firefox).
- **Replay last Ns** — tap **Replay last 6s** (or whatever the buffer slider is set to) to open a real player of that stretch: pause, play, scrub, slow-mo. **Save in app** keeps it in Recorded attempts (IndexedDB). **Save to device** downloads the file.
- **Record** — optional longer attempt capture; the last 12 clips are kept in the app (oldest pruned).

### Recommended coach workflow

1. Paste public Instagram reel URL(s) into a Compare collection (e.g. "Back handspring refs"). **Rename**, **search**, and **reorder** the list. Hit **Save all in app** so the videos stay on this device. **Export library** for a JSON backup of every URL.
2. Wait for it to load, then set an A/B loop around the key phase; slow to 0.5x.
3. Athlete performs in front of the camera with **Delay cam** at 6–20s — they watch themselves hands-free. Tap **Replay last Ns** to pause, play, and scrub that same buffer, then **Save in app** or **Save to device**.

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
  lib/captureStore.ts    IndexedDB (task hit snapshots + trimmed clips)
  lib/sounds.ts          success chime
  components/compare/    Compare tab (reference player, delay cam, replay)
  hooks/useSpeechCoach.ts
  hooks/useRollingCapture.ts
  components/TaskTrainer.tsx
  lib/shapeQuiz.ts       Learn tab multiple-choice shape test
  components/HitFolder.tsx  athlete hit photos grouped by shape
  components/ShapeQuiz.tsx
  components/EducationPanel.tsx  Learn tab (shapes, quiz, my shapes, pathways)
  App.tsx                main UI (Tasks | Homework | Learn | Compare | Coach | Athletes | About)
public/references/       optional default coach photos
```

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4
- `@mediapipe/tasks-vision` Pose Landmarker (lite model)

## Roadmap (architecture hooks)

Cartwheel gaze/hands, roundoff segmentation, rolls, V-ups, drills library, richer education media, athlete folders/groups, parent sharing — not built yet; shape/sequence/curriculum config is designed so new shapes drop in without rewriting the app.
