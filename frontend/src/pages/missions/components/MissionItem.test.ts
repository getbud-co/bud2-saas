// ─── collectMissionIds — testes unitários ───────────────────────────────────

import { describe, it, expect } from "vitest";
import type { Mission } from "@/types";
import { collectMissionIds } from "../utils/missionItemTree";

/* ─── Helper de factory ─────────────────────────────────────────────────────── */

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m1",
    orgId: "org1",
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
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    completedAt: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    deletedAt: null,
    ...overrides,
  };
}

/* ─── Testes ────────────────────────────────────────────────────────────────── */

describe("collectMissionIds", () => {
  it("retorna [mission.id] para missão sem filhos", () => {
    const mission = makeMission({ id: "m1" });
    expect(collectMissionIds(mission)).toEqual(["m1"]);
  });

  it("retorna todos os IDs para missão com filhos diretos", () => {
    const mission = makeMission({
      id: "m1",
      children: [makeMission({ id: "c1" }), makeMission({ id: "c2" })],
    });
    expect(collectMissionIds(mission)).toEqual(["m1", "c1", "c2"]);
  });

  it("coleta IDs recursivamente em múltiplos níveis", () => {
    const grandchild = makeMission({ id: "gc1" });
    const child = makeMission({ id: "c1", children: [grandchild] });
    const mission = makeMission({ id: "m1", children: [child] });
    expect(collectMissionIds(mission)).toEqual(["m1", "c1", "gc1"]);
  });

  it("trata children undefined como lista vazia", () => {
    const mission = makeMission({ id: "m1", children: undefined });
    expect(collectMissionIds(mission)).toEqual(["m1"]);
  });
});
