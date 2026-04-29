// Pure helper that compares the form state of a mission edit against the
// currently-persisted mission and returns the discrete API operations needed
// to bring the server up to date.
//
// The page submit handler then dispatches each op via the corresponding
// mutation hook (useUpdateMission, useCreate/Update/DeleteIndicator,
// useCreate/Update/DeleteTask). Operations are independent — failures are
// surfaced per op and the next refetch reconciles whatever did persist.
//
// Scope of comparison
//   - mission row: every field the API knows about (delegates to the
//     PatchMissionRequest schema). UI-only fields (progress, depth, path,
//     join blobs) are ignored.
//   - indicators: matched by id. New = no id or id missing in current.
//     Updated = id exists in both AND a tracked field differs.
//     Deleted = id exists in current but not in form state.
//   - tasks: same matching rules, comparing the API-tracked subset of
//     MissionTask.

import type { components } from "@/lib/types";
import type { Mission, KeyResult, MissionTask } from "@/types";
import type { CreateIndicatorInput, UpdateIndicatorInput } from "@/hooks/use-indicators";
import type { CreateTaskInput, UpdateTaskInput } from "@/hooks/use-tasks";
import { isLocalIndicatorId, isLocalTaskId } from "@/lib/local-ids";

type PatchMissionBody = components["schemas"]["PatchMissionRequest"];

export interface MissionDiff {
  /** null when nothing on the mission row changed. */
  missionPatch: PatchMissionBody | null;
  indicatorOps: {
    create: CreateIndicatorInput[];
    update: { id: string; patch: UpdateIndicatorInput }[];
    delete: string[];
  };
  taskOps: {
    create: CreateTaskInput[];
    update: { id: string; patch: UpdateTaskInput }[];
    delete: string[];
  };
}

export function diffMission(current: Mission, form: Mission): MissionDiff {
  return {
    missionPatch: diffMissionRow(current, form),
    indicatorOps: diffIndicators(form.id, current.keyResults ?? [], form.keyResults ?? []),
    // Tasks live both directly under the mission (m.tasks) and nested
    // under each indicator (kr.tasks with keyResultId set). The diff
    // flattens both shapes to a single list per side so creates,
    // updates, and deletes are computed across the whole task surface.
    taskOps: diffTasks(form.id, flattenTasks(current), flattenTasks(form)),
  };
}

function flattenTasks(m: Mission): MissionTask[] {
  const out: MissionTask[] = [...(m.tasks ?? [])];
  for (const kr of m.keyResults ?? []) {
    for (const t of kr.tasks ?? []) {
      out.push({ ...t, keyResultId: kr.id });
    }
  }
  return out;
}

// ── mission row ────────────────────────────────────────────────────────────

function diffMissionRow(current: Mission, form: Mission): PatchMissionBody | null {
  // KNOWN LIMITATION: nullable fields (description, teamId) cannot be
  // cleared via PATCH today. The backend's PatchMissionRequest uses single
  // Go pointers, so the application layer cannot distinguish "field absent"
  // from "field explicitly null". We mirror that here by only emitting the
  // field when the new value is non-null; clearing is a no-op until the
  // backend grows support for it (see the note on PatchMissionRequest in
  // openapi.yml).
  const patch: PatchMissionBody = {};
  if (current.title !== form.title) patch.title = form.title;
  if ((current.description ?? null) !== (form.description ?? null)) {
    if (form.description != null) patch.description = form.description;
  }
  if (current.ownerId !== form.ownerId) patch.owner_id = form.ownerId;
  if ((current.teamId ?? null) !== (form.teamId ?? null)) {
    if (form.teamId != null) patch.team_id = form.teamId;
  }
  if (current.status !== form.status) patch.status = form.status;
  if (current.visibility !== form.visibility) patch.visibility = form.visibility;
  if (current.startDate !== form.startDate) patch.start_date = form.startDate;
  if (current.endDate !== form.endDate) patch.end_date = form.endDate;
  const currentTagIds = [...(current.tagIds ?? [])].sort();
  const formTagIds = [...(form.tagIds ?? [])].sort();
  if (currentTagIds.join(",") !== formTagIds.join(",")) patch.tag_ids = form.tagIds ?? [];
  return Object.keys(patch).length === 0 ? null : patch;
}

// ── indicators ─────────────────────────────────────────────────────────────

