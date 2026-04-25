import { describe, it, expect } from "vitest";
import { apiErrorToMessage } from "./api-error";

const DEFAULT_MSG = "Erro inesperado. Tente novamente.";

describe("apiErrorToMessage", () => {
  it("returns default message for null", () => {
    expect(apiErrorToMessage(null)).toBe(DEFAULT_MSG);
  });

  it("returns default message for undefined", () => {
    expect(apiErrorToMessage(undefined)).toBe(DEFAULT_MSG);
  });

  it("returns default message for a string input", () => {
    expect(apiErrorToMessage("something went wrong")).toBe(DEFAULT_MSG);
  });

  it("returns default message for a number input", () => {
    expect(apiErrorToMessage(42)).toBe(DEFAULT_MSG);
  });

  it("returns default message for an object without status", () => {
    expect(apiErrorToMessage({ message: "fail" })).toBe(DEFAULT_MSG);
  });

  it("returns session-expired message for status 401", () => {
    expect(apiErrorToMessage({ status: 401 })).toBe(
      "Sessão expirada. Faça login novamente.",
    );
  });

  it("returns no-permission message for status 403", () => {
    expect(apiErrorToMessage({ status: 403 })).toBe(
      "Sem permissão para esta operação.",
    );
  });

  it("returns conflict message for status 409", () => {
    expect(apiErrorToMessage({ status: 409 })).toBe(
      "Conflito: registro duplicado.",
    );
  });

  it("returns detail message for status 422 with detail", () => {
    expect(apiErrorToMessage({ status: 422, detail: "campo obrigatório" })).toBe(
      "Dados inválidos: campo obrigatório",
    );
  });

  it("returns default message for status 422 without detail", () => {
    expect(apiErrorToMessage({ status: 422 })).toBe(DEFAULT_MSG);
  });

  it("returns default message for unknown status like 500", () => {
    expect(apiErrorToMessage({ status: 500 })).toBe(DEFAULT_MSG);
  });

  it("uses custom override when it matches the status", () => {
    const overrides = { 403: "Acesso negado pelo administrador." };
    expect(apiErrorToMessage({ status: 403 }, overrides)).toBe(
      "Acesso negado pelo administrador.",
    );
  });

  it("falls back to default mapping when override does not match", () => {
    const overrides = { 404: "Não encontrado." };
    expect(apiErrorToMessage({ status: 401 }, overrides)).toBe(
      "Sessão expirada. Faça login novamente.",
    );
  });
});
