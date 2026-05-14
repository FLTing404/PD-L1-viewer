import {
  getCaseDir,
  isValidCaseId,
  isValidPatchId,
} from "@/lib/data/paths";
import { loadCaseManifest, resolveCellsCsvPath } from "@/lib/data/parseManifest";
import { loadCells } from "@/lib/data/parseCells";
import { computeCellStats, computeWsiStats, type WsiStats } from "@/lib/store";
import { countPatchesByBucket } from "@/lib/tpsHistogram";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import {
  computeLocalSelectionFromUserRect,
  patchesIntersectingRect,
  type LocalSelectionSummary,
  type WorldRect,
} from "@/lib/localRoiStats";
import type { CaseManifest, PatchBucket, PatchEntry } from "@/types/case";
import type { TemplateFields } from "@/lib/agent/templateFields";
import {
  formatPercent01Digits,
  formatTpsPercentDigits,
} from "@/lib/formatTpsPercent";

export type CaseStatsParams = {
  threshold: number;
  selectedPatchId: string | null;
  roiWorld: WorldRect | null;
};

export type RoiStatsPayload = {
  snapped: WorldRect;
  summary: LocalSelectionSummary;
  meanTpsInRoi: number;
  bucketCounts: Record<PatchBucket, number>;
};

export type PatchDetailPayload = {
  patchId: string;
  patchPredBucket: string;
  patchPredTps: number;
  numCells: number;
  px: number;
  py: number;
  width: number;
  height: number;
  cellStatsAtThreshold: {
    positive: number;
    negative: number;
    borderline: number;
    positiveRatio: number;
    meanProb: number;
  } | null;
};

/** Same patch set as WSI max TPS: among exported patches with cells>0, highest patchPredTps (ties → lexicographically smallest patchId). */
export type HighestTpsPatchPayload = {
  patchId: string;
  patchPredBucket: string;
  patchPredTps: number;
  px: number;
  py: number;
  width: number;
  height: number;
};

/** 内部执行层唯一结构化快照：Agent / LLM 上下文仅应由此生成，不直接读表拼装 */
export type CaseStatsSnapshot = {
  caseId: string;
  wsiId: string;
  exportThresholdUsedForLabels: number;
  bestCellThresholdFromModel: number | null;
  wsi: WsiStats;
  /** Patch that achieves wsi.maxTps (same denominator as patch-count / bucket stats). */
  wsiHighestTpsPatch: HighestTpsPatchPayload | null;
  selectedPatch: PatchDetailPayload | null;
  roi: RoiStatsPayload | null;
};

function cellWeightedMeanTps(patches: PatchEntry[]): number {
  const withCells = patchesWithCellsForTps(patches);
  let sum = 0;
  let cells = 0;
  for (const p of withCells) {
    sum += p.patchPredTps * p.numCells;
    cells += p.numCells;
  }
  return cells > 0 ? sum / cells : 0;
}

async function loadPatchDetail(
  manifest: CaseManifest,
  caseDir: string,
  patchId: string,
  threshold: number,
): Promise<PatchDetailPayload | null> {
  const patch = manifest.patches.find((p) => p.patchId === patchId);
  if (!patch) return null;
  let cellStatsAtThreshold: PatchDetailPayload["cellStatsAtThreshold"] = null;
  const cellsCsv = await resolveCellsCsvPath(caseDir, patchId);
  if (cellsCsv) {
    try {
      const cells = await loadCells(cellsCsv);
      const cs = computeCellStats(cells, threshold);
      cellStatsAtThreshold = {
        positive: cs.positive,
        negative: cs.negative,
        borderline: cs.borderline,
        positiveRatio: cs.positiveRatio,
        meanProb: cs.meanProb,
      };
    } catch {
      cellStatsAtThreshold = null;
    }
  }
  return {
    patchId: patch.patchId,
    patchPredBucket: patch.patchPredBucket,
    patchPredTps: patch.patchPredTps,
    numCells: patch.numCells,
    px: patch.px,
    py: patch.py,
    width: patch.width,
    height: patch.height,
    cellStatsAtThreshold,
  };
}

function pickHighestPredTpsPatch(patches: PatchEntry[]): PatchEntry | null {
  if (patches.length === 0) return null;
  let best = patches[0]!;
  for (let i = 1; i < patches.length; i++) {
    const p = patches[i]!;
    if (p.patchPredTps > best.patchPredTps) best = p;
    else if (p.patchPredTps === best.patchPredTps && p.patchId < best.patchId)
      best = p;
  }
  return best;
}

