import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api-client";
import { userErrorToMessage } from "./users-api";

describe("userErrorToMessage", () => {
  it("returns generic message for non-ApiError", () => {
    expect(userErrorToMessage(new Error("oops"))).toBe(
      "Erro inesperado. Tente novamente.",
    );
  });

  it("returns conflict message for 409", () => {
    expect(userErrorToMessage(new ApiError(409, "Conflict", ""))).toBe(
      "Conflito: este usuário já existe na organização.",
    );
  });

  it("returns session expired for 401", () => {
    expect(userErrorToMessage(new ApiError(401, "Unauthorized", ""))).toBe(
      "Sessão expirada. Faça login novamente.",
    );
  });

  it("returns permission message for 403", () => {
    expect(userErrorToMessage(new ApiError(403, "Forbidden", ""))).toBe(
      "Sem permissão para esta operação.",
    );
  });

  it("returns validation detail for 422", () => {
    expect(
      userErrorToMessage(new ApiError(422, "Unprocessable", "email inválido")),
    ).toBe("Dados inválidos: email inválido");
  });

  it("returns generic message for unknown status", () => {
    expect(
      userErrorToMessage(new ApiError(500, "Internal Server Error", "")),
    ).toBe("Erro inesperado. Tente novamente.");
  });
});
