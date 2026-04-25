import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { components } from "@/lib/types";

export type Role = components["schemas"]["Role"];
export type Permission = components["schemas"]["Permission"];

export function useRoles() {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();
  return useQuery({
    queryKey: ["roles", orgId],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const { data, error } = await client.GET("/roles");
      if (error) throw error;
      return data.data;
    },
  });
}

export function usePermissions() {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();
  return useQuery({
    queryKey: ["permissions", orgId],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const { data, error } = await client.GET("/permissions");
      if (error) throw error;
      return data.data;
    },
  });
}
