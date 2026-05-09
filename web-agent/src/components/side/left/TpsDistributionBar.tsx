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
import { useViewerStore } from "@/lib/store";
import { BUCKET_STYLES, type BucketStyle } from "@/lib/bucket";
import type { PatchBucket } from "@/types/case";
import { patchesIntersectingRect } from "@/lib/localRoiStats";
import {
  buildTpsPercentBins,
  countPatchesByBucket,
  createLinearTpsAxis,
  createProportionalTpsAxis,
  maxBin,
  sumBins,
  TPS_HISTOGRAM_BIN_COUNT,
} from "@/lib/tpsHistogram";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import { cn } from "@/lib/utils";
import { HilbertSpatialStrip } from "./HilbertSpatialStrip";

/** ROI bars: tallest bin uses this fraction of plot height (Y scale = maxBin / ratio). */
const ROI_FILL_RATIO = 0.8;

/** Muted dark strata fills (decorative only; not clinical palette). */
const BAND_SURFACE: Record<PatchBucket, string> = {
  Negative: "#2c2c32",
  TPS_1: "#3a3320",
  TPS_10: "#3d2520",
  TPS_50: "#3a1818",
};

const BAND_SHORT: Record<PatchBucket, string> = {
  Negative: "Neg",
  TPS_1: "Low",
  TPS_10: "Med",
  TPS_50: "High",
};

const BAND_BUCKETS: PatchBucket[] = ["Negative", "TPS_1", "TPS_10", "TPS_50"];

const ROI_FILL = "#22d3ee";
const ROI_STROKE = "rgba(224,242,254,0.85)";

type Pt = { x: number; y: number };

/** Linear segments only — cubic smoothing overshoots below the Y=0 baseline between peaks and zeros. */
function traceHistogramPolyline(ctx: CanvasRenderingContext2D, points: Pt[]) {
  if (points.length === 0) return;
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
}

function seriesPoints(
  counts: number[],
  yMax: number,
  mapTpsToX: (tps: number) => number,
  py1: number,
  plotH: number,
): Pt[] {
  const yTop = py1 - plotH;
  const pts: Pt[] = [];
  for (let k = 0; k < TPS_HISTOGRAM_BIN_COUNT; k++) {
    const v = counts[k]!;
    const yRaw = py1 - (v / yMax) * plotH;
    const y = Math.max(yTop, Math.min(py1, yRaw));
    pts.push({ x: mapTpsToX(k), y });
  }
  return pts;
}

