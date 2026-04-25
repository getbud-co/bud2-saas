import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "@/lib/api-client";
import {
  apiCycleToView,
  createCycle,
  cycleErrorToMessage,
  deleteCycle,
  listCycles,
  updateCycle,
  type CycleApiResponse,
} from "./cycles-api";

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

const apiCycle: CycleApiResponse = {
  id: "11111111-1111-4111-8111-111111111111",
  org_id: "22222222-2222-4222-8222-222222222222",
  name: "Q1 2026",
  type: "quarterly",
  start_date: "2026-01-01",
  end_date: "2026-03-31",
  status: "active",
  okr_definition_deadline: null,
  mid_review_date: "2026-02-15",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

describe("cycles-api", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("maps API cycles to the frontend shape", () => {
    expect(apiCycleToView(apiCycle)).toEqual({
      id: apiCycle.id,
      orgId: apiCycle.org_id,
      name: apiCycle.name,
      type: apiCycle.type,
      startDate: apiCycle.start_date,
      endDate: apiCycle.end_date,
      status: apiCycle.status,
      okrDefinitionDeadline: apiCycle.okr_definition_deadline,
      midReviewDate: apiCycle.mid_review_date,
      createdAt: apiCycle.created_at,
      updatedAt: apiCycle.updated_at,
    });
  });

  it("listCycles calls the cycles endpoint with query params", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ data: [], total: 0, page: 1, size: 100 });

    await listCycles("token", { page: 1, size: 100, status: "active" });

    expect(apiRequest).toHaveBeenCalledWith("/cycles?page=1&size=100&status=active", {
      token: "token",
    });
  });

  it("createCycle posts the payload", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(apiCycle);

    await createCycle(
      {
        name: "Q1 2026",
        type: "quarterly",
        start_date: "2026-01-01",
        end_date: "2026-03-31",
        status: "active",
        okr_definition_deadline: null,
        mid_review_date: null,
      },
      "token",
    );

    expect(apiRequest).toHaveBeenCalledWith("/cycles", {
      method: "POST",
      body: {
        name: "Q1 2026",
        type: "quarterly",
        start_date: "2026-01-01",
        end_date: "2026-03-31",
        status: "active",
        okr_definition_deadline: null,
        mid_review_date: null,
      },
      token: "token",
    });
  });

  it("updateCycle puts the full payload", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(apiCycle);

    await updateCycle(apiCycle.id, {
      name: "Q1 2026",
      type: "quarterly",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
      status: "active",
    }, "token");

    expect(apiRequest).toHaveBeenCalledWith(`/cycles/${apiCycle.id}`, {
      method: "PUT",
      body: {
        name: "Q1 2026",
        type: "quarterly",
        start_date: "2026-01-01",
        end_date: "2026-03-31",
        status: "active",
      },
      token: "token",
    });
  });

  it("deleteCycle calls the delete endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(undefined);

    await deleteCycle(apiCycle.id, "token");

    expect(apiRequest).toHaveBeenCalledWith(`/cycles/${apiCycle.id}`, {
      method: "DELETE",
      token: "token",
    });
  });
});

describe("cycleErrorToMessage", () => {
  it("maps known API errors", () => {
    expect(cycleErrorToMessage(new ApiError(401, "Unauthorized", ""))).toBe(
      "Sessão expirada. Faça login novamente.",
    );
    expect(cycleErrorToMessage(new ApiError(403, "Forbidden", ""))).toBe(
      "Sem permissão para esta operação.",
    );
    expect(cycleErrorToMessage(new ApiError(409, "Conflict", ""))).toBe(
      "Conflito: já existe um ciclo com esse nome.",
    );
    expect(cycleErrorToMessage(new ApiError(422, "Validation", "campo"))).toBe(
      "Dados inválidos: campo",
    );
  });

  it("returns a generic message for unexpected errors", () => {
    expect(cycleErrorToMessage(new Error("oops"))).toBe("Erro inesperado. Tente novamente.");
    expect(cycleErrorToMessage(new ApiError(500, "Internal Server Error", ""))).toBe(
      "Erro inesperado. Tente novamente.",
    );
  });
});
