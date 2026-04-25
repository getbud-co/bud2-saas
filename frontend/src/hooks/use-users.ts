import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api-client";
import type { components } from "@/lib/types";

export type User = components["schemas"]["User"];
export type Membership = components["schemas"]["Membership"];

type CreateUserBody = components["schemas"]["CreateUserRequest"];
type UpdateUserBody = components["schemas"]["UpdateUserRequest"];
type UpdateMembershipBody = components["schemas"]["UpdateMembershipRequest"];

const PAGE_SIZE = 100;

export function useUsers(params?: { status?: "active" | "inactive" }) {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();
  const query = useQuery({
    queryKey: ["users", orgId, params],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const { data, error } = await client.GET("/users", {
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

export function useCreateUser() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const { data, error } = await client.POST("/users", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["teams"] }); },
  });
}

// TODO: Add PUT /users/{id} to openapi.yml and use openapi-fetch client instead of apiRequest
export function useUpdateUser() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateUserBody }) => {
      const token = getToken();
      if (!token) throw new Error("No auth token");
      return apiRequest<User>(`/users/${id}`, {
        method: "PUT",
        body,
        token,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["teams"] }); },
  });
}

// TODO: Add DELETE /users/{id} to openapi.yml and use openapi-fetch client instead of apiRequest
export function useDeleteUser() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = getToken();
      if (!token) throw new Error("No auth token");
      await apiRequest<void>(`/users/${id}`, { method: "DELETE", token });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["teams"] }); },
  });
}

export function useUpdateMembership() {
  const client = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateMembershipBody;
    }) => {
      const { data, error } = await client.PUT("/users/{id}/membership", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["teams"] }); },
  });
}
