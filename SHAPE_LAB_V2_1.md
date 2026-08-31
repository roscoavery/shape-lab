# Shape Lab version 2.1

This is the gym app on `v2-rebuild` after the 9:16 drill library viewer, before
Replay Last pinch-zoom, save-to-Photos trim, and overlay transport changes.

If Ryan says **revert to Shape Lab version 2.1**, restore this snapshot. Do not
delete the tag or the branch.

## Restore points (same commit)

- **Tag:** `shape-lab-v2.1`
- **Branch:** `cursor/shape-lab-v2.1-847e` (do not commit new work here)

Earlier snapshots stay as they are:

- Version 1: `shape-lab-v1` / `cursor/shape-lab-v1-847e`
- Earlier Version 2: `shape-lab-v2` / `cursor/shape-lab-v2-847e`

## How to revert `v2-rebuild`

```bash
git fetch origin shape-lab-v2.1 cursor/shape-lab-v2.1-847e
git switch v2-rebuild
git reset --hard shape-lab-v2.1
git push --force-with-lease origin v2-rebuild
```

To look at 2.1 without moving the rebuild branch:

```bash
git switch --detach shape-lab-v2.1
```
