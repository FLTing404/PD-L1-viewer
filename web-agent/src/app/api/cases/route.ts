import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCasesRoot } from "@/lib/data/paths";
import type { CaseSummary } from "@/types/case";

export const dynamic = "force-dynamic";

interface RawSummary {
  wsi_id?: string;
  num_exported_patches?: number;
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
    try {
      const text = await fs.readFile(summaryPath, "utf8");
      const raw = JSON.parse(text) as RawSummary;
      cases.push({
        caseId: name,
        wsiId: raw.wsi_id ?? name,
        numExportedPatches: raw.num_exported_patches ?? 0,
      });
    } catch {
      cases.push({
        caseId: name,
        wsiId: name,
        numExportedPatches: 0,
      });
    }
  }

  cases.sort((a, b) => a.caseId.localeCompare(b.caseId));
  return NextResponse.json({ cases });
}
