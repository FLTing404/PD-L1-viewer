import type { PatchBucket, PatchEntry } from "@/types/case";

/** Histogram bins at 0.1% TPS resolution; index k ∈ [0,1000] → k/10 % on [0.0%, 100.0%]. */
export const TPS_HISTOGRAM_BIN_COUNT = 1001;

/** Clinical bucket by scalar TPS (0..1), consistent with `bucket.ts` labels. */
export function patchBucketFromPredTps(pred: number): PatchBucket {
  if (pred < 0.01) return "Negative";
  if (pred < 0.1) return "TPS_1";
  if (pred < 0.5) return "TPS_10";
  return "TPS_50";
}

/** Count patches per severity bucket (denominator for proportional band widths). */
export function countPatchesByBucket(
  patches: Pick<PatchEntry, "patchPredTps">[],
): Record<PatchBucket, number> {
  const out: Record<PatchBucket, number> = {
    Negative: 0,
    TPS_1: 0,
    TPS_10: 0,
    TPS_50: 0,
  };
  for (const p of patches) {
    out[patchBucketFromPredTps(p.patchPredTps)]++;
  }
  return out;
}

export type TpsProportionalAxis = {
  /** Map TPS percent 0..100 to SVG x (same coord space as px0/plotW). */
  mapTpsToX: (tpsPercent: number) => number;
  /** Pixel width of each of the four bands (Negative → TPS_50). */
  bandWidths: [number, number, number, number];
};

/**
 * Horizontal space for each clinical band is proportional to its patch count / total.
 * Within each band, TPS maps linearly to x (boundaries at 0, 1, 10, 50, 100%).
 */
export function createProportionalTpsAxis(
  bucketCounts: Record<PatchBucket, number>,
  px0: number,
  plotW: number,
): TpsProportionalAxis {
  const order: PatchBucket[] = ["Negative", "TPS_1", "TPS_10", "TPS_50"];
  const total = order.reduce((s, b) => s + bucketCounts[b], 0);
  const w =
    total > 0
      ? (order.map((b) => (bucketCounts[b] / total) * plotW) as [
          number,
          number,
          number,
          number,
        ])
      : ([plotW / 4, plotW / 4, plotW / 4, plotW / 4] as const);

  const [wN, w1, w10, w50] = w;

  function mapTpsToX(tpsPercent: number): number {
    const t = Math.max(0, Math.min(100, tpsPercent));
    if (t < 1) {
      return px0 + t * wN;
    }
    if (t < 10) {
      return px0 + wN + ((t - 1) / 9) * w1;
    }
    if (t < 50) {
      return px0 + wN + w1 + ((t - 10) / 40) * w10;
    }
    return px0 + wN + w1 + w10 + ((t - 50) / 50) * w50;
  }

  return {
    mapTpsToX,
    bandWidths: [wN, w1, w10, w50],
  };
}

/**
 * Linear TPS% axis: equal pixel width per percentage point (0–100%).
 * Band shading widths match clinical spans [0,1), [1,10), [10,50), [50,100].
 */
export function createLinearTpsAxis(px0: number, plotW: number): TpsProportionalAxis {
  function mapTpsToX(tpsPercent: number): number {
    const t = Math.max(0, Math.min(100, tpsPercent));
    return px0 + (t / 100) * plotW;
  }
  const wN = plotW / 100;
  const w1 = (9 / 100) * plotW;
  const w10 = (40 / 100) * plotW;
  const w50 = (50 / 100) * plotW;
  return {
    mapTpsToX,
    bandWidths: [wN, w1, w10, w50],
  };
}

/** Linear blend of bucket totals (for strip / legend animation between distributions). */
export function blendBucketCounts(
  a: Record<PatchBucket, number>,
  b: Record<PatchBucket, number>,
  t: number,
): Record<PatchBucket, number> {
  const u = Math.max(0, Math.min(1, t));
  const om = 1 - u;
  return {
    Negative: om * a.Negative + u * b.Negative,
    TPS_1: om * a.TPS_1 + u * b.TPS_1,
    TPS_10: om * a.TPS_10 + u * b.TPS_10,
    TPS_50: om * a.TPS_50 + u * b.TPS_50,
  };
}

/** Interpolate between two TPS x-mappings (e.g. proportional whole-slide vs linear ROI). */
export function blendTpsAxes(
  a: TpsProportionalAxis,
  b: TpsProportionalAxis,
  t: number,
): TpsProportionalAxis {
  const u = Math.max(0, Math.min(1, t));
  const om = 1 - u;
  function mapTpsToX(p: number): number {
    return om * a.mapTpsToX(p) + u * b.mapTpsToX(p);
  }
  const bandWidths = a.bandWidths.map((w, i) => om * w + u * b.bandWidths[i]!) as [
    number,
    number,
    number,
    number,
  ];
  return { mapTpsToX, bandWidths };
}

