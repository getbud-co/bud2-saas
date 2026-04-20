// ─── filterMissions — testes unitários ──────────────────────────────────────

import { describe, it, expect } from "vitest";
import type { Mission, KeyResult, MissionTask } from "@/types";
import { filterMissions } from "./filterMissions";
import type { MissionFilterState, MissionFilterContext } from "./filterMissions";

/* ─── Helpers de factory ────────────────────────────────────────────────────── */

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m1",
    orgId: "org1",
    cycleId: null,
    parentId: null,
    depth: 0,
    path: [],
    title: "Missão padrão",
    description: null,
    ownerId: "u1",
    teamId: null,
    status: "active",
    visibility: "public",
    progress: 0,
    kanbanStatus: "uncategorized",
    sortOrder: 0,
    dueDate: null,
    completedAt: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    deletedAt: null,
    ...overrides,
  };
}

function makeKR(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: "kr1",
    orgId: "org1",
    missionId: "m1",
    parentKrId: null,
    title: "Indicador padrão",
    description: null,
    ownerId: "u1",
    teamId: null,
    measurementMode: "manual",
    goalType: "reach",
    targetValue: "100",
    currentValue: "50",
    startValue: "0",
    lowThreshold: null,
    highThreshold: null,
    unit: "percent",
    unitLabel: null,
    expectedValue: null,
    status: "on_track",
    progress: 50,
    periodLabel: null,
    periodStart: null,
    periodEnd: null,
    sortOrder: 0,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    deletedAt: null,
    linkedMissionId: null,
    linkedSurveyId: null,
    externalSource: null,
    externalConfig: null,
    ...overrides,
  };
}

