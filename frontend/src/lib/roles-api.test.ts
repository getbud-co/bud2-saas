import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, apiRequest } from "@/lib/api-client";
import { listPermissions, listRoles, roleErrorToMessage } from "./roles-api";

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

describe("roles-api", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("listRoles calls the roles endpoint with token", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ data: [] });

    await listRoles("token");

    expect(apiRequest).toHaveBeenCalledWith("/roles", { token: "token" });
  });

  it("listPermissions calls the permissions endpoint with token", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ data: [] });

    await listPermissions("token");

    expect(apiRequest).toHaveBeenCalledWith("/permissions", { token: "token" });
  });
});

describe("roleErrorToMessage", () => {
  it("returns session expired for 401", () => {
    expect(roleErrorToMessage(new ApiError(401, "Unauthorized", ""))).toBe(
      "Sessão expirada. Faça login novamente.",
    );
  });

  it("returns permission message for 403", () => {
    expect(roleErrorToMessage(new ApiError(403, "Forbidden", ""))).toBe(
      "Sem permissão para esta operação.",
    );
  });

  it("returns generic message for unknown errors", () => {
    expect(roleErrorToMessage(new Error("oops"))).toBe(
      "Erro inesperado. Tente novamente.",
    );
    expect(roleErrorToMessage(new ApiError(500, "Internal Server Error", ""))).toBe(
      "Erro inesperado. Tente novamente.",
    );
  });
});
