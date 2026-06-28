"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useViewerStore, getEffectiveBucket, getEffectiveTps } from "@/lib/store";
import { BUCKET_ORDER_LTR, BUCKET_STYLES, type BucketStyle } from "@/lib/bucket";
import type { PatchBucket } from "@/types/case";
import { patchesIntersectingRect } from "@/lib/localRoiStats";
import {
  aggregateFineBinsByTpsEdges,
  blendBucketCounts,
  blendTpsAxes,
  buildEqualPixelHistogramPlan,
  buildTpsPercentBins,
  countPatchesByBucket,
  createProportionalTpsAxis,
  maxBin,
  sumBins,
  TPS_HISTOGRAM_BIN_COUNT,
} from "@/lib/tpsHistogram";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import { cn } from "@/lib/utils";
import { HilbertSpatialStrip } from "./HilbertSpatialStrip";
import { SelectionRoiPanel } from "@/components/viewer/SelectionRoiPanel";

/** ROI bars: tallest bin uses this fraction of plot height (Y scale = maxBin / ratio). */
const ROI_FILL_RATIO = 0.8;

/** Whole-slide histogram: tallest bar fills at most this fraction of plot height. */
const WS_FILL_RATIO = 0.9;

/** Equal-pixel histogram: min CSS px per bar (↑ fewer, wider columns). */
const HISTOGRAM_MIN_BAR_PX = 6;

/** Dark chart strata — same hue families as `BUCKET_STYLES` for coherent proportion bands. */
const BAND_SURFACE: Record<PatchBucket, string> = {
  Negative: "#152c48",
  TPS_1: "#103d2e",
  TPS_10: "#3d2608",
  TPS_50: "#3d1018",
};

const BAND_BUCKETS = BUCKET_ORDER_LTR;

const EMPTY_BUCKET_COUNTS: Record<PatchBucket, number> = {
  Negative: 0,
  TPS_1: 0,
  TPS_10: 0,
  TPS_50: 0,
};

function cloneBucketCounts(
  c: Record<PatchBucket, number>,
): Record<PatchBucket, number> {
  return {
    Negative: c.Negative,
    TPS_1: c.TPS_1,
    TPS_10: c.TPS_10,
    TPS_50: c.TPS_50,
  };
}

function bucketCountsEqual(
  a: Record<PatchBucket, number>,
  b: Record<PatchBucket, number>,
): boolean {
  return BAND_BUCKETS.every((k) => a[k] === b[k]);
}

const ROI_FILL = "#22d3ee";
const ROI_STROKE = "rgba(224,242,254,0.85)";

const X_BOUNDARY_TICKS = [1, 10, 50, 100] as const;

/** Equal-pixel-width bars; counts already aggregated to match `plan.tpsEdges`. */
function drawEqualPixelHistogramBars(
  ctx: CanvasRenderingContext2D,
  aggCounts: number[],
  yAxisMax: number,
  px0: number,
  wBar: number,
  py1: number,
  plotH: number,
): void {
  const denom = Math.max(1e-6, yAxisMax);
  const gapTrim = Math.min(0.06, Math.max(0.02, wBar * 0.12));
  ctx.beginPath();
  for (let i = 0; i < aggCounts.length; i++) {
    const c = aggCounts[i]!;
    if (c <= 0) continue;
    let x0 = px0 + i * wBar + gapTrim;
    let x1 = px0 + (i + 1) * wBar - gapTrim;
    if (x1 <= x0) x1 = x0 + 0.12;
    const hRaw = (c / denom) * plotH;
    const h = Math.min(plotH, hRaw);
    const yTop = py1 - h;
    ctx.rect(x0, yTop, x1 - x0, py1 - yTop);
  }
  ctx.fill();
  ctx.stroke();
}

function yTicks(yMax: number): number[] {
  if (yMax <= 1) return [0, 1];
  const step = Math.max(1, Math.ceil(yMax / 4));
  const out: number[] = [];
  for (let v = 0; v <= yMax; v += step) out.push(v);
  if (out[out.length - 1]! < yMax) out.push(yMax);
  return out;
}

