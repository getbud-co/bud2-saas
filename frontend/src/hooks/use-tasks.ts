// Tasks API hook. Mirrors use-indicators: server resource is "task", UI keeps
// its richer MissionTask type unchanged via internal adapters.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { components } from "@/lib/types";
import type { MissionTask } from "@/types";

export type ApiTask = components["schemas"]["Task"];
type CreateTaskBody = components["schemas"]["CreateTaskRequest"];
type PatchTaskBody = components["schemas"]["PatchTaskRequest"];

const PAGE_SIZE = 100;

export interface UseTasksParams {
  missionId?: string;
  assigneeId?: string;
}

export function useTasks(params?: UseTasksParams) {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();

  const query = useQuery({
    queryKey: ["tasks", orgId, params],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const queryParams: Record<string, string | number> = { size: PAGE_SIZE };
      if (params?.missionId) queryParams.mission_id = params.missionId;
      if (params?.assigneeId) queryParams.assignee_id = params.assigneeId;
      const { data, error } = await client.GET("/tasks", {
        params: { query: queryParams as never },
      });
      if (error) throw error;
      // Truncation guard, same rationale as use-indicators: until proper
      // pagination lands, warn the developer when a single fetch cannot
      // carry the full set.
      if (data && data.total > (data.data?.length ?? 0)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[useTasks] truncated: ${data.data?.length ?? 0} of ${data.total} tasks returned. Pagination is not implemented yet.`,
        );
      }
      return data;
    },
    select: (data) => (data?.data ?? []).map(apiTaskToMissionTask),
  });

  const items = query.data ?? [];
  return {
    ...query,
    data: items,
  };
}

export function useCreateTask() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const body = missionTaskToCreateTaskBody(input);
      const { data, error } = await client.POST("/tasks", { body });
      if (error) throw error;
      return apiTaskToMissionTask(data!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
    },
  });
}

export function useUpdateTask() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateTaskInput }) => {
      const body = missionTaskToPatchTaskBody(patch);
      const { data, error } = await client.PATCH("/tasks/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return apiTaskToMissionTask(data!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
    },
  });
}

export function useDeleteTask() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/tasks/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
    },
  });
}

// ── Adapters ───────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  missionId: string;
  // indicatorId is optional: when set, the task is nested under that
  // indicator (UI shows it inside the indicator block) and the backend
  // verifies the indicator belongs to the same mission.
  indicatorId?: string | null;
  parentTaskId?: string | null;
  teamId?: string | null;
  contributesToMissionIds?: string[];
  assigneeId: string;
  title: string;
  description?: string | null;
  isDone?: boolean;
  status?: "todo" | "in_progress" | "done" | "cancelled";
  dueDate?: string | null;
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, "missionId">>;

// API task status has four states (todo|in_progress|done|cancelled) but the
// UI only distinguishes done vs not-done via MissionTask.isDone. The
// adapter is intentionally lossy on the way in: any non-done status
// (including in_progress and cancelled) becomes isDone=false. The diff
// helper then emits a status PATCH only when isDone actually flips, so
// in_progress/cancelled are preserved across edits that do not toggle the
// done flag — a flip from true→false defaults to "todo" via the create
// adapter, which is the safest interpretation given the UI cannot express
// the intermediate state.
export function apiTaskToMissionTask(api: ApiTask): MissionTask {
  return {
    id: api.id,
    missionId: api.mission_id,
    // The API now carries indicator_id (nullable). When set, the task is
    // visually nested under that indicator; when null, it lives at the
    // mission level. The UI's existing keyResultId field maps 1:1.
    keyResultId: api.indicator_id ?? null,
    title: api.title,
    description: api.description ?? null,
    ownerId: api.assignee_id,
    teamId: api.team_id ?? null,
    dueDate: api.due_date ?? null,
    isDone: api.status === "done",
    status: api.status,
    completedAt: api.completed_at ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    contributesTo: (api.contributes_to_mission_ids ?? []).map((id) => ({
      missionId: id,
      missionTitle: "",
    })),
  };
}

export function missionTaskToCreateTaskBody(input: CreateTaskInput): CreateTaskBody {
  return {
    mission_id: input.missionId,
    indicator_id: input.indicatorId ?? undefined,
    parent_task_id: input.parentTaskId ?? undefined,
    team_id: input.teamId ?? undefined,
    contributes_to_mission_ids: input.contributesToMissionIds,
    assignee_id: input.assigneeId,
    title: input.title,
    description: input.description ?? undefined,
    status: input.status ?? (input.isDone ? "done" : "todo"),
    due_date: input.dueDate ?? undefined,
  };
}

export function missionTaskToPatchTaskBody(patch: UpdateTaskInput): PatchTaskBody {
  const body: PatchTaskBody = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.description !== undefined) body.description = patch.description ?? undefined;
  if (patch.indicatorId !== undefined && patch.indicatorId !== null) body.indicator_id = patch.indicatorId;
  if (patch.assigneeId !== undefined) body.assignee_id = patch.assigneeId;
  if (patch.teamId !== undefined) body.team_id = patch.teamId ?? undefined;
  if (patch.contributesToMissionIds !== undefined) body.contributes_to_mission_ids = patch.contributesToMissionIds;
  if (patch.status !== undefined) {
    body.status = patch.status;
  } else if (patch.isDone !== undefined) {
    body.status = patch.isDone ? "done" : "todo";
  }
  if (patch.dueDate !== undefined) body.due_date = patch.dueDate ?? undefined;
  return body;
}
