import path from "node:path";

const ENV_ROOT = process.env.CASES_ROOT;

export function getCasesRoot(): string {
  if (ENV_ROOT && ENV_ROOT.length > 0) {
    return path.resolve(ENV_ROOT);
  }
  // Default: next dev runs in code/web, data lives in code/data
  return path.resolve(process.cwd(), "..", "data");
}

/**
 * Optional demo aliases: list multiple case IDs in the UI while reusing one
 * on-disk folder (no duplicated `data/<caseId>` trees).
 */
const CASE_DATA_ALIASES: Record<string, string> = {
  case2: "case1",
  case3: "case1",
};

/** Physical folder under {@link getCasesRoot} that holds images / CSV for this case. */
export function getCaseDir(caseId: string): string {
  const source = CASE_DATA_ALIASES[caseId] ?? caseId;
  return path.join(getCasesRoot(), source);
}

const CASE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidCaseId(caseId: string): boolean {
  return CASE_ID_PATTERN.test(caseId);
}

const PATCH_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidPatchId(patchId: string): boolean {
  return PATCH_ID_PATTERN.test(patchId);
}

export function safeJoin(rootDir: string, relative: string): string | null {
  const target = path.normalize(path.join(rootDir, relative));
  const root = path.normalize(rootDir);
  if (!target.startsWith(root + path.sep) && target !== root) {
    return null;
  }
  return target;
}
