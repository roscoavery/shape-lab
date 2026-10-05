# R2 video storage setup

## What it does and why

ShapeLab stores video bytes in the coach's own private Cloudflare R2 bucket. Phones then stream video straight from Cloudflare's edge instead of through the Mac gym server, so the Mac stops proxying video bytes and upload/download of large files moves off the home network. R2 charges no bandwidth (egress) fees, so streaming costs nothing per view.

Without R2 configured, everything works exactly as before: videos live in Vercel Blob and on local disk, and the Mac serves them the way it always has.

## Cloudflare dashboard steps

1. Open the Cloudflare dashboard and go to **R2**. Click **Create bucket** and pick any name, for example `shapelab-videos`. The region and storage class defaults are fine.
2. Go to **R2 > Manage R2 API tokens** and click **Create API token**. Give it **Admin read and write** (or scope it to just this bucket). Note the token and secret when they are shown; the secret is only shown once.
3. Copy your **Account ID** from the R2 overview page (it appears in the S3 endpoint URL).

## Environment variables

Set these in the checkout's `.env` file:

| Variable | Required | Description |
|---|---|---|
| `R2_ACCOUNT_ID` | yes | Cloudflare account ID (from the R2 overview page). |
| `R2_BUCKET` | yes | The bucket name you created, e.g. `shapelab-videos`. |
| `R2_ACCESS_KEY_ID` | yes | The API token value. |
| `R2_SECRET_ACCESS_KEY` | yes | The API token secret. |
| `R2_PREFIX` | no | Optional folder prefix, e.g. `coach-ryan/`. Isolates and namespaces one coach's videos inside a shared bucket. |
| `GYM_PULL_MEDIA` | no | Leave unset for the default metadata-only pull. Set to `1` for the legacy behavior that downloads every media binary too. |

## Per-coach setup

Each coach sets this up for their own gym. Either create a separate bucket + API token per coach, or use one shared bucket and give each coach their own `R2_PREFIX` (for example `coach-ryan/`, `coach-jaycie/`). Each coach puts their own env vars in their own checkout's `.env` file. Costs follow the coach who generates them: whoever's videos are being stored and streamed pays for their storage.

## Migration

To move existing athlete videos into the bucket:

1. Dry run first to see the plan:
   ```
   node scripts/backfill-videos-to-cloud.mjs --dry-run
   ```
2. Run it for real:
   ```
   node scripts/backfill-videos-to-cloud.mjs
   ```
3. Play a video in the app to verify it streams.

Notes:

- The script is idempotent. Running it twice migrates nothing new; a video whose `cloudKey` already exists in R2 is skipped.
- It prefers local bytes from `data/athlete-video-blobs/`, falls back to the video's `publicUrl`, and skips videos it cannot read.
- `publicUrl` is kept as a fallback; nothing is deleted from Vercel Blob. Once you are confident everything plays from R2, delete the old Blob objects from the Cloudflare or Vercel dashboards.