function toHighestPayload(p: PatchEntry): HighestTpsPatchPayload {
  return {
    patchId: p.patchId,
    patchPredBucket: p.patchPredBucket,
    patchPredTps: p.patchPredTps,
    px: p.px,
    py: p.py,
    width: p.width,
    height: p.height,
  };
}

function computeRoiPayload(
  manifest: CaseManifest,
  roiWorld: WorldRect,
): RoiStatsPayload | null {
  const sel = computeLocalSelectionFromUserRect(manifest, roiWorld);
  if (!sel) return null;
  const { snapped, summary } = sel;
  const inRoiRect = patchesIntersectingRect(manifest, snapped);
  const inRoiBuckets = patchesWithCellsForTps(inRoiRect);
  const roiBc = countPatchesByBucket(inRoiBuckets);
  const mean = cellWeightedMeanTps(inRoiRect);
  return {
    snapped,
    summary,
    meanTpsInRoi: mean,
    bucketCounts: roiBc,
  };
}

/**
 * 内部数据 API：聚合全图 / 选中 patch / ROI 的预计算指标（唯一推荐入口）。
 */
export async function getCaseStats(
  caseId: string,
  params: CaseStatsParams,
): Promise<CaseStatsSnapshot> {
  if (!isValidCaseId(caseId)) {
    throw new Error("invalid_case_id");
  }
  const caseDir = getCaseDir(caseId);
  const manifest = await loadCaseManifest(caseId, caseDir);
  const wsi = computeWsiStats(manifest);
  const forTpsPatches = patchesWithCellsForTps(manifest.patches);
  const highestEntry = pickHighestPredTpsPatch(forTpsPatches);
  const wsiHighestTpsPatch =
    highestEntry != null ? toHighestPayload(highestEntry) : null;

  const patchId =
    params.selectedPatchId && isValidPatchId(params.selectedPatchId)
      ? params.selectedPatchId
      : null;
  const selectedPatch = patchId
    ? await loadPatchDetail(manifest, caseDir, patchId, params.threshold)
    : null;

  let roi: RoiStatsPayload | null = null;
  const rw = params.roiWorld;
  if (rw && rw.w > 0 && rw.h > 0) {
    roi = computeRoiPayload(manifest, rw);
  }

  return {
    caseId: manifest.caseId,
    wsiId: manifest.wsiSummary.wsiId,
    exportThresholdUsedForLabels:
      manifest.wsiSummary.cellThresholdUsedForExportLabels,
    bestCellThresholdFromModel:
      manifest.wsiSummary.bestCellThresholdFromModel ?? null,
    wsi,
    wsiHighestTpsPatch,
    selectedPatch,
    roi,
  };
}

/** Axis-aligned overlap: patch footprint vs ROI rectangle (WSI px). */
function patchIntersectsWorldRect(
  patch: { px: number; py: number; width: number; height: number },
  roi: WorldRect,
): boolean {
  const rx2 = roi.x + roi.w;
  const ry2 = roi.y + roi.h;
  const px2 = patch.px + patch.width;
  const py2 = patch.py + patch.height;
  return !(
    patch.px >= rx2 || px2 <= roi.x || patch.py >= ry2 || py2 <= roi.y
  );
}

function fmtCountEn(n: number): string {
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—";
}

function coordInt(n: number): string {
  return String(Math.round(n));
}

/**
 * Fixed-layout Markdown for guided "What does my current ROI show?" — only numbers change.
 */
