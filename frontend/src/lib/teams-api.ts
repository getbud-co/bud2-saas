import { ApiError, apiRequest } from "@/lib/api-client";

// ── API shapes (snake_case mirrors backend JSON) ──────────────────────────────

export interface TeamMemberUserApiResponse {
  id: string;
  first_name: string;
  last_name: string;
  initials: string | null;
  job_title: string | null;
  avatar_url: string | null;
}

export interface TeamMemberApiResponse {
  team_id: string;
  user_id: string;
  role_in_team: "leader" | "member" | "observer";
  joined_at: string;
  user?: TeamMemberUserApiResponse;
}

export interface TeamApiResponse {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string;
  status: "active" | "archived";
  members: TeamMemberApiResponse[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListTeamsResponse {
  data: TeamApiResponse[];
  total: number;
  page: number;
  size: number;
}

export interface TeamMemberInput {
  user_id: string;
  role_in_team: "leader" | "member" | "observer";
}

export interface CreateTeamParams {
  name: string;
  description?: string | null;
  color: string;
  members: TeamMemberInput[];
}

export interface UpdateTeamParams {
  name: string;
  description?: string | null;
  color: string;
  status: "active" | "archived";
  members: TeamMemberInput[];
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function listTeams(
  token: string,
  params?: { page?: number; size?: number; status?: string },
): Promise<ListTeamsResponse> {
  const query = new URLSearchParams();
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.size != null) query.set("size", String(params.size));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return apiRequest<ListTeamsResponse>(`/teams${qs ? `?${qs}` : ""}`, { token });
}

export async function createTeam(
  params: CreateTeamParams,
  token: string,
): Promise<TeamApiResponse> {
  return apiRequest<TeamApiResponse>("/teams", {
    method: "POST",
    body: params,
    token,
  });
}

export async function updateTeam(
  teamId: string,
  params: UpdateTeamParams,
  token: string,
): Promise<TeamApiResponse> {
  return apiRequest<TeamApiResponse>(`/teams/${teamId}`, {
    method: "PUT",
    body: params,
    token,
  });
}

export async function deleteTeam(
  teamId: string,
  token: string,
): Promise<void> {
  await apiRequest<void>(`/teams/${teamId}`, { method: "DELETE", token });
}

export function teamErrorToMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return "Erro inesperado. Tente novamente.";
  if (err.status === 409) return "Conflito: já existe um time com esse nome.";
  if (err.status === 401) return "Sessão expirada. Faça login novamente.";
  if (err.status === 403) return "Sem permissão para esta operação.";
  if (err.status === 422) return `Dados inválidos: ${err.detail}`;
  return "Erro inesperado. Tente novamente.";
}
