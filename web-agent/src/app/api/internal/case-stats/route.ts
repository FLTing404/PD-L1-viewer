import { NextResponse } from "next/server";
import { isValidCaseId, isValidPatchId } from "@/lib/data/paths";
import {
  formatCaseStatsForPrompt,
  getCaseStats,
} from "@/lib/internal/caseStats";
import type { WorldRect } from "@/lib/localRoiStats";

export const dynamic = "force-dynamic";

function parseRoiWorld(raw: unknown): WorldRect | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const w = Number(o.w);
  const h = Number(o.h);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

interface Body {
  caseId?: string;
  threshold?: number;
  selectedPatchId?: string | null;
  roiWorld?: WorldRect | null;
  /** 默认返回 JSON；设为 true 时额外附 `promptText` 便于调试 */
  includePromptText?: boolean;
}

/**
 * 内部执行层 HTTP 封装：与 `getCaseStats` 一致。
 * Agent / 编排层应调用此接口（或直接在服务端 import `getCaseStats`），勿重复解析 CSV。
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.caseId || !isValidCaseId(body.caseId)) {
    return NextResponse.json({ error: "invalid_case_id" }, { status: 400 });
  }

  const threshold =
    typeof body.threshold === "number" && Number.isFinite(body.threshold)
      ? body.threshold
      : 0.5;

  const selectedPatchId =
    body.selectedPatchId && isValidPatchId(body.selectedPatchId)
      ? body.selectedPatchId
      : null;

  const roiWorld = parseRoiWorld(body.roiWorld);

  try {
    const snapshot = await getCaseStats(body.caseId, {
      threshold,
      selectedPatchId,
      roiWorld,
    });
    const payload: Record<string, unknown> = { snapshot };
    if (body.includePromptText) {
      payload.promptText = formatCaseStatsForPrompt(snapshot);
    }
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: "case_stats_failed", message: String(err) },
      { status: 500 },
    );
  }
}