export function buildRoiReportMarkdown(s: CaseStatsSnapshot): string {
  const r = s.roi;
  if (!r) {
    return "_No active ROI — draw a rectangle on the slide first, then use this quick prompt again._";
  }

  const { snapped, summary } = r;
  const roiMean = formatTpsPercentDigits(r.meanTpsInRoi);
  const wsiMean = formatTpsPercentDigits(s.wsi.meanTps);
  const bc = r.bucketCounts;

  const pct = (part: number, whole: number) =>
    whole > 0 ? Math.round((100 * part) / whole) : 0;
  const roiCellsPct = pct(summary.totalCells, s.wsi.totalCells);
  const roiPosCapturePct =
    s.wsi.positiveCells > 0
      ? Math.round((100 * summary.positiveCells) / s.wsi.positiveCells)
      : 0;

  const d = r.meanTpsInRoi - s.wsi.meanTps;
  let enrichment: string;
  if (d > 0.02) {
    enrichment = `**Enrichment:** The cell-weighted mean TPS of **${roiMean}%** is significantly higher than the slide-wide mean of **${wsiMean}%**, indicating this specific region is enriched for PD-L1 positivity.`;
  } else if (d < -0.02) {
    enrichment = `**Enrichment:** The cell-weighted mean TPS of **${roiMean}%** is lower than the slide-wide mean of **${wsiMean}%**, indicating this region is comparatively less PD-L1–enriched than the rest of the slide.`;
  } else {
    enrichment = `**Enrichment:** The cell-weighted mean TPS of **${roiMean}%** is close to the slide-wide mean of **${wsiMean}%**.`;
  }

  const h = s.wsiHighestTpsPatch;
  const n50fmt = fmtCountEn(bc.TPS_50);
  let hotspots: string;
  if (h && patchIntersectsWorldRect(h, snapped)) {
    hotspots = `**Hotspots:** Over **${n50fmt}** patches in the ROI have a TPS ≥50%. The hottest patch on the entire slide (**${formatTpsPercentDigits(h.patchPredTps)}%** TPS) is located within this ROI at coordinates **x=${coordInt(h.px)}, y=${coordInt(h.py)}**.`;
  } else if (h) {
    hotspots = `**Hotspots:** Over **${n50fmt}** patches in the ROI have a TPS ≥50%. The hottest patch on the entire slide (**${formatTpsPercentDigits(h.patchPredTps)}%** TPS) is located outside this ROI (coordinates **x=${coordInt(h.px)}, y=${coordInt(h.py)}**).`;
  } else {
    hotspots = `**Hotspots:** Over **${n50fmt}** patches in the ROI have a TPS ≥50%.`;
  }

  const posCapture =
    s.wsi.positiveCells > 0
      ? `**Positive Cell Capture:** The ROI captures roughly **${roiPosCapturePct}%** of all positive cells found on the entire slide (${fmtCountEn(summary.positiveCells)} of ${fmtCountEn(s.wsi.positiveCells)} total).`
      : `**Positive Cell Capture:** Whole-slide positive-cell count is zero in the current roll-up; ROI positive cells = **${fmtCountEn(summary.positiveCells)}**.`;

  const cellDensity = `**Cell Density:** The ROI contains about **${roiCellsPct}%** of all cells on the slide (${fmtCountEn(summary.totalCells)} out of ${fmtCountEn(s.wsi.totalCells)} total).`;

  return [
    "# Current ROI Summary",
    "",
    `**Location (snapped):** x=${coordInt(snapped.x)}, y=${coordInt(snapped.y)}, width=${coordInt(snapped.w)}, height=${coordInt(snapped.h)}`,
    "",
    `**Patches with cells:** ${fmtCountEn(summary.patchCount)} (${fmtCountEn(summary.syntheticPatchCount)} blank grid slots were excluded).`,
    "",
    `**Total cells:** ${fmtCountEn(summary.totalCells)}`,
    "",
    `**Positive cells:** ${fmtCountEn(summary.positiveCells)}`,
    "",
    `**Negative cells:** ${fmtCountEn(summary.negativeCells)}`,
    "",
    "## TPS Metrics",
    "",
    `**Mean TPS (cell-weighted):** ${roiMean}%`,
    "",
    "**Patch bucket distribution (cells > 0):**",
    "",
    `Negative (<1%): ${fmtCountEn(bc.Negative)} patches<br />1–9% TPS: ${fmtCountEn(bc.TPS_1)} patches<br />10–49% TPS: ${fmtCountEn(bc.TPS_10)} patches<br />≥50% TPS: ${fmtCountEn(bc.TPS_50)} patches`,
    "",
    "## Key Takeaways",
    "",
    cellDensity,
    "",
    enrichment,
    "",
    hotspots,
    "",
    posCapture,
    "",
    "> ⚠️ *These are quantitative observations from the automated analysis pipeline. Clinical interpretation and treatment decisions require physician review of the full histology and correlation with other clinical findings.*",
  ].join("\n");
}

