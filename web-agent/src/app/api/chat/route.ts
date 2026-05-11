import { NextResponse } from "next/server";
import { isValidCaseId, isValidPatchId } from "@/lib/data/paths";
import { buildTemplateFieldsFromCase } from "@/lib/agent/structuredReport";
import { getPredefinedQuestion, PREDEFINED_QUESTIONS } from "@/lib/agent/predefinedQuestions";
import { renderGuidedAnswer } from "@/lib/agent/renderGuided";
import {
  formatCaseStatsForPrompt,
  getCaseStats,
} from "@/lib/internal/caseStats";
import type { WorldRect } from "@/lib/localRoiStats";

export const dynamic = "force-dynamic";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  mode?: "chat" | "guided";
  questionId?: string;
  roiWorld?: WorldRect | null;
  caseId?: string;
  selectedPatchId?: string | null;
  threshold?: number;
  messages?: IncomingMessage[];
}

export async function GET() {
  return NextResponse.json({
    questions: PREDEFINED_QUESTIONS.map(({ id, label }) => ({ id, label })),
  });
}

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

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

async function buildCaseContext(
  caseId: string,
  selectedPatchId: string | null | undefined,
  threshold: number,
  roiWorld: WorldRect | null,
): Promise<string> {
  try {
    const sid =
      selectedPatchId && isValidPatchId(selectedPatchId)
        ? selectedPatchId
        : null;
    const snapshot = await getCaseStats(caseId, {
      threshold,
      selectedPatchId: sid,
      roiWorld,
    });
    return formatCaseStatsForPrompt(snapshot);
  } catch (err) {
    return `(failed to load case context: ${String(err)})`;
  }
}

function buildSystemPrompt(caseContext: string): string {
  return [
    "You are an assistant for a PD-L1 TPS visualization system.",
    "The === Case context === block lists real outputs from the internal stats pipeline (getCaseStats); report those numbers faithfully.",
    "If it includes the line beginning with 'Patch with highest TPS on this slide', that patch ID and coordinates are the manifest patch that achieves the slide-wide maximum TPS (among exported patches with cells)—cite them when asked which patch is hottest.",
    "You help clinicians interpret TPS summaries, cell-level evidence, and common PD-L1 therapy considerations.",
    "Always remember:",
    "- These outputs are not a clinical diagnosis and require confirmation by a qualified physician.",
    "- When discussing drugs or PD-L1 cut-offs, only summarize widely published guideline-style points and defer to local protocols and the treating clinician.",
    "- Never issue a definitive diagnosis or prescribe treatment.",
    "- Prefer concise, structured answers (short headers + bullet lists) grounded in the supplied case context.",
    "- If the user asks for something the data does not support, say so clearly.",
    "- Always reply in English, even if the user writes in another language.",
    "",
    "=== Case context (auto-injected) ===",
    caseContext,
    "=== end of case context ===",
  ].join("\n");
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  if (body.mode === "guided") {
    const qid = typeof body.questionId === "string" ? body.questionId : "";
    const q = getPredefinedQuestion(qid);
    if (!q) {
      return NextResponse.json(
        { error: "unknown_question", questionId: qid },
        { status: 400 },
      );
    }
    if (!body.caseId || !isValidCaseId(body.caseId)) {
      return NextResponse.json(
        { error: "case_required" },
        { status: 400 },
      );
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
      const fields = await buildTemplateFieldsFromCase(
        body.caseId,
        threshold,
        selectedPatchId,
        roiWorld,
      );
      const content = await renderGuidedAnswer(q, fields);
      return NextResponse.json({
        mode: "guided" as const,
        questionId: q.id,
        content,
      });
    } catch (err) {
      return NextResponse.json(
        {
          error: "guided_failed",
          message: String(err),
        },
        { status: 500 },
      );
    }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "deepseek_api_key_missing",
        message:
          "Set DEEPSEEK_API_KEY in code/web-agent/.env.local before using Pathology Insight.",
      },
      { status: 503 },
    );
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "empty_messages" },
      { status: 400 },
    );
  }

  const threshold =
    typeof body.threshold === "number" && Number.isFinite(body.threshold)
      ? body.threshold
      : 0.5;

  const roiWorldChat = parseRoiWorld(body.roiWorld);

  let context = "(no case selected)";
  if (body.caseId && isValidCaseId(body.caseId)) {
    context = await buildCaseContext(
      body.caseId,
      body.selectedPatchId ?? null,
      threshold,
      roiWorldChat,
    );
  }
  const systemPrompt = buildSystemPrompt(context);

  const upstream = await fetch(DEEPSEEK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      stream: true,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : "",
        })),
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    let upstreamMessage = "";
    try {
      const parsed = JSON.parse(text) as {
        error?: { message?: string } | string;
      };
      if (typeof parsed.error === "string") {
        upstreamMessage = parsed.error;
      } else if (parsed.error && typeof parsed.error === "object") {
        upstreamMessage = parsed.error.message ?? "";
      }
    } catch {
      /* upstream body wasn't JSON; ignore */
    }
    return NextResponse.json(
      {
        error: "deepseek_upstream_error",
        status: upstream.status,
        message:
          upstreamMessage ||
          `DeepSeek upstream returned ${upstream.status} ${upstream.statusText || ""}`.trim(),
        body: text.slice(0, 500),
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
