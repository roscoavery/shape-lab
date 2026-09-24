# Mac gym stuck on Sort build

**Sort** = branch `v2-rebuild`. **Lace** = branch `shape-lab-v4`.

`gym.shapelab.win` serves whatever is running on your Mac (`npm run gym:up`). It is not Vercel.

## Recovery (no Cursor login)

If the folder is already on Sort, `npm run gym:mac` will keep pulling Sort. Do not use that. Paste this instead (works from any folder):

```bash
curl -fsSL https://raw.githubusercontent.com/roscoavery/shape-lab/shape-lab-v4/scripts/boot-lace.sh | bash
```

That fetch is `shape-lab-v4` (Lace) from GitHub, including iCloud calendar. It cannot check out `v2-rebuild`.

After it is running: coach **Today** → **Today from calendar**. **More → Profiles → Calendar connections**.

## GitHub one-line fix (stops this forever on `shape-lab-v4`)

On GitHub, edit `scripts/mac-gym.sh` on branch **shape-lab-v4** and change:

`GYM_BRANCH="${GYM_BRANCH:-v2-rebuild}"` → `GYM_BRANCH="${GYM_BRANCH:-shape-lab-v4}"`

Or merge: https://github.com/roscoavery/shape-lab/compare/v2-rebuild...shape-lab-v4

## Tunnel "not found"

Create a new token in Cloudflare Zero Trust → Tunnels, then on the Mac:

`npm run gym:token`

Restart the gym. Until the tunnel works, use the LAN URL from the terminal on the same Wi‑Fi.
