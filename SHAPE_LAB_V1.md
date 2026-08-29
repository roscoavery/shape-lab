# Shape Lab version 1

This is the frozen gym app from 29 August 2026: camera scoring, Tasks, Learn, Compare, Classes, Feed, roster, and the Vercel production path.

If Ryan says **revert to Shape Lab version 1**, restore this snapshot. Do not delete the tag or the branch.

## Restore points (same commit)

- **Tag:** `shape-lab-v1`
- **Branch:** `cursor/shape-lab-v1-847e` (do not commit new work here)

## How to revert `main`

```bash
git fetch origin shape-lab-v1 cursor/shape-lab-v1-847e
git switch main
git reset --hard shape-lab-v1
git push --force-with-lease origin main
```

To look at v1 without moving `main`:

```bash
git switch --detach shape-lab-v1
```
