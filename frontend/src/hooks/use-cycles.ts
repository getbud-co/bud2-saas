import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { components } from "@/lib/types";

export type Cycle = components["schemas"]["Cycle"];
export type CycleStatus = Cycle["status"];
export type CycleType = Cycle["type"];

type CreateCycleBody = components["schemas"]["CreateCycleRequest"];
type UpdateCycleBody = components["schemas"]["UpdateCycleRequest"];

const PAGE_SIZE = 100;

export function useCycles(params?: { status?: CycleStatus }) {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();
  const query = useQuery({
    queryKey: ["cycles", orgId, params],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const { data, error } = await client.GET("/cycles", {
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

export function useCreateCycle() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCycleBody) => {
      const { data, error } = await client.POST("/cycles", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycles"] }),
  });
}

export function useUpdateCycle() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateCycleBody }) => {
      const { data, error } = await client.PUT("/cycles/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycles"] }),
  });
}

export function useDeleteCycle() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/cycles/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycles"] }),
  });
}