/** 将快照转为模板填空字段 */
export function caseStatsToTemplateFields(s: CaseStatsSnapshot): TemplateFields {
  const bc = s.wsi.bucketCounts;
  const base: TemplateFields = {
    caseId: s.caseId,
    wsiId: s.wsiId,
    exportThreshold: String(s.exportThresholdUsedForLabels),
    wsiPatchCount: String(s.wsi.patchCount),
    wsiTotalCells: String(s.wsi.totalCells),
    wsiMeanTpsPct: formatTpsPercentDigits(s.wsi.meanTps),
    wsiMaxTpsPct: formatTpsPercentDigits(s.wsi.maxTps),
    wsiPosCells: String(s.wsi.positiveCells),
    wsiNegCells: String(s.wsi.negativeCells),
    wsiBucketNeg: String(bc.Negative ?? 0),
    wsiBucket1: String(bc.TPS_1 ?? 0),
    wsiBucket10: String(bc.TPS_10 ?? 0),
    wsiBucket50: String(bc.TPS_50 ?? 0),
    ...(s.wsiHighestTpsPatch
      ? {
          wsiHighestPatchId: s.wsiHighestTpsPatch.patchId,
          wsiHighestPatchTpsPct: formatTpsPercentDigits(
            s.wsiHighestTpsPatch.patchPredTps,
          ),
          wsiHighestPatchBucket: s.wsiHighestTpsPatch.patchPredBucket,
          wsiHighestPatchPx: String(s.wsiHighestTpsPatch.px),
          wsiHighestPatchPy: String(s.wsiHighestTpsPatch.py),
        }
      : {
          wsiHighestPatchId: "—",
          wsiHighestPatchTpsPct: "—",
          wsiHighestPatchBucket: "—",
          wsiHighestPatchPx: "—",
          wsiHighestPatchPy: "—",
        }),
  };

  const p = s.selectedPatch;
  const patchBlock: TemplateFields = p
    ? {
        hasPatch: "Yes",
        patchId: p.patchId,
        patchBucket: p.patchPredBucket,
        patchTpsPct: formatTpsPercentDigits(p.patchPredTps),
        patchNumCells: String(p.numCells),
        patchPx: String(p.px),
        patchPy: String(p.py),
        patchPosCells:
          p.cellStatsAtThreshold != null
            ? String(p.cellStatsAtThreshold.positive)
            : "—",
        patchNegCells:
          p.cellStatsAtThreshold != null
            ? String(p.cellStatsAtThreshold.negative)
            : "—",
        patchPosRatioPct:
          p.cellStatsAtThreshold != null
            ? formatPercent01Digits(p.cellStatsAtThreshold.positiveRatio)
            : "—",
        patchMeanCellProb:
          p.cellStatsAtThreshold != null
            ? p.cellStatsAtThreshold.meanProb.toFixed(3)
            : "—",
      }
    : {
        hasPatch: "No",
        patchId: "—",
        patchBucket: "—",
        patchTpsPct: "—",
        patchNumCells: "—",
        patchPx: "—",
        patchPy: "—",
        patchPosCells: "—",
        patchNegCells: "—",
        patchPosRatioPct: "—",
        patchMeanCellProb: "—",
      };

  const r = s.roi;
  const roiBlock: TemplateFields = r
    ? {
        hasRoi: "Yes",
        roiPatchCount: String(r.summary.patchCount),
        roiSynthPatchCount: String(r.summary.syntheticPatchCount),
        roiTotalCells: String(r.summary.totalCells),
        roiPosCells: String(r.summary.positiveCells),
        roiNegCells: String(r.summary.negativeCells),
        roiMeanTpsPct: formatTpsPercentDigits(r.meanTpsInRoi),
        roiBucketNeg: String(r.bucketCounts.Negative),
        roiBucket1: String(r.bucketCounts.TPS_1),
        roiBucket10: String(r.bucketCounts.TPS_10),
        roiBucket50: String(r.bucketCounts.TPS_50),
        roiX: r.snapped.x.toFixed(0),
        roiY: r.snapped.y.toFixed(0),
        roiW: r.snapped.w.toFixed(0),
        roiH: r.snapped.h.toFixed(0),
      }
    : {
        hasRoi: "No",
        roiPatchCount: "0",
        roiSynthPatchCount: "0",
        roiTotalCells: "0",
        roiPosCells: "0",
        roiNegCells: "0",
        roiMeanTpsPct: "—",
        roiBucketNeg: "0",
        roiBucket1: "0",
        roiBucket10: "0",
        roiBucket50: "0",
        roiX: "—",
        roiY: "—",
        roiW: "—",
        roiH: "—",
      };

  return {
    ...base,
    ...patchBlock,
    ...roiBlock,
    roiReportMarkdown: buildRoiReportMarkdown(s),
  };
}

