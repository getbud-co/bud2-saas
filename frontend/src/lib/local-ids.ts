// Single source of truth for the prefixes the page uses to mint client-side
// IDs while a draft mission/indicator/task has not been persisted yet. The
// diff helpers and the page submit logic both depend on this convention to
// decide whether a given ID belongs to the server (target of PATCH/DELETE)
// or to the local draft state (target of POST). Drift between the two sides
// previously allowed `t-`-prefixed subtask IDs to be sent in DELETE calls;
// keeping the prefix lists here prevents that recurring.

const MISSION_PREFIXES = ["draft-", "mission-"] as const;
const INDICATOR_PREFIXES = ["draft-", "kr-", "indicator-"] as const;
const TASK_PREFIXES = ["draft-", "task-", "t-"] as const;

function startsWithAny(id: string, prefixes: readonly string[]): boolean {
  for (const p of prefixes) {
    if (id.startsWith(p)) return true;
  }
  return false;
}

export function isLocalMissionId(id: string): boolean {
  return startsWithAny(id, MISSION_PREFIXES);
}

export function isLocalIndicatorId(id: string): boolean {
  return startsWithAny(id, INDICATOR_PREFIXES);
}

export function isLocalTaskId(id: string): boolean {
  return startsWithAny(id, TASK_PREFIXES);
}
