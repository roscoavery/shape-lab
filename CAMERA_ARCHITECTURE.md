# Shape Lab Camera Architecture

This document protects the known-good Version 1 Compare camera while Version 2
is rebuilt. Update it whenever camera ownership or lifecycle changes.

## Protected baseline

The immutable pre-rebuild baseline is tagged `v1-working-delaycam` at
`26e2a23`. The camera implementation starts in
`src/components/compare/CameraPane.tsx`.

Do not replace or substantially refactor this implementation before the
Videos / Compare UI works and Ryan has verified delay behavior in the browser.

## Current Version 1 architecture

### Stream owner

- `CameraPane` owns the physical `MediaStream` in `streamRef`.
- The user starts it explicitly with **Start camera**.
- `startCamera` calls `navigator.mediaDevices.getUserMedia` once for that pane,
  requests a user-facing 1280×720 video stream with no audio, assigns it to the
  live `<video>`, and starts the rolling recorder.
- Today/Tasks pose scoring uses a separate camera hook. There is no shared
  session yet.

### Compare access

- `ComparePanel` renders `CameraPane`.
- After Compare has been opened once, `App` keeps `ComparePanel` mounted and
  hides it when another tab is selected. This lets its camera and rolling
  buffer survive ordinary tab switches.
- Compare currently accesses no external or shared camera stream.

### Today access

- Version 1 has no Today screen.
- Tasks and Tasks 2 use the existing pose-camera path independently from
  `CameraPane`.
- The rebuild must not connect Today to Compare until the shared-session phase.

### Delay buffering

- A rolling `MediaRecorder` records the same physical stream in 200 ms chunks.
- Complete chunks are retained for Replay Last and also appended to a
  `MediaSource` / `SourceBuffer` when delay mode is active.
- Every 400 ms, delay playback targets:

  `buffered end - selected delay seconds`

- The supported delay range is 6–20 seconds.
- Old `SourceBuffer` data is trimmed with an additional safety margin.
- Replay Last flushes the rolling recorder into one playable blob, immediately
  restarts rolling on the still-live stream, and opens only the requested tail
  in `VideoWorkbench`.
- Do not split WebM timeslices into independent files: later slices may not
  contain the file header and therefore may not play.

### Recording

- A separate attempt `MediaRecorder` can record from the same stream and save
  complete attempts to IndexedDB.
- Delay-mode **Record** flushes the rolling blob and uploads it to the active
  athlete's video library, then restarts rolling.
- Replay blobs can be saved to the app or device without stopping the physical
  camera.

### Start and stop lifecycle

- Start occurs only after the user presses **Start camera**.
- **Stop camera** stops attempt recording, delay playback, rolling recording,
  and every physical stream track.
- `CameraPane` cleanup does the same when the component actually unmounts.
- Merely hiding the already-open Compare tab does not unmount it.
- Any future shared owner must use consumer-aware release semantics so one
  screen cannot stop tracks still used by another.

### Fullscreen

- Fullscreen is layout state owned by `ComparePanel`.
- Opening fullscreen while the camera is already running switches `CameraPane`
  to delay mode.
- Fullscreen does not itself call `getUserMedia`, stop tracks, or replace the
  stream.
- Fullscreen moves camera controls into the Compare rail through a portal and
  changes video sizing; it does not own the camera lifecycle.

## Intended shared-session architecture (Phase 7)

The protected camera core remains the behavioral reference:

```text
WORKING CAMERA CORE
  Delay Camera
  Replay Last
  Record

SHARED CAMERA SESSION
  one physical MediaStream
  consumer-aware acquire/release
  Today / Match This Shape / Floor Camera
  Videos / Compare
```

Incremental migration rules:

1. Add a session owner without changing the delay algorithm.
2. Let Compare accept either its legacy stream or a shared stream.
3. Keep the legacy path available until shared-stream Compare passes browser
   tests.
4. Add Today as a second consumer only after Compare passes.
5. Never stop physical tracks while another registered consumer is active.
6. Keep rolling delay state owned by the Compare camera core unless a later,
   separately tested change explicitly moves it.
7. Test Delay, Replay Last, Record, tab switching, and fullscreen after every
   camera-session commit.

