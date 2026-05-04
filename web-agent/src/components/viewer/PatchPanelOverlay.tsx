"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import {
  useViewerStore,
  selectSelectedPatch,
  PREVIEW_TILE_MIN,
  PREVIEW_TILE_MAX,
  type PanelLayer,
} from "@/lib/store";
import { cn } from "@/lib/utils";

interface PanelImageInfo {
  key: PanelLayer;
  label: string;
}

const ALL_PANELS: PanelImageInfo[] = [
  { key: "cell_class", label: "Cell Class" },
  { key: "heatmap_overlay", label: "Heatmap" },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

interface ZoomState {
  zoom: number;
  // pan stored in normalized 0..1 units relative to tile size, so it scales with resizing
  panX: number;
  panY: number;
}

const IDENTITY: ZoomState = { zoom: 1, panX: 0, panY: 0 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function clampPan(zoom: number, panX: number, panY: number): ZoomState {
  // Pan is normalized so that range of allowed values is -(zoom-1)..0
  const max = zoom - 1;
  return {
    zoom,
    panX: clamp(panX, -max, 0),
    panY: clamp(panY, -max, 0),
  };
}

export function PatchPanelOverlay() {
  const caseId = useViewerStore((s) => s.caseId);
  const patch = useViewerStore(selectSelectedPatch);
  const panelLayers = useViewerStore((s) => s.panelLayers);
  const tileSize = useViewerStore((s) => s.previewTileSize);
  const setTileSize = useViewerStore((s) => s.setPreviewTileSize);

  const [transform, setTransform] = useState<ZoomState>(IDENTITY);
  const [isHidden, setIsHidden] = useState(false);

  // Reset zoom when patch changes — derive-from-props pattern so we do not
  // call setState inside an effect (cascading renders).
  const prevPatchIdRef = useRef<string | null | undefined>(patch?.patchId);
  if (prevPatchIdRef.current !== patch?.patchId) {
    prevPatchIdRef.current = patch?.patchId;
    if (
      transform.zoom !== IDENTITY.zoom ||
      transform.panX !== IDENTITY.panX ||
      transform.panY !== IDENTITY.panY
    ) {
      setTransform(IDENTITY);
    }
  }

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startSize = useViewerStore.getState().previewTileSize;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const handleMove = (ev: PointerEvent) => {
        // Drag toward top-left grows; use dominant axis
        const dx = startX - ev.clientX;
        const dy = startY - ev.clientY;
        const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
        setTileSize(
          clamp(startSize + delta, PREVIEW_TILE_MIN, PREVIEW_TILE_MAX),
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
    },
    [setTileSize],
  );

  if (!caseId) return null;

  const panels = ALL_PANELS.filter((p) => panelLayers[p.key]);
  const isZoomed =
    transform.zoom !== 1 || transform.panX !== 0 || transform.panY !== 0;

  if (isHidden) {
    return (
      <button
        type="button"
        onClick={() => setIsHidden(false)}
        className="pointer-events-auto absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/60 px-2.5 py-1.5 text-[13px] font-medium text-white/90 shadow-lg backdrop-blur-sm hover:bg-black/70"
        title="Show patch views"
      >
        <Eye className="size-3.5" />
        Patch views
      </button>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-4 right-4 flex max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-2 rounded-md border border-white/15 bg-black/60 p-2 shadow-xl backdrop-blur-sm",
      )}
    >
      {/* Top-left resize handle */}
      <div
        onPointerDown={onResizePointerDown}
        title="Drag to resize"
        className="absolute -left-1 -top-1 size-3.5 cursor-nwse-resize rounded-sm border border-white/40 bg-white/30 hover:bg-white/70"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 45%, rgba(255,255,255,0.9) 45%, rgba(255,255,255,0.9) 55%, transparent 55%)",
        }}
      />

      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="font-semibold text-white/90">Patch views</span>
        <div className="flex items-center gap-2 text-white/60">
          <span className="font-mono">
            {patch ? `x${patch.px} / y${patch.py}` : "no patch"}
          </span>
          {patch ? (
            <span className="font-mono tabular-nums">
              {tileSize}px · {transform.zoom.toFixed(1)}x
            </span>
          ) : null}
          {patch && isZoomed ? (
            <button
              type="button"
              onClick={() => setTransform(IDENTITY)}
              title="Reset zoom"
              className="rounded p-0.5 hover:bg-white/10"
            >
              <RotateCcw className="size-3" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsHidden(true)}
            title="Hide patch views"
            className="rounded p-0.5 hover:bg-white/10"
          >
            <EyeOff className="size-3" />
          </button>
        </div>
      </div>

      {!patch ? (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-white/20 px-3 text-center text-[13px] leading-snug text-white/60"
          style={{ width: tileSize, height: 120 }}
        >
          Click anywhere on the main image to locate a patch and inspect its
          preview views.
        </div>
      ) : panels.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-white/20 px-3 text-center text-[13px] leading-snug text-white/60"
          style={{ width: tileSize, height: 100 }}
        >
          All preview layers are hidden.
        </div>
      ) : (
        <div className="flex gap-2 overflow-hidden">
          {panels.map((p) => (
            <PreviewTile
              key={p.key}
              caseId={caseId}
              patchId={patch.patchId}
              kind={p.key}
              label={p.label}
              size={tileSize}
              transform={transform}
              setTransform={setTransform}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewTile({
  caseId,
  patchId,
  kind,
  label,
  size,
  transform,
  setTransform,
}: {
  caseId: string;
  patchId: string;
  kind: PanelLayer;
  label: string;
  size: number;
  transform: ZoomState;
  setTransform: React.Dispatch<React.SetStateAction<ZoomState>>;
}) {
  const url = `/api/cases/${encodeURIComponent(caseId)}/file/preview/by_patch/${encodeURIComponent(patchId)}/${kind}.png`;
  const containerRef = useRef<HTMLDivElement>(null);

  // Non-passive wheel listener so we can preventDefault and avoid page scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      // cursor position normalized to tile size
      const cx = (e.clientX - rect.left) / rect.width;
      const cy = (e.clientY - rect.top) / rect.height;
      setTransform((prev) => {
        const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        const newZoom = clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        if (newZoom === prev.zoom) return prev;
        // Solve so the world point under the cursor stays under the cursor.
        // screen = world * zoom + pan  (all in normalized units 0..1 of the tile)
        const ratio = newZoom / prev.zoom;
        const newPanX = cx - (cx - prev.panX) * ratio;
        const newPanY = cy - (cy - prev.panY) * ratio;
        return clampPan(newZoom, newPanX, newPanY);
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setTransform]);

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

  const onDoubleClick = () => {
    setTransform(IDENTITY);
  };

  return (
    <figure
      className="overflow-hidden rounded-md border border-white/10 bg-black/30"
      style={{ width: size, height: size + 18 }}
    >
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden touch-none",
          transform.zoom > 1
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-zoom-in",
        )}
        style={{ width: size, height: size }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`${label} preview of ${patchId}`}
          width={size}
          height={size}
          className="block select-none"
          draggable={false}
          style={{
            width: size,
            height: size,
            transform: `translate(${transform.panX * size}px, ${transform.panY * size}px) scale(${transform.zoom})`,
            transformOrigin: "top left",
            willChange: "transform",
            imageRendering: transform.zoom >= 4 ? "pixelated" : "auto",
          }}
        />
      </div>
      <figcaption className="bg-black/50 px-2 py-0.5 text-center text-[12px] tracking-wide text-white/80">
        {label}
      </figcaption>
    </figure>
  );
}
