# PD-L1 TPS workspace (`code/`)

Active application: **`web-agent/`** — PD-L1 tumor proportion score review UI (OpenSeadragon WSI, patch gallery, DeepSeek chat). Legacy **`web/`** is deprecated; left in tree only, do not extend.

Case assets live under **`data/<caseId>/`** (e.g. `patches/`, `stitched.jpg`, optional `dzi/`).

> All model-derived numbers are **AI inference outputs**, not standalone diagnostic evidence.

## UI overview (`web-agent`)

- **Top bar**: title, case selector, case ID, Export Report (placeholder).
- **Left column**
  - Top: OpenSeadragon WSI (navigator + overlays).
  - Middle: TPS distribution (stacked bar + legend), WSI summary.
  - Bottom: Patch Gallery — buckets (`>50% / 10–50% / 1–10% / <1%`), sort, thumbnails, pagination; click selects patch and flies the viewer.
- **Right column**
  - Top: Selected Patch — Cell Class / Heatmap previews (shared zoom/pan), TPS ring + cell counts.
  - Bottom: AI Assistant — DeepSeek streaming chat with case / selected-patch context.

## Run locally

```bash
cd web-agent
pnpm install

# AI Assistant needs a DeepSeek API key
cp .env.local.example .env.local
# Set DEEPSEEK_API_KEY=sk-xxxxxxxx in .env.local

pnpm dev
# http://localhost:3000
```

From **this `code/` directory**, `data/` is at `./data`. Default cases root is `../data` relative to `web-agent` (i.e. `code/data/`). Override:

```bash
# Windows PowerShell
$env:CASES_ROOT = "D:\path\to\my\cases"
pnpm dev
```

## AI Assistant (`POST /api/chat`)

Builds an English system prompt with WSI stats; if a patch is selected, includes patch ID, bucket, TPS, cell counts, coordinates, positive/negative counts. Policy: inference disclaimer, guideline cut-offs cited without replacing clinician judgment, no definitive diagnosis or prescriptions. Replies stream over SSE as Markdown.

## Configuration (`web-agent`)

| Env | Default | Notes |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | (none) | Without it, `/api/chat` returns 503 |
| `CASES_ROOT` | `..\data` (from `web-agent`; resolves to `code/data`) | Root folder containing `case1`, … |

### Large WSI (Deep Zoom)

- The viewer prefers **`stitched.jpg`** at `data/<caseId>/stitched.jpg`, served via `/api/cases/<caseId>/file/stitched.jpg`. The URL segment **`file` is only the API route**, not a folder on disk.
- For smooth zoom on huge images, generate tiles with **libvips** and add **`dzi/stitched.dzi`** plus **`dzi/stitched_files/`** under the case folder; manifest prefers DZI over a single JPEG.
- Example: `python data/case1/build_dzi_from_stitched.py` (run from **`code/`**, with `vips` on `PATH`).

### Production notes

- Prefer `pnpm build && pnpm start` for production-like performance vs `pnpm dev`.
- Serving `dzi/` via Nginx or pure static hosting (instead of Next file routes) reduces tile latency at scale; see deployment docs if you add a reverse proxy.