function makeTask(overrides: Partial<MissionTask> = {}): MissionTask {
  return {
    id: "t1",
    missionId: "m1",
    keyResultId: null,
    title: "Tarefa padrão",
    description: null,
    ownerId: null,
    teamId: null,
    dueDate: null,
    isDone: false,
    sortOrder: 0,
    completedAt: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeFilters(overrides: Partial<MissionFilterState> = {}): MissionFilterState {
  return {
    activeFilters: [],
    selectedTeams: [],
    selectedPeriod: [null, null],
    selectedStatus: "all",
    selectedOwners: [],
    selectedItemTypes: [],
    selectedIndicatorTypes: [],
    selectedContributions: [],
    selectedSupporters: [],
    selectedTaskState: "all",
    selectedMissionStatuses: [],
    ...overrides,
  };
}

function makeCtx(overrides: Partial<MissionFilterContext> = {}): MissionFilterContext {
  return {
    ownerFilterOptions: [],
    resolveTeamId: (id) => id,
    resolveUserId: (id) => id,
    userTeamsMap: new Map(),
    ...overrides,
  };
}

/* ─── Testes ────────────────────────────────────────────────────────────────── */

describe("filterMissions — sem filtros", () => {
  it("retorna todas as missões quando não há filtros ativos", () => {
    const missions = [makeMission({ id: "m1" }), makeMission({ id: "m2" })];
    expect(filterMissions(missions, makeFilters(), makeCtx())).toHaveLength(2);
  });

  it("trata activeFilters vazio como sem filtro", () => {
    const missions = [makeMission()];
    const result = filterMissions(missions, makeFilters({ activeFilters: [] }), makeCtx());
    expect(result).toHaveLength(1);
  });
});

describe("filterMissions — filtro por owner", () => {
  it("mantém missões cujo owner corresponde ao ID selecionado", () => {
    const owner = { id: "u1", firstName: "Maria", lastName: "Silva", initials: "MS" };
    const missions = [
      makeMission({ id: "m1", ownerId: "u1", owner }),
      makeMission({ id: "m2", ownerId: "u2", owner: { ...owner, id: "u2", firstName: "Joao", lastName: "Santos", initials: "JS" } }),
    ];
    const filters = makeFilters({ activeFilters: ["owner"], selectedOwners: ["u1"] });
    const ctx = makeCtx({ ownerFilterOptions: [{ id: "u1", initials: "MS" }] });
    const result = filterMissions(missions, filters, ctx);
    expect(result.map((m) => m.id)).toEqual(["m1"]);
  });

  it("selecao 'all' age como filtro inativo (mantém tudo)", () => {
    const missions = [makeMission({ id: "m1" }), makeMission({ id: "m2" })];
    const filters = makeFilters({ activeFilters: ["owner"], selectedOwners: ["all"] });
    expect(filterMissions(missions, filters, makeCtx())).toHaveLength(2);
  });

  it("remove missão sem owner quando filtro está ativo", () => {
    const missions = [makeMission({ id: "m1", ownerId: "u2", owner: undefined })];
    const filters = makeFilters({ activeFilters: ["owner"], selectedOwners: ["u1"] });
    const ctx = makeCtx({ ownerFilterOptions: [{ id: "u1", initials: "MS" }] });
    expect(filterMissions(missions, filters, ctx)).toHaveLength(0);
  });
});

describe("filterMissions — filtro por team", () => {
  it("mantém missão cujo owner pertence ao time selecionado", () => {
    const userTeamsMap = new Map([["u1", new Set(["team-1"])]]);
    const missions = [
      makeMission({ id: "m1", ownerId: "u1" }),
      makeMission({ id: "m2", ownerId: "u2" }),
    ];
    const filters = makeFilters({ activeFilters: ["team"], selectedTeams: ["team-1"] });
    const ctx = makeCtx({ userTeamsMap });
    const result = filterMissions(missions, filters, ctx);
    expect(result.map((m) => m.id)).toEqual(["m1"]);
  });

  it("remove missão cujo owner não pertence a nenhum time selecionado", () => {
    const userTeamsMap = new Map([["u1", new Set(["team-2"])]]);
    const missions = [makeMission({ id: "m1", ownerId: "u1" })];
    const filters = makeFilters({ activeFilters: ["team"], selectedTeams: ["team-1"] });
    const ctx = makeCtx({ userTeamsMap });
    expect(filterMissions(missions, filters, ctx)).toHaveLength(0);
  });
});

describe("filterMissions — filtro por período", () => {
  it("mantém missão com dueDate dentro do período filtrado", () => {
    const missions = [makeMission({ id: "m1", dueDate: "2026-02-15" })];
    const filters = makeFilters({
      activeFilters: ["period"],
      selectedPeriod: [{ year: 2026, month: 1, day: 1 }, { year: 2026, month: 3, day: 31 }],
    });
    expect(filterMissions(missions, filters, makeCtx())).toHaveLength(1);
  });

  it("remove missão com dueDate fora do período filtrado", () => {
    const missions = [makeMission({ id: "m1", dueDate: "2025-06-01" })];
    const filters = makeFilters({
      activeFilters: ["period"],
      selectedPeriod: [{ year: 2026, month: 1, day: 1 }, { year: 2026, month: 3, day: 31 }],
    });
    expect(filterMissions(missions, filters, makeCtx())).toHaveLength(0);
  });

  it("quando ambas as datas do filtro são nulas, retorna tudo", () => {
    const missions = [makeMission({ id: "m1", dueDate: "2026-02-15" })];
    const filters = makeFilters({
      activeFilters: ["period"],
      selectedPeriod: [null, null],
    });
    expect(filterMissions(missions, filters, makeCtx())).toHaveLength(1);
  });

  it("usa start como end quando end é nulo (single-date range)", () => {
    // Quando end=null, o filtro efetivo é [start, start].
    // Testa via KR com período amplo que claramente engloba a data filtrada.
    const kr = makeKR({ id: "kr1", periodStart: "2026-01-01", periodEnd: "2026-12-31" });
    const missions = [makeMission({ id: "m1", keyResults: [kr] })];
    const filters = makeFilters({
      activeFilters: ["period"],
      selectedPeriod: [{ year: 2026, month: 3, day: 15 }, null],
    });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults).toHaveLength(1);
  });
});

describe("filterMissions — filtro por status do KR", () => {
  it("mantém KR com status correspondente", () => {
    const kr = makeKR({ id: "kr1", status: "on_track" });
    const missions = [makeMission({ id: "m1", keyResults: [kr] })];
    const filters = makeFilters({ activeFilters: ["status"], selectedStatus: "on-track" });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults).toHaveLength(1);
  });

  it("remove KR com status diferente do selecionado", () => {
    const kr = makeKR({ id: "kr1", status: "attention" });
    const missions = [makeMission({ id: "m1", keyResults: [kr] })];
    const filters = makeFilters({ activeFilters: ["status"], selectedStatus: "on-track" });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result).toHaveLength(0);
  });

  it("converte dash para underscore no status (on-track -> on_track)", () => {
    const kr = makeKR({ id: "kr1", status: "off_track" });
    const missions = [makeMission({ id: "m1", keyResults: [kr] })];
    const filters = makeFilters({ activeFilters: ["status"], selectedStatus: "off-track" });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults).toHaveLength(1);
  });
});