function emptyBins(): number[] {
  return new Array(TPS_HISTOGRAM_BIN_COUNT).fill(0);
}

export function TpsDistributionBar() {
  const manifest = useViewerStore((s) => s.manifest);
  const localRoi = useViewerStore((s) => s.localRoi);
  const setGalleryBucket = useViewerStore((s) => s.setGalleryBucket);
  const bucketOverrides = useViewerStore((s) => s.bucketOverrides);

  const chartLayoutRef = useRef<HTMLDivElement>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 320, h: 200 });

  useLayoutEffect(() => {
    const layout = chartLayoutRef.current;
    const box = chartWrapRef.current;
    if (!layout || !box) return;

    const readLayoutWidth = (): number => {
      /** Use max(chart column, plot box): layout alone can lag flex row width; chartWrap can lag legend column — together match the real drawable row. */
      const lw = layout.getBoundingClientRect().width;
      const bw = box.getBoundingClientRect().width;
      let w = Math.max(lw, bw, layout.clientWidth, box.clientWidth);
      if (w < 8) {
        let el: HTMLElement | null = layout.parentElement;
        for (let i = 0; i < 6 && el; i++) {
          const cw = el.getBoundingClientRect().width;
          w = Math.max(w, cw);
          el = el.parentElement;
        }
      }
      return Math.max(1, Math.round(w));
    };

    const updateSize = () => {
      const w = readLayoutWidth();
      const dh =
        box.offsetHeight ||
        box.clientHeight ||
        box.getBoundingClientRect().height;
      const h = Math.max(1, Math.round(dh > 0 ? dh : box.getBoundingClientRect().height));
      setSize((prev) => {
        if (
          Math.abs(prev.w - w) < 2 &&
          Math.abs(prev.h - h) < 2
        ) {
          return prev;
        }
        return { w, h };
      });
    };

    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(layout);
    ro.observe(box);
    let p: HTMLElement | null = layout.parentElement;
    for (let i = 0; i < 4 && p; i++) {
      ro.observe(p);
      p = p.parentElement;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(updateSize);
    });
    window.addEventListener("resize", updateSize);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", updateSize);
    };
  }, [manifest?.caseId]);

  const geom = useMemo(() => {
    const w = Math.max(1, size.w);
    const h = Math.max(1, size.h);
    // Prefer proportional margins; clamp so ML+MR never eats the whole width —
    // otherwise PLOT_W collapses to ~1px and the canvas looks "empty".
    const MIN_PLOT_W = 48;
    /* Tighter Y-axis gutter → plot width tracks full row (match Hilbert strip span). */
    let ML = Math.max(16, Math.min(24, Math.round(w * 0.026)));
    let MR = Math.max(5, Math.min(10, Math.round(w * 0.012)));
    if (ML + MR + MIN_PLOT_W > w) {
      const budget = Math.max(0, w - MIN_PLOT_W);
      if (budget <= 0) {
        ML = 0;
        MR = 0;
      } else {
        ML = Math.floor(budget * 0.72);
        MR = budget - ML;
      }
    }
    // When ResizeObserver fires before layout (h≈0) or flex steals height,
    // fixed MT/MB caps made PY1 < PY0 → negative PLOT_H and an invisible chart.
    let MT = Math.max(24, Math.round(h * 0.12));
    let MB = Math.max(20, Math.round(h * 0.11));
    const MIN_INNER = 8;
    if (MT + MB + MIN_INNER > h) {
      const marginBudget = Math.max(0, h - MIN_INNER);
      if (marginBudget <= 0) {
        MT = 0;
        MB = 0;
      } else {
        MT = Math.floor(marginBudget * 0.55);
        MB = marginBudget - MT;
      }
    }
    const PX0 = ML;
    const PX1 = w - MR;
    const PY0 = MT;
    const PY1 = h - MB;
    const PLOT_W = Math.max(1, PX1 - PX0);
    const PLOT_H = Math.max(1, PY1 - PY0);
    return { w, h, ML, MR, MT, MB, PX0, PX1, PY0, PY1, PLOT_W, PLOT_H };
  }, [size.w, size.h]);

  const tpsPatches = useMemo(
    () => (manifest ? patchesWithCellsForTps(manifest.patches) : []),
    [manifest],
  );

  const effectivePatches = useMemo(
    () =>
      tpsPatches.map((p) => ({
        ...p,
        patchPredTps: getEffectiveTps(p, bucketOverrides),
      })),
    [tpsPatches, bucketOverrides],
  );

  const allCounts = useMemo(
    () =>
      effectivePatches.length > 0
        ? buildTpsPercentBins(effectivePatches)
        : emptyBins(),
    [effectivePatches],
  );

  const bucketCounts = useMemo(() => {
    if (tpsPatches.length === 0) return null;
    const counts: Record<PatchBucket, number> = {
      Negative: 0,
      TPS_1: 0,
      TPS_10: 0,
      TPS_50: 0,
    };
    for (const p of tpsPatches) {
      counts[getEffectiveBucket(p, bucketOverrides)]++;
    }
    return counts;
  }, [tpsPatches, bucketOverrides]);

  const roiPatchesInRect = useMemo(() => {
    if (!manifest || !localRoi) return null;
    return patchesWithCellsForTps(
      patchesIntersectingRect(manifest, localRoi.world),
    );
  }, [manifest, localRoi]);

  const roiCounts = useMemo(() => {
    if (!manifest || !localRoi) return null;
    const patches = patchesWithCellsForTps(
      patchesIntersectingRect(manifest, localRoi.world),
    );
    const effective = patches.map((p) => ({
      ...p,
      patchPredTps: getEffectiveTps(p, bucketOverrides),
    }));
    return buildTpsPercentBins(effective);
  }, [manifest, localRoi, bucketOverrides]);

  const roiSum = roiCounts ? sumBins(roiCounts) : 0;
  const hasRoi = Boolean(localRoi && roiCounts);
  const roiBarsOnly = Boolean(hasRoi && roiSum > 0);

  const roiAnimKey = useMemo(
    () =>
      localRoi
        ? `${localRoi.world.x},${localRoi.world.y},${localRoi.world.w},${localRoi.world.h}`
        : "",
    [localRoi],
  );

  /** Histogram + allocation strip always use proportional bands; ROI uses in-ROI bucket counts. */
  const targetBucketCounts = useMemo(() => {
    if (roiBarsOnly && roiPatchesInRect && roiPatchesInRect.length > 0) {
      const counts: Record<PatchBucket, number> = {
        Negative: 0,
        TPS_1: 0,
        TPS_10: 0,
        TPS_50: 0,
      };
      for (const p of roiPatchesInRect) {
        counts[getEffectiveBucket(p, bucketOverrides)]++;
      }
      return counts;
    }
    return bucketCounts ?? EMPTY_BUCKET_COUNTS;
  }, [roiBarsOnly, roiPatchesInRect, bucketCounts, bucketOverrides]);

  const distTargetKey = useMemo(
    () =>
      `${manifest?.caseId ?? ""}|${roiBarsOnly ? roiAnimKey || "roi" : "ws"}|${BAND_BUCKETS.map((b) => targetBucketCounts[b]).join(",")}`,
    [manifest?.caseId, roiBarsOnly, roiAnimKey, targetBucketCounts],
  );

  const stableBucketCountsRef = useRef<Record<PatchBucket, number>>(
    EMPTY_BUCKET_COUNTS,
  );

  const [axisDistBlend, setAxisDistBlend] = useState<{
    from: Record<PatchBucket, number>;
    to: Record<PatchBucket, number>;
    t: number;
  }>(() => ({
    from: EMPTY_BUCKET_COUNTS,
    to: EMPTY_BUCKET_COUNTS,
    t: 1,
  }));

  useLayoutEffect(() => {
    if (!manifest) return;
    const end = cloneBucketCounts(targetBucketCounts);
    stableBucketCountsRef.current = end;
    setAxisDistBlend({ from: end, to: end, t: 1 });
  }, [manifest?.caseId]);

  useEffect(() => {
    if (!manifest) return;
    const end = cloneBucketCounts(targetBucketCounts);
    const start = stableBucketCountsRef.current;
    if (bucketCountsEqual(start, end)) {
      setAxisDistBlend({ from: end, to: end, t: 1 });
      return;
    }
    let cancelled = false;
    const from = cloneBucketCounts(start);
    const to = end;
    const t0 = performance.now();
    const duration = 420;
    const tick = (now: number) => {
      if (cancelled) return;
      const u = Math.min(1, (now - t0) / duration);
      const ease = 1 - (1 - u) ** 3;
      setAxisDistBlend({ from, to, t: ease });
      if (u < 1) {
        requestAnimationFrame(tick);
      } else {
        stableBucketCountsRef.current = cloneBucketCounts(to);
        const settled = cloneBucketCounts(to);
        setAxisDistBlend({ from: settled, to: settled, t: 1 });
      }
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [distTargetKey, manifest]);

  const chartAxis = useMemo(
    () =>
      blendTpsAxes(
        createProportionalTpsAxis(axisDistBlend.from, geom.PX0, geom.PLOT_W),
        createProportionalTpsAxis(axisDistBlend.to, geom.PX0, geom.PLOT_W),
        axisDistBlend.t,
      ),
    [axisDistBlend, geom.PX0, geom.PLOT_W],
  );

  const equalPixelBarPlan = useMemo(
    () =>
      buildEqualPixelHistogramPlan(chartAxis.bandWidths, geom.PX0, geom.PLOT_W, {
        minBarPx: HISTOGRAM_MIN_BAR_PX,
      }),
    [chartAxis.bandWidths, geom.PX0, geom.PLOT_W],
  );

  const aggAllCounts = useMemo(
    () =>
      aggregateFineBinsByTpsEdges(allCounts, equalPixelBarPlan.tpsEdges),
    [allCounts, equalPixelBarPlan.tpsEdges],
  );

  const [displayRoiCounts, setDisplayRoiCounts] = useState<number[] | null>(
    null,
  );
  const animRef = useRef<number>(0);
  const displayRef = useRef<number[] | null>(null);

  useLayoutEffect(() => {
    displayRef.current = displayRoiCounts;
  }, [displayRoiCounts]);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    if (!roiCounts || roiSum === 0) {
      queueMicrotask(() => setDisplayRoiCounts(null));
      return;
    }

    const target = roiCounts.map((v) => v);
    const start = displayRef.current ?? emptyBins();
    const startTime = performance.now();
    const duration = 380;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - (1 - t) ** 3;
      const next = target.map((endVal, i) => {
        const s = start[i] ?? 0;
        return s + (endVal - s) * ease;
      });
      setDisplayRoiCounts(next);
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [roiAnimKey, roiCounts, roiSum]);

  const aggRoiCounts = useMemo(() => {
    if (!roiCounts || roiSum === 0) return null;
    const fine = displayRoiCounts ?? roiCounts;
    return aggregateFineBinsByTpsEdges(fine, equalPixelBarPlan.tpsEdges);
  }, [
    roiCounts,
    roiSum,
    displayRoiCounts,
    equalPixelBarPlan.tpsEdges,
  ]);

  const yMaxAll = useMemo(() => maxBin(aggAllCounts), [aggAllCounts]);
  const yMaxRoi = useMemo(() => {
    if (!aggRoiCounts || roiSum === 0) return 1;
    return Math.max(1, maxBin(aggRoiCounts));
  }, [aggRoiCounts, roiSum]);

  const yScaleTarget = useMemo(() => {
    if (!hasRoi || roiSum === 0) {
      return Math.max(1, yMaxAll / WS_FILL_RATIO);
    }
    return Math.max(1, yMaxRoi / ROI_FILL_RATIO);
  }, [hasRoi, roiSum, yMaxAll, yMaxRoi]);

  const [displayYScale, setDisplayYScale] = useState(1);
  const yScaleAnimRef = useRef(0);
  const yScaleDisplayRef = useRef(1);

  useLayoutEffect(() => {
    yScaleDisplayRef.current = displayYScale;
  }, [displayYScale]);

  useEffect(() => {
    cancelAnimationFrame(yScaleAnimRef.current);
    const target = Math.max(1, yScaleTarget);
    const start = yScaleDisplayRef.current;
    if (Math.abs(target - start) < 0.25) {
      setDisplayYScale(target);
      yScaleDisplayRef.current = target;
      return;
    }
    const startTime = performance.now();
    const duration = 420;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - (1 - t) ** 3;
      const next = start + (target - start) * ease;
      setDisplayYScale(next);
      if (t < 1) {
        yScaleAnimRef.current = requestAnimationFrame(tick);
      } else {
        yScaleDisplayRef.current = target;
      }
    };
    yScaleAnimRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(yScaleAnimRef.current);
  }, [yScaleTarget]);

  const stripCounts = useMemo(
    () =>
      blendBucketCounts(axisDistBlend.from, axisDistBlend.to, axisDistBlend.t),
    [axisDistBlend],
  );

  const stripPatchTotal = useMemo(() => {
    const fromSum = BAND_BUCKETS.reduce((s, b) => s + axisDistBlend.from[b], 0);
    const toSum = BAND_BUCKETS.reduce((s, b) => s + axisDistBlend.to[b], 0);
    return Math.round(
      (1 - axisDistBlend.t) * fromSum + axisDistBlend.t * toSum,
    );
  }, [axisDistBlend]);

  /** Align tick visibility with stripCounts / clinical buckets (hide ticks when an interval is empty). */
  const xTickVisibility = useMemo(() => {
    const n = stripCounts.Negative > 1e-6;
    const t1 = stripCounts.TPS_1 > 1e-6;
    const t10 = stripCounts.TPS_10 > 1e-6;
    const t50 = stripCounts.TPS_50 > 1e-6;
    return {
      show0: n,
      show1: n || t1,
      show10: t1 || t10,
      show50: t10 || t50,
      show100: t50,
    };
  }, [stripCounts]);

  const filteredMinorTicks = useMemo(() => {
    const t1 = stripCounts.TPS_1 > 1e-6;
    const t10 = stripCounts.TPS_10 > 1e-6;
    const t50 = stripCounts.TPS_50 > 1e-6;
    const skipBoundary = new Set([10, 50]);
    const out: number[] = [];
    for (let v = 10; v <= 90; v += 10) {
      if (skipBoundary.has(v)) continue;
      if (v < 50) {
        if (!(t1 || t10)) continue;
      } else {
        if (!(t10 || t50)) continue;
      }
      out.push(v);
    }
    return out;
  }, [stripCounts]);

  const curveScale = Math.max(1e-6, displayYScale);
  const yTickVals = yTicks(Math.max(1, Math.ceil(curveScale)));

  const { mapTpsToX, bandWidths } = chartAxis;
  const { w: vbW, h: vbH, PX0, PX1, PY0, PY1, PLOT_H } = geom;

  const bandLayouts = BAND_BUCKETS.reduce(
    (acc, b, i) => {
      const bw = bandWidths[i]!;
      const x =
        acc.length === 0
          ? PX0
          : acc[acc.length - 1]!.x + acc[acc.length - 1]!.width;
      acc.push({ bucket: b, x, width: bw });
      return acc;
    },
    [] as { bucket: PatchBucket; x: number; width: number }[],
  );

  useEffect(() => {
    if (!manifest) return;
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, vbW);
    const cssH = Math.max(1, vbH);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    for (const { bucket, x, width } of bandLayouts) {
      const grad = ctx.createLinearGradient(0, PY0, 0, PY1);
      grad.addColorStop(0, `${BAND_SURFACE[bucket]}8c`);
      grad.addColorStop(1, `${BAND_SURFACE[bucket]}33`);
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.fillRect(x, PY0, width, PLOT_H);
      ctx.strokeRect(x, PY0, width, PLOT_H);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 0.35;
    ctx.setLineDash([2, 3]);
    for (const t of filteredMinorTicks) {
      const x = mapTpsToX(t);
      ctx.beginPath();
      ctx.moveTo(x, PY0);
      ctx.lineTo(x, PY1);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const t of X_BOUNDARY_TICKS) {
      const show =
        t === 1
          ? xTickVisibility.show1
          : t === 10
            ? xTickVisibility.show10
            : t === 50
              ? xTickVisibility.show50
              : xTickVisibility.show100;
      if (!show) continue;
      const x = mapTpsToX(t);
      const strong = t === 1 || t === 10 || t === 50;
      ctx.strokeStyle = strong ? "rgba(56,189,248,0.55)" : "rgba(255,255,255,0.4)";
      ctx.lineWidth = strong ? 0.9 : 0.45;
      if (!strong) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, PY0);
      ctx.lineTo(x, PY1);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const yv of yTickVals) {
      const y = PY1 - (yv / curveScale) * PLOT_H;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(PX0, y);
      ctx.lineTo(PX1, y);
      ctx.stroke();
      /** Omit Y label "0": sits on baseline next to x-axis "1%" and overlaps on narrow charts. */
      if (yv === 0) continue;
      ctx.fillStyle = "rgba(160,170,185,0.92)";
      ctx.font = "400 9px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(String(yv), PX0 - 5, y);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PX0, PY1);
    ctx.lineTo(PX1, PY1);
    ctx.moveTo(PX0, PY0);
    ctx.lineTo(PX0, PY1);
    ctx.stroke();

    /** Whole-slide: equal-pixel bars; TPS precision from sensitivity × proportional bandwidth. */
    if (!roiBarsOnly) {
      ctx.save();
      ctx.fillStyle = "rgba(56,189,248,0.58)";
      ctx.strokeStyle = "rgba(125,211,252,0.42)";
      ctx.lineWidth = 0.35;
      drawEqualPixelHistogramBars(
        ctx,
        aggAllCounts,
        curveScale,
        PX0,
        equalPixelBarPlan.wBar,
        PY1,
        PLOT_H,
      );
      ctx.restore();
    }

    if (roiBarsOnly && roiCounts && aggRoiCounts) {
      ctx.save();
      ctx.fillStyle = "rgba(34,211,238,0.78)";
      ctx.strokeStyle = ROI_STROKE;
      ctx.lineWidth = 0.45;
      drawEqualPixelHistogramBars(
        ctx,
        aggRoiCounts,
        curveScale,
        PX0,
        equalPixelBarPlan.wBar,
        PY1,
        PLOT_H,
      );
      ctx.restore();
    }

    if (xTickVisibility.show0) {
      const xLabel0 = mapTpsToX(0);
      ctx.fillStyle = "rgba(160,170,185,0.95)";
      ctx.font = "400 9px sans-serif";
      ctx.textBaseline = "bottom";
      ctx.textAlign = "left";
      ctx.fillText("0%", Math.min(xLabel0 + 2, PX1 - 28), vbH - 4);
    }

    for (const t of X_BOUNDARY_TICKS) {
      const show =
        t === 1
          ? xTickVisibility.show1
          : t === 10
            ? xTickVisibility.show10
            : t === 50
              ? xTickVisibility.show50
              : xTickVisibility.show100;
      if (!show) continue;
      const x = mapTpsToX(t);
      const strong = t === 1 || t === 10 || t === 50;
      ctx.fillStyle = strong ? "rgba(125,211,252,0.95)" : "rgba(160,170,185,0.95)";
      ctx.font = strong ? "600 9px sans-serif" : "400 9px sans-serif";
      ctx.textBaseline = "bottom";
      if (t === 100) ctx.textAlign = "right";
      else ctx.textAlign = "center";
      ctx.fillText(`${t}%`, t === 100 ? x - 2 : x, vbH - 4);
    }
  }, [
    PLOT_H,
    PX0,
    PX1,
    PY0,
    PY1,
    aggAllCounts,
    aggRoiCounts,
    equalPixelBarPlan.wBar,
    bandLayouts,
    curveScale,
    axisDistBlend,
    chartAxis,
    displayRoiCounts,
    hasRoi,
    mapTpsToX,
    filteredMinorTicks,
    xTickVisibility,
    roiBarsOnly,
    roiCounts,
    roiSum,
    vbH,
    vbW,
    yTickVals,
    manifest,
  ]);

  if (!manifest) {
    return (
      <Card className="h-full min-h-0 gap-1 rounded-none border-0 py-2 ring-0 shadow-none">
        <CardContent className="flex h-full min-h-0 flex-col gap-2 px-2.5">
          <div className="text-app-section font-semibold tracking-wide">
            TPS Distribution Overview
          </div>
          <p className="text-app-body text-muted-foreground">No case loaded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full min-h-0 w-full max-w-none flex-col gap-1 rounded-none border-0 py-2 ring-0 shadow-none">
      <CardContent className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-1 px-2 sm:px-3">
        <div className="relative flex shrink-0 flex-col gap-0.5">
          <div className="text-app-section flex items-center gap-1.5 font-semibold tracking-wide">
            TPS Distribution Overview
            <Tooltip>
              <TooltipTrigger className="inline-flex rounded p-0.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                <Info className="size-4 shrink-0" aria-hidden />
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={6}
                className="max-w-none whitespace-nowrap text-[11px]"
              >
                X-axis band widths match TPS Allocation Band (bucket counts): whole slide uses
                all patches; with ROI they match the selection. Histogram bars use equal pixel
                width; each bar’s TPS span follows clinical sensitivity × band pixel budget (fine
                0.1% bins aggregated). Y = counts (whole slide tallest ~90%; ROI tallest ~80%).
                Bucket-empty spans hide the matching boundary ticks.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 lg:flex-row lg:items-stretch">
          <div
            ref={chartLayoutRef}
            className="flex min-h-0 min-w-0 flex-[33] flex-col gap-1 lg:min-w-0"
          >
            <div
              ref={chartWrapRef}
              className="relative min-h-[140px] w-full min-w-full max-w-none flex-1 basis-0 self-stretch sm:min-h-[180px]"
            >
              {hasRoi && roiSum === 0 ? (
                <div className="absolute right-2 top-2 z-[1] rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-amber-500/40">
                  No patches in selection
                </div>
              ) : null}
              <canvas
                ref={chartCanvasRef}
                className="absolute inset-0 block h-full w-full min-h-0"
                role="img"
                aria-label="TPS distribution overview"
              />
              <div className="absolute inset-0">
                {bandLayouts.map(({ bucket, x, width }) => (
                  <button
                    key={`hit-${bucket}`}
                    type="button"
                    className="absolute cursor-pointer bg-transparent p-0"
                    style={{ left: x, top: PY0, width, height: PLOT_H }}
                    aria-label={`Select ${BUCKET_STYLES[bucket].fullLabel} bucket`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryBucket(bucket);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="shrink-0">
              <HilbertSpatialStrip
                manifest={manifest}
                leftPad={geom.ML}
                rightPad={geom.MR}
                distributionCounts={stripCounts}
                patchTotalDisplay={stripPatchTotal}
                scope={roiBarsOnly ? "roi_selection" : "whole_slide"}
                densityTraceLegend={{
                  mode: roiBarsOnly ? "roi_bars" : "ws",
                  wsAsReference: Boolean(hasRoi && !roiBarsOnly),
                }}
              />
            </div>
          </div>

          <div className="flex min-h-0 w-full shrink-0 flex-col border-border/45 pt-3 lg:max-w-[21%] lg:min-h-0 lg:flex-[7] lg:min-w-[140px] lg:border-l lg:border-t-0 lg:pt-0 lg:pl-3 border-t">
            <SelectionRoiPanel
              variant="embedded"
              className="min-h-0 flex-1 overflow-hidden"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

