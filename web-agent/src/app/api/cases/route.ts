import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCasesRoot } from "@/lib/data/paths";
import type { CaseSummary } from "@/types/case";

export const dynamic = "force-dynamic";

interface RawSummary {
  wsi_id?: string;
  num_exported_patches?: number;
  thumbnail_file?: string;
}

function meanPatchTpsFromManifestCsv(text: string): number {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return 0;
  const header = lines[0]!.split(",").map((h) => h.trim());
  const tpsIdx = header.indexOf("patch_pred_tps");
  const numCellsIdx = header.indexOf("num_cells");
  if (tpsIdx < 0) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(",");
    if (numCellsIdx >= 0) {
      const nc = parseInt(parts[numCellsIdx] ?? "0", 10);
      if (!Number.isFinite(nc) || nc <= 0) continue;
    }
    const raw = parts[tpsIdx];
    const v = parseFloat(raw ?? "");
    if (Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

export async function GET() {
  const root = getCasesRoot();
  let entries: string[] = [];
  try {
    const dirents = await fs.readdir(root, { withFileTypes: true });
    entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch (err) {
    return NextResponse.json(
      { error: "cases_root_unreadable", root, message: String(err) },
      { status: 500 },
    );
  }

  const cases: CaseSummary[] = [];
  for (const name of entries) {
    const caseDir = path.join(root, name);
    const summaryPath = path.join(caseDir, "wsi_summary.json");
    const manifestPath = path.join(caseDir, "patches_manifest.csv");
    try {
      await Promise.all([fs.stat(summaryPath), fs.stat(manifestPath)]);
    } catch {
      continue;
    }
    let meanPatchTps = 0;
    let thumbRel = "thumbnail.png";
    let wsiId = name;
    let numPatches = 0;
    try {
      const text = await fs.readFile(summaryPath, "utf8");
      const raw = JSON.parse(text) as RawSummary;
      wsiId = raw.wsi_id ?? name;
      numPatches = raw.num_exported_patches ?? 0;
      if (raw.thumbnail_file) thumbRel = raw.thumbnail_file;
    } catch {
      /* keep defaults */
    }
    try {
      const csvText = await fs.readFile(manifestPath, "utf8");
      meanPatchTps = meanPatchTpsFromManifestCsv(csvText);
    } catch {
      /* ignore */
    }
    cases.push({
      caseId: name,
      wsiId,
      numExportedPatches: numPatches,
      meanPatchTps,
      thumbnailRelative: thumbRel,
    });
  }

  cases.sort((a, b) => a.caseId.localeCompare(b.caseId));
  return NextResponse.json({ cases });
}
