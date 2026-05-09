import { NextResponse } from "next/server";
import {
  getCaseDir,
  isValidCaseId,
  isValidPatchId,
} from "@/lib/data/paths";
import {
  loadCaseManifest,
  resolveCellsCsvPath,
} from "@/lib/data/parseManifest";
import { loadCells } from "@/lib/data/parseCells";
import { computeCellStats, computeWsiStats } from "@/lib/store";

export const dynamic = "force-dynamic";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  caseId?: string;
  selectedPatchId?: string | null;
  threshold?: number;
  messages?: IncomingMessage[];
}

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

async function buildCaseContext(
  caseId: string,
  selectedPatchId: string | null | undefined,
  threshold: number,
): Promise<string> {
  const lines: string[] = [];
  try {
    const manifest = await loadCaseManifest(caseId, getCaseDir(caseId));
    const stats = computeWsiStats(manifest);
    lines.push(`Case ID: ${manifest.caseId}`);
    lines.push(`WSI ID: ${manifest.wsiSummary.wsiId}`);
    lines.push(`Patches exported: ${stats.patchCount}`);
    lines.push(`Total cells across patches: ${stats.totalCells}`);
    lines.push(
      `Mean patch TPS: ${(stats.meanTps * 100).toFixed(2)}% / Max patch TPS: ${(stats.maxTps * 100).toFixed(2)}%`,
    );
    lines.push(
      `Bucket distribution: TPS_50=${stats.bucketCounts.TPS_50 ?? 0}, TPS_10=${stats.bucketCounts.TPS_10 ?? 0}, TPS_1=${stats.bucketCounts.TPS_1 ?? 0}, Negative=${stats.bucketCounts.Negative ?? 0}`,
    );
    lines.push(
      `Export threshold: ${manifest.wsiSummary.cellThresholdUsedForExportLabels}`,
    );
    if (manifest.wsiSummary.bestCellThresholdFromModel != null) {
      lines.push(
        `Model best threshold: ${manifest.wsiSummary.bestCellThresholdFromModel}`,
      );
    }

    if (selectedPatchId && isValidPatchId(selectedPatchId)) {
      const patch = manifest.patches.find(
        (p) => p.patchId === selectedPatchId,
      );
      if (patch) {
        lines.push("");
        lines.push(`Selected patch: ${patch.patchId}`);
        lines.push(`  - Bucket: ${patch.patchPredBucket}`);
        lines.push(
          `  - Predicted TPS: ${(patch.patchPredTps * 100).toFixed(2)}%`,
        );
        lines.push(`  - Cell count: ${patch.numCells}`);
        lines.push(
          `  - WSI position: x=${patch.px}, y=${patch.py} (size ${patch.width}×${patch.height})`,
        );

        const cellsCsv = await resolveCellsCsvPath(
          getCaseDir(caseId),
          selectedPatchId,
        );
        if (cellsCsv) {
          try {
            const cells = await loadCells(cellsCsv);
            const cs = computeCellStats(cells, threshold);
            lines.push(
              `  - At threshold ${threshold.toFixed(2)}: positive=${cs.positive} (${(cs.positiveRatio * 100).toFixed(2)}%), negative=${cs.negative}, borderline (±0.05)=${cs.borderline}, mean cell pos. prob.=${cs.meanProb.toFixed(3)}`,
            );
          } catch {
            /* ignore corrupt cells.csv */
          }
        }
      }
    }
  } catch (err) {
    lines.push(`(failed to load case context: ${String(err)})`);
  }
  return lines.join("\n");
}

function buildSystemPrompt(caseContext: string): string {
  return [
    "You are an AI pathology assistant integrated into a PD-L1 TPS visualization system.",
    "You support physicians by interpreting AI-inferred Tumor Proportion Score (TPS) results, explaining cell-level evidence, discussing treatment-related considerations such as PD-L1 directed therapy eligibility, and pointing out spatial patterns and edge cases that warrant manual review.",
    "Always remember and respect these constraints:",
    "- All numeric results in this system are AI inference outputs, NOT a clinical diagnosis. Make this clear when answering.",
    "- When asked about drug usage (e.g. pembrolizumab / nivolumab indications, PD-L1 cut-offs), you may summarize publicly known guideline-level considerations (e.g. NSCLC TPS ≥1% / ≥50% cut-offs) but explicitly require physician confirmation and remind that local guidelines and the patient's full clinical picture must be considered.",
    "- Never produce a definitive diagnosis or treatment prescription.",
    "- Prefer concise, structured answers (short headers + bullet lists) and stay grounded in the supplied case data when relevant.",
    "- If the user asks something the data clearly does not support, say so transparently.",
    "",
    "=== Case context (auto-injected) ===",
    caseContext,
    "=== end of case context ===",
  ].join("\n");
}

export async function POST(req: Request) {
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

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
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

  let context = "(no case selected)";
  if (body.caseId && isValidCaseId(body.caseId)) {
    context = await buildCaseContext(
      body.caseId,
      body.selectedPatchId ?? null,
      threshold,
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