function drawRoiBars(
  ctx: CanvasRenderingContext2D,
  roiCounts: number[],
  yAxisMax: number,
  mapTpsToX: (tps: number) => number,
  py1: number,
  plotH: number,
): void {
  const denom = Math.max(1e-6, yAxisMax);
  ctx.beginPath();
  for (let k = 0; k < TPS_HISTOGRAM_BIN_COUNT; k++) {
    const c = roiCounts[k]!;
    if (c <= 0) continue;
    let x0 = mapTpsToX(k);
    let x1 = mapTpsToX(Math.min(100, k + 1));
    if (x1 < x0) [x0, x1] = [x1, x0];
    const gapTrim = 0.08;
    x0 += gapTrim;
    x1 -= gapTrim;
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

  const allCounts = useMemo(
    () =>
      tpsPatches.length > 0 ? buildTpsPercentBins(tpsPatches) : emptyBins(),
    [tpsPatches],
  );

  const bucketCounts = useMemo(
    () =>
      tpsPatches.length > 0 ? countPatchesByBucket(tpsPatches) : null,
    [tpsPatches],
  );

  const roiCounts = useMemo(() => {
    if (!manifest || !localRoi) return null;
    const patches = patchesWithCellsForTps(
      patchesIntersectingRect(manifest, localRoi.world),
    );
    return buildTpsPercentBins(patches);
  }, [manifest, localRoi]);

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

  const yMaxAll = useMemo(() => maxBin(allCounts), [allCounts]);
  const yMaxRoi = useMemo(() => {
    if (!roiCounts || roiSum === 0) return 1;
    return Math.max(1, maxBin(roiCounts));
  }, [roiCounts, roiSum]);

  const yScaleTarget = useMemo(() => {
    if (!hasRoi || roiSum === 0) return Math.max(1, yMaxAll);
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

  const proportionalAxis = useMemo(() => {
    if (!manifest) return null;
    return createProportionalTpsAxis(
      bucketCounts ?? countPatchesByBucket([]),
      geom.PX0,
      geom.PLOT_W,
    );
  }, [manifest, bucketCounts, geom.PX0, geom.PLOT_W]);

  const linearAxis = useMemo(() => {
    if (!manifest) return null;
    return createLinearTpsAxis(geom.PX0, geom.PLOT_W);
  }, [manifest, geom.PX0, geom.PLOT_W]);

  const [axisBlend, setAxisBlend] = useState(0);
  const axisBlendRef = useRef(0);
  const axisBlendAnimRef = useRef(0);

  useLayoutEffect(() => {
    axisBlendRef.current = axisBlend;
  }, [axisBlend]);

  useEffect(() => {
    const target = roiBarsOnly ? 1 : 0;
    const start = axisBlendRef.current;
    if (Math.abs(target - start) < 1e-4) {
      setAxisBlend(target);
      return;
    }
    cancelAnimationFrame(axisBlendAnimRef.current);
    const t0 = performance.now();
    const duration = 420;
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / duration);
      const ease = 1 - (1 - u) ** 3;
      const next = start + (target - start) * ease;
      setAxisBlend(next);
      axisBlendRef.current = next;
      if (u < 1) {
        axisBlendAnimRef.current = requestAnimationFrame(tick);
      }
    };
    axisBlendAnimRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(axisBlendAnimRef.current);
  }, [roiBarsOnly]);

  const blendedAxis = useMemo(() => {
    const p = proportionalAxis;
    const l = linearAxis;
    if (!p || !l) {
      return (
        p ??
        l ??
        createLinearTpsAxis(geom.PX0, geom.PLOT_W)
      );
    }
    const b = axisBlend;
    const mapTpsToX = (tps: number) =>
      p.mapTpsToX(tps) + (l.mapTpsToX(tps) - p.mapTpsToX(tps)) * b;
    const bandWidths = [
      p.bandWidths[0]! + (l.bandWidths[0]! - p.bandWidths[0]!) * b,
      p.bandWidths[1]! + (l.bandWidths[1]! - p.bandWidths[1]!) * b,
      p.bandWidths[2]! + (l.bandWidths[2]! - p.bandWidths[2]!) * b,
      p.bandWidths[3]! + (l.bandWidths[3]! - p.bandWidths[3]!) * b,
    ] as [number, number, number, number];
    return { mapTpsToX, bandWidths };
  }, [proportionalAxis, linearAxis, axisBlend, geom.PX0, geom.PLOT_W]);

  const [bandPopover, setBandPopover] = useState<{
    clientX: number;
    clientY: number;
    bucket: PatchBucket;
  } | null>(null);

  const xBoundaryLabels = [0, 1, 10, 50, 100] as const;
  const minorTicks = useMemo(() => {
    const skip = new Set([10, 50]);
    const out: number[] = [];
    for (let v = 10; v <= 90; v += 10) {
      if (!skip.has(v)) out.push(v);
    }
    return out;
  }, []);

  const curveScale = Math.max(1e-6, displayYScale);
  const yTickVals = yTicks(Math.max(1, Math.ceil(curveScale)));
  const curveOverflows = yMaxAll > curveScale * 1.02;
  /** Fade whole-slide curve out while morphing axis into ROI mode; fade in when leaving. */
  const curveAlpha = roiBarsOnly ? 1 - axisBlend : 1;
  const showWholeSlideCurve = !curveOverflows && curveAlpha > 0.01;

  const totalPatches = tpsPatches.length;

  const bandStats = useMemo(() => {
    if (!bucketCounts || totalPatches <= 0) return null;
    return BAND_BUCKETS.map((b) => ({
      bucket: b,
      n: bucketCounts[b],
      pct: (bucketCounts[b]! / totalPatches) * 100,
    }));
  }, [bucketCounts, totalPatches]);

  const { mapTpsToX, bandWidths } = blendedAxis;
  const { w: vbW, h: vbH, PX0, PX1, PY0, PY1, PLOT_H } = geom;

  const allPts = seriesPoints(
    allCounts,
    curveScale,
    mapTpsToX,
    PY1,
    PLOT_H,
  );

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

  const popoverStat = bandPopover
    ? bandStats?.find((s) => s.bucket === bandPopover.bucket)
    : null;

  useEffect(() => {
    if (!manifest || !proportionalAxis || !linearAxis) return;
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
      if (!roiBarsOnly) {
        ctx.fillStyle = "rgba(180,189,203,0.85)";
        ctx.font = "500 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(BAND_SHORT[bucket], x + width / 2, PY0 + 3);
      }
    }

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 0.35;
    ctx.setLineDash([2, 3]);
    for (const t of minorTicks) {
      const x = mapTpsToX(t);
      ctx.beginPath();
      ctx.moveTo(x, PY0);
      ctx.lineTo(x, PY1);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const t of xBoundaryLabels) {
      if (roiBarsOnly && t === 0) continue;
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

    if (showWholeSlideCurve) {
      ctx.save();
      ctx.globalAlpha = curveAlpha;
      const areaGrad = ctx.createLinearGradient(0, PY0, 0, PY1);
      areaGrad.addColorStop(0, "rgba(56,189,248,0.22)");
      areaGrad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = areaGrad;
      ctx.beginPath();
      traceHistogramPolyline(ctx, allPts);
      const first = allPts[0]!;
      const last = allPts[allPts.length - 1]!;
      ctx.lineTo(last.x, PY1);
      ctx.lineTo(first.x, PY1);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      traceHistogramPolyline(ctx, allPts);
      ctx.strokeStyle = "rgba(56,189,248,0.55)";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(56,189,248,0.5)";
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      traceHistogramPolyline(ctx, allPts);
      ctx.strokeStyle = "rgba(224,242,254,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    if (roiBarsOnly && roiCounts) {
      ctx.save();
      ctx.globalAlpha = axisBlend;
      ctx.fillStyle = "rgba(34,211,238,0.78)";
      ctx.strokeStyle = ROI_STROKE;
      ctx.lineWidth = 0.45;
      drawRoiBars(
        ctx,
        displayRoiCounts ?? roiCounts,
        curveScale,
        mapTpsToX,
        PY1,
        PLOT_H,
      );
      ctx.restore();
    }

    for (const t of xBoundaryLabels) {
      if (roiBarsOnly && t === 0) continue;
      const x = mapTpsToX(t);
      const strong = t === 1 || t === 10 || t === 50;
      ctx.fillStyle = strong ? "rgba(125,211,252,0.95)" : "rgba(160,170,185,0.95)";
      ctx.font = strong ? "600 9px sans-serif" : "400 9px sans-serif";
      ctx.textBaseline = "bottom";
      if (t === 0) ctx.textAlign = "left";
      else if (t === 100) ctx.textAlign = "right";
      else ctx.textAlign = "center";
      ctx.fillText(`${t}%`, t === 0 ? x + 2 : t === 100 ? x - 2 : x, vbH - 4);
    }
  }, [
    PLOT_H,
    PX0,
    PX1,
    PY0,
    PY1,
    allPts,
    bandLayouts,
    curveOverflows,
    curveScale,
    showWholeSlideCurve,
    curveAlpha,
    axisBlend,
    displayRoiCounts,
    hasRoi,
    mapTpsToX,
    minorTicks,
    proportionalAxis,
    linearAxis,
    roiBarsOnly,
    roiCounts,
    roiSum,
    vbH,
    vbW,
    xBoundaryLabels,
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
                Whole-slide TPS% histogram (1% bins, 0–100%) · X width ∝ stratum
                patch fraction · With ROI and patches inside: linear 0–100% axis (equal
                width per TPS%), ROI bars only (tallest ~80% height); Y = bin counts
              </TooltipContent>
            </Tooltip>
          </div>
          {hasRoi ? (
            <p className="text-[11px] text-muted-foreground">
              Local ROI · {localRoi!.summary.patchCount} patches (selection overlap)
            </p>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
          <div
            ref={chartLayoutRef}
            className="flex min-h-0 w-full min-w-full max-w-full flex-1 flex-col gap-1"
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
                      setBandPopover({
                        clientX: e.clientX,
                        clientY: e.clientY,
                        bucket,
                      });
                      setGalleryBucket(bucket);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="shrink-0">
              <HilbertSpatialStrip
                manifest={manifest}
                densityTraceLegend={{
                  mode: roiBarsOnly ? "roi_bars" : "ws",
                  wsAsReference: Boolean(hasRoi && !roiBarsOnly),
                }}
              />
            </div>
          </div>
        </div>

        {bandPopover && popoverStat ? (
          <div
            role="tooltip"
            className="pointer-events-auto fixed z-[90] min-w-[160px] rounded-md border border-border/70 bg-background/96 px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm"
            style={{
              left: bandPopover.clientX,
              top: bandPopover.clientY,
              transform: "translate(-50%, 12px)",
            }}
            onMouseLeave={() => setBandPopover(null)}
          >
            <div className="font-medium text-foreground">
              {BUCKET_STYLES[popoverStat.bucket].fullLabel}
            </div>
            <div className="mt-0.5 tabular-nums text-muted-foreground">
              {popoverStat.n} / {totalPatches} patches (
              {popoverStat.pct.toFixed(1)}%)
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

