import fs from "node:fs/promises";
import path from "node:path";
import type {
  CaseManifest,
  PatchEntry,
  WsiSummary,
  PatchBucket,
} from "@/types/case";
import type { TileSourceConfig } from "@/types/tileSource";
import {
  DEFAULT_PATCH_SIZE,
  deriveWsiExtent,
  parsePatchId,
} from "./patchGeometry";
import {
  buildDziTileSource,
  buildTileSource,
  readDziXmlMeta,
  readImageSize,
} from "./tileSource";
import { safeJoin } from "@/lib/data/paths";

interface RawWsiSummary {
  wsi_id: string;
  kfb_path?: string;
  thumbnail_file: string;
  num_exported_patches: number;
  model_checkpoint?: string;
  best_cell_threshold_from_model?: number;
  cell_threshold_used_for_export_labels: number;
  selection_notes?: string[];
  wsi_width?: number;
  wsi_height?: number;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else if (ch === '"') {
      inQuotes = true;
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function toPatchBucket(value: string): PatchBucket {
  if (
    value === "TPS_50" ||
    value === "TPS_10" ||
    value === "TPS_1" ||
    value === "Negative"
  ) {
    return value;
  }
  return "Negative";
}

function snakeToWsiSummary(raw: RawWsiSummary): WsiSummary {
  return {
    wsiId: raw.wsi_id,
    kfbPath: raw.kfb_path,
    thumbnailFile: raw.thumbnail_file,
    numExportedPatches: raw.num_exported_patches,
    modelCheckpoint: raw.model_checkpoint,
    bestCellThresholdFromModel: raw.best_cell_threshold_from_model,
    cellThresholdUsedForExportLabels: raw.cell_threshold_used_for_export_labels,
    selectionNotes: raw.selection_notes,
  };
}

async function fileExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locates `cells.csv` for a patch. Tries `patches/<patchId>/cells.csv` first, then
 * the `cells_csv` path in `patches_manifest.csv` (folder name may be e.g. `patch_x0_y0`
 * while `patch_id` uses another prefix).
 */
export async function resolveCellsCsvPath(
  caseDir: string,
  patchId: string,
): Promise<string | null> {
  const direct = path.join(caseDir, "patches", patchId, "cells.csv");
  if (await fileExists(direct)) return direct;

  const manifestPath = path.join(caseDir, "patches_manifest.csv");
  if (!(await fileExists(manifestPath))) return null;

  const text = await fs.readFile(manifestPath, "utf8");
  const rows = parseCsv(text);
  for (const row of rows) {
    if (row.patch_id !== patchId) continue;
    const rel = (row.cells_csv ?? "").replace(/\\/g, "/").trim();
    if (!rel) continue;
    const abs = safeJoin(caseDir, rel);
    if (!abs) continue;
    if (await fileExists(abs)) return abs;
  }
  return null;
}

/** Prefer Deep Zoom tiles when present (generated offline with libvips `dzsave`). */
const DZI_CANDIDATES = ["dzi/stitched.dzi", "dzi/slide.dzi"] as const;

async function tryResolveDziTileSource(
  caseId: string,
  caseDir: string,
): Promise<Extract<TileSourceConfig, { kind: "dzi" }> | null> {
  for (const rel of DZI_CANDIDATES) {
    const abs = path.join(caseDir, rel);
    if (!(await fileExists(abs))) continue;
    const meta = await readDziXmlMeta(abs);
    if (!meta) continue;
    return buildDziTileSource(caseId, rel, meta);
  }
  return null;
}

/** Browser-safe single-image viewer sources (TIFF is used offline → DZI; OSD image tiles rarely decode TIFF). */
const STITCHED_BROWSER_CANDIDATES = ["stitched.jpg", "stitched.png"] as const;

/** Full-res mosaic paths for WSI extent (includes TIFF written when JPEG edge > ~65500). */
const STITCHED_EXTENT_CANDIDATES = [
  "stitched.jpg",
  "stitched.png",
  "stitched.tif",
  "stitched.tiff",
] as const;

async function tryResolveBrowserStitchedPath(
  caseDir: string,
): Promise<{ abs: string; rel: string } | null> {
  for (const rel of STITCHED_BROWSER_CANDIDATES) {
    const abs = path.join(caseDir, rel);
    if (await fileExists(abs)) return { abs, rel };
  }
  return null;
}

async function tryResolveStitchedExtentPath(caseDir: string): Promise<string | null> {
  for (const rel of STITCHED_EXTENT_CANDIDATES) {
    const abs = path.join(caseDir, rel);
    if (await fileExists(abs)) return abs;
  }
  return null;
}

export async function loadCaseManifest(
  caseId: string,
  caseDir: string,
): Promise<CaseManifest> {
  const summaryPath = path.join(caseDir, "wsi_summary.json");
  const manifestPath = path.join(caseDir, "patches_manifest.csv");

  const [summaryRaw, manifestText] = await Promise.all([
    fs.readFile(summaryPath, "utf8"),
    fs.readFile(manifestPath, "utf8"),
  ]);

  const summary = JSON.parse(summaryRaw) as RawWsiSummary;
  const wsiSummary = snakeToWsiSummary(summary);

  const rows = parseCsv(manifestText);
  const patches: PatchEntry[] = rows
    .map<PatchEntry | null>((row) => {
      const patchId = row.patch_id;
      const coord = parsePatchId(patchId);
      if (!coord) return null;
      return {
        patchId,
        imageFile: row.image_file,
        patchJson: row.patch_json,
        cellsCsv: row.cells_csv,
        numCells: Number(row.num_cells) || 0,
        patchPredBucket: toPatchBucket(row.patch_pred_bucket),
        patchPredTps: Number(row.patch_pred_tps) || 0,
        px: coord.px,
        py: coord.py,
        width: DEFAULT_PATCH_SIZE,
        height: DEFAULT_PATCH_SIZE,
      };
    })
    .filter((entry): entry is PatchEntry => entry !== null);

  let wsiWidth = summary.wsi_width ?? 0;
  let wsiHeight = summary.wsi_height ?? 0;

  let tileSource: TileSourceConfig;
  let viewerSize = { width: 0, height: 0 };

  const dziSource = await tryResolveDziTileSource(caseId, caseDir);
  if (dziSource) {
    tileSource = dziSource;
    viewerSize = { width: dziSource.width, height: dziSource.height };
    wsiWidth = dziSource.width;
    wsiHeight = dziSource.height;
  } else {
    const thumbPath = path.join(caseDir, wsiSummary.thumbnailFile);
    const browserStitched = await tryResolveBrowserStitchedPath(caseDir);
    const extentAbs = await tryResolveStitchedExtentPath(caseDir);
    const useStitched = browserStitched !== null;

    const viewerDiskPath = useStitched ? browserStitched.abs : thumbPath;
    const viewerRelPath = useStitched ? browserStitched.rel : wsiSummary.thumbnailFile;

    viewerSize = await readImageSize(viewerDiskPath);

    const extentPath = useStitched ? browserStitched.abs : extentAbs;
    let extentSize = { width: 0, height: 0 };
    if (extentPath) {
      extentSize = await readImageSize(extentPath);
    }

    if (extentSize.width > 0 && extentSize.height > 0) {
      wsiWidth = extentSize.width;
      wsiHeight = extentSize.height;
    } else if (!wsiWidth || !wsiHeight) {
      const extent = deriveWsiExtent(patches);
      wsiWidth = extent.wsiWidth;
      wsiHeight = extent.wsiHeight;
    }

    if (!viewerSize.width || !viewerSize.height) {
      viewerSize = {
        width: Math.max(1, wsiWidth),
        height: Math.max(1, wsiHeight),
      };
    }

    tileSource = buildTileSource(caseId, viewerRelPath, viewerSize);
  }


  const manifest: CaseManifest = {
    caseId,
    wsiSummary,
    patches,
    wsiMeta: {
      wsiWidth,
      wsiHeight,
      thumbnailWidth: viewerSize.width,
      thumbnailHeight: viewerSize.height,
      thumbScaleX: viewerSize.width / wsiWidth,
      thumbScaleY: viewerSize.height / wsiHeight,
      patchSize: DEFAULT_PATCH_SIZE,
    },
    tileSource,
  };

  return manifest;
}
