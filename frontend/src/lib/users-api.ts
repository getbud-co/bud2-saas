import { ApiError, apiRequest } from "@/lib/api-client";

export interface CreateUserParams {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  nickname?: string;
  job_title?: string;
  birth_date?: string;
  language?: string;
  gender?: string;
  phone?: string;
}

export interface UserApiResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  is_system_admin: boolean;
  nickname?: string;
  job_title?: string;
  birth_date?: string;
  language: string;
  gender?: string;
  phone?: string;
  role?: string;
  membership_status?: string;
  created_at: string;
  updated_at: string;
}

export interface ListUsersResponse {
  data: UserApiResponse[];
  total: number;
  page: number;
  size: number;
}

export interface UpdateUserParams {
  first_name: string;
  last_name: string;
  email: string;
  status: "active" | "inactive";
  nickname?: string;
  job_title?: string;
  birth_date?: string;
  language?: string;
  gender?: string;
  phone?: string;
}

export interface UpdateMembershipParams {
  role: string;
  status: "invited" | "active" | "inactive";
}

export async function createUser(
  params: CreateUserParams,
  token: string,
): Promise<UserApiResponse> {
  return apiRequest<UserApiResponse>("/users", {
    method: "POST",
    body: params,
    token,
  });
}

export async function listUsers(
  token: string,
  params?: { page?: number; size?: number; status?: string },
): Promise<ListUsersResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.size) query.set("size", String(params.size));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return apiRequest<ListUsersResponse>(`/users${qs ? `?${qs}` : ""}`, { token });
}

export async function updateUser(
  userId: string,
  params: UpdateUserParams,
  token: string,
): Promise<UserApiResponse> {
  return apiRequest<UserApiResponse>(`/users/${userId}`, {
    method: "PUT",
    body: params,
    token,
  });
}

export async function deleteUserMembership(
  userId: string,
  token: string,
): Promise<void> {
  await apiRequest<void>(`/users/${userId}`, { method: "DELETE", token });
}

export async function updateUserMembership(
  userId: string,
  params: UpdateMembershipParams,
  token: string,
): Promise<{ role: string; status: string }> {
  return apiRequest<{ role: string; status: string }>(`/users/${userId}/membership`, {
    method: "PUT",
    body: params,
    token,
  });
}

export function userErrorToMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return "Erro inesperado. Tente novamente.";
  if (err.status === 409) return "Este usuário já é membro desta organização.";
  if (err.status === 401) return "Sessão expirada. Faça login novamente.";
  if (err.status === 403) return "Sem permissão para convidar usuários.";
  if (err.status === 422) return `Dados inválidos: ${err.detail}`;
  return "Erro ao convidar usuário. Tente novamente.";
}
