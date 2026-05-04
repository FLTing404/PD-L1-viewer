"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  useViewerStore,
  selectSelectedPatch,
  type PanelLayer,
} from "@/lib/store";
import { cn } from "@/lib/utils";

interface LayerOption {
  value: PanelLayer;
  label: string;
}

const LAYERS: LayerOption[] = [
  { value: "cell_class", label: "Cell Class" },
  { value: "heatmap_overlay", label: "Heatmap" },
];

interface ZoomState {
  zoom: number;
  panX: number;
  panY: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const IDENTITY: ZoomState = { zoom: 1, panX: 0, panY: 0 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function clampPan(zoom: number, panX: number, panY: number): ZoomState {
  const max = zoom - 1;
  return {
    zoom,
    panX: clamp(panX, -max, 0),
    panY: clamp(panY, -max, 0),
  };
}

export function SelectedPatchView() {
  const caseId = useViewerStore((s) => s.caseId);
  const patch = useViewerStore(selectSelectedPatch);
  const selectedLayer = useViewerStore((s) => s.selectedLayer);
  const setSelectedLayer = useViewerStore((s) => s.setSelectedLayer);
  const setSelectedPatch = useViewerStore((s) => s.setSelectedPatch);
  const [transform, setTransform] = useState<ZoomState>(IDENTITY);
  const containerRef = useRef<HTMLDivElement>(null);

  const previewUrl =
    patch && caseId
      ? `/api/cases/${encodeURIComponent(caseId)}/file/preview/by_patch/${encodeURIComponent(
          patch.patchId,
        )}/${selectedLayer}.png`
      : null;

  const prevKeyRef = useRef<string>("init");
  const key = `${patch?.patchId ?? "none"}|${selectedLayer}`;
  if (prevKeyRef.current !== key) {
    prevKeyRef.current = key;
    if (
      transform.zoom !== IDENTITY.zoom ||
      transform.panX !== IDENTITY.panX ||
      transform.panY !== IDENTITY.panY
    ) {
      setTransform(IDENTITY);
    }
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width;
      const cy = (e.clientY - rect.top) / rect.height;
      setTransform((prev) => {
        const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        const newZoom = clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        if (newZoom === prev.zoom) return prev;
        const ratio = newZoom / prev.zoom;
        const newPanX = cx - (cx - prev.panX) * ratio;
        const newPanY = cy - (cy - prev.panY) * ratio;
        return clampPan(newZoom, newPanX, newPanY);
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (transform.zoom <= 1) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = transform.panX;
    const startPanY = transform.panY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const handleMove = (ev: PointerEvent) => {
      const dxN = (ev.clientX - startX) / rect.width;
      const dyN = (ev.clientY - startY) / rect.height;
      setTransform((prev) =>
        clampPan(prev.zoom, startPanX + dxN, startPanY + dyN),
      );
    };
    const handleUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  return (
    <Card className="gap-2 py-3">
      <CardContent className="space-y-2.5 px-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Selected Patch</span>
            <span className="font-mono text-[12px] text-muted-foreground">
              Patch ID: {patch?.patchId ?? "—"}
            </span>
          </div>
          {patch ? (
            <button
              type="button"
              onClick={() => void setSelectedPatch(null)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Clear selection"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-1 rounded-md bg-muted/40 p-0.5">
          {LAYERS.map((l) => {
            const isActive = selectedLayer === l.value;
            return (
              <button
                key={l.value}
                type="button"
                onClick={() => setSelectedLayer(l.value)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-background shadow-sm ring-1 ring-foreground/10"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        <div
          ref={containerRef}
          className={cn(
            "aspect-square w-full overflow-hidden rounded-md bg-muted/40 ring-1 ring-foreground/10 touch-none",
            transform.zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
          )}
          onPointerDown={onPointerDown}
          onDoubleClick={() => setTransform(IDENTITY)}
        >
          {patch && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewUrl}
              src={previewUrl}
              alt={`${selectedLayer} of ${patch.patchId}`}
              className="h-full w-full object-cover select-none"
              loading="lazy"
              draggable={false}
              style={{
                transform: `translate(${transform.panX * 100}%, ${transform.panY * 100}%) scale(${transform.zoom})`,
                transformOrigin: "top left",
                willChange: "transform",
                imageRendering: transform.zoom >= 4 ? "pixelated" : "auto",
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
              Pick a patch from the gallery or click a region on the WSI to
              inspect its cell-level views.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
