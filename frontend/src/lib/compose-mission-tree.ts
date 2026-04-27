// Pure composer that joins the three independent API queries (missions,
// indicators, tasks) into the Mission[] shape the UI consumes. Lives outside
// MissionsDataContext so it can be unit-tested without React.
//
// Each indicator/task is appended to its parent mission via mission_id. UI-
// only fields the API does not own (depth, path, progress, owner/team join
// blobs, members, tags, links) keep the safe defaults documented in the
// adapters; the components already tolerate these defaults.

import type { components } from "@/lib/types";
import type { Mission, KeyResult, MissionTask } from "@/types";
import { apiIndicatorToKeyResult, type ApiIndicator } from "@/hooks/use-indicators";
import { apiTaskToMissionTask, type ApiTask } from "@/hooks/use-tasks";

type ApiMission = components["schemas"]["Mission"];

// Stable reference returned when there is nothing to compose. Lets callers
// rely on Object.is identity for memoization (e.g., useBriefingReadModel
// depends on missions identity to skip recomputation).
const EMPTY: Mission[] = Object.freeze([]) as Mission[];

export function composeMissionTree(
  missions: ApiMission[] | undefined,
  indicators: KeyResult[] | undefined,
  tasks: MissionTask[] | undefined,
): Mission[] {
  if (!missions || missions.length === 0) return EMPTY;
  const indByMission = groupBy(indicators ?? [], (kr) => kr.missionId);
  const tasksByMission = groupBy(tasks ?? [], (t) => t.missionId ?? "");
  return missions.map((api) => apiMissionToMission(api, indByMission.get(api.id) ?? [], tasksByMission.get(api.id) ?? []));
}

// Same composer but accepting raw API payloads for indicators/tasks. Useful
// when the consumer fetched them through a non-adapted client (tests).
export function composeMissionTreeFromApi(
  missions: ApiMission[] | undefined,
  indicators: ApiIndicator[] | undefined,
  tasks: ApiTask[] | undefined,
): Mission[] {
  return composeMissionTree(
    missions,
    (indicators ?? []).map(apiIndicatorToKeyResult),
    (tasks ?? []).map(apiTaskToMissionTask),
  );
}

function apiMissionToMission(api: ApiMission, keyResults: KeyResult[], tasks: MissionTask[]): Mission {
  return {
    id: api.id,
    orgId: api.org_id,
    cycleId: api.cycle_id ?? null,
    parentId: api.parent_id ?? null,
    depth: 0,
    path: [api.id],
    title: api.title,
    description: api.description ?? null,
    ownerId: api.owner_id,
    teamId: api.team_id ?? null,
    status: api.status,
    visibility: api.visibility,
    progress: 0,
    kanbanStatus: api.kanban_status,
    sortOrder: api.sort_order,
    dueDate: api.due_date ?? null,
    completedAt: api.completed_at ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    deletedAt: null,
    keyResults,
    tasks,
    children: [],
    tags: [],
  };
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}
