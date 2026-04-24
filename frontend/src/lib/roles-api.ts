import { ApiError, apiRequest } from "@/lib/api-client";
import type { components } from "@/lib/types";

export type RoleApiResponse = components["schemas"]["Role"];
export type PermissionApiResponse = components["schemas"]["Permission"];
export type ListRolesResponse = components["schemas"]["RoleListResponse"];
export type ListPermissionsResponse = components["schemas"]["PermissionListResponse"];

export async function listRoles(token: string): Promise<ListRolesResponse> {
  return apiRequest<ListRolesResponse>("/roles", { token });
}

export async function listPermissions(token: string): Promise<ListPermissionsResponse> {
  return apiRequest<ListPermissionsResponse>("/permissions", { token });
}

export function roleErrorToMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return "Erro inesperado. Tente novamente.";
  if (err.status === 401) return "Sessão expirada. Faça login novamente.";
  if (err.status === 403) return "Sem permissão para esta operação.";
  return "Erro inesperado. Tente novamente.";
}
