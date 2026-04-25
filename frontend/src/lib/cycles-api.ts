import { ApiError, apiRequest } from "@/lib/api-client";
import type { Cycle, CycleStatus, CycleType } from "@/types";

export interface CycleApiResponse {
  id: string;
  org_id: string;
  name: string;
  type: CycleType;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  okr_definition_deadline: string | null;
  mid_review_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListCyclesResponse {
  data: CycleApiResponse[];
  total: number;
  page: number;
  size: number;
}

export interface CycleParams {
  name: string;
  type: CycleType;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  okr_definition_deadline?: string | null;
  mid_review_date?: string | null;
}

export function apiCycleToView(cycle: CycleApiResponse): Cycle {
  return {
    id: cycle.id,
    orgId: cycle.org_id,
    name: cycle.name,
    type: cycle.type,
    startDate: cycle.start_date,
    endDate: cycle.end_date,
    status: cycle.status,
    okrDefinitionDeadline: cycle.okr_definition_deadline,
    midReviewDate: cycle.mid_review_date,
    createdAt: cycle.created_at,
    updatedAt: cycle.updated_at,
  };
}

export async function listCycles(
  token: string,
  params?: { page?: number; size?: number; status?: CycleStatus },
): Promise<ListCyclesResponse> {
  const query = new URLSearchParams();
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.size != null) query.set("size", String(params.size));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return apiRequest<ListCyclesResponse>(`/cycles${qs ? `?${qs}` : ""}`, { token });
}

export async function createCycle(
  params: CycleParams,
  token: string,
): Promise<CycleApiResponse> {
  return apiRequest<CycleApiResponse>("/cycles", {
    method: "POST",
    body: params,
    token,
  });
}

export async function updateCycle(
  cycleId: string,
  params: CycleParams,
  token: string,
): Promise<CycleApiResponse> {
  return apiRequest<CycleApiResponse>(`/cycles/${cycleId}`, {
    method: "PUT",
    body: params,
    token,
  });
}

export async function deleteCycle(
  cycleId: string,
  token: string,
): Promise<void> {
  await apiRequest<void>(`/cycles/${cycleId}`, { method: "DELETE", token });
}

export function cycleErrorToMessage(err: unknown): string {
  if (err instanceof Error && err.message === "Sessão expirada. Faça login novamente.") {
    return err.message;
  }
  if (!(err instanceof ApiError)) return "Erro inesperado. Tente novamente.";
  if (err.status === 409) return "Conflito: já existe um ciclo com esse nome.";
  if (err.status === 401) return "Sessão expirada. Faça login novamente.";
  if (err.status === 403) return "Sem permissão para esta operação.";
  if (err.status === 422) return `Dados inválidos: ${err.detail}`;
  return "Erro inesperado. Tente novamente.";
}
