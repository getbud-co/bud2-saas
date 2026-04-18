// ─── missionTree — testes unitários ────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import type { Mission, KeyResult, MissionTask, ExternalContribution } from "@/types";
import {
  findParentMission,
  findIndicatorById,
  findTaskById,
  findTaskInMissions,
  flattenMissions,
  addKRContribution,
  addTaskContribution,
  addExternalContrib,
  removeKRContribution,
  removeTaskContribution,
  removeExternalContrib,
} from "./missionTree";

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

/* ─── findParentMission ─────────────────────────────────────────────────────── */

describe("findParentMission", () => {
  it("retorna o título da missão que contém o KR", () => {
    const missions: Mission[] = [
      makeMission({
        id: "m1",
        title: "Missão Alpha",
        keyResults: [makeKR({ id: "kr-a" })],
      }),
    ];
    expect(findParentMission("kr-a", missions)).toBe("Missão Alpha");
  });

  it("retorna string vazia quando o KR não existe", () => {
    const missions: Mission[] = [makeMission({ keyResults: [] })];
    expect(findParentMission("kr-inexistente", missions)).toBe("");
  });

  it("busca recursivamente em filhos", () => {
    const missions: Mission[] = [
      makeMission({
        id: "m1",
        title: "Pai",
        keyResults: [],
        children: [
          makeMission({
            id: "m2",
            title: "Filha",
            keyResults: [makeKR({ id: "kr-child" })],
          }),
        ],
      }),
    ];
    expect(findParentMission("kr-child", missions)).toBe("Filha");
  });
});

/* ─── findIndicatorById ─────────────────────────────────────────────────────── */

describe("findIndicatorById", () => {
  it("retorna o indicador quando encontrado na missão", () => {
    const kr = makeKR({ id: "kr-x", title: "Indicador X" });
    const missions: Mission[] = [makeMission({ keyResults: [kr] })];
    expect(findIndicatorById("kr-x", missions)).toEqual(kr);
  });

  it("retorna null quando não encontrado", () => {
    const missions: Mission[] = [makeMission({ keyResults: [] })];
    expect(findIndicatorById("inexistente", missions)).toBeNull();
  });

  it("busca em filhos recursivamente", () => {
    const kr = makeKR({ id: "kr-deep" });
    const missions: Mission[] = [
      makeMission({
        children: [makeMission({ id: "m2", keyResults: [kr] })],
      }),
    ];
    expect(findIndicatorById("kr-deep", missions)).toEqual(kr);
  });
});

/* ─── findTaskById ──────────────────────────────────────────────────────────── */

describe("findTaskById", () => {
  it("retorna tarefa diretamente na missão com parentLabel correto", () => {
    const task = makeTask({ id: "t-1" });
    const missions: Mission[] = [
      makeMission({ title: "M1", tasks: [task] }),
    ];
    const result = findTaskById("t-1", missions);
    expect(result).not.toBeNull();
    expect(result!.task.id).toBe("t-1");
    expect(result!.parentLabel).toBe("M1");
  });

  it("retorna tarefa dentro de um KR com parentLabel formatado", () => {
    const task = makeTask({ id: "t-kr" });
    const kr = makeKR({ id: "kr-1", title: "KR 1", tasks: [task] });
    const missions: Mission[] = [
      makeMission({ title: "M1", keyResults: [kr] }),
    ];
    const result = findTaskById("t-kr", missions);
    expect(result).not.toBeNull();
    expect(result!.parentLabel).toBe("M1 › KR 1");
  });

  it("retorna null se a tarefa não existe", () => {
    expect(findTaskById("nope", [makeMission()])).toBeNull();
  });

  it("busca recursivamente em filhos", () => {
    const task = makeTask({ id: "t-deep" });
    const missions: Mission[] = [
      makeMission({
        children: [makeMission({ id: "m-child", title: "Child", tasks: [task] })],
      }),
    ];
    const result = findTaskById("t-deep", missions);
    expect(result).not.toBeNull();
    expect(result!.parentLabel).toBe("Child");
  });
});

/* ─── findTaskInMissions ────────────────────────────────────────────────────── */

describe("findTaskInMissions", () => {
  it("retorna a tarefa diretamente na missão", () => {
    const task = makeTask({ id: "t-1" });
    const missions: Mission[] = [makeMission({ tasks: [task] })];
    expect(findTaskInMissions("t-1", missions)).toEqual(task);
  });

  it("retorna a tarefa dentro de um KR", () => {
    const task = makeTask({ id: "t-kr" });
    const kr = makeKR({ tasks: [task] });
    const missions: Mission[] = [makeMission({ keyResults: [kr] })];
    expect(findTaskInMissions("t-kr", missions)).toEqual(task);
  });

  it("retorna undefined se não encontrada", () => {
    expect(findTaskInMissions("ghost", [makeMission()])).toBeUndefined();
  });
});

/* ─── flattenMissions ───────────────────────────────────────────────────────── */

describe("flattenMissions", () => {
  it("retorna lista plana com id e título", () => {
    const missions: Mission[] = [
      makeMission({ id: "m1", title: "A" }),
      makeMission({ id: "m2", title: "B" }),
    ];
    expect(flattenMissions(missions)).toEqual([
      { id: "m1", title: "A" },
      { id: "m2", title: "B" },
    ]);
  });

  it("inclui filhos recursivamente", () => {
    const missions: Mission[] = [
      makeMission({
        id: "m1",
        title: "Pai",
        children: [makeMission({ id: "m2", title: "Filho" })],
      }),
    ];
    const result = flattenMissions(missions);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ id: "m2", title: "Filho" });
  });

  it("retorna array vazio para lista vazia", () => {
    expect(flattenMissions([])).toEqual([]);
  });
});

