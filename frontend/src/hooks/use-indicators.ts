// Indicators API hook. The backend resource is called "indicator"; the UI
// consumes its richer KeyResult type unchanged. The adapter below keeps that
// translation contained so no component file needs to change.
//
// Fields that exist only on the UI side (measurementMode, goalType, progress,
// linked* etc.) get safe defaults when coming from the API — the server does
// not own them yet. When the user edits those fields the local snapshot still
// holds the truth; only fields the API understands round-trip.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./use-api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { components } from "@/lib/types";
import type { KeyResult, KRUnit, KRStatus } from "@/types";

export type ApiIndicator = components["schemas"]["Indicator"];
type CreateIndicatorBody = components["schemas"]["CreateIndicatorRequest"];
type PatchIndicatorBody = components["schemas"]["PatchIndicatorRequest"];

const PAGE_SIZE = 100;

export interface UseIndicatorsParams {
  missionId?: string;
  ownerId?: string;
}

export function useIndicators(params?: UseIndicatorsParams) {
  const client = useApiClient();
  const { isAuthenticated, activeOrganization, getToken } = useAuth();
  const orgId = activeOrganization?.id;
  const token = getToken();

  const query = useQuery({
    queryKey: ["indicators", orgId, params],
    enabled: isAuthenticated && !!orgId && !!token,
    queryFn: async () => {
      const queryParams: Record<string, string | number> = { size: PAGE_SIZE };
      if (params?.missionId) queryParams.mission_id = params.missionId;
      if (params?.ownerId) queryParams.owner_id = params.ownerId;
      const { data, error } = await client.GET("/indicators", {
        params: { query: queryParams as never },
      });
      if (error) throw error;
      // Truncation guard: until proper pagination lands, surface a console
      // warning when the backend reports more rows than this single page
      // can carry. The composer will silently produce incomplete trees
      // otherwise.
      if (data && data.total > (data.data?.length ?? 0)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[useIndicators] truncated: ${data.data?.length ?? 0} of ${data.total} indicators returned. Pagination is not implemented yet.`,
        );
      }
      return data;
    },
    select: (data) => (data?.data ?? []).map(apiIndicatorToKeyResult),
  });

  const items = query.data ?? [];
  return {
    ...query,
    data: items,
  };
}

export function useCreateIndicator() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async (input: CreateIndicatorInput) => {
      const body = keyResultToCreateIndicatorBody(input);
      const { data, error } = await client.POST("/indicators", { body });
      if (error) throw error;
      return apiIndicatorToKeyResult(data!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicators", orgId] });
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
    },
  });
}

export function useUpdateIndicator() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateIndicatorInput }) => {
      const body = keyResultToPatchIndicatorBody(patch);
      const { data, error } = await client.PATCH("/indicators/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw error;
      return apiIndicatorToKeyResult(data!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicators", orgId] });
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
    },
  });
}

export function useDeleteIndicator() {
  const client = useApiClient();
  const qc = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/indicators/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicators", orgId] });
      qc.invalidateQueries({ queryKey: ["missions", orgId] });
    },
  });
}

// ── Adapters ───────────────────────────────────────────────────────────────

/**
 * Required fields when creating an indicator. Mirrors the UI's `KeyResult`
 * shape but with only the fields the API understands.
 */
export interface CreateIndicatorInput {
  missionId: string;
  ownerId: string;
  title: string;
  description?: string | null;
  targetValue?: string | null;
  currentValue?: string | null;
  unitLabel?: string | null;
  status?: KRStatus;
  sortOrder?: number;
  dueDate?: string | null;
}

export type UpdateIndicatorInput = Partial<Omit<CreateIndicatorInput, "missionId">>;

/**
 * apiIndicatorToKeyResult fills the UI's KeyResult with safe defaults for
 * fields the API does not own (measurementMode, goalType, progress, etc).
 * The local snapshot is the source of truth for those; this conversion is
 * called only when the UI consumes a freshly-fetched indicator that does not
 * yet have a local counterpart.
 */
export function apiIndicatorToKeyResult(api: ApiIndicator): KeyResult {
  return {
    id: api.id,
    orgId: api.org_id,
    missionId: api.mission_id,
    parentKrId: null,
    title: api.title,
    description: api.description ?? null,
    ownerId: api.owner_id,
    teamId: null,
    measurementMode: "manual",
    goalType: "reach",
    targetValue: api.target_value != null ? String(api.target_value) : null,
    currentValue: api.current_value != null ? String(api.current_value) : "0",
    startValue: "0",
    lowThreshold: null,
    highThreshold: null,
    unit: inferUnit(api.unit),
    unitLabel: api.unit ?? null,
    expectedValue: null,
    status: apiStatusToKRStatus(api.status),
    progress: 0,
    periodLabel: null,
    periodStart: null,
    periodEnd: null,
    sortOrder: api.sort_order,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    deletedAt: null,
    linkedMissionId: null,
    linkedSurveyId: null,
    externalSource: null,
    externalConfig: null,
  };
}

export function keyResultToCreateIndicatorBody(input: CreateIndicatorInput): CreateIndicatorBody {
  return {
    mission_id: input.missionId,
    owner_id: input.ownerId,
    title: input.title,
    description: input.description ?? undefined,
    target_value: parseNumberOrUndefined(input.targetValue),
    current_value: parseNumberOrUndefined(input.currentValue),
    unit: input.unitLabel ?? undefined,
    status: input.status ? krStatusToApiStatus(input.status) : undefined,
    sort_order: input.sortOrder ?? 0,
    due_date: input.dueDate ?? undefined,
  };
}

export function keyResultToPatchIndicatorBody(patch: UpdateIndicatorInput): PatchIndicatorBody {
  const body: PatchIndicatorBody = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.description !== undefined) body.description = patch.description ?? undefined;
  if (patch.ownerId !== undefined) body.owner_id = patch.ownerId;
  if (patch.targetValue !== undefined) body.target_value = parseNumberOrUndefined(patch.targetValue);
  if (patch.currentValue !== undefined) body.current_value = parseNumberOrUndefined(patch.currentValue);
  if (patch.unitLabel !== undefined) body.unit = patch.unitLabel ?? undefined;
  if (patch.status !== undefined) body.status = krStatusToApiStatus(patch.status);
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;
  if (patch.dueDate !== undefined) body.due_date = patch.dueDate ?? undefined;
  return body;
}

function parseNumberOrUndefined(value: string | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function inferUnit(unitLabel: string | null | undefined): KRUnit {
  if (!unitLabel) return "count";
  const lower = unitLabel.toLowerCase();
  if (lower.includes("%") || lower.includes("percent")) return "percent";
  if (lower.includes("$") || lower.includes("brl") || lower.includes("usd")) return "currency";
  if (lower === "count" || lower === "#") return "count";
  return "custom";
}

// Status mappings between the API and the UI vocabulary.
//
// The API has a setup state (`draft`) that the UI does not model directly,
// so we surface it as `off_track` rather than `on_track` — that way, an
// indicator the user has not finished configuring is visually distinct from
// one that is on track. Mapping it to `on_track` (as we did initially) led
// to an unwanted server-side promotion to `active` on the first edit save.
// Round-trip from a fresh draft is now: draft → off_track → (no edit) →
// (no PATCH) → still draft.
function apiStatusToKRStatus(status: ApiIndicator["status"]): KRStatus {
  switch (status) {
    case "draft":
      return "off_track";
    case "active":
      return "on_track";
    case "at_risk":
      return "attention";
    case "done":
      return "completed";
    case "archived":
      return "off_track";
    default:
      return "on_track";
  }
}

// Reverse mapping is intentionally lossy: we cannot tell from the UI status
// alone whether `off_track` should mean "draft" or "archived" on the
// server. We pick `archived` (the more conservative interpretation) so the
// server side is never silently promoted from draft to active. Callers that
// need explicit draft/active control should not go through this adapter.
function krStatusToApiStatus(status: KRStatus): ApiIndicator["status"] {
  switch (status) {
    case "on_track":
      return "active";
    case "attention":
      return "at_risk";
    case "off_track":
      return "archived";
    case "completed":
      return "done";
    default:
      return "active";
  }
}
