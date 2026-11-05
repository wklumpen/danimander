import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { PlanState } from "./types";

type Payload = { role: string; diff: [number, number][]; powersUsed: string[]; nDistricts: number };

/** `#b=<boardId>&t=<taskId>&p=<payload>` with an lz-string payload of the diff vs start. */
export function encodePlan(plan: PlanState, start: number[]): string {
  const diff: [number, number][] = [];
  plan.assignment.forEach((d, i) => d !== start[i] && diff.push([i, d]));
  const payload: Payload = { role: plan.role, diff, powersUsed: plan.powersUsed, nDistricts: plan.nDistricts };
  return `#b=${encodeURIComponent(plan.boardId)}&t=${encodeURIComponent(plan.taskId)}&p=${compressToEncodedURIComponent(
    JSON.stringify(payload),
  )}`;
}

/** Inverse of encodePlan. Returns null for anything malformed (never throws on bad links). */
export function decodePlan(hash: string, startFor: (boardId: string) => number[] | undefined): PlanState | null {
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const boardId = params.get("b");
    const taskId = params.get("t");
    const raw = params.get("p");
    if (!boardId || !taskId || !raw) return null;
    const start = startFor(boardId);
    if (!start) return null;
    const json = decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const p = JSON.parse(json) as Payload;
    if (!Number.isInteger(p.nDistricts) || p.nDistricts < 1 || !Array.isArray(p.diff)) return null;
    const assignment = [...start];
    for (const [i, d] of p.diff) {
      if (!Number.isInteger(i) || i < 0 || i >= start.length) return null;
      if (!Number.isInteger(d) || d < 0 || d >= p.nDistricts) return null;
      assignment[i] = d;
    }
    return {
      boardId,
      taskId,
      role: String(p.role),
      assignment,
      powersUsed: Array.isArray(p.powersUsed) ? p.powersUsed.map(String) : [],
      nDistricts: p.nDistricts,
    };
  } catch {
    return null;
  }
}
