# PD-L1 TPS workspace (`code/`)

Active application: **`web-agent/`** — PD-L1 tumor proportion score review UI (OpenSeadragon WSI, patch gallery, DeepSeek chat). Legacy **`web/`** is deprecated; left in tree only, do not extend.

Case assets live under **`data/<caseId>/`** (e.g. `patches/`, `stitched.jpg`, optional `dzi/`).

> All model-derived numbers are **AI inference outputs**, not standalone diagnostic evidence.

## UI overview (`web-agent`)

- **Top bar**: title, case selector, case ID, Export Report (placeholder).
- **Left column**
  - Top: OpenSeadragon WSI (navigator + overlays). Optional **TPS heatmap** overlay on the WSI (toolbar toggle next to ROI).
  - Middle: TPS distribution (stacked bar + legend), WSI summary.
  - Bottom: Patch Gallery — buckets (`>50% / 10–50% / 1–10% / <1%`), sort, thumbnails, pagination; click selects patch and flies the viewer.
- **Right column**
  - Top: Selected Patch — Cell Class / Heatmap previews (shared zoom/pan), TPS ring + cell counts.
  - Bottom: AI Assistant — DeepSeek streaming chat with case / selected-patch context.

## Run locally

```bash
cd web-agent
pnpm install
pnpm build && pnpm start
# AI Assistant needs a DeepSeek API key
cp .env.local.example .env.local
# Set DEEPSEEK_API_KEY=sk-xxxxxxxx in .env.local

pnpm dev
# http://localhost:3000
```

From **this `code/` directory**, `data/` is at `./data`. Default cases root is `../data` relative to `web-agent` (i.e. `code/data/`). Override:

```bash
# Windows PowerShell
$env:CASES_ROOT = "D:\path\to\my\data"
pnpm dev
pnpm start
```

## AI Assistant (`POST /api/chat`)

Builds an English system prompt with WSI stats; if a patch is selected, includes patch ID, bucket, TPS, cell counts, coordinates, positive/negative counts. Policy: inference disclaimer, guideline cut-offs cited without replacing clinician judgment, no definitive diagnosis or prescriptions. Replies stream over SSE as Markdown.

## Configuration (`web-agent`)

| Env                  | Default                                                     | Notes                                                                                        |
| -------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DEEPSEEK_API_KEY` | (none)                                                      | Without it,`/api/chat` returns 503                                                         |
| `CASES_ROOT`       | `..\data` (from `web-agent`; resolves to `code/data`) | Root folder containing one subdirectory per case (e.g.`DI2025-020430_2025-03-19_14_16_26`) |

### Large WSI (stitch + Deep Zoom)

- The viewer prefers **`stitched.jpg`** at `data/<caseId>/stitched.jpg`, served via `/api/cases/<caseId>/file/stitched.jpg`. The URL segment **`file` is only the API route**, not a folder on disk.
- For smooth zoom on huge images, generate tiles with **libvips** and add **`dzi/stitched.dzi`** plus **`dzi/stitched_files/`** under the case folder; manifest prefers DZI over a single JPEG.

If a case folder only has **`patches/`** and **`patches_manifest.csv`**, build assets from repo root **`code/`**:

1. **Stitch patch JPEGs** → `stitched.jpg` (and optional `thumbnail.png` + minimal `wsi_summary.json` if missing). Large canvases require **pyvips** and **libvips** (Pillow alone is capped by `--max-pil-pixels`, default 120M pixels).

   ```bash
   python data/script/build_stitched_from_patches.py DI2025-016679_2025-03-10_13_47_56
   ```
2. **Deep Zoom** (requires **`vips`** on `PATH`):

   ```bash
   python data/script/build_dzi_from_stitched.py DI2025-016679_2025-03-10_13_47_56
   ```
3. **Both** in one command:

   ```bash
   python data/script/build_case_viewer_assets.py DI2025-016679_2025-03-10_13_47_56
   ```

Use `--cases-root` if your data root is not `code/data`. Use `build_stitched_from_patches.py --dry-run` to print canvas size without writing files.

### Production notes

- Prefer `pnpm build && pnpm start` for production-like performance vs `pnpm dev`.
- Serving `dzi/` via Nginx or pure static hosting (instead of Next file routes) reduces tile latency at scale; see deployment docs if you add a reverse proxy.
