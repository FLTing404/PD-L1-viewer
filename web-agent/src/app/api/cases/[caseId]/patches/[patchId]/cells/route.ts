import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { getCaseDir, isValidCaseId, isValidPatchId } from "@/lib/data/paths";
import { loadCells } from "@/lib/data/parseCells";

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
  const cellsPath = path.join(
    getCaseDir(caseId),
    "patches",
    patchId,
    "cells.csv",
  );
  try {
    await fs.access(cellsPath);
  } catch {
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
