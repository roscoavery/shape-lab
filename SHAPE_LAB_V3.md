# Shape Lab version 3

This is the gym app on `v2-rebuild` after the Videos landing rebuild:
three full-screen destination buttons, a cinema **Reference library**
viewer, and carousel **‹ ›** on the left and right of the picture
(above the scrub bar).

If Ryan says **revert to Shape Lab version 3**, restore this snapshot. Do not
delete the tag or the branch.

## Restore points (same commit)

- **Tag:** `shape-lab-v3`
- **Branch:** `cursor/shape-lab-v3-847e` (do not commit new work here)

Earlier snapshots stay as they are:

- Version 1: `shape-lab-v1` / `cursor/shape-lab-v1-847e`
- Earlier Version 2: `shape-lab-v2` / `cursor/shape-lab-v2-847e`
- Version 2.1: `shape-lab-v2.1` / `cursor/shape-lab-v2.1-847e`

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