/** 供 DeepSeek 系统提示注入：与内部快照一致的可读文本（非 JSON，便于模型阅读） */
export function formatCaseStatsForPrompt(s: CaseStatsSnapshot): string {
  const lines: string[] = [];
  lines.push(`Case ID: ${s.caseId}`);
  lines.push(`WSI ID: ${s.wsiId}`);
  lines.push(`Patches exported: ${s.wsi.patchCount}`);
  lines.push(`Total cells across patches: ${s.wsi.totalCells}`);
  lines.push(
    `Mean patch TPS: ${formatTpsPercentDigits(s.wsi.meanTps)}% / Max patch TPS: ${formatTpsPercentDigits(s.wsi.maxTps)}%`,
  );
  if (s.wsiHighestTpsPatch) {
    const h = s.wsiHighestTpsPatch;
    lines.push(
      `Patch with highest TPS on this slide: ${h.patchId} at ${formatTpsPercentDigits(h.patchPredTps)}% (bucket ${h.patchPredBucket}; WSI coords px=${h.px}, py=${h.py}; patch size ${h.width}×${h.height})`,
    );
  }
  lines.push(
    `Bucket distribution: TPS_50=${s.wsi.bucketCounts.TPS_50 ?? 0}, TPS_10=${s.wsi.bucketCounts.TPS_10 ?? 0}, TPS_1=${s.wsi.bucketCounts.TPS_1 ?? 0}, Negative=${s.wsi.bucketCounts.Negative ?? 0}`,
  );
  lines.push(`Export threshold: ${s.exportThresholdUsedForLabels}`);
  if (s.bestCellThresholdFromModel != null) {
    lines.push(`Model best threshold: ${s.bestCellThresholdFromModel}`);
  }
  lines.push(
    `Positive / negative cells (patch TPS × cell counts): ${s.wsi.positiveCells} / ${s.wsi.negativeCells}`,
  );

  const p = s.selectedPatch;
  if (p) {
    lines.push("");
    lines.push(`Selected patch: ${p.patchId}`);
    lines.push(`  - Bucket: ${p.patchPredBucket}`);
    lines.push(`  - Patch TPS: ${formatTpsPercentDigits(p.patchPredTps)}%`);
    lines.push(`  - Cell count: ${p.numCells}`);
    lines.push(
      `  - WSI position: x=${p.px}, y=${p.py} (size ${p.width}×${p.height})`,
    );
    if (p.cellStatsAtThreshold) {
      const cs = p.cellStatsAtThreshold;
      lines.push(
        `  - At interactive threshold: positive=${cs.positive} (${formatPercent01Digits(cs.positiveRatio)}%), negative=${cs.negative}, borderline (±0.05 around threshold)=${cs.borderline}, mean cell pos. prob.=${cs.meanProb.toFixed(3)}`,
      );
    }
  }

  if (s.roi) {
    const { snapped, summary } = s.roi;
    lines.push("");
    lines.push(
      "Current rectangular ROI (internal API getCaseStats; aligned with Selection ROI panel):",
    );
    lines.push(
      `  - Snapped rect: x=${snapped.x}, y=${snapped.y}, w=${snapped.w}, h=${snapped.h}`,
    );
    lines.push(
      `  - Patches (cells>0 in ROI): ${summary.realPatchCount}; blank grid slots: ${summary.syntheticPatchCount}`,
    );
    lines.push(
      `  - Cells: total=${summary.totalCells}, positive=${summary.positiveCells}, negative=${summary.negativeCells}`,
    );
    lines.push(
      `  - Mean TPS in ROI (cell-weighted): ${formatTpsPercentDigits(s.roi.meanTpsInRoi)}%`,
    );
    const bc = s.roi.bucketCounts;
    lines.push(
      "  - Patches in ROI by clinical TPS band (exported patches with cells; Selection ROI tooltip format):",
    );
    lines.push(
      [
        `    Negative (<1%): ${bc.Negative} patches`,
        `    1–9% TPS: ${bc.TPS_1} patches`,
        `    10–49% TPS: ${bc.TPS_10} patches`,
        `    ≥50% TPS: ${bc.TPS_50} patches`,
      ].join("\n"),
    );
    lines.push("");
    lines.push(
      "### Pathology Insight — Current ROI Summary (Markdown; same output as guided quick prompt)",
    );
    lines.push(buildRoiReportMarkdown(s));
  }

  return lines.join("\n");
}
