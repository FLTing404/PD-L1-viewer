import fs from "node:fs/promises";
import type { CellRecord } from "@/types/case";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export async function loadCells(filePath: string): Promise<CellRecord[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const header = parseCsvLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);
  const iId = idx("cell_id");
  const iX = idx("x");
  const iY = idx("y");
  const iCenter = idx("center_prob");
  const iPos = idx("cell_pos_prob");
  const iPred = idx("cell_pred");

  const rows: CellRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    rows.push({
      cellId: Number(cells[iId]) || 0,
      x: Number(cells[iX]) || 0,
      y: Number(cells[iY]) || 0,
      centerProb: Number(cells[iCenter]) || 0,
      cellPosProb: Number(cells[iPos]) || 0,
      cellPred: cells[iPred] === "Positive" ? "Positive" : "Negative",
    });
  }
  return rows;
}
