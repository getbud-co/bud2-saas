import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { components, paths } from "@/lib/types";

export type ApiMission = components["schemas"]["Mission"];
export type ApiMissionStatus = ApiMission["status"];
export type ApiMissionVisibility = ApiMission["visibility"];

type CreateMissionBody = components["schemas"]["CreateMissionRequest"];
type PatchMissionBody = components["schemas"]["PatchMissionRequest"];
type ListQueryParams = NonNullable<
  paths["/missions"]["get"]["parameters"]["query"]
>;

const PAGE_SIZE = 100;

export interface UseMissionsParams {
  status?: ApiMissionStatus;
  parentId?: string | null;
  ownerId?: string;
  teamId?: string;
}

export function useMissions(params?: UseMissionsParams) {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();

  const query = useQuery({
    queryKey: ["missions", orgId, params],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const queryParams: ListQueryParams = { size: PAGE_SIZE };
      if (params?.status) queryParams.status = params.status;
      if (params?.ownerId) queryParams.owner_id = params.ownerId;
      if (params?.teamId) queryParams.team_id = params.teamId;
      if (params && "parentId" in params) {
        // Backend convention: literal "null" filters by roots only;
        // a UUID filters by that specific parent; absence = no filter.
        queryParams.parent_id = params.parentId ?? "null";
      }

      const { data, error } = await client.GET("/missions", {
        params: { query: queryParams },
      });
      if (error) throw error;
      return data;
    },
  });

  const items = query.data?.data ?? [];
  const total = query.data?.total ?? items.length;

  return {
    ...query,
    data: items,
    total,
    page: query.data?.page ?? 1,
    size: query.data?.size ?? PAGE_SIZE,
    isTruncated: total > items.length,
  };
}

export function useCreateMission() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async (body: CreateMissionBody) => {
      const { data, error } = await client.POST("/missions", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
      qc.invalidateQueries({ queryKey: ["indicators", orgId] });
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
    },
  });
}

export function useUpdateMission() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: PatchMissionBody }) => {
      const { data, error } = await client.PATCH("/missions/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
      qc.invalidateQueries({ queryKey: ["indicators", orgId] });
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
    },
  });
}

export function useDeleteMission() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/missions/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
      qc.invalidateQueries({ queryKey: ["indicators", orgId] });
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
    },
  });
}

export function useGetMission(id: string | undefined) {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();
  return useQuery({
    queryKey: ["missions", orgId, "detail", id],
    enabled: isAuthenticated && !!orgId && !!token && !!id,
    queryFn: async () => {
      const { data, error } = await client.GET("/missions/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export interface SetMissionMembersInput {
  missionId: string;
  members: { userId: string; role?: "owner" | "supporter" | "observer" }[];
}

export function useSetMissionMembers() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async ({ missionId, members }: SetMissionMembersInput) => {
      const { data, error } = await client.PUT("/missions/{id}/members", {
        params: { path: { id: missionId } },
        body: {
          members: members.map((m) => ({ user_id: m.userId, role: m.role })),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { missionId }) => {
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
      qc.invalidateQueries({ queryKey: ["missions", orgId, "detail", missionId] });
    },
  });
}
