// ─── missionItemTree — testes unitários ─────────────────────────────────────

import { describe, it, expect } from "vitest";
import type { MissionItemData } from "../missionTypes";
import {
  addChildToParent,
  removeChildFromTree,
  replaceItemInTree,
  calendarDateToIso,
  unitFromValue,
  getGoalSummary,
  countAllItems,
} from "./missionItemTree";

/* ─── Helpers de factory ────────────────────────────────────────────────────── */

function makeItem(overrides: Partial<MissionItemData> = {}): MissionItemData {
  return {
    id: "item-1",
    name: "Item padrão",
    description: "",
    measurementMode: "manual",
    manualType: "reach",
    surveyId: null,
    period: [null, null],
    goalValue: "",
    goalValueMin: "",
    goalValueMax: "",
    goalUnit: "%",
    ownerId: null,
    teamId: null,
    ...overrides,
  };
}

/* ─── addChildToParent ──────────────────────────────────────────────────────── */

describe("addChildToParent", () => {
  it("adiciona filho ao item root cujo id corresponde", () => {
    const parent = makeItem({ id: "p1", children: [] });
    const child = makeItem({ id: "c1" });
    const result = addChildToParent([parent], "p1", child);
    expect(result[0]?.children?.map((c) => c.id)).toEqual(["c1"]);
  });

  it("adiciona filho a item aninhado (busca recursiva)", () => {
    const grandchild = makeItem({ id: "c2" });
    const child = makeItem({ id: "c1", children: [] });
    const parent = makeItem({ id: "p1", children: [child] });
    const result = addChildToParent([parent], "c1", grandchild);
    expect(result[0]?.children?.[0]?.children?.map((c) => c.id)).toEqual(["c2"]);
  });

  it("retorna árvore sem alterações quando parentId não é encontrado", () => {
    const item = makeItem({ id: "p1", children: [] });
    const result = addChildToParent([item], "inexistente", makeItem({ id: "c1" }));
    expect(result[0]?.children).toHaveLength(0);
  });

  it("preserva filhos existentes ao adicionar novo filho", () => {
    const existing = makeItem({ id: "c-existing" });
    const parent = makeItem({ id: "p1", children: [existing] });
    const newChild = makeItem({ id: "c-new" });
    const result = addChildToParent([parent], "p1", newChild);
    expect(result[0]?.children?.map((c) => c.id)).toEqual(["c-existing", "c-new"]);
  });
});

/* ─── removeChildFromTree ───────────────────────────────────────────────────── */

describe("removeChildFromTree", () => {
  it("remove item root pelo id", () => {
    const items = [makeItem({ id: "i1" }), makeItem({ id: "i2" })];
    const result = removeChildFromTree(items, "i1");
    expect(result.map((i) => i.id)).toEqual(["i2"]);
  });

  it("remove item aninhado (busca recursiva)", () => {
    const child = makeItem({ id: "c1" });
    const parent = makeItem({ id: "p1", children: [child] });
    const result = removeChildFromTree([parent], "c1");
    expect(result[0]?.children).toHaveLength(0);
  });

  it("retorna árvore sem alterações quando childId não é encontrado", () => {
    const items = [makeItem({ id: "i1" }), makeItem({ id: "i2" })];
    const result = removeChildFromTree(items, "inexistente");
    expect(result.map((i) => i.id)).toEqual(["i1", "i2"]);
  });

  it("preserva itens irmãos ao remover", () => {
    const c1 = makeItem({ id: "c1" });
    const c2 = makeItem({ id: "c2" });
    const parent = makeItem({ id: "p1", children: [c1, c2] });
    const result = removeChildFromTree([parent], "c1");
    expect(result[0]?.children?.map((c) => c.id)).toEqual(["c2"]);
  });
});

/* ─── replaceItemInTree ─────────────────────────────────────────────────────── */

describe("replaceItemInTree", () => {
  it("substitui item root pelo id", () => {
    const items = [makeItem({ id: "i1", name: "Original" })];
    const replacement = makeItem({ id: "i1", name: "Substituído" });
    const result = replaceItemInTree(items, "i1", replacement);
    expect(result[0]?.name).toBe("Substituído");
  });

  it("substitui item aninhado (busca recursiva)", () => {
    const child = makeItem({ id: "c1", name: "Original" });
    const parent = makeItem({ id: "p1", children: [child] });
    const replacement = makeItem({ id: "c1", name: "Substituído" });
    const result = replaceItemInTree([parent], "c1", replacement);
    expect(result[0]?.children?.[0]?.name).toBe("Substituído");
  });

  it("retorna árvore sem alterações quando itemId não é encontrado", () => {
    const items = [makeItem({ id: "i1", name: "Original" })];
    const result = replaceItemInTree(items, "inexistente", makeItem({ id: "outro" }));
    expect(result[0]?.name).toBe("Original");
  });
});

