# Shape Lab

Free, browser-based gymnastics coaching prototype. Uses your device camera and **MediaPipe Pose** (runs locally in the browser — no paid APIs) to:

- Detect body landmarks and draw a skeleton overlay
- Calculate live joint angles
- Grade gymnastics shapes from **0–100** with per-criterion scores
- Track **total hold time** vs **quality hold time** (only while above a score threshold)
- Run an ordered **athlete Tasks curriculum** (standalone holds 5s → 3s after mastery; sequences always 3s)
- **Learn** shapes and pathways without a camera, **tumbling physics** plus a **physics test**, **anatomy** and **progression / blocks** for coaches, and a **reference scroll** of the gym Instagram library
- **Compare** reference videos side-by-side with a delay cam. Videos is three full-screen buttons: **Replay with reference cam**, **Athlete camera**, and **Reference library** (player + list; make your own collections).
- **Classes** named drill collages (up to 6 gym URLs, captions, A/B loops, even full-screen split). Share a board to the gym feed so other coaches can save it into their class library. Open collages from Today too. On Today, open a board to switch the playing tile, pick another gym reel, **Save to Photos**, or record / upload a clip into a slot.
- **Chalkboard** opens on Today while a class is running (show more / show less / full screen — it does not take over the page). Coaches pin a looped clip, shape still, IG still, drill, drill list, or collage onto a class type (Connections, Elevate, Reps w/ Logan, or a class they create with a name and time). Erase takes it off. Pin ahead of time so the board is ready before class starts.
- **Share** on every reel and shape view — Compare, Learn scroll, full-screen reels, the shape library, IG stills, drills, and collages. The same sheet posts to a class chalkboard, sends the reference to an athlete or a coach, or posts it on the gym feed.
- **Feed** thoughts, accomplishment clips, and shared class collages — video is optional; coaches tag athletes, athletes tag their coach. Type `@handle` or `@"Full Name"` in a story, feed post, or win to tag a profile. Instagram @ on a profile is also the Shape Lab handle unless they set a different one. Instagram-style **stories** sit at the top for 24 hours (same rings as Learn → Reference scroll). **Highlights** — stories you save so they stay — only show on a profile. Anyone signed in as an athlete or coach can **high-five** the athlete on a post (not themselves). They see “You high-fived Ellie”; the athlete gets an alert.
- **Wins** a separate spam-friendly feed for firsts and small hits, with a **big win** checkbox to also post on the gym feed. Attach a clip from Photos on the class clock or the Wins composer. When a coach logs a win it still belongs to the athlete, with **shared by Coach Ryan** (or whichever coach posted it). High-five works the same as on the gym feed.
- **My profile** (Today) — add or take a photo, answer the class-station questions, plus twist direction, dominant hand, and skate stance. Answers sync into Research.
- **Public profiles** — Instagram-style layout unique to Shape Lab: photo with a story ring, handle, and tabs for **Posts**, **Passes**, and **Stories**. A pass is a short vertical clip (our word for a reel / Short). Only what that person posted or reposted shows. They can share a story, a feed post, or a pass from their own page. Highlights stay under the header. Athletes and coaches can high-five that athlete. Coaches can also fist bump. Coaches see notes they wrote; gym admin sees every note. Class and lesson desks keep those notes on the athlete after class ends. Parent profiles show who their athlete is.
- **Parents** select their athlete on Profiles. Coaches see that link. Parents can open that kid’s wins, homework, and lessons without unlocking the child’s passcode, and they can **add and log homework** on that athlete.
- **Homework coaches** — athletes pick the coaches they work with (create profile, Homework, or Edit photo and answers). Those coaches get an **Alert** when homework is logged (not class or lesson logs) and can **high-five, fist bump, flex, like, or heart** it from Alerts or the log. The athlete sees that coach’s profile pic plus the emoji on the activity. Only those coaches (plus the athlete, their parent, and gym admin) see homework logs, class nights, and lessons. Wins, posts, and stories stay public. Athletes can **keep those coach names off their public profile** if they want.
- **Stopwatch sets** — Homework Stopwatch, Train now (without the camera), the class clock, and a live lesson can log **reps and sets**. Pick the exercise, or **Other** to type / pick one that is not on the list.
- **Class clock** (Today) — homework-style stopwatch that logs hollow / Superman / side plank / wall handstand holds, V-up reps, and typed skills onto each selected athlete’s homework as **in class**. Edit a class to pin extras (hollow arms up, push-ups, a custom name) — core drills stay where they are; extras show on that class clock and on a lesson if the class is running.
- **Network** follow people on this gym. Athletes can send a video or a win. Coaches do not free-text athletes — they share a reference, give a high five or fist bump, or like something the athlete posted. A high five or fist bump notifies the athlete in Alerts, and the person who sent it sees a confirmation such as “You high-fived Ellie.” Coaches and parents can write real text to each other, attach a reel / still / drill / collage / win / link, and start a group thread. Coach lounge stays for tumbling philosophy.
- **Gym desks** — every profile defaults to **Tumble Smart Athletics**. A coach’s Today list is that gym plus athletes who take class there or who they do privates with. Camp / clinic groups stay off the main desk until you tap **Add to this gym**. **Add to camp** puts a Tumble Smart athlete on a clinic list without taking them off this gym. **Search all** or pick another gym to find anyone; other-gym names are labeled. Network still connects everyone. Profiles, photos, and class-station answers sync on the gym URL so a new profile on the iPad shows on every phone.
- **Lesson recaps** on Today fold after a day into Older recaps (you can go back as far as you have). Remove hides a recap without deleting the notes; Show again brings it back.
- **Research** gym studies (laterality, shape feel, standing-full mats, reasons, fear, and the New athlete · shape test) with counts, gym facts, and correlations. Cartwheel / harder hold / twist / handstand guesses from Today → New athlete · shape test are saved on Finish later and tracked here — n is this gym
- **Finish later** is on every New athlete · shape test screen (station questions, before-the-pictures questions, and the pictures test). Progress stays on the athlete so the next rotation continues without starting over.
- **IG shapes library** (Learn) stores every Screenshot / Shot crop from Compare, Learn scroll, and reels. Stills persist on the gym URL so they are not stuck on one iPad.
- Speak live corrections (toggleable voice coaching)
- Save attempts, progress, and reference photos in the browser (`localStorage`) as a cache; the gym URL stores the same records when Blob is connected
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

