"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GripVertical, X } from "lucide-react";
import { useViewerStore, computeWsiStats } from "@/lib/store";
import { patchesWithCellsForTps } from "@/lib/patchFilters";
import { patchesIntersectingRect } from "@/lib/localRoiStats";
import type { PatchEntry } from "@/types/case";
import { CellMixStackedBar, MetricHBar } from "@/components/charts/MetricBars";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

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

const EDGE = 12;

/** Bottom-right on WSI; draggable by header (scalar metrics as horizontal bars). */
export function RoiSummaryPopup() {
  const manifest = useViewerStore((s) => s.manifest);
  const localRoi = useViewerStore((s) => s.localRoi);
  const clearLocalRoi = useViewerStore((s) => s.clearLocalRoi);

  const wrapRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ left: 0, top: 0 });
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  const wsiStats = useMemo(() => computeWsiStats(manifest), [manifest]);

  const roiMeanTps = useMemo(() => {
    if (!manifest || !localRoi) return 0;
    const inRoi = patchesIntersectingRect(manifest, localRoi.world);
    return cellWeightedMeanTps(inRoi);
  }, [manifest, localRoi]);

  const placeBottomRight = useCallback(() => {
    const el = wrapRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent || parent.clientWidth <= 0) return;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const ew = el.offsetWidth;
    const eh = el.offsetHeight;
    const next = {
      left: clamp(pw - ew - EDGE, 0, Math.max(0, pw - ew)),
      top: clamp(ph - eh - EDGE, 0, Math.max(0, ph - eh)),
    };
    posRef.current = next;
    setPos(next);
  }, []);

  const clampIntoParent = useCallback(() => {
    const el = wrapRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const ew = el.offsetWidth;
    const eh = el.offsetHeight;
    const next = {
      left: clamp(posRef.current.left, 0, Math.max(0, pw - ew)),
      top: clamp(posRef.current.top, 0, Math.max(0, ph - eh)),
    };
    posRef.current = next;
    setPos(next);
  }, []);

  useLayoutEffect(() => {
    if (!manifest) return;
    placeBottomRight();
  }, [manifest?.caseId, placeBottomRight]);

  useLayoutEffect(() => {
    if (!manifest) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(clampIntoParent);
    });
    const parent = wrapRef.current?.offsetParent;
    const el = wrapRef.current;
    if (parent instanceof HTMLElement) ro.observe(parent);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [manifest, clampIntoParent]);

  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest("button")) return;

      const parent = wrapRef.current?.offsetParent as HTMLElement | null;
      const panel = wrapRef.current;
      if (!parent || !panel) return;

      e.preventDefault();

      const start = { x: e.clientX, y: e.clientY };
      const origin = { ...posRef.current };

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        const pw = parent.clientWidth;
        const ph = parent.clientHeight;
        const ew = panel.offsetWidth;
        const eh = panel.offsetHeight;
        const next = {
          left: clamp(origin.left + dx, 0, Math.max(0, pw - ew)),
          top: clamp(origin.top + dy, 0, Math.max(0, ph - eh)),
        };
        posRef.current = next;
        setPos(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [],
  );

  if (!manifest) return null;

  const hasRoi = Boolean(localRoi);
  const s = localRoi?.summary;
  const positiveCells = hasRoi ? s!.positiveCells : wsiStats.positiveCells;
  const negativeCells = hasRoi ? s!.negativeCells : wsiStats.negativeCells;
  const totalCells = hasRoi ? s!.totalCells : wsiStats.totalCells;
  const patchCount = hasRoi ? s!.patchCount : wsiStats.patchCount;
  const meanTps = hasRoi ? roiMeanTps : wsiStats.meanTps;

  const subtitle = hasRoi ? "Local ROI" : "Whole slide";

  const patchFrac =
    wsiStats.patchCount > 0 ? patchCount / wsiStats.patchCount : 0;
  const cellFrac =
    wsiStats.totalCells > 0 ? totalCells / wsiStats.totalCells : 0;

  const patchesLabel = hasRoi ? "Patches (vs slide)" : "Patches";
  const cellsLabel = hasRoi ? "Cells (vs slide)" : "Cells";
  const patchesValue = hasRoi
    ? `${patchCount.toLocaleString()} / ${wsiStats.patchCount.toLocaleString()}`
    : patchCount.toLocaleString();
  const cellsValue = hasRoi
    ? `${totalCells.toLocaleString()} / ${wsiStats.totalCells.toLocaleString()}`
    : totalCells.toLocaleString();
  const patchesFraction = hasRoi ? Math.min(1, patchFrac) : 1;
  const cellsFraction = hasRoi ? Math.min(1, cellFrac) : 1;

  return (
    <div
      ref={wrapRef}
      style={{ left: pos.left, top: pos.top }}
      className="pointer-events-auto absolute z-20 flex max-w-[300px] gap-2 rounded-lg border border-white/20 bg-black/75 p-2.5 shadow-xl backdrop-blur-md"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="mb-1.5 flex cursor-grab items-start gap-1.5 active:cursor-grabbing"
          onPointerDown={onHeaderPointerDown}
        >
          <GripVertical
            className="mt-0.5 size-4 shrink-0 text-white/45"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-wide text-white/95">
              Selection ROI
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-cyan-300/90">
              {subtitle}
            </div>
          </div>
          {hasRoi ? (
            <button
              type="button"
              onClick={() => clearLocalRoi()}
              className="shrink-0 rounded p-0.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              title="Clear ROI"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/15 pt-2">
          <MetricHBar
            variant="overlay"
            label="Mean TPS (scalar)"
            fraction={Math.min(1, Math.max(0, meanTps))}
            valueLabel={`${(meanTps * 100).toFixed(1)}%`}
            barClassName="bg-cyan-400/85"
          />
          <MetricHBar
            variant="overlay"
            label={patchesLabel}
            fraction={patchesFraction}
            valueLabel={patchesValue}
            barClassName="bg-sky-400/80"
          />
          <MetricHBar
            variant="overlay"
            label={cellsLabel}
            fraction={cellsFraction}
            valueLabel={cellsValue}
            barClassName="bg-emerald-400/75"
          />
          <CellMixStackedBar
            variant="overlay"
            positiveCells={positiveCells}
            negativeCells={negativeCells}
          />
        </div>
      </div>
    </div>
  );
}
