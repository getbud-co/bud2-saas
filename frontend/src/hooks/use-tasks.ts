// Tasks API hook. Mirrors use-indicators: server resource is "task", UI keeps
// its richer MissionTask type unchanged via internal adapters. Fields the API
// does not own (keyResultId, teamId, subtasks, contributesTo) keep their
// local-snapshot defaults.

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
  assigneeId: string;
  title: string;
  description?: string | null;
  isDone?: boolean;
  sortOrder?: number;
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
    keyResultId: null,
    title: api.title,
    description: api.description ?? null,
    ownerId: api.assignee_id,
    teamId: null,
    dueDate: api.due_date ?? null,
    isDone: api.status === "done",
    sortOrder: api.sort_order,
    completedAt: api.completed_at ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function missionTaskToCreateTaskBody(input: CreateTaskInput): CreateTaskBody {
  return {
    mission_id: input.missionId,
    assignee_id: input.assigneeId,
    title: input.title,
    description: input.description ?? undefined,
    status: input.isDone ? "done" : "todo",
    sort_order: input.sortOrder ?? 0,
    due_date: input.dueDate ?? undefined,
  };
}

export function missionTaskToPatchTaskBody(patch: UpdateTaskInput): PatchTaskBody {
  const body: PatchTaskBody = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.description !== undefined) body.description = patch.description ?? undefined;
  if (patch.assigneeId !== undefined) body.assignee_id = patch.assigneeId;
  if (patch.isDone !== undefined) body.status = patch.isDone ? "done" : "todo";
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;
  if (patch.dueDate !== undefined) body.due_date = patch.dueDate ?? undefined;
  return body;
}