/* ─── addKRContribution / removeKRContribution ──────────────────────────────── */

describe("addKRContribution", () => {
  it("adiciona contribuição ao KR correto", () => {
    const kr = makeKR({ id: "kr-1", contributesTo: [] });
    const missions: Mission[] = [makeMission({ keyResults: [kr] })];
    const target = { id: "m-target", title: "Target Mission" };

    const result = addKRContribution(missions, "kr-1", target);
    const updatedKR = result[0]!.keyResults![0]!;
    expect(updatedKR.contributesTo).toHaveLength(1);
    expect(updatedKR.contributesTo![0]).toEqual({
      missionId: "m-target",
      missionTitle: "Target Mission",
    });
  });

  it("não duplica contribuição existente", () => {
    const kr = makeKR({
      id: "kr-1",
      contributesTo: [{ missionId: "m-target", missionTitle: "Target" }],
    });
    const missions: Mission[] = [makeMission({ keyResults: [kr] })];
    const result = addKRContribution(missions, "kr-1", { id: "m-target", title: "Target" });
    expect(result[0]!.keyResults![0]!.contributesTo).toHaveLength(1);
  });
});

describe("removeKRContribution", () => {
  it("remove contribuição do KR", () => {
    const kr = makeKR({
      id: "kr-1",
      contributesTo: [
        { missionId: "m-a", missionTitle: "A" },
        { missionId: "m-b", missionTitle: "B" },
      ],
    });
    const missions: Mission[] = [makeMission({ keyResults: [kr] })];
    const result = removeKRContribution(missions, "kr-1", "m-a");
    expect(result[0]!.keyResults![0]!.contributesTo).toHaveLength(1);
    expect(result[0]!.keyResults![0]!.contributesTo![0]!.missionId).toBe("m-b");
  });
});

/* ─── addTaskContribution / removeTaskContribution ──────────────────────────── */

describe("addTaskContribution", () => {
  it("adiciona contribuição à tarefa correta", () => {
    const task = makeTask({ id: "t-1", contributesTo: [] });
    const missions: Mission[] = [makeMission({ tasks: [task] })];
    const target = { id: "m-target", title: "Target" };

    const result = addTaskContribution(missions, "t-1", target);
    const updatedTask = result[0]!.tasks![0]!;
    expect(updatedTask.contributesTo).toHaveLength(1);
    expect(updatedTask.contributesTo![0]!.missionId).toBe("m-target");
  });

  it("não duplica contribuição existente", () => {
    const task = makeTask({
      id: "t-1",
      contributesTo: [{ missionId: "m-target", missionTitle: "Target" }],
    });
    const missions: Mission[] = [makeMission({ tasks: [task] })];
    const result = addTaskContribution(missions, "t-1", { id: "m-target", title: "Target" });
    expect(result[0]!.tasks![0]!.contributesTo).toHaveLength(1);
  });
});

describe("removeTaskContribution", () => {
  it("remove contribuição da tarefa", () => {
    const task = makeTask({
      id: "t-1",
      contributesTo: [{ missionId: "m-x", missionTitle: "X" }],
    });
    const missions: Mission[] = [makeMission({ tasks: [task] })];
    const result = removeTaskContribution(missions, "t-1", "m-x");
    expect(result[0]!.tasks![0]!.contributesTo).toHaveLength(0);
  });
});

/* ─── addExternalContrib / removeExternalContrib ────────────────────────────── */

describe("addExternalContrib", () => {
  it("adiciona contribuição externa à missão alvo", () => {
    const missions: Mission[] = [
      makeMission({ id: "m-target", externalContributions: [] }),
    ];
    const contrib: ExternalContribution = {
      type: "indicator",
      id: "ec-1",
      title: "External KR",
      sourceMission: { id: "m-source", title: "Source" },
    };
    const result = addExternalContrib(missions, "m-target", contrib);
    expect(result[0]!.externalContributions).toHaveLength(1);
    expect(result[0]!.externalContributions![0]!.id).toBe("ec-1");
  });

  it("não duplica contribuição externa com mesmo id", () => {
    const contrib: ExternalContribution = {
      type: "task",
      id: "ec-dup",
      title: "Dup",
      sourceMission: { id: "m-s", title: "S" },
    };
    const missions: Mission[] = [
      makeMission({ id: "m-target", externalContributions: [contrib] }),
    ];
    const result = addExternalContrib(missions, "m-target", contrib);
    expect(result[0]!.externalContributions).toHaveLength(1);
  });
});

describe("removeExternalContrib", () => {
  it("remove contribuição externa da missão", () => {
    const contrib: ExternalContribution = {
      type: "indicator",
      id: "ec-1",
      title: "EC",
      sourceMission: { id: "m-s", title: "S" },
    };
    const missions: Mission[] = [
      makeMission({ id: "m-target", externalContributions: [contrib] }),
    ];
    const result = removeExternalContrib(missions, "m-target", "ec-1");
    expect(result[0]!.externalContributions).toHaveLength(0);
  });
});
