"use client";

import { createContext, useContext } from "react";
import type OpenSeadragon from "openseadragon";

export interface ViewerContextValue {
  /** Main WSI viewer (patch pick + optional TPS heatmap overlay). */
  viewer: OpenSeadragon.Viewer | null;
  ready: boolean;
}

export const ViewerContext = createContext<ViewerContextValue>({
  viewer: null,
  ready: false,
});

export function useOsdViewer(): ViewerContextValue {
  return useContext(ViewerContext);
}
