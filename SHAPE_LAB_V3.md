# Shape Lab version 3

This is the gym app on `v2-rebuild` after the Videos landing rebuild **and**
the iPhone delay-cam / Compare HUD work that followed:

- Three full-screen Videos buttons (Replay, Athlete camera, Reference library)
- Cinema **Reference library** viewer
- Carousel **‹ ›** on the picture edges
- Homework as big destination buttons
- Delay cam on iPhone Safari: buffered feed plays in a `<video>` (Replay Last
  still uses the rolling blob). CSS rotates that delay picture 90° clockwise
  and sizes it to the pane so it is upright at 1×, matching LIVE.
- Save / hide / min stay on the right edge unless the minimized REF chip is
  actually in the bottom-right corner. Swap / Split travel with the chip.

If Ryan says **revert to Shape Lab version 3**, restore this snapshot. Do not
delete the tag or the branch.

The earlier Videos-landing-only freeze (carousel arrows, before delay-cam
orientation) is still tagged **`shape-lab-v3-landing`**.

## Restore points (same commit)

- **Tag:** `shape-lab-v3`
- **Branch:** `cursor/shape-lab-v3-847e` (do not commit new work here)

Earlier snapshots stay as they are:

- Version 1: `shape-lab-v1` / `cursor/shape-lab-v1-847e`
- Earlier Version 2: `shape-lab-v2` / `cursor/shape-lab-v2-847e`
- Version 2.1: `shape-lab-v2.1` / `cursor/shape-lab-v2.1-847e`
- v3 landing-only: `shape-lab-v3-landing`

## How to revert `v2-rebuild`

```bash
git fetch origin shape-lab-v3 cursor/shape-lab-v3-847e
git switch v2-rebuild
git reset --hard shape-lab-v3
git push --force-with-lease origin v2-rebuild
```

To look at v3 without moving the rebuild branch:

```bash
git switch --detach shape-lab-v3
```
