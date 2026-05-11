import type { WorldRect } from "@/lib/localRoiStats";
import {
  caseStatsToTemplateFields,
  getCaseStats,
  type CaseStatsSnapshot,
} from "@/lib/internal/caseStats";
import type { TemplateFields } from "@/lib/agent/templateFields";

export type { TemplateFields };

export type { CaseStatsSnapshot };

/** 通过内部 {@link getCaseStats} 生成模板字段（勿绕过内部 API 直接读 manifest） */
export async function buildTemplateFieldsFromCase(
  caseId: string,
  threshold: number,
  selectedPatchId: string | null,
  roiWorld: WorldRect | null,
): Promise<TemplateFields> {
  const stats = await getCaseStats(caseId, {
    threshold,
    selectedPatchId,
    roiWorld,
  });
  return caseStatsToTemplateFields(stats);
}

export { caseStatsToTemplateFields, getCaseStats };