**Camera note:** Browsers require a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) for `getUserMedia`. `localhost` works on the computer. Over a LAN IP, many phones block the camera on plain `http`. Use the **Vercel production URL** (HTTPS) on phones.

### Android (Chrome)

Open the Production gym URL in **Chrome**. Camera, delay cam, recordings, and file pickers use Android-safe settings (WebM first, lower bitrate, no 1080p-first camera ask, Chrome permission copy). **iPhone, iPad, and laptop are unchanged** — iPad delay still fills like the Camera app; iPhone / laptop still contain the native frame; iOS still uses the 90° unwind. Samsung Internet can lie about MP4 support; Chrome is the path that matches these gates.

## Permanent gym link (Vercel)

This is the link that **stays the same** after updates. Do not text Cursor Preview or `*.trycloudflare.com` to the gym — those die.

The lasting gym URL is **not** Cursor Preview and **not** a `*.trycloudflare.com` tunnel.

You get it here:

1. Open the **claim link** from the latest deploy message (Vercel → Claim deployment).
2. Sign in (GitHub is fine).
3. On the project page, copy **Production** — it looks like `https://shape-lab-….vercel.app`.
4. Text **that** hostname to the gym. Later deploys keep the same address.

### Claim the project (once)

Sign in with the claim URL, then in the Vercel project connect [github.com/roscoavery/shape-lab](https://github.com/roscoavery/shape-lab) (push this repo there if that GitHub copy is behind). After that, every `git push` to `main` ships to the same `*.vercel.app` hostname.

### Env vars on Vercel

| Variable | Required | What it does |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | **Yes for gym data** | Stores roster (profiles, photos, notes, homework + class-clock logs), Compare library, feed + Wins, stills, research, lessons, classes, and athlete/feed videos in [Vercel Blob](https://vercel.com/docs/storage/vercel-blob). Claiming a temporary `*.vercel.app` link does **not** add this. Without it, new profiles stay on that phone and vanish from the server on a cold start. |

How to add it:

1. Vercel project → **Storage** → create a **Blob** store.
2. Keep **Private** (phones stay off the public internet).
3. Check **Add a read-write token env var to this connection**.
4. Create, then redeploy **Production** on the same gym URL.

No other secrets are required. Instagram / TikTok resolve uses public Cobalt instances (yt-dlp is not available on Vercel).

Hobby plan upload cap is about **4.5 MB** per request — keep athlete/feed clips short on the public URL.

### Update the live site from Cursor

```bash
git add -A && git commit -m "Describe the change" && git push
```

If GitHub is connected to the Vercel project, that push is enough. Otherwise:

```bash
npx vercel --prod --yes
```

### Redeploy without making a new link

Use **Create Deployment** (or Redeploy) on the **same Vercel project** that already owns `temporary-racing-sulfur-78x9doy.vercel.app`.

1. Open that project (the one whose Production URL is the gym link you already use).
2. Pick branch **`v2-rebuild`**.
3. Deploy to **Production** — not Preview, not a new project, not “temporary”.
4. Wait until it says Ready, then hard-refresh the **same** gym URL.

That replaces the app on the existing address. It does **not** mint a new `*.vercel.app` hostname. A new link only appears if you create a new project or run `vercel deploy --temporary`.

Open **that exact Production URL** on every phone. Preview, Cloudflare tunnels, and `localhost` each have their own empty store — they will not show the gym that already lives on `temporary-racing-sulfur-78x9doy.vercel.app`. The app now waits for the gym file before showing Profiles; if the file cannot load it says so instead of looking like only Ryan exists.

On the **same Production URL**, with Blob connected, every device shares:

- New athlete profiles and later edits (name, gyms, laterality, photos, coach notes)
- Homework items and every logged activity (including class-clock holds)
- Feed and Wins posts — **video wins upload straight to Blob**, then the post is just a URL. Phone clips used to die on Vercel’s ~4.5MB request limit.
- Profile pictures as real image URLs (phones load them like any social app; they are not stuffed through JSON)
- Videos the app records or uploads (delay cam, compare, lesson, feed)
- Lessons, class meetings, research, Compare library, and shape-library crops

Edits land through a cheap `/api/revision` check every few seconds. Only the store that changed is pulled — add, edit, or delete on the iPad and the phone should show it without a full reload.

**Do not create a second Blob store.** The gym already has one. Missing pictures (Addy, Tina, anyone else) are still sitting in the iPad browser. After a Production redeploy, unlock Ryan on the iPad → **More → Profiles** → **Send everything on this device**. Then hard-refresh the phone and laptop on the same Production URL.

After a class ends, **Class recaps** can change which class it was and who was there. Adding someone who was not marked present still writes Class nights and copies holds / skills already logged in that class.

Unlock/passcode stays on that phone. The records themselves are gym-wide. Preview or tunnel links are different origins and do not share that store.

Shape-library crop sizes ship in the app (the framings set on Aug 28). Later crop edits merge on top and do not wipe those defaults.

Athlete names, parent phones, and class photos stay **in the app** on **More → Profiles**. You do not need a spreadsheet.

### Gym computer (local Cloudflare tunnel)

`*.trycloudflare.com` hostnames are one-shot. A **named** tunnel is only needed if you want phones to hit the gym PC instead of Vercel. The gym PC must stay on.

This Cursor cloud VM is **not** 24/7.

### What you need once

1. A free [Cloudflare account](https://dash.cloudflare.com/sign-up).
2. A **domain on Cloudflare** (buy one, or point an existing domain’s nameservers at Cloudflare). Cloudflare will not give a stable public hostname without a domain.

### Dashboard (once)

1. Open [Networking → Tunnels](https://one.dash.cloudflare.com/) (or dash.cloudflare.com → Zero Trust / Networking → Tunnels).
2. **Create a tunnel** named `shape-lab`. Copy the install **token**.
3. Add a **published application**:
   - Hostname: `gym.yourdomain.com` (any subdomain on that domain)
   - Service URL: `http://localhost:43127`
4. In this repo:

```bash
cp .env.example .env
```

Paste into `.env`:

```bash
CLOUDFLARE_TUNNEL_TOKEN=eyJ...
CLOUDFLARE_TUNNEL_HOSTNAME=https://gym.yourdomain.com
```

`.env` is gitignored. Do not commit the token.

### Gym computer (every session, or on boot)

```bash
npm run dev      # terminal 1 — leave it running
npm run share    # terminal 2 — keeps the HTTPS name alive
```

`npm run share` prints the hostname from `.env` and runs `cloudflared tunnel run --token …`. It will download `cloudflared` via `npx` if it is not already on PATH.

To start the tunnel when Windows boots (admin PowerShell, after `.env` has the token):

```bash
npm run share -- --install-service
```

That installs Cloudflare’s Windows service so you do not need a second terminal after reboot. `npm run dev` still has to be running (or started on login) for phones to load the app.

### Temporary link only

If you just need a throwaway HTTPS URL right now (new name every time):

```bash
npm run share -- --quick
```

Or `npm run share:quick`. Do not text that URL to the gym as the permanent address.

## Athlete Tasks pathway

1. Unlock **Ryan** and open the **Tasks** tab (Ryan-only for now — everyone else uses **Tasks 2**).
2. Create / select an athlete.
3. Work through the ordered curriculum — later tasks stay locked until the previous one is completed at least once.
4. Hold times: **standalone shapes** need **5 seconds** the first times through, then **3 seconds** after the task is mastered. **Sequences** (FTOS → passé → lunge → lever → …) always use **3 second** holds. **Freestanding handstand is not a gate** — you get **3 kick-up tries**, we grade the best line in the task analysis, and you move on. Wall handstand stays on Homework.
5. Press **Start pathway** once (Voice on). On the FTOS → passé → lunge → lever → handstand → landing lunge sequences, stay in **profile** — FTOS does not need you to face the camera. The coach talks you through the holds (including a spoken **3-2-1** countdown on 3-second asks, and “kick up to the best handstand you can hit”). A green check flashes on the camera when you hit a shape. **Full screen** on the Tasks camera puts delay cam bottom-right, the reference still bottom-left, and the live score on the feed. An arrow on the camera skips to the **next task** if scoring is stuck. After the task you get a **written analysis** of every shape — including the handstand — with corrections to read.
6. Upload a **reference photo** (shared for the shape, or athlete-specific) — it appears beside the camera while training.
7. Every quality hit is **snapshotted** into that athlete’s **shape folder** (Tasks + Learn → My shapes), grouped by position. Hold-complete also saves a **trimmed clip**. A hit still also becomes their personal reference photo for that shape.

### Learn: shape library and tests

**Learn → Shape library** lists the positions you photographed (pathway, hollows, zombie, pike with zombie arms, Hands, pike with open shoulders, Tuck, candlestick, tucked candle, tight arch, Superman, Rainbow Bridge, Long Bridge, Side plank) plus homework that still needs a still (wall handstand). Unused scoring leftovers (generic lunge, bridge, tucked/piked/L handstand) stay in the code for sequences but are not empty library cards. Arm-position drills live in **Learn → Arm positions test**, not as a second catalog.

Open **Learn → Shape test** and pick **Pictures** (name the still), **Descriptions** (name the body notes), or **Pictures and descriptions**. Description prompts have the shape’s name taken out so the question cannot read “this is a tuck.” **Landing lunge** and **Lunge · open shoulders** are the same position and share the landing-lunge still — the test treats them as one name. **Standing open shoulders** shares the FTOS still. **Learn → Arm positions test** uses the same picture / description / mixed choice for low V, T, front middle, open shoulders, and high V (standing and on a lunge) — those are not a Tasks gate right now. **Learn → Physics test** is sixteen questions from the tumbling-physics notes (inertia, angular momentum, moment of inertia, the block and surfaces, twisting, the round-off arm drop, tuck vs layout). When any of those tests finish, you see the score and every miss with the correct answer (and a why on the physics test). **Learn → Anatomy** is joint actions and cues, hypermobility, strain vs sprain vs tendon, grades, and gym prevention (wrists, ankles, backs, short landings, ice / RICE). **Learn → Progression** is the four levels (introduction, approximation, acquisition, mastery) and how normal fear and mental / physical / emotional blocks sit on them. **My shapes** shows the athlete’s own hit photos. Long Home core videos ask before they land there.

You do **not** need to match a coach still to move on. Scoring grades the **written body position**, not a pixel match to the photo. On **starting lunge and landing lunge**, the app first recognizes a good lunge (legs 85%+). Open shoulders do **not** block that. Then we **count 3, 2, 1** out loud and snapshot the best open in that window. **Passé** passes on stance leg + passé knee; open shoulders are graded, not required. **Low V lunge** looks for the line from the back foot to the shoulders plus arms in a low V slightly back — shorts that fake a bent back knee do not block the pass. You also do **not** need to film from the same angle as a reference photo. Joint angles grade from any facing. Side-view shapes (lunges, lever, C) are scored in profile — you do not need to face the camera, and a guessed “front” label will not fail the pose. Standalone FTOS is easiest from the front; **sequence FTOS stays in profile**. T arms still need a front view. Lunges/levers auto-detect left vs right foot forward unless the task specifies a side.

The FTOS → passé → starting lunge → lever → landing lunge sequences (both sides) come first. The FTOS → passé → lunge → lever → HS → lunge sequences are next, also on both sides. Arm-position drills (low V, T, front middle, high V — standing and on a lunge) are **not** a Tasks gate right now; they live in **Learn → Arm positions test** until we put them back.

Shipped coach stills live in `src/assets/references/` (and `public/references/`) so they
show on every Preview or tunnel link. Hit snapshots go in the Tasks hit folder and
never replace these pictures.

```text
c_shape.jpg
passe.jpg
feet_together_open_shoulders.jpg
lunge_start.jpg
lunge_land.jpg  (also Lunge · open shoulders)
lever.jpg
handstand.jpg
arch.jpg
candlestick.jpg
candlestick_drill.jpg
tucked_candle.jpg  (main)
tucked_candle_b.jpg
hollow_arms_down.jpg
hollow_arms_up.jpg
zombie.jpg
pike_zombie_arms.jpg
hands_push_through.jpg
pike_open_shoulders.jpg
pike_open_shoulders_class.jpg
tuck_open_shoulders.jpg
tuck_open_shoulders_b.jpg
tuck_open_shoulders_class.jpg
mountain_climber.jpg
stand_clean.jpg
superman.jpg
rainbow_bridge.jpg
long_bridge.jpg
side_plank_left.jpg
side_plank_right.jpg
```

Curriculum order is edited in `src/config/curriculum.ts`.

## Tasks 2 — class-pace guided sequences

Open the **Tasks 2** tab. This is the same body-position work as Tasks, run the way class runs:

1. Pick an athlete. Every sequence is open — grades do not lock the next one.
2. Sequences include **LG LV HS LG (Cartwheel side)**, **LG LV HS LG (NON Cartwheel side)**, **MC HS LV LG**, **MC HS LG (Assisted)** — spotted handstand with a coach, friend, or parent — **MC HS 5 reps**, **Handstand hold challenge**, **Long Bridge**, **Pike → Hollow → Arch** (snap-open), **Pike → Tuck → Hollow → Arch**, **Lemon squeezes**, and **Core home conditioning**. Assisted analysis is the **handstand only**. Five-reps grades each kick, numbered 1–5, assisted or not. The hold challenge is one person: as many tries as you want, clock starts in the handstand and stops when a foot hits, longest hold is highlighted. **Long Bridge** is the class talk-through (bridge up on 3, feet together, straight legs, heels flat, arms by the ears, chin to chest, come down and rock it out). Two snapshots: one before chin to chest, one after. Only after rainbow-bridge shoulders are open. **Pike → Hollow → Arch** is the snap-open drill for handsprings and whips (pike with zombie arms, hollow arms down, arch on the back). **Pike → Tuck → Hollow → Arch** is the open-shoulder chain (pike, seated tuck, hollow, arch). **Lemon squeezes** move hollow to that tuck, repeatedly. **Core home conditioning** is the easy home circuit: ten pike–hollow–arch, three open-shoulder pike–tuck–hollow–arch, then 30s side planks, Superman, and hollow. Not a gate.
3. Voice names the sequence, then says **side view, stand clean** on the lunge–lever–handstand runs. On the non-cartwheel run it then reminds you that open shoulders often get harder. **MC HS LV LG** is: ready in clean, mountain climber 3-2, kick to handstand, lever (replay marker from best match, not a timed snapshot), landing lunge 5-count, clean. **MC HS LG (Assisted)** is: ready, step to mountain climber, kick to a spotted handstand (straight legs one at a time so the spotter can catch the first), hold 3-2, back to lunge 3-2, clean. **MC HS 5 reps** is: start clean, mountain climber, kick to handstand, back to lunge, and clean — five times. **Handstand hold challenge** is: ready to challenge your hold time, walking allowed (try not to), start clean, mountain climber, kick to a handstand and hold as long as you can. **Long Bridge** is: lie on your back, bridge up on 3, feet together, straight legs, heels flat, arms by the ears, chin to chest, hold 5-4-3-2, come down and rock it out. **Pike → Hollow → Arch** is: sit in a pike with zombie arms, snap to hollow arms down, arch on your back. **Pike → Tuck → Hollow → Arch** is: sit in an open-shoulder pike, pull into the seated tuck (flexed feet, arms behind the ears), hollow, arch. **Lemon squeezes** is: hollow, squeeze to tuck, back to hollow, repeat. **Core home** is: ten pike–hollow–arch, three open-shoulder tuck squeezes, then 30-second holds. **Start sequence** jumps the live camera to **full screen**. You can also tap **Full screen first** and start from the camera. The still switches to the shape being named.
4. Snapshots fire on the spoken **2** (except lever on MC, which is an accuracy playhead). The assisted run snapshots the handstand on the 3-count. Five-reps snapshots the **tallest, straightest** handstand on each kick. **Long Bridge** snapshots once on **arms in close by the ears** and once on the **2** of the chin-to-chest hold. **Pike → Hollow → Arch** snapshots the pike, the hollow, and the arch. **Pike → Tuck → Hollow → Arch** snapshots the pike, the tuck, the hollow, and the arch. **Lemon squeezes** snapshots the first hollow, the first tuck, and the last tuck. **Core home** snapshots the first pike–hollow–arch, the open-shoulder pike and tuck, both side planks, Superman, and the hollow hold. The hold challenge uses stills only to **map the playhead** — they are not graded. Live scores are notes. The show goes on even with flaws.
5. After **and clean**, the last run replays fullscreen with the **skeleton, joint angles, and live score** burned into the video (same picture as the live camera). **LG LV HS LG** (cartwheel and non-cartwheel) replays start the instant the voice says **“feet together, fully open shoulders, arms in close by the ears”** — not in the passé. MC HS LV LG starts at the mountain climber step. **MC HS LG (Assisted)** starts right before mountain climber and **ends at the landing lunge** (standing clean is not on the clip). The **clean** still on the other runs is taken after you stand up. Delay-cam buffer is **20s**. Scrub, or tap a snapshot to jump to that shape. **Hold challenge** records the camera plus a pose track. Right after the last hold you get a high-quality replay with a **stopwatch**, a **single line down the body** (hands → shoulders → hips → knees → ankles → toes — not left and right joints), and the **live score as it moved during the hold**. **Save video to Photos / Files** burns that overlay into a real video file and opens the phone share sheet (Save Video into Photos, or Save to Files). Desktop downloads the file. You can switch to a front left/right overlay before saving if you filmed from the front. Phone Back from the fullscreen replay goes to analysis and **keeps the clip**. Then **Share to Instagram Story** (caption copied, Instagram opened — Instagram will not let a website auto-post a Story), or **Send to Ryan** (coach inbox on the Profiles tab, same device). Hold clips stay playable in the tab even if in-app storage is full. Recording prefers MP4 at a higher bitrate so a 40s hold is watchable and Photos will accept it.

Profiles save on this gym computer and on the Shape Lab server (`/api/roster`), so a new Preview or phone link still has the roster. **Create a profile on the Profiles tab** — **Gym owner**, **Coach**, **Athlete**, or **Parent** — with a 4-digit passcode, a **home gym** (defaults to Tumble Smart Athletics), optional other gyms they take class at (or the athlete a parent came with), and Instagram handle. A coach’s Today desk is their gym — plus class and private-lesson athletes — not every profile on the network. **Search all** or a gym chip finds anyone; other-gym names are labeled. **+ Camp / clinic** on Today makes a travel group so visiting athletes stay on their home gym and off Tumble Smart’s main list. Unlock that profile on any browser or link to load its homework, hold times, and **video library**. Selecting a profile always asks for its passcode in that tab — only one profile stays unlocked. **Ryan’s gym admin passcode is 2223.** Tapping Ryan’s name on a shared link does not open admin; the code is required. The first **Tasks** tab and **Coach** stay hidden unless Ryan is unlocked — everyone else uses **Tasks 2**. Homework logs, Tasks progress, and saved hold times stay with the profile. **Gym Compare URLs are shared** — every profile and every browser sees Ryan’s library. Unlock **Ryan** to add, rename, or reorder those clips, then tap **Save into the app** so the list is written into `data/library.json` for every link. **Other coaches** unlock their own coach profile, paste Instagram URLs, and create collections that **only show on their profile** (`/api/coach-library`). They cannot edit Ryan’s gym collections, shape descriptions, or picture sizes. **Ryan** is always in the profile list and cannot be deleted. Creating the same name again selects the existing profile. Clips in the video library live on this gym computer (`/api/athlete-videos`) so every link can play them. There is no Instagram login that can post Stories for you from a website.

Edit the scripts in `src/config/tasks2.ts`.

## Homework (per-athlete drill library)

Every athlete automatically has **4 lifetime drills** (they can never be removed). Each drill shows **once** — Safari remounts and roster sync used to seed extra copies of the same shape:

1. **Hollow body hold — arms down** (`hollow_arms_down`) — start in a zombie-arm pike and inch back until the lowest part of the lower back touches, then flatten and let the feet inch off; arms by sides. When the best **quality hold reaches 60s**, the app prompts to **level up to Hollow (arms up)** (`hollow_arms_up`, arms by ears). Do not train arms-up until that minute is camera-verified. One click switches the drill and keeps all history. Both stills are shown on the homework card.
2. **Superman** — chin stays up with straight arms behind the ears; straight knees off the ground; feet and ankles together. Challenges open-shoulder angle while it strengthens a large portion of the posterior chain. Coach still: two athletes hitting the position (side view).
3. **Side plank** — forearm plank, both sides (log left / right). Be a pencil: elbow under the shoulder, one foot stacked on the other, top hand on the hip or up, head in line. No dangling head, no ribs flaring, no closed hips. Straight knees if you can; otherwise bend them and put weight on the bottom knee. Two stills (left and right). Target 30s, work toward a minute.
4. **Wall handstand** — time + quality, same standards as freestanding.

**Rainbow Bridge** is not one of those four auto drills. Assign it from Homework when you want it on camera: feet flat and pointed straight, feet apart, bent knees, hips up high, arch spread until the shoulders are open. That is the style used for bridge push-ups, back bends, hops, and rocks — and a shape athletes often hit in flight to hands on early handsprings. Coach still is on the card.

**Long Bridge** is also assignable (not auto). Only after rainbow-bridge shoulders are open. Straight legs together, heels flat, pushing through the toes, arms in close by the ears, chin to chest. The class talk-through lives on **Tasks 2** (two snapshots: before and after chin to chest). A slightly less arched version of this is the flight-to-hands shape in a back handspring.

**Pike (zombie arms)** is assignable too (not auto). Seated: toes pointed, straight knees, torso upright and rounded hollow, shoulders shrug, arms covering the ears, eyes through the hands. Hands as if they just pushed through an object — wide fingers, thumbs slightly down, pinkies slightly up (same finish as standing **Zombie**; second still is the hands close-up). Standing zombie is a different shape. The snap-open drill (pike → hollow arms down → arch on the back) lives on **Tasks 2** and in Coach sequences.

**Pike (open shoulders)** is assignable (not auto). Arms up by the ears, reaching to the ceiling. Two stills (close-up and class line). Used in pike–tuck–hollow–arch, rocking back to candlestick (candle reps / hollow rocker prep), and teaching arms behind the ears on a back tuck.

**Tuck** is assignable (not auto). Pulled in from that open-shoulder pike: knees bent, feet in, feet flexed, arms still reaching behind the ears, slightly rounded hollow back. Three stills (close-up, flexed feet, class line). The torso usually rounds more while flipping a back tuck or rolling backward to a tucked candle. Class talk-throughs: **Pike → Tuck → Hollow → Arch** and **Lemon squeezes** (hollow ↔ tuck) on **Tasks 2**. Coach sequences match. This is not a tucked handstand.

**Tight arch** (also called arch supine) is assignable. On the back: arms press the floor behind the ears, hips push up, knees stay straight. Ankles together and toes pointed are the usual miss. Used at the end of pike → hollow → arch. This is not Superman (stomach) and not a candlestick.

**Candlestick** is a shoulder stand: open hips, ribs in, straight line from shoulders to pointed toes. Two stills (handstand-roll and shoulder-stand). The **Candlestick drill** is not a shape card — it lives in **Learn → Drill library** (Ryan only) and also shows on the Candlestick page. Do not pause; FTOS → C → sit and fall to tuck → roll back and arch. Toes stay above you, not past the face. Lifting the feet on an arch is a good candle.

**Tucked candle** is assignable (not auto). Same tuck, rolled back so the weight is on the shoulders and arms — like a candlestick, but tucked. Used to teach forward and backward rolls and a lot of back-tuck drills. Verbal cues: arms behind the ears, round back, hips over, middle of the thighs in front of the eyes. Space between chin and chest is fine. Shins toward the wall keeps heels off the butt; tighter knees speed rotation — work both. Two stills; the side profile is the main one.

**Core home conditioning** on **Tasks 2** (and Coach) is the easy at-home circuit: 10× pike (zombie arms) → hollow → arch, then 3× open-shoulder pike with tuck–hollow squeezes into an arch, then 30-second side plank (both sides), Superman, and hollow. Hollow starts from a zombie-arm pike and inches back until the lowest part of the low back touches, then flatten and let the feet inch off. End by working those holds toward a minute.

On top of that, the **coach can assign** any shape from the library as homework, a **class flow**, or a **drill** that Ryan linked to a shape. Sequence homework opens **Practice → Class flows** on that assigned task — same spoken guidance as class. Each finished run logs how many times they did the sequence and the overall score on the homework card. Linked drills play the video. Athletes can also self-select ("Coach assigns" / "Athlete picks" when adding).

**Drill library** (Ryan only, under Learn): upload clips. The list stays private. Attach a shape and everyone sees that video on the shape page and can assign it as homework.

**Gym shape library:** unlock a coach or gym-admin profile, then add a shape from **Learn → Shape library** or **Coach library**. It is gym-wide — Learn, homework assignment, and lesson pickers all see it. Optionally copy camera grading from a shipped shape. Private coach shapes stay on that coach’s card.

**Camera sessions (primary, encouraged):**

1. Open the **Homework** tab, pick an athlete.
2. Press **Train** on a drill — that starts the camera and scores that shape. The clock starts when you **actually hit the shape** (hollow: lying C-shape, bent knees allowed). Voice stays quiet; it only nags about every 20s on a real miss.
3. Two timers: **Total hold** and **Proper hold** (time at/above the **form standard** — hollow defaults to **58**, others **75**, editable per drill).
4. Press **Log session** — date, total hold, proper hold, score, form standard, side, and breakdowns are saved.

**Stopwatch (manual timing):** Start / Stop / Reset at the top of Homework. When you stop, log that time on a drill, or type a different number of seconds.

**Manual logging:** press **Log manually** on any drill to type a hold time with an editable date (defaults to today). Manual sessions are flagged `method: 'manual'`, get a **manual** badge in history, and only count total time — no proper-hold data, so they don't feed the trend or the hollow level-up.

Each drill card shows **best proper hold** (legacy v1 quality-hold logs still count), session count, a proper-hold **trend sparkline**, and the last 5 sessions.

Data lives in `src/lib/storage.ts` (`HomeworkItem` / `HomeworkLog` / `HomeworkBreakdown`); the auto drills are defined in `AUTO_HOMEWORK_DEFS`, the 60s hollow level-up gate in `HOLLOW_PROGRESS_TARGET_SECONDS`, and the default form standard in `DEFAULT_FORM_STANDARD`.

## Education (Learn tab)

1. Open the **Learn** tab.
2. **Shape glossary** — one stored coach photo per practiced shape. **Need photos** lists exactly what to shoot (view + body). Upload the picture and type extra notes in the same form. **Extra shapes** is a folder for positions you will not score on camera: library extras (pike, bridge, tucked HS, …) plus any shape you add yourself (name, body position, camera hint, notes, photo).
3. **Shape library** — browse all scored shapes. On the Ryan profile, **Crop display** on a coach still sets the borders used everywhere in the app (library cards, overlay, Tasks). Original JPEGs are not rewritten.
4. **IG shapes library** — stills cropped from Compare. On a looping Instagram clip or replay, tap **Screenshot**, press one corner of the shape, drag to the opposite corner, tag a listed shape or type a **custom name** if it is not in the list, and Save. Select the **Ryan** profile first if you want that still saved **into the app** (this gym computer) so every browser and phone link still has it. Other profiles keep crops on this device only. These never replace shipped coach stills. On **Tasks**, **Homework**, **Coach**, or **Compare**, **Still overlay** lets you scroll left/right through Shape library or IG shapes and put any picture on the live camera or Compare video (opacity slider).
5. **Task pathways** — walk the curriculum in order.
6. **Tumbling physics** — inertia, angular momentum, moment of inertia, speeding and slowing rotation, the round-off → back handspring arm drop (shrink I so the feet can get in front), why layouts expose a weak set, Newton’s third law and the block on dead / spring / rod / Tumble Trak / tramp, and how twisting works (contact, late / aerial, tilt, cat twist). Written for coaches, in gym language. Unlock Ryan to **Edit / Save** the notes.
7. **Anatomy** — joint names and cues, struggle vs visible hypermobility, muscle / tendon / ligament, strain and sprain grades, and injury prevention (wrists, ankles, backs, groins, abs, hamstrings, hip flexors, short landings, ankle brace in early acquisition, and why ice / RICE is not the whole plan). Ryan can Edit / Save the same way.
8. **Progression** — introduction, approximation, acquisition, mastery, then normal fear vs mental / physical / emotional blocks and how those sit on the four levels. The 4-levels / blocks picture opens full screen from those lessons.
9. **Physics test** — sixteen questions from those notes. Finish and you see the score, every miss with the right answer, and why.
10. **Shape test** — pick pictures, descriptions, or both. Descriptions do not name the answer. Finish and you see the score and every miss with the correct name.
11. **My shapes** — the athlete’s own hit photos. Long Home core videos ask Save to My shapes or I don’t want the video.

## Compare (video study tab)

Side-by-side technique study: a **reference video** (the technique to copy) next to the **athlete camera** (live view, delay cam, or recorded replay). Stacks vertically on phones. Videos is three full-screen buttons — **Replay with reference cam**, **Athlete camera**, and **Reference library**. Library opens a cinema viewer (player + scrolling list, **Done** / Escape to leave) so clip chrome is not sitting on the Videos page. Instagram carousels put **‹ ›** on the left and right of the picture (above the scrub bar) with **2/5** at the top. The big **Replay with reference cam** button opens **top / bottom** with the side rail closed. First open is a dark **BUFFER** picker (wheel + 12s / 16s / 20s + **GO!**). A small red **×** at the top-right leaves fullscreen and returns to Videos — you do not need **Controls** to exit. **Controls** is a circular tool under **Clear** (and on delay cam) when you need the rail. **Min** shrinks a pane to a corner chip — drag the chip to any corner. **Swap** flips which view is full; **Split** on the chip restores top / bottom. Tap the small **Live** picture to check tripod framing; **Tap to close** returns to delay. Delay **EXIT** goes back to the live camera (no second EXIT on that live screen, so you do not drop out to Videos by accident). **Clip** next to **Show** on the reference picks another library clip. Shape overlay opens as a **large filmstrip**; the selected still floats over both videos so you can drag it anywhere, then tap **×** to hide it. The Compare how-to, collection clip list, and profile **video library** start collapsed so a long library is not endless scroll.

### The Instagram constraint (honest version)

Instagram, TikTok, and Facebook do **not** offer a free public API to log in and pull your saved collections. Compare still lets you **paste public video URLs** from those sites (or a direct video file URL). The local app resolves those to a playable video, **saves the file in IndexedDB**, and **loops them in the tab** (pause, scrub, slow-mo). Use **Save all in app** to download every pasted clip at once. Paste, **rename**, and add **shape keywords** (handstand, whip, roundoff) in the browser — names, URLs, and tags write into the app library (`src/config/compareLibrary.json` / `data/library.json`) so they are still there on the next Preview. Search a keyword to list every video tagged with that shape, including clips in other collections. **Export library** is an extra JSON backup. Drag or use ↑↓ to reorder — reorder pauses while a search is active. Private posts will not load. Optional: `pip install yt-dlp` gives a local fallback if the built-in resolver misses a clip.

You do **not** need to screen-record every reference. Upload a file only when you already have one.

### Athlete camera side

- **Live** — plain camera view (no pose detection needed here), mirror toggle.
- **Delay cam** — adjustable **6–20s** delay. Chrome / Android play a MediaRecorder → MediaSource buffer. On iPhone Safari the delay *picture* is a frame ring drawn from the live preview (upright, no MSE hitch). Replay Last still flushes the rolling recorder.
- **Record** (on delay cam) — start / stop of the **buffered camera picture**, like a screen record of that pane (not the phone’s screen, not a flush of the rolling buffer). Tap Record to start, tap Stop when you are done. The clip is kept in the app; with a profile unlocked it also lands in the video library.
- **Replay last Ns** — tap **Replay last 6s** (or whatever the buffer slider is set to) to open a real player of that stretch: pause, play, scrub, slow-mo. **Line** is the default markup on the picture (tap, tap, tap — three dots you can drag). **Draw** is a smooth stroke (press and drag), not a line of dots. **Arrow** is the same press-and-draw path, with the head where you let go. Those tools stay on the video; they do **not** cover Pause, the playhead, **0.25x / 0.5x / 1x**, or **A / B** loop points. Set **A** and **B** at the current time, then **Save loop** to keep that section on the gym URL (up to eight named loops per clip). Tap a saved name to use it that day without losing the others. **Clear A/B** only stops the current loop. **Screenshot** is press one corner, drag to the opposite corner, pick a listed shape — or **None** — or type a custom name, and save into **Learn → IG shapes**. **Clear** wipes marks. The same markup is on the looping reference, including full-screen split. **Save in app** keeps it in Recorded attempts (IndexedDB) and, with a profile unlocked, also the video library. **Save to device** downloads the file.
- **Record attempt** — same start / stop as Record: it records the delay-cam (or live) picture on screen. The last 12 clips are kept in the app (oldest pruned). With a profile unlocked, those also land in the video library.

### Recommended coach workflow

1. Unlock **Ryan** (passcode 2223) to edit the **gym** library, or unlock another **coach** profile to edit **your** collections. Paste public Instagram, TikTok, or Facebook video URL(s). Add **keywords**, **Rename**, search, and reorder. On Ryan, tap **Save into the app** so the gym URL list is written into `data/library.json` / `src/config/compareLibrary.json` for **every** Preview. Coach collections save to that profile only (`data/coach-libraries.json`) and never rewrite Ryan’s list. Hit **Save all in app** only if you also want the video files downloaded on this device. **Export library** is an extra JSON backup.
2. Wait for it to load, then set **A** and **B** around the key phase and **Save loop** (name it if you want). Save another loop on the same clip for a different section. Star the loops you cue often. Tap the name you need that day. Slow to 0.25x or 0.5x. Pause, the playhead, and speed stay usable while Line is on. **Line** is two straight sides and a corner — it does not bend. Tap three points; the degree number sits on the angle. Drag a dot to move. In **Replay with reference cam**, tap a finished Line dot to select it, then drag to move that point.
3. Tap **Replay with reference cam** (or the same button on either card). Pick a buffer with the wheel or 12s / 16s / 20s, then **GO!**. The red **×** at the top-right returns to Videos. The rail starts closed; **Controls** sits under **Clear**. **Drag the bar** in split to resize. **Min** parks a pane in a corner chip you can drag; **Swap** flips full vs chip; **Split** on the chip restores top / bottom. Athlete performs with **Delay cam** at 6–20s. Tap the **Live** thumbnail to set the tripod, then **Tap to close** to return to delay. Delay **EXIT** returns to live camera without leaving Compare. Tap **Clip** next to **Show** to switch reference videos. Tap **Record** to start / stop a recording of the delay-cam picture, or **Replay last Ns** to pause, play, and scrub, then **Save in app** or **Save to Photos**. **Collect** copies any reference into a collection you can edit.
4. To keep a still of a shape in an IG clip: pause, tap **Screenshot**, drag from one corner of the crop to the other, tag the shape, Save. Open **Learn → IG shapes**. Overlay that still (or any coach still) on Tasks / Homework / Coach. In Compare full screen, open **Shape overlay** for a large filmstrip — pick **None** to clear it — drag the still over either video, and tap **×** to hide it. Size goes down to 5% of the stage so the still can sit as a small stamp.

**Video library (Profiles tab):** clips from delay-cam Record, Compare replay, the handstand hold challenge, and Tasks 2 form-analysis replays. **Save to video library** on a hold or Tasks 2 replay files it there. Grouped by date. Playable on any phone link once that profile is unlocked.

## Learn: reference scroll

**Learn → Reference scroll** opens with Instagram-style **stories** at the top (24 hours). Watch a story and save it into a named **highlight** on your profile, or name a highlight when you post. Then it is a vertical snap through the same gym URL library as Compare. Search a shape, name, or collection. **Full screen reels** (and **Full screen** on a clip) opens a TikTok-style viewer: swipe up/down, star a URL, add to a collage, and tap **Shot** to crop a still into the IG shape library. Line / Shot stay off until you pick them so the swipe still works. Names stay in sync: rename a clip in Compare, Save into the app, and the scroll shows the new name. **A** / **B** plus **Save loop** keeps up to eight named sections per clip in `data/clip-loops.json`. Star a URL or a favorite loop (the gold star on the chip) so Compare, Learn, and Classes can filter to those. Compare and Classes share that list — pick the loop you need without wiping the others.

On a phone, **Reference library → Clips** puts search and suggested keywords *inside* the scrolling list (the player is capped) so you can swipe past the chips. Cached Instagram copies play immediately; the site fetch runs in the background.

## Classes (drill collages)

**Classes** builds named boards of up to **six** gym-library clips (plus a coach’s own Compare URLs). While you pick panels, tap a clip to **preview** it, then **Add**. The same video can occupy more than one tile. Each slot has its own clip menu while the board is open (not in full screen). **Edit** changes a saved board; **Duplicate** copies it into your class library. Each slot can have a caption and its own A/B loop. **Share to feed** posts that board so other coaches can **Save to my class library**. Gym-wide boards (no personal owner) still show for everyone — only Ryan can edit or delete those. On a phone, tiles stay posters until you tap **Play** (one clip loads at a time). **Watch reels** opens the same full-screen swipe viewer as the library. **Full grid** packs the clips so their frames share an edge. Unlock a profile to save. Fellow coaches edit their own boards.

## Gym feed

**Feed** is a gym wall. 24-hour stories sit at the top — same rings as Learn → Reference scroll. Highlights stay on profiles, not here. Unlock a profile, write a caption, optionally attach a video, and tag people. A thought does not need a clip. **Coach** profiles tag athletes. **Athlete** profiles tag their coach (Ryan is selected by default). From **Classes**, share a collage to the feed; other coaches tap **Save to my class library** to copy it into Classes. Posts live on this gym computer (`/api/feed`). Ryan keeps gym-admin edits: the shared Compare library, Learn shape copy, still crops / picture sizes. Other coaches keep their own Compare collections and class boards.

## Network

**Network** is follow, message, and the coach lounge on this gym computer (`/api/social`, `/api/discuss`). Unlock a profile to follow someone, send a direct message, or paste a public video URL in a thread.

**Coach lounge** is for coach profiles only. Threads are tagged (round-off to back handspring, tuck vs layout, set and snap, twist, power, standing, fear, physics, other). Each post has a **why** box — the gym reason, not just the slogan — so Research can count what coaches argue about and how they justify it. Athletes see a lock note in the lounge; the digest on Research is readable without unlocking.

## Research

**Research** is how this gym gathers tumbling data with the scientific method: a question, a stated hypothesis, one observation per athlete, then counts and crosstabs. Studies shipped now:

- **Laterality** — dominant hand, foot in front when tumbling, twist left vs right, whether they can twist both ways, double full and triple (and which way), whether they also skate and which foot is in front. One form so those fields can be correlated.
- **Standing full · panel mats** — how many layers they could back tuck up when they first got a standing full (0 is floor).
- **Why people tumble** — reasons they pick for themselves.
- **Fear and mental blocks** — whether they have felt fear tumbling, had a block, and whether that block followed an emotional shutdown. Not a clinical screen.

**Correlations** are HTML tables (hand × twist, front foot × twist, front foot × skate, twist × double, twist × triple, and fear × twist when the same athlete is in both studies). They do not claim causes. **Ideas** is an inbox for future questions (cheer, acro, more tumbling philosophy) until they become a study. **Lounge** is a digest of coach-lounge threads: counts by topic, who posted, how many posts have a written why, and recent titles with reasoning samples. Findings are readable without unlocking a profile; logging needs one. Coaches can see who is in a sample. Data lives on this gym computer (`/api/research`, `data/research.json`). Lounge posts live in `data/discuss.json` (gitignored, like research).

## First test: Handstand

1. Create an athlete under **Athlete profile** and set a **4-digit** passcode.
2. Open **Coach**, leave **Shape** on **Handstand** (default), or jump there from Tasks.
3. Click **Demo: good HS** to see scoring without a camera, or **Start camera** and film from the **side**.
4. Watch Overall + Shoulders / Elbows / Hips / Knees / Body line / Head / Feet.
5. Hold above the quality threshold (default 70) to grow **Quality hold**.
6. Click **Save attempt**, then open the **Profiles** tab for progress history.

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
  components/EducationPanel.tsx  Learn tab (shapes, quiz, physics, anatomy, progression, my shapes, pathways)
  components/learn/PhysicsLessons.tsx  tumbling physics lessons
  components/learn/PhysicsQuiz.tsx  physics-in-tumbling test
  components/network/NetworkPanel.tsx  follow, DMs, coach lounge
  App.tsx                main UI (Tasks + Coach are Ryan-only; Tasks 2 | Homework | Learn | Compare | Feed | Network | Research | Profiles | About)
public/references/       optional default coach photos
```

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4
- `@mediapipe/tasks-vision` Pose Landmarker (lite model)

## Roadmap (architecture hooks)

Cartwheel gaze/hands, roundoff segmentation, rolls, V-ups, drills library, richer education media, athlete folders/groups, parent sharing — not built yet; shape/sequence/curriculum config is designed so new shapes drop in without rewriting the app.