function diffIndicators(
  missionId: string,
  current: KeyResult[],
  form: KeyResult[],
): MissionDiff["indicatorOps"] {
  const currentById = new Map(current.map((kr) => [kr.id, kr]));
  const formIds = new Set<string>();

  const create: CreateIndicatorInput[] = [];
  const update: { id: string; patch: UpdateIndicatorInput }[] = [];

  for (const kr of form) {
    if (!isPersistedIndicatorId(kr.id) || !currentById.has(kr.id)) {
      create.push(keyResultToCreateInput(missionId, kr));
      continue;
    }
    formIds.add(kr.id);
    const existing = currentById.get(kr.id)!;
    const patch = indicatorPatch(existing, kr);
    if (patch) update.push({ id: kr.id, patch });
  }

  const del: string[] = [];
  for (const kr of current) {
    if (!formIds.has(kr.id) && isPersistedIndicatorId(kr.id)) del.push(kr.id);
  }
  return { create, update, delete: del };
}

function indicatorPatch(current: KeyResult, form: KeyResult): UpdateIndicatorInput | null {
  const patch: UpdateIndicatorInput = {};
  if (current.title !== form.title) patch.title = form.title;
  if ((current.description ?? null) !== (form.description ?? null)) patch.description = form.description ?? null;
  if (current.ownerId !== form.ownerId) patch.ownerId = form.ownerId;
  if ((current.targetValue ?? null) !== (form.targetValue ?? null)) patch.targetValue = form.targetValue ?? null;
  if (current.currentValue !== form.currentValue) patch.currentValue = form.currentValue;
  if ((current.unitLabel ?? null) !== (form.unitLabel ?? null)) patch.unitLabel = form.unitLabel ?? null;
  if (current.status !== form.status) patch.status = form.status;
  // KeyResult does not currently expose dueDate at the row level, only via
  // periodEnd. Skip dueDate here until the form surfaces it.
  return Object.keys(patch).length === 0 ? null : patch;
}

function keyResultToCreateInput(missionId: string, kr: KeyResult): CreateIndicatorInput {
  return {
    missionId,
    ownerId: kr.ownerId,
    title: kr.title,
    description: kr.description,
    targetValue: kr.targetValue,
    currentValue: kr.currentValue,
    unitLabel: kr.unitLabel,
    status: kr.status,
  };
}

// ── tasks ──────────────────────────────────────────────────────────────────

function diffTasks(
  missionId: string,
  current: MissionTask[],
  form: MissionTask[],
): MissionDiff["taskOps"] {
  const currentById = new Map(current.map((t) => [t.id, t]));
  const formIds = new Set<string>();

  const create: CreateTaskInput[] = [];
  const update: { id: string; patch: UpdateTaskInput }[] = [];

  for (const t of form) {
    if (!isPersistedTaskId(t.id) || !currentById.has(t.id)) {
      create.push(missionTaskToCreateInput(missionId, t));
      continue;
    }
    formIds.add(t.id);
    const existing = currentById.get(t.id)!;
    const patch = taskPatch(existing, t);
    if (patch) update.push({ id: t.id, patch });
  }

  const del: string[] = [];
  for (const t of current) {
    if (!formIds.has(t.id) && isPersistedTaskId(t.id)) del.push(t.id);
  }
  return { create, update, delete: del };
}

function taskPatch(current: MissionTask, form: MissionTask): UpdateTaskInput | null {
  const patch: UpdateTaskInput = {};
  if (current.title !== form.title) patch.title = form.title;
  if ((current.description ?? null) !== (form.description ?? null)) patch.description = form.description ?? null;
  if ((current.ownerId ?? null) !== (form.ownerId ?? null)) {
    if (form.ownerId != null) patch.assigneeId = form.ownerId;
  }
  if ((current.keyResultId ?? null) !== (form.keyResultId ?? null)) {
    if (form.keyResultId != null) patch.indicatorId = form.keyResultId;
    // (clearing indicator_id back to mission-level needs the future
    // null-vs-absent distinction in PATCH; deferred.)
  }
  if (current.isDone !== form.isDone) patch.isDone = form.isDone;
  if ((current.dueDate ?? null) !== (form.dueDate ?? null)) patch.dueDate = form.dueDate ?? null;
  return Object.keys(patch).length === 0 ? null : patch;
}

function missionTaskToCreateInput(missionId: string, t: MissionTask): CreateTaskInput {
  return {
    missionId,
    indicatorId: t.keyResultId ?? null,
    assigneeId: t.ownerId ?? "",
    title: t.title,
    description: t.description,
    isDone: t.isDone,
    dueDate: t.dueDate,
  };
}

// ── id heuristics ──────────────────────────────────────────────────────────

// Persisted = "lives on the server" = target of PATCH/DELETE. Anything that
// matches a local-draft prefix (defined in lib/local-ids) is the target of
// POST instead. The prefix lists live in a single module so the form code,
// the diff logic, and the submit logic cannot drift apart.
function isPersistedIndicatorId(id: string): boolean {
  return !isLocalIndicatorId(id);
}

function isPersistedTaskId(id: string): boolean {
  return !isLocalTaskId(id);
}
