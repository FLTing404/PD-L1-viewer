import { NextResponse } from "next/server";
import { getCaseDir, isValidCaseId, isValidPatchId } from "@/lib/data/paths";
import { loadCells } from "@/lib/data/parseCells";
import { resolveCellsCsvPath } from "@/lib/data/parseManifest";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ caseId: string; patchId: string }>;
  },
) {
  const { caseId, patchId } = await params;
  if (!isValidCaseId(caseId) || !isValidPatchId(patchId)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  const caseDir = getCaseDir(caseId);
  const cellsPath = await resolveCellsCsvPath(caseDir, patchId);
  if (!cellsPath) {
    return NextResponse.json({ error: "cells_not_found" }, { status: 404 });
  }
  try {
    const cells = await loadCells(cellsPath);
    return NextResponse.json({ patchId, cells });
  } catch (err) {
    return NextResponse.json(
      { error: "cells_load_failed", message: String(err) },
      { status: 500 },
    );
  }
}
