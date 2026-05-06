import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCaseDir, isValidCaseId, safeJoin } from "@/lib/data/paths";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".csv": "text/csv",
  ".dzi": "application/xml",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

function lookupMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ caseId: string; path: string[] }>;
  },
) {
  const { caseId, path: segments } = await params;
  if (!isValidCaseId(caseId)) {
    return NextResponse.json({ error: "invalid_case_id" }, { status: 400 });
  }
  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: "empty_path" }, { status: 400 });
  }
  const caseDir = getCaseDir(caseId);
  const target = safeJoin(caseDir, segments.join("/"));
  if (!target) {
    return NextResponse.json({ error: "path_traversal" }, { status: 400 });
  }
  try {
    const data = await fs.readFile(target);
    const mime = lookupMime(target);
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }
}
