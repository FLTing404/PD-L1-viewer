"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useViewerStore } from "@/lib/store";
import type { PatchEntry } from "@/types/case";

function bubbleColor(tps: number): string {
  const t = Math.max(0, Math.min(1, tps));
  const r = Math.round(90 + t * 165);
  const g = Math.round(180 - t * 120);
  const b = Math.round(200 - t * 160);
  return `rgb(${r},${g},${b})`;
}

export function PatchTpsBubbleChart() {
  const manifest = useViewerStore((s) => s.manifest);
  const selectedPatchId = useViewerStore((s) => s.selectedPatchId);
  const setSelectedPatch = useViewerStore((s) => s.setSelectedPatch);
  const flyToPatch = useViewerStore((s) => s.flyToPatch);

  const { wsiW, wsiH, minTps, maxTps, patches } = useMemo(() => {
    if (!manifest) {
      return {
        wsiW: 1,
        wsiH: 1,
        minTps: 0,
        maxTps: 1,
        patches: [] as PatchEntry[],
      };
    }
    const ts = manifest.patches.map((p) => p.patchPredTps);
    const mn = Math.min(...ts, 0);
    const mx = Math.max(...ts, mn + 1e-9);
    return {
      wsiW: manifest.wsiMeta.wsiWidth,
      wsiH: manifest.wsiMeta.wsiHeight,
      minTps: mn,
      maxTps: mx,
      patches: manifest.patches,
    };
  }, [manifest]);

  if (!manifest || patches.length === 0) {
    return (
      <Card className="gap-0 py-2 shadow-sm">
        <CardContent className="px-3 py-2">
          <div className="text-app-section font-semibold tracking-wide">
            Patch · TPS
          </div>
          <p className="text-app-body mt-2 text-muted-foreground">
            加载 case 后将显示 patch 中心 (x, y) 与 TPS 气泡图。
          </p>
        </CardContent>
      </Card>
    );
  }

  const pad = 8;
  const sizeBase = Math.max(wsiW, wsiH);

  return (
    <Card className="gap-0 py-2 shadow-sm">
      <CardContent className="space-y-1 px-3 py-1">
        <div className="text-app-section font-semibold tracking-wide">
          Patch positions · TPS
        </div>
        <div className="relative w-full overflow-hidden rounded-md border border-border/60 bg-muted/20">
          <svg
            viewBox={`${-pad} ${-pad} ${wsiW + pad * 2} ${wsiH + pad * 2}`}
            className="h-[200px] w-full touch-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect
              x={0}
              y={0}
              width={wsiW}
              height={wsiH}
              fill="currentColor"
              className="text-background"
              opacity={0.5}
            />
            <line
              x1={0}
              y1={wsiH}
              x2={wsiW}
              y2={wsiH}
              className="text-border"
              stroke="currentColor"
              strokeWidth={wsiW * 0.002}
            />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={wsiH}
              className="text-border"
              stroke="currentColor"
              strokeWidth={wsiW * 0.002}
            />
            <text
              x={wsiW * 0.5}
              y={wsiH + pad * 2.5}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: sizeBase * 0.018 }}
            >
              X (px)
            </text>
            <text
              x={-pad * 3}
              y={wsiH * 0.5}
              textAnchor="middle"
              className="fill-muted-foreground"
              transform={`rotate(-90 ${-pad * 3} ${wsiH * 0.5})`}
              style={{ fontSize: sizeBase * 0.018 }}
            >
              Y (px)
            </text>
            {patches.map((p) => {
              const cx = p.px + p.width / 2;
              const cy = p.py + p.height / 2;
              const tNorm =
                (p.patchPredTps - minTps) / (maxTps - minTps + 1e-12);
              const rMin = sizeBase * 0.0035;
              const rMax = sizeBase * 0.052;
              const r = rMin + Math.sqrt(tNorm) * (rMax - rMin);
              const isSel = p.patchId === selectedPatchId;
              return (
                <circle
                  key={p.patchId}
                  role="button"
                  tabIndex={0}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={bubbleColor(p.patchPredTps)}
                  fillOpacity={isSel ? 0.92 : 0.55}
                  stroke={isSel ? "rgb(255,59,48)" : "rgba(255,255,255,0.35)"}
                  strokeWidth={
                    isSel ? Math.max(r * 0.18, 2) : Math.max(r * 0.06, 1)
                  }
                  className="cursor-pointer transition-opacity hover:fill-opacity-80"
                  onClick={() => {
                    void setSelectedPatch(p.patchId);
                    flyToPatch(p.patchId);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      void setSelectedPatch(p.patchId);
                      flyToPatch(p.patchId);
                    }
                  }}
                />
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
