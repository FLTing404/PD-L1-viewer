"use client";

import { createContext, useContext } from "react";
import type { RefObject } from "react";

/** Ref to the TPS spatial heatmap pane in MainViewer (for cross-column vertical alignment). */
export const HeatmapPaneRefContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

export function useHeatmapPaneRef(): RefObject<HTMLDivElement | null> | null {
  return useContext(HeatmapPaneRefContext);
}
