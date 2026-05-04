"use client";

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useViewerStore } from "@/lib/store";

export function CaseSelector({ className }: { className?: string }) {
  const caseList = useViewerStore((s) => s.caseList);
  const caseListStatus = useViewerStore((s) => s.caseListStatus);
  const caseId = useViewerStore((s) => s.caseId);
  const setCase = useViewerStore((s) => s.setCase);
  const loadCaseList = useViewerStore((s) => s.loadCaseList);

  useEffect(() => {
    if (caseListStatus === "idle") {
      void loadCaseList();
    }
  }, [caseListStatus, loadCaseList]);

  const isLoading = caseListStatus === "loading";

  return (
    <Select
      value={caseId ?? ""}
      onValueChange={(value: string | null) => {
        if (value && value !== caseId) void setCase(value);
      }}
      disabled={isLoading || caseList.length === 0}
    >
      <SelectTrigger className={className ?? "w-[260px]"}>
        <SelectValue
          placeholder={
            isLoading
              ? "Loading cases…"
              : caseList.length === 0
                ? "No cases available"
                : "Select a case"
          }
        />
      </SelectTrigger>
      <SelectContent>
        {caseList.map((c) => (
          <SelectItem key={c.caseId} value={c.caseId}>
            <span className="truncate">{c.caseId}</span>
            <span className="ml-2 text-app-body text-muted-foreground">
              · {c.numExportedPatches} patches
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