describe("filterMissions — filtro por tipo de item", () => {
  it("'mission' mantém missões, remove KRs e tasks", () => {
    const kr = makeKR({ id: "kr1" });
    const task = makeTask({ id: "t1" });
    const missions = [makeMission({ id: "m1", keyResults: [kr], tasks: [task] })];
    const filters = makeFilters({ activeFilters: ["itemType"], selectedItemTypes: ["mission"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.id).toBe("m1");
    expect(result[0]?.keyResults).toHaveLength(0);
    expect(result[0]?.tasks).toHaveLength(0);
  });

  it("'indicator' mantém KRs, remove missões sem KR e tasks", () => {
    const kr = makeKR({ id: "kr1" });
    const missions = [makeMission({ id: "m1", keyResults: [kr] })];
    const filters = makeFilters({ activeFilters: ["itemType"], selectedItemTypes: ["indicator"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults).toHaveLength(1);
  });

  it("'task' mantém tasks, remove missões sem task e KRs", () => {
    const task = makeTask({ id: "t1" });
    const missions = [makeMission({ id: "m1", tasks: [task] })];
    const filters = makeFilters({ activeFilters: ["itemType"], selectedItemTypes: ["task"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.tasks).toHaveLength(1);
  });
});

describe("filterMissions — filtro por tipo de indicador", () => {
  it("filtra por goalType (reach)", () => {
    const krReach = makeKR({ id: "kr1", goalType: "reach" });
    const krAbove = makeKR({ id: "kr2", goalType: "above" });
    const missions = [makeMission({ id: "m1", keyResults: [krReach, krAbove] })];
    const filters = makeFilters({ activeFilters: ["indicatorType"], selectedIndicatorTypes: ["reach"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults?.map((k) => k.id)).toEqual(["kr1"]);
  });

  it("'external' filtra por measurementMode", () => {
    const krExternal = makeKR({ id: "kr1", measurementMode: "external" });
    const krManual = makeKR({ id: "kr2", measurementMode: "manual" });
    const missions = [makeMission({ id: "m1", keyResults: [krExternal, krManual] })];
    const filters = makeFilters({ activeFilters: ["indicatorType"], selectedIndicatorTypes: ["external"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults?.map((k) => k.id)).toEqual(["kr1"]);
  });

  it("'linked_mission' filtra por measurementMode mission", () => {
    const krMission = makeKR({ id: "kr1", measurementMode: "mission" });
    const missions = [makeMission({ id: "m1", keyResults: [krMission] })];
    const filters = makeFilters({ activeFilters: ["indicatorType"], selectedIndicatorTypes: ["linked_mission"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults).toHaveLength(1);
  });
});

describe("filterMissions — filtro por contribuição", () => {
  it("'contributing' mantém KR com contributesTo", () => {
    const krWith = makeKR({ id: "kr1", contributesTo: [{ missionId: "m2", missionTitle: "Outra" }] });
    const krWithout = makeKR({ id: "kr2", contributesTo: [] });
    const missions = [makeMission({ id: "m1", keyResults: [krWith, krWithout] })];
    const filters = makeFilters({ activeFilters: ["contribution"], selectedContributions: ["contributing"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults?.map((k) => k.id)).toEqual(["kr1"]);
  });

  it("'none' mantém KR sem contribuição", () => {
    const krWith = makeKR({ id: "kr1", contributesTo: [{ missionId: "m2", missionTitle: "Outra" }] });
    const krWithout = makeKR({ id: "kr2", contributesTo: [] });
    const missions = [makeMission({ id: "m1", keyResults: [krWith, krWithout] })];
    const filters = makeFilters({ activeFilters: ["contribution"], selectedContributions: ["none"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.keyResults?.map((k) => k.id)).toEqual(["kr2"]);
  });
});

describe("filterMissions — filtro por supporter", () => {
  it("mantém missão com supporter correspondente", () => {
    const missions = [
      makeMission({ id: "m1", members: [{ missionId: "m1", userId: "u2", role: "supporter", addedAt: "2025-01-01T00:00:00Z", addedBy: null }] }),
      makeMission({ id: "m2", members: [] }),
    ];
    const filters = makeFilters({ activeFilters: ["supporter"], selectedSupporters: ["u2"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result.map((m) => m.id)).toEqual(["m1"]);
  });
});

describe("filterMissions — filtro por estado de tarefa", () => {
  it("'done' mantém apenas tasks concluídas", () => {
    const taskDone = makeTask({ id: "t1", isDone: true });
    const taskPending = makeTask({ id: "t2", isDone: false });
    const missions = [makeMission({ id: "m1", tasks: [taskDone, taskPending] })];
    const filters = makeFilters({ activeFilters: ["taskState"], selectedTaskState: "done" });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.tasks?.map((t) => t.id)).toEqual(["t1"]);
  });

  it("'pending' mantém apenas tasks pendentes", () => {
    const taskDone = makeTask({ id: "t1", isDone: true });
    const taskPending = makeTask({ id: "t2", isDone: false });
    const missions = [makeMission({ id: "m1", tasks: [taskDone, taskPending] })];
    const filters = makeFilters({ activeFilters: ["taskState"], selectedTaskState: "pending" });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.tasks?.map((t) => t.id)).toEqual(["t2"]);
  });
});

describe("filterMissions — filtro por status da missão", () => {
  it("mantém missões com status correspondente", () => {
    const missions = [
      makeMission({ id: "m1", status: "active" }),
      makeMission({ id: "m2", status: "draft" }),
    ];
    const filters = makeFilters({ activeFilters: ["missionStatus"], selectedMissionStatuses: ["active"] });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result.map((m) => m.id)).toEqual(["m1"]);
  });

  it("'all' nas missões ativas age como sem filtro", () => {
    const missions = [makeMission({ id: "m1", status: "draft" })];
    const filters = makeFilters({ activeFilters: ["missionStatus"], selectedMissionStatuses: ["all"] });
    expect(filterMissions(missions, filters, makeCtx())).toHaveLength(1);
  });
});

describe("filterMissions — preservação de ancestrais", () => {
  it("preserva missão pai quando filho (KR) faz match", () => {
    const kr = makeKR({ id: "kr1", status: "on_track" });
    const missions = [makeMission({ id: "m1", keyResults: [kr], status: "active" })];
    const filters = makeFilters({ activeFilters: ["status"], selectedStatus: "on-track" });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.id).toBe("m1");
  });

  it("preserva missão filho aninhado quando KR faz match", () => {
    const kr = makeKR({ id: "kr1", status: "on_track" });
    const child = makeMission({ id: "m2", keyResults: [kr] });
    const missions = [makeMission({ id: "m1", children: [child] })];
    const filters = makeFilters({ activeFilters: ["status"], selectedStatus: "on-track" });
    const result = filterMissions(missions, filters, makeCtx());
    expect(result[0]?.children?.[0]?.id).toBe("m2");
  });
});

describe("filterMissions — filtros combinados", () => {
  it("aplica owner + missionStatus como AND", () => {
    const ownerMS = { id: "u1", firstName: "Maria", lastName: "Silva", initials: "MS" };
    const ownerJC = { id: "u2", firstName: "Joao", lastName: "Costa", initials: "JC" };
    const missions = [
      makeMission({ id: "m1", ownerId: "u1", owner: ownerMS, status: "active" }),
      makeMission({ id: "m2", ownerId: "u1", owner: ownerMS, status: "draft" }),
      makeMission({ id: "m3", ownerId: "u2", owner: ownerJC, status: "active" }),
    ];
    const filters = makeFilters({
      activeFilters: ["owner", "missionStatus"],
      selectedOwners: ["u1"],
      selectedMissionStatuses: ["active"],
    });
    const ctx = makeCtx({ ownerFilterOptions: [{ id: "u1", initials: "MS" }] });
    const result = filterMissions(missions, filters, ctx);
    expect(result.map((m) => m.id)).toEqual(["m1"]);
  });
});

describe("filterMissions — resultado vazio", () => {
  it("retorna array vazio quando nada faz match", () => {
    const missions = [makeMission({ id: "m1", status: "draft" })];
    const filters = makeFilters({ activeFilters: ["missionStatus"], selectedMissionStatuses: ["active"] });
    expect(filterMissions(missions, filters, makeCtx())).toHaveLength(0);
  });

  it("retorna array vazio para lista de missões vazia", () => {
    expect(filterMissions([], makeFilters(), makeCtx())).toHaveLength(0);
  });
});
