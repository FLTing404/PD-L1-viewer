"use client";

import { createContext, useContext } from "react";
import type OpenSeadragon from "openseadragon";

export interface ViewerContextValue {
  /** Main WSI viewer (patch pick + navigator). */
  viewer: OpenSeadragon.Viewer | null;
  /** Same WSI with TPS heatmap overlay. */
  heatmapViewer: OpenSeadragon.Viewer | null;
  ready: boolean;
}

export const ViewerContext = createContext<ViewerContextValue>({
  viewer: null,
  heatmapViewer: null,
  ready: false,
});

export function useOsdViewer(): ViewerContextValue {
  return useContext(ViewerContext);
}
