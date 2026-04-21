// ─── missionConstants — testes unitários ────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  getTemplateConfig,
  generateItemId,
  parseKeyResultGoal,
  splitFullName,
  isoToCalendarDate,
} from "./missionConstants";

/* ─── getTemplateConfig ─────────────────────────────────────────────────────── */

describe("getTemplateConfig", () => {
  it.each(["okr", "pdi", "bsc", "kpi", "meta", "scratch"] as const)(
    "retorna config correta para template '%s'",
    (template) => {
      const config = getTemplateConfig(template);
      expect(config).toBe(getTemplateConfig(template));
    },
  );

  it("faz fallback para 'scratch' quando template é undefined", () => {
    expect(getTemplateConfig(undefined)).toEqual(getTemplateConfig("scratch"));
  });

  it("faz fallback para 'scratch' para template desconhecido", () => {
    expect(getTemplateConfig("inexistente")).toEqual(getTemplateConfig("scratch"));
  });
});

/* ─── generateItemId ────────────────────────────────────────────────────────── */

describe("generateItemId", () => {
  it("retorna string que começa com 'item-'", () => {
    expect(generateItemId()).toMatch(/^item-/);
  });

  it("retorna valores únicos em chamadas consecutivas", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateItemId()));
    expect(ids.size).toBe(20);
  });
});

/* ─── parseKeyResultGoal ────────────────────────────────────────────────────── */

describe("parseKeyResultGoal", () => {
  it("'Atingir 100%' -> reach, 100, %", () => {
    expect(parseKeyResultGoal("Atingir 100%")).toMatchObject({ manualType: "reach", goalValue: "100", goalUnit: "%" });
  });

  it("'Reduzir para 5 dias' -> reduce, 5, dias", () => {
    expect(parseKeyResultGoal("Reduzir para 5 dias")).toMatchObject({ manualType: "reduce", goalValue: "5", goalUnit: "dias" });
  });

  it("'Manter acima de 80%' -> above, 80, %", () => {
    expect(parseKeyResultGoal("Manter acima de 80%")).toMatchObject({ manualType: "above", goalValue: "80", goalUnit: "%" });
  });

  it("'Manter abaixo de R$ 1000' -> below, 1000, R$", () => {
    expect(parseKeyResultGoal("Manter abaixo de R$ 1000")).toMatchObject({ manualType: "below", goalValue: "1000", goalUnit: "R$" });
  });

  it("'>= 50' -> above, 50", () => {
    const result = parseKeyResultGoal(">= 50");
    expect(result.manualType).toBe("above");
    expect(result.goalValue).toBe("50");
  });

  it("'Zero incidentes' -> below, 0", () => {
    expect(parseKeyResultGoal("Zero incidentes")).toMatchObject({ manualType: "below", goalValue: "0" });
  });

  it("converte decimal com vírgula para ponto", () => {
    const result = parseKeyResultGoal("Atingir 3,14%");
    expect(result.goalValue).toBe("3.14");
  });

  it("texto com NPS -> goalUnit NPS", () => {
    const result = parseKeyResultGoal("Atingir NPS 75");
    expect(result.goalUnit).toBe("NPS");
  });

  it("texto com 'horas' -> goalUnit hrs", () => {
    const result = parseKeyResultGoal("Reduzir para 2 horas");
    expect(result.goalUnit).toBe("hrs");
  });

  it("retorna manualType padrão sem valor numérico", () => {
    const result = parseKeyResultGoal("Melhorar comunicação");
    expect(result.goalValue).toBe("");
    expect(result.manualType).toBe("reach");
  });

  it("'Diminuir para 10%' -> reduce (alias de reduzir)", () => {
    const result = parseKeyResultGoal("Diminuir para 10%");
    expect(result.manualType).toBe("reduce");
  });
});

/* ─── splitFullName ─────────────────────────────────────────────────────────── */

describe("splitFullName", () => {
  it("separa 'Maria Silva' em firstName e lastName", () => {
    expect(splitFullName("Maria Silva")).toEqual({ firstName: "Maria", lastName: "Silva" });
  });

  it("nome único retorna lastName vazio", () => {
    expect(splitFullName("Maria")).toEqual({ firstName: "Maria", lastName: "" });
  });

  it("nome composto com múltiplas partes junta o restante no lastName", () => {
    expect(splitFullName("Maria da Silva Costa")).toEqual({ firstName: "Maria", lastName: "da Silva Costa" });
  });

  it("string vazia retorna firstName e lastName vazios", () => {
    expect(splitFullName("")).toEqual({ firstName: "", lastName: "" });
  });
});

/* ─── isoToCalendarDate ─────────────────────────────────────────────────────── */

describe("isoToCalendarDate", () => {
  it("converte 'YYYY-MM-DD' para CalendarDate", () => {
    expect(isoToCalendarDate("2026-03-15")).toEqual({ year: 2026, month: 3, day: 15 });
  });

  it("converte mês e dia com um dígito corretamente", () => {
    expect(isoToCalendarDate("2026-01-05")).toEqual({ year: 2026, month: 1, day: 5 });
  });

  it("lança erro para string malformada", () => {
    expect(() => isoToCalendarDate("not-a-date")).toThrow(/invalid ISO date string/);
  });

  it("lança erro para string vazia", () => {
    expect(() => isoToCalendarDate("")).toThrow(/invalid ISO date string/);
  });
});
