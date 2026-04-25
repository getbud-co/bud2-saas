import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { components } from "@/lib/types";

export type Team = components["schemas"]["Team"];
export type TeamMember = components["schemas"]["TeamMember"];
export type TeamMemberInput = components["schemas"]["TeamMemberInput"];

type CreateTeamBody = components["schemas"]["CreateTeamRequest"];
type UpdateTeamBody = components["schemas"]["UpdateTeamRequest"];

const PAGE_SIZE = 100;

export function useTeams(params?: { status?: "active" | "archived" }) {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();
  const query = useQuery({
    queryKey: ["teams", orgId, params],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const { data, error } = await client.GET("/teams", {
        params: { query: { size: PAGE_SIZE, ...params } },
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

export function useCreateTeam() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTeamBody) => {
      const { data, error } = await client.POST("/teams", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teams"] }); qc.invalidateQueries({ queryKey: ["users"] }); },
  });
}

export function useUpdateTeam() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateTeamBody }) => {
      const { data, error } = await client.PUT("/teams/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teams"] }); qc.invalidateQueries({ queryKey: ["users"] }); },
  });
}

export function useDeleteTeam() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/teams/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teams"] }); qc.invalidateQueries({ queryKey: ["users"] }); },
  });
}