/* ─── calendarDateToIso ─────────────────────────────────────────────────────── */

describe("calendarDateToIso", () => {
  it("converte CalendarDate para string ISO YYYY-MM-DD", () => {
    expect(calendarDateToIso({ year: 2026, month: 3, day: 15 })).toBe("2026-03-15");
  });

  it("faz padding de mês e dia com um dígito", () => {
    expect(calendarDateToIso({ year: 2026, month: 1, day: 5 })).toBe("2026-01-05");
  });

  it("retorna null para entrada null", () => {
    expect(calendarDateToIso(null)).toBeNull();
  });
});

/* ─── unitFromValue ─────────────────────────────────────────────────────────── */

describe("unitFromValue", () => {
  it("'%' retorna 'percent'", () => {
    expect(unitFromValue("%")).toBe("percent");
  });

  it("'R$' retorna 'currency'", () => {
    expect(unitFromValue("R$")).toBe("currency");
  });

  it("'US$' retorna 'currency'", () => {
    expect(unitFromValue("US$")).toBe("currency");
  });

  it("'un' retorna 'count'", () => {
    expect(unitFromValue("un")).toBe("count");
  });

  it("string vazia retorna 'count'", () => {
    expect(unitFromValue("")).toBe("count");
  });

  it("qualquer outro valor retorna 'custom'", () => {
    expect(unitFromValue("pts")).toBe("custom");
    expect(unitFromValue("dias")).toBe("custom");
  });
});

/* ─── getGoalSummary ────────────────────────────────────────────────────────── */

describe("getGoalSummary", () => {
  it("retorna string vazia para modo não-manual", () => {
    const item = makeItem({ measurementMode: "external", manualType: "reach" });
    expect(getGoalSummary(item)).toBe("");
  });

  it("retorna string vazia quando manualType é null", () => {
    const item = makeItem({ measurementMode: "manual", manualType: null });
    expect(getGoalSummary(item)).toBe("");
  });

  it("'between' retorna resumo com min e max", () => {
    const item = makeItem({ manualType: "between", goalValueMin: "10", goalValueMax: "20", goalUnit: "%" });
    expect(getGoalSummary(item)).toBe("10 – 20 % (Percentual)");
  });

  it("'between' retorna string vazia quando min ou max estão ausentes", () => {
    const item = makeItem({ manualType: "between", goalValueMin: "", goalValueMax: "20", goalUnit: "%" });
    expect(getGoalSummary(item)).toBe("");
  });

  it("'above' retorna resumo com min", () => {
    const item = makeItem({ manualType: "above", goalValueMin: "80", goalUnit: "%" });
    expect(getGoalSummary(item)).toBe("≥ 80 % (Percentual)");
  });

  it("'above' retorna string vazia quando min está ausente", () => {
    const item = makeItem({ manualType: "above", goalValueMin: "", goalUnit: "%" });
    expect(getGoalSummary(item)).toBe("");
  });

  it("'below' retorna resumo com max", () => {
    const item = makeItem({ manualType: "below", goalValueMax: "5", goalUnit: "%" });
    expect(getGoalSummary(item)).toBe("≤ 5 % (Percentual)");
  });

  it("'reach' retorna resumo com goalValue", () => {
    const item = makeItem({ manualType: "reach", goalValue: "100", goalUnit: "%" });
    expect(getGoalSummary(item)).toBe("100 % (Percentual)");
  });

  it("'reach' retorna string vazia quando goalValue está ausente", () => {
    const item = makeItem({ manualType: "reach", goalValue: "", goalUnit: "%" });
    expect(getGoalSummary(item)).toBe("");
  });
});

/* ─── countAllItems ─────────────────────────────────────────────────────────── */

describe("countAllItems", () => {
  it("retorna 0 para array vazio", () => {
    expect(countAllItems([])).toBe(0);
  });

  it("conta lista plana corretamente", () => {
    const items = [makeItem({ id: "i1" }), makeItem({ id: "i2" }), makeItem({ id: "i3" })];
    expect(countAllItems(items)).toBe(3);
  });

  it("conta itens aninhados recursivamente", () => {
    const child = makeItem({ id: "c1" });
    const parent = makeItem({ id: "p1", children: [child] });
    expect(countAllItems([parent])).toBe(2);
  });

  it("conta múltiplos níveis de aninhamento", () => {
    const grandchild = makeItem({ id: "gc1" });
    const child = makeItem({ id: "c1", children: [grandchild] });
    const parent = makeItem({ id: "p1", children: [child] });
    expect(countAllItems([parent])).toBe(3);
  });
});
