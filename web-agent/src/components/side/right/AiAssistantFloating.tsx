"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, GripVertical, X } from "lucide-react";
import { AiAssistantChatBody } from "./AiAssistantPanel";
import { cn } from "@/lib/utils";

const FAB_SIZE = 48;
const PANEL_W = 384;
const PANEL_H = 520;
const DRAG_THRESHOLD = 5;

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

  const [open, setOpen] = useState(false);
  const [fabPos, setFabPos] = useState<Point>({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState<Point>({ x: 0, y: 0 });
  const panelEverPlaced = useRef(false);
  const fabPosRef = useRef(fabPos);
  fabPosRef.current = fabPos;
  const panelPosRef = useRef(panelPos);
  panelPosRef.current = panelPos;

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    setFabPos((p) =>
      p.x === 0 && p.y === 0
        ? clampPos(
            window.innerWidth - FAB_SIZE - 20,
            window.innerHeight - FAB_SIZE - 20,
            FAB_SIZE,
            FAB_SIZE,
            window.innerWidth,
            window.innerHeight,
          )
        : p,
    );
  }, [mounted]);

  useLayoutEffect(() => {
    if (!open || panelEverPlaced.current || !mounted) return;
    const x = fabPos.x - PANEL_W - 12;
    const y = Math.min(fabPos.y, vh - PANEL_H - 12);
    setPanelPos(
      clampPos(
        x >= 8 ? x : fabPos.x + FAB_SIZE + 12,
        clamp(y, 8, vh - 8),
        PANEL_W,
        PANEL_H,
        vw,
        vh,
      ),
    );
    panelEverPlaced.current = true;
  }, [open, mounted, fabPos.x, fabPos.y, vw, vh]);

  useLayoutEffect(() => {
    if (!mounted) return;
    setFabPos((p) => clampPos(p.x, p.y, FAB_SIZE, FAB_SIZE, vw, vh));
    setPanelPos((p) => clampPos(p.x, p.y, PANEL_W, PANEL_H, vw, vh));
  }, [mounted, vw, vh]);

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
      setPanelPos(clampPos(origin.x + dx, origin.y + dy, PANEL_W, PANEL_H, vw0, vh0));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

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
            ? "Drag to move · Click to close assistant"
            : "Drag to move · Click to open AI assistant"
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
          role="dialog"
          aria-label="AI assistant"
          className="pointer-events-auto absolute flex max-h-[min(70vh,560px)] w-[384px] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
          style={{ left: panelPos.x, top: panelPos.y, height: PANEL_H }}
        >
          <div
            className="flex shrink-0 cursor-grab select-none items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 active:cursor-grabbing"
            onPointerDown={onPanelHeaderPointerDown}
          >
            <GripVertical className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm font-semibold tracking-wide">
              AI Assistant
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
          <div className="min-h-0 flex-1 overflow-hidden p-2 pt-0">
            <AiAssistantChatBody
              hideChrome
              className="h-full min-h-0 flex-1 border-0 bg-transparent shadow-none"
            />
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
