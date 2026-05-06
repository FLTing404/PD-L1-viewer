import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { getCaseDir, isValidCaseId } from "@/lib/data/paths";
import { loadCaseManifest } from "@/lib/data/parseManifest";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  if (!isValidCaseId(caseId)) {
    return NextResponse.json({ error: "invalid_case_id" }, { status: 400 });
  }
  const caseDir = getCaseDir(caseId);
  try {
    await fs.access(caseDir);
  } catch {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }
  try {
    const manifest = await loadCaseManifest(caseId, caseDir);
    return NextResponse.json(manifest);
  } catch (err) {
    return NextResponse.json(
      { error: "manifest_load_failed", message: String(err) },
      { status: 500 },
    );
  }
}
