// ─── checkinReadModels — testes unitários ──────────────────────────────────────

import { describe, it, expect } from "vitest";
import type { CheckIn } from "@/types";
import { sortCheckInsDesc, buildCheckInChartData } from "./checkinReadModels";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: "ci-1",
    keyResultId: "kr-1",
    authorId: "u-1",
    value: "50",
    previousValue: "40",
    confidence: null,
    note: null,
    mentions: null,
    createdAt: "2025-06-15T10:00:00Z",
    ...overrides,
  };
}

/* ─── sortCheckInsDesc ──────────────────────────────────────────────────────── */

describe("sortCheckInsDesc", () => {
  it("ordena check-ins do mais recente para o mais antigo", () => {
    const checkins: CheckIn[] = [
      makeCheckIn({ id: "ci-old", createdAt: "2025-01-01T00:00:00Z" }),
      makeCheckIn({ id: "ci-new", createdAt: "2025-06-15T00:00:00Z" }),
      makeCheckIn({ id: "ci-mid", createdAt: "2025-03-10T00:00:00Z" }),
    ];
    const sorted = sortCheckInsDesc(checkins);
    expect(sorted.map((c) => c.id)).toEqual(["ci-new", "ci-mid", "ci-old"]);
  });

  it("não altera o array original", () => {
    const original: CheckIn[] = [
      makeCheckIn({ id: "a", createdAt: "2025-01-01T00:00:00Z" }),
      makeCheckIn({ id: "b", createdAt: "2025-06-01T00:00:00Z" }),
    ];
    const copy = [...original];
    sortCheckInsDesc(original);
    expect(original.map((c) => c.id)).toEqual(copy.map((c) => c.id));
  });

  it("retorna array vazio para entrada vazia", () => {
    expect(sortCheckInsDesc([])).toEqual([]);
  });

  it("retorna o próprio check-in para um único elemento", () => {
    const single = [makeCheckIn({ id: "only" })];
    const sorted = sortCheckInsDesc(single);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]!.id).toBe("only");
  });
});

/* ─── buildCheckInChartData ─────────────────────────────────────────────────── */

describe("buildCheckInChartData", () => {
  it("ordena do mais antigo para o mais recente (cronológico)", () => {
    const checkins: CheckIn[] = [
      makeCheckIn({ id: "b", value: "70", createdAt: "2025-06-15T12:00:00Z" }),
      makeCheckIn({ id: "a", value: "50", createdAt: "2025-01-10T12:00:00Z" }),
    ];
    const chartData = buildCheckInChartData(checkins);
    expect(chartData).toHaveLength(2);
    // O primeiro deve ser o mais antigo (janeiro), segundo o mais recente (junho)
    const [first, second] = chartData;
    expect(new Date("2025-01-10T12:00:00Z").getTime()).toBeLessThan(
      new Date("2025-06-15T12:00:00Z").getTime(),
    );
    // Verifica a ordem (primeiro é janeiro, segundo é junho)
    expect(first!.value).toBe(50);
    expect(second!.value).toBe(70);
  });

  it("converte value para número", () => {
    const checkins: CheckIn[] = [
      makeCheckIn({ value: "75" }),
    ];
    const chartData = buildCheckInChartData(checkins);
    expect(chartData[0]!.value).toBe(75);
    expect(typeof chartData[0]!.value).toBe("number");
  });

  it("retorna 0 para valor inválido", () => {
    const checkins: CheckIn[] = [
      makeCheckIn({ value: "abc" }),
    ];
    const chartData = buildCheckInChartData(checkins);
    expect(chartData[0]!.value).toBe(0);
  });

  it("retorna array vazio para entrada vazia", () => {
    expect(buildCheckInChartData([])).toEqual([]);
  });

  it("formata datas no formato DD/MM", () => {
    const checkins: CheckIn[] = [
      makeCheckIn({ createdAt: "2025-03-05T12:00:00Z" }),
    ];
    const chartData = buildCheckInChartData(checkins);
    expect(chartData[0]!.date).toBe("05/03");
  });
});