/** `counts[k]` = patches with TPS% rounded to nearest 0.1% (index k ∈ 0..1000). */
export function buildTpsPercentBins(patches: Pick<PatchEntry, "patchPredTps">[]): number[] {
  const counts = new Array<number>(TPS_HISTOGRAM_BIN_COUNT).fill(0);
  const maxIdx = TPS_HISTOGRAM_BIN_COUNT - 1;
  for (const p of patches) {
    const k = Math.round(p.patchPredTps * 1000);
    const idx = Math.max(0, Math.min(maxIdx, k));
    counts[idx]!++;
  }
  return counts;
}

export function sumBins(counts: number[]): number {
  return counts.reduce((a, b) => a + b, 0);
}

export function maxBin(counts: number[]): number {
  let m = 0;
  for (const v of counts) if (v > m) m = v;
  return m <= 0 ? 1 : m;
}

export type EqualPixelBarPlan = {
  /** Constant CSS px width per bar (plotW / nBars). */
  wBar: number;
  nBars: number;
  /** TPS% boundaries; length nBars + 1; bar i covers [edges[i], edges[i+1]). */
  tpsEdges: number[];
  /** Total bandWidths sum used as visual budget. */
  totalRawU: number;
};

export type EqualPixelBarPlanOptions = {
  /** Minimum bar width in CSS px (caps bar count). Larger → wider bars, fewer columns. Default 4. */
  minBarPx?: number;
  /** Upper bound on number of bars. Default 480. */
  maxBars?: number;
};

/**
 * Equal-pixel histogram bars aligned with the proportional TPS axis (same `bandWidths`
 * used by the chart's coloured allocation bands).
 *
 * - Each bar has constant pixel width `W_bar = plotW / N`.
 * - Bar i covers TPS% range `[edges[i], edges[i+1])`, computed by inverting the
 *   piecewise-linear proportional axis so that bar boundaries land exactly on the same
 *   x positions as the clinical-tier background bands.
 * - This guarantees: bars drawn under the "Negative" colour represent TPS ∈ [0,1)%,
 *   bars under "TPS_1" represent [1,10)%, etc. — i.e. total bar area within each band
 *   equals that band's patch count, matching the TPS Allocation Band ratios.
 * - "Precision" per bar = (band TPS span) / (bars in that band) ∝ (band TPS span) / W_b,
 *   so wider visual bandwidth ⇒ finer TPS precision in that tier ("visual bandwidth"
 *   alone defines per-bar Δp; no separate sensitivity multiplier).
 */
export function buildEqualPixelHistogramPlan(
  bandWidths: [number, number, number, number],
  px0: number,
  plotW: number,
  opts?: EqualPixelBarPlanOptions,
): EqualPixelBarPlan {
  const minBarPx = opts?.minBarPx ?? 4;
  const maxBars = opts?.maxBars ?? 480;
  const plot = Math.max(1e-6, plotW);
  const nBars = Math.max(
    1,
    Math.min(maxBars, Math.max(1, Math.floor(plot / minBarPx))),
  );
  const wBar = plot / nBars;

  const [wN, w1, w10, w50] = bandWidths;
  const totalW = wN + w1 + w10 + w50;

  if (totalW <= 1e-12) {
    const edges = Array.from({ length: nBars + 1 }, (_, i) => (100 * i) / nBars);
    return { wBar, nBars, tpsEdges: edges, totalRawU: 1 };
  }

  /** Inverse of the piecewise-linear proportional `mapTpsToX`. */
  function invMapTpsToX(x: number): number {
    const dx = x - px0;
    if (dx <= 0) return 0;
    if (dx < wN) return wN > 0 ? dx / wN : 1;
    if (dx < wN + w1) return w1 > 0 ? 1 + ((dx - wN) / w1) * 9 : 10;
    if (dx < wN + w1 + w10) {
      return w10 > 0 ? 10 + ((dx - wN - w1) / w10) * 40 : 50;
    }
    if (dx < totalW) {
      return w50 > 0 ? 50 + ((dx - wN - w1 - w10) / w50) * 50 : 100;
    }
    return 100;
  }

  const edges: number[] = [];
  for (let i = 0; i <= nBars; i++) {
    const xi = px0 + (i / nBars) * plot;
    edges.push(invMapTpsToX(xi));
  }
  return { wBar, nBars, tpsEdges: edges, totalRawU: totalW };
}

/**
 * Aggregate 0.1% bins into variable TPS intervals [edges[i], edges[i+1]).
 * Splits bin mass when an interval straddles fine-bin boundaries.
 */
export function aggregateFineBinsByTpsEdges(
  fineCounts: number[],
  edgesPercent: number[],
): number[] {
  const n = edgesPercent.length - 1;
  const out = new Array<number>(n).fill(0);
  const fineSpan = 0.1;
  for (let i = 0; i < n; i++) {
    const a = edgesPercent[i]!;
    const b = edgesPercent[i + 1]!;
    if (b <= a) continue;
    for (let k = 0; k < TPS_HISTOGRAM_BIN_COUNT; k++) {
      const t0 = k / 10;
      const t1 = (k + 1) / 10;
      const lo = Math.max(a, t0);
      const hi = Math.min(b, t1);
      if (hi > lo) {
        out[i] += fineCounts[k]! * ((hi - lo) / fineSpan);
      }
    }
  }
  return out;
}
