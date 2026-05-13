"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, GripVertical, X } from "lucide-react";
import { AiAssistantChatBody } from "./AiAssistantPanel";
import { cn } from "@/lib/utils";

const FAB_SIZE = 48;
const PANEL_W = 440;
/** Max fraction of viewport height for the open panel (chrome + chat). */
const PANEL_MAX_VH = 0.8;
const DRAG_THRESHOLD = 5;
/** Padding from viewport edge when snapping the closed FAB to a corner */
const FAB_EDGE_MARGIN = 20;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function clampPos(
  x: number,
  y: number,
  elW: number,
  elH: number,
  vw: number,
  vh: number,
) {
  return {
    x: clamp(x, 0, Math.max(0, vw - elW)),
    y: clamp(y, 0, Math.max(0, vh - elH)),
  };
}

/** Snap closed FAB center to nearest viewport corner (keeps icon flush to two edges). */
function snapFabToNearestCorner(
  x: number,
  y: number,
  vw: number,
  vh: number,
): Point {
  const m = FAB_EDGE_MARGIN;
  const corners: Point[] = [
    { x: m, y: m },
    { x: vw - FAB_SIZE - m, y: m },
    { x: m, y: vh - FAB_SIZE - m },
    { x: vw - FAB_SIZE - m, y: vh - FAB_SIZE - m },
  ];
  const cx = x + FAB_SIZE / 2;
  const cy = y + FAB_SIZE / 2;
  let best = corners[0]!;
  let bestD = Infinity;
  for (const c of corners) {
    const mx = c.x + FAB_SIZE / 2;
    const my = c.y + FAB_SIZE / 2;
    const d = (cx - mx) ** 2 + (cy - my) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return clampPos(best.x, best.y, FAB_SIZE, FAB_SIZE, vw, vh);
}

type Point = { x: number; y: number };

function useViewportSize() {
  const [sz, setSz] = useState({ w: 1024, h: 768 });
  useLayoutEffect(() => {
    const read = () => setSz({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return sz;
}

export function AiAssistantFloating() {
  const [mounted, setMounted] = useState(false);
  const { w: vw, h: vh } = useViewportSize();
  const maxPanelPx = vh * PANEL_MAX_VH;

  const [open, setOpen] = useState(false);
  const [fabPos, setFabPos] = useState<Point>({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState<Point>({ x: 0, y: 0 });
  /** Measured dialog height (grows with chat until capped by maxPanelPx). */
  const [panelMeasuredH, setPanelMeasuredH] = useState(480);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelEverPlaced = useRef(false);
  const fabPosRef = useRef(fabPos);
  fabPosRef.current = fabPos;
  const panelPosRef = useRef(panelPos);
  panelPosRef.current = panelPos;
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => setMounted(true), []);

  /** Track dialog height for viewport clamping / dragging (content-driven, max 80vh). */
  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const read = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setPanelMeasuredH(h);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, vw, vh]);

  /** FAB: clamp; when closed, snap to nearest viewport corner (avoids 0,0 → wrong corner). */
  useLayoutEffect(() => {
    if (!mounted) return;
    setFabPos((p) => {
      const c = clampPos(p.x, p.y, FAB_SIZE, FAB_SIZE, vw, vh);
      if (open) return c;
      if (p.x === 0 && p.y === 0) {
        return snapFabToNearestCorner(
          vw - FAB_SIZE - FAB_EDGE_MARGIN,
          vh - FAB_SIZE - FAB_EDGE_MARGIN,
          vw,
          vh,
        );
      }
      return snapFabToNearestCorner(c.x, c.y, vw, vh);
    });
    setPanelPos((p) =>
      clampPos(p.x, p.y, PANEL_W, Math.min(panelMeasuredH, maxPanelPx), vw, vh),
    );
  }, [mounted, vw, vh, open, panelMeasuredH, maxPanelPx]);

  useLayoutEffect(() => {
    if (!open || panelEverPlaced.current || !mounted) return;
    const estH = Math.min(520, maxPanelPx);
    const x = fabPos.x - PANEL_W - 12;
    const y = Math.min(fabPos.y, vh - estH - 12);
    setPanelPos(
      clampPos(
        x >= 8 ? x : fabPos.x + FAB_SIZE + 12,
        clamp(y, 8, vh - 8),
        PANEL_W,
        estH,
        vw,
        vh,
      ),
    );
    panelEverPlaced.current = true;
  }, [open, mounted, fabPos.x, fabPos.y, vw, vh, maxPanelPx]);

  const fabDragMoved = useRef(false);

  const onFabPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    fabDragMoved.current = false;
    const start = { x: e.clientX, y: e.clientY };
    const origin = { ...fabPosRef.current };
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        moved = true;
        fabDragMoved.current = true;
      }
      if (!moved) return;
      const vw0 = window.innerWidth;
      const vh0 = window.innerHeight;
      setFabPos(
        clampPos(origin.x + dx, origin.y + dy, FAB_SIZE, FAB_SIZE, vw0, vh0),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (moved && !openRef.current) {
        const vw0 = window.innerWidth;
        const vh0 = window.innerHeight;
        setFabPos((p) => snapFabToNearestCorner(p.x, p.y, vw0, vh0));
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  const onPanelHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    const origin = { ...panelPosRef.current };
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD))
        moved = true;
      if (!moved) return;
      const vw0 = window.innerWidth;
      const vh0 = window.innerHeight;
      const elH = panelRef.current?.getBoundingClientRect().height ?? panelMeasuredH;
      setPanelPos(clampPos(origin.x + dx, origin.y + dy, PANEL_W, elH, vw0, vh0));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [panelMeasuredH]);

  const onFabClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (fabDragMoved.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      setOpen((v) => !v);
    },
    [],
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <button
        type="button"
        title={
          open
            ? "Drag to move · Click to close"
            : "Drag to move · Click to open Pathology Insight"
        }
        className={cn(
          "pointer-events-auto absolute flex items-center justify-center rounded-full border border-white/20 bg-primary text-primary-foreground shadow-lg shadow-black/40 transition-[box-shadow,transform] hover:scale-105 hover:shadow-xl active:scale-95",
          open && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
        )}
        style={{
          left: fabPos.x,
          top: fabPos.y,
          width: FAB_SIZE,
          height: FAB_SIZE,
        }}
        onPointerDown={onFabPointerDown}
        onClick={onFabClick}
      >
        <Bot className="size-5" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Pathology Insight"
          className="pointer-events-auto absolute flex max-h-[80vh] min-h-[280px] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
          style={{
            left: panelPos.x,
            top: panelPos.y,
            width: PANEL_W,
            maxHeight: maxPanelPx,
          }}
        >
          <div
            className="flex shrink-0 cursor-grab select-none items-center gap-2 border-b border-border bg-muted/40 px-2.5 py-1.5 active:cursor-grabbing"
            onPointerDown={onPanelHeaderPointerDown}
          >
            <GripVertical className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-[0.66rem] font-semibold tracking-wide">
              Pathology Insight
            </span>
            <button
              type="button"
              title="Close"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-hidden p-1.5 pt-0">
            <AiAssistantChatBody
              hideChrome
              className="h-auto max-h-none min-h-0 border-0 bg-transparent shadow-none"
            />
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
