import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { components } from "@/lib/types";

export type Tag = components["schemas"]["Tag"];
export type TagColor = Tag["color"];

type CreateTagBody = components["schemas"]["CreateTagRequest"];
type UpdateTagBody = components["schemas"]["UpdateTagRequest"];

const PAGE_SIZE = 100;

export function useTags() {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();
  const query = useQuery({
    queryKey: ["tags", orgId],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const { data, error } = await client.GET("/tags", {
        params: { query: { size: PAGE_SIZE } },
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

export function useCreateTag() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async (body: CreateTagBody) => {
      const { data, error } = await client.POST("/tags", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags", orgId] }),
  });
}

export function useUpdateTag() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateTagBody }) => {
      const { data, error } = await client.PUT("/tags/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags", orgId] }),
  });
}

export function useDeleteTag() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/tags/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags", orgId] }),
  });
}
