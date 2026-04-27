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
const EMPTY: Mission[] = Object.freeze([] as Mission[]) as Mission[];

// Returns a flat list with every mission, ordered with each parent before
// its children. Each Mission carries `children` populated with its direct
// descendants — also flat-listed elsewhere in the array — and `depth` /
// `path` derived from the parent chain. Consumers that want only the
// roots filter by `parentId === null`; consumers that want the subtree
// of a single mission walk `children` (which is recursive).
//
// Why both flat and tree? The page filters/sorts/group on the flat list
// (team grouping, sort_order at the same level), and the tree view walks
// `children` directly. Returning both shapes from a single composition
// avoids duplicate state.
export function composeMissionTree(
  missions: ApiMission[] | undefined,
  indicators: KeyResult[] | undefined,
  tasks: MissionTask[] | undefined,
): Mission[] {
  if (!missions || missions.length === 0) return EMPTY;

  // Tasks split by parent: tasks attached to an indicator (keyResultId set)
  // are bucketed onto that indicator; the rest stay at the mission level.
  // Indicators always get a `tasks` array — empty if no children — so the
  // UI can iterate without null checks.
  const tasksByIndicator = groupBy(
    (tasks ?? []).filter((t) => t.keyResultId != null),
    (t) => t.keyResultId as string,
  );
  const indicatorsWithTasks = (indicators ?? []).map((kr) => ({
    ...kr,
    tasks: tasksByIndicator.get(kr.id) ?? [],
  }));
  const indByMission = groupBy(indicatorsWithTasks, (kr) => kr.missionId);
  const tasksByMission = groupBy(
    (tasks ?? []).filter((t) => t.keyResultId == null),
    (t) => t.missionId ?? "",
  );

  // Build raw nodes in input order so siblings keep API ordering (the API
  // already returns them sorted by sort_order, created_at).
  const byId = new Map<string, Mission>();
  const orderedIds: string[] = [];
  for (const api of missions) {
    const node = apiMissionToMission(
      api,
      indByMission.get(api.id) ?? [],
      tasksByMission.get(api.id) ?? [],
    );
    byId.set(api.id, node);
    orderedIds.push(api.id);
  }

  // Wire children + compute depth/path. A child's `children` field is
  // assigned to the same array reference held in the flat list, so
  // mutating one view updates the other (intended — the page reads from
  // the flat list during filter/sort and from `children` during render).
  for (const id of orderedIds) {
    const node = byId.get(id)!;
    if (node.parentId == null) continue;
    const parent = byId.get(node.parentId);
    if (!parent) {
      // Parent is in another org or has been deleted — promote the
      // orphan to a root rather than dropping it. Avoids data loss in
      // the UI when the API returns a partial subtree (rare).
      node.parentId = null;
      continue;
    }
    parent.children = parent.children ?? [];
    parent.children.push(node);
    node.depth = parent.depth + 1;
    node.path = [...parent.path, node.id];
  }

  return orderedIds.map((id) => byId.get(id)!);
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
