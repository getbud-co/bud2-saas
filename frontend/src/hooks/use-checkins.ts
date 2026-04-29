import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { components } from "@/lib/types";
import type { CheckIn } from "@/types";

type ApiCheckIn = components["schemas"]["CheckIn"];
type CreateCheckInBody = components["schemas"]["CreateCheckInRequest"];
type PatchCheckInBody = components["schemas"]["PatchCheckInRequest"];

export interface UseCheckInsParams {
  indicatorId: string | undefined;
}

function apiToCheckIn(api: ApiCheckIn): CheckIn {
  const firstInitial = api.author?.first_name?.[0] ?? "";
  const lastInitial = api.author?.last_name?.[0] ?? "";
  const initials = firstInitial || lastInitial ? `${firstInitial}${lastInitial}`.toUpperCase() : null;

  return {
    id: api.id,
    keyResultId: api.indicator_id,
    authorId: api.author_id,
    value: api.value,
    previousValue: api.previous_value ?? null,
    confidence: api.confidence as CheckIn["confidence"],
    note: api.note ?? null,
    mentions: api.mentions ?? null,
    createdAt: api.created_at,
    author: api.author
      ? {
          id: api.author.id ?? api.author_id,
          firstName: api.author.first_name ?? "",
          lastName: api.author.last_name ?? "",
          initials,
        }
      : undefined,
  };
}

export function useCheckIns(params: UseCheckInsParams) {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();

  return useQuery({
    queryKey: ["checkins", orgId, params.indicatorId],
    enabled: isAuthenticated && !!orgId && !!token && !!params.indicatorId,
    queryFn: async () => {
      const { data, error } = await client.GET("/checkins", {
        params: { query: { indicator_id: params.indicatorId!, size: 100 } },
      });
      if (error) throw error;
      return (data?.data ?? []).map(apiToCheckIn);
    },
  });
}

export interface CreateCheckInInput {
  indicatorId: string;
  authorId: string;
  value: string;
  previousValue?: string | null;
  confidence: CheckIn["confidence"];
  note?: string | null;
  mentions?: string[] | null;
}

export function useCreateCheckIn() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  return useMutation({
    mutationFn: async (input: CreateCheckInInput) => {
      const body: CreateCheckInBody = {
        indicator_id: input.indicatorId,
        author_id: input.authorId,
        value: input.value,
        confidence: input.confidence ?? "medium",
        previous_value: input.previousValue ?? null,
        note: input.note ?? null,
        mentions: input.mentions ?? [],
      };
      const { data, error } = await client.POST("/checkins", { body });
      if (error) throw error;
      return data ? apiToCheckIn(data) : null;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["checkins", orgId, input.indicatorId] });
    },
  });
}

export interface UpdateCheckInInput {
  id: string;
  indicatorId: string;
  value: string;
  confidence: CheckIn["confidence"];
  note?: string | null;
  mentions?: string[] | null;
}

export function useUpdateCheckIn() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  return useMutation({
    mutationFn: async (input: UpdateCheckInInput) => {
      const body: PatchCheckInBody = {
        value: input.value,
        confidence: input.confidence ?? "medium",
        note: input.note ?? null,
        mentions: input.mentions ?? [],
      };
      const { data, error } = await client.PATCH("/checkins/{id}", {
        params: { path: { id: input.id } },
        body,
      });
      if (error) throw error;
      return data ? apiToCheckIn(data) : null;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["checkins", orgId, input.indicatorId] });
    },
  });
}

export function useDeleteCheckIn() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  return useMutation({
    mutationFn: async ({ id }: { id: string; indicatorId: string }) => {
      const { error } = await client.DELETE("/checkins/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: (_data, { indicatorId }) => {
      qc.invalidateQueries({ queryKey: ["checkins", orgId, indicatorId] });
    },
  });
}
