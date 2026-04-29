import { describe, expect, it } from "vitest";
import { diffMission } from "./missions-diff";
import type { Mission, KeyResult, MissionTask } from "@/types";

function baseMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m-1",
    orgId: "org-1",
    parentId: null,
    depth: 0,
    path: ["m-1"],
    title: "Reduzir churn",
    description: null,
    ownerId: "u-1",
    teamId: null,
    status: "active",
    visibility: "public",
    progress: 0,
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    completedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    deletedAt: null,
    keyResults: [],
    tasks: [],
    children: [],
    tags: [],
    ...overrides,
  };
}

function baseKR(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: "ind-1",
    orgId: "org-1",
    missionId: "m-1",
    parentKrId: null,
    title: "Churn",
    description: null,
    ownerId: "u-1",
    teamId: null,
    measurementMode: "manual",
    goalType: "reach",
    targetValue: "100",
    currentValue: "0",
    startValue: "0",
    lowThreshold: null,
    highThreshold: null,
    unit: "percent",
    unitLabel: "%",
    expectedValue: null,
    status: "on_track",
    progress: 0,
    periodLabel: null,
    periodStart: null,
    periodEnd: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    deletedAt: null,
    linkedMissionId: null,
    linkedSurveyId: null,
    externalSource: null,
    externalConfig: null,
    ...overrides,
  };
}

function baseTask(overrides: Partial<MissionTask> = {}): MissionTask {
  return {
    id: "srv-task-1",
    missionId: "m-1",
    keyResultId: null,
    title: "Triage",
    description: null,
    ownerId: "u-1",
    teamId: null,
    dueDate: null,
    isDone: false,
    status: "todo",
    completedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("diffMission - mission row", () => {
  it("returns null patch when nothing changed", () => {
    const m = baseMission();
    const diff = diffMission(m, m);
    expect(diff.missionPatch).toBeNull();
  });

  it("only includes changed mission fields", () => {
    const current = baseMission();
    const form = baseMission({ title: "novo", status: "paused" });
    const diff = diffMission(current, form);
    expect(diff.missionPatch).toEqual({ title: "novo", status: "paused" });
  });

  it("ignores UI-only fields like progress, depth, path, completedAt", () => {
    const current = baseMission();
    const form = baseMission({ progress: 75, depth: 3, path: ["x", "m-1"], completedAt: "2024-02-01T00:00:00Z" });
    const diff = diffMission(current, form);
    expect(diff.missionPatch).toBeNull();
  });
});

describe("diffMission - indicators", () => {
  it("creates a brand-new indicator when its id is a draft", () => {
    const current = baseMission();
    const form = baseMission({ keyResults: [baseKR({ id: "draft-abc", title: "Novo KR" })] });
    const diff = diffMission(current, form);
    expect(diff.indicatorOps.create).toHaveLength(1);
    expect(diff.indicatorOps.create[0]!.title).toBe("Novo KR");
    expect(diff.indicatorOps.create[0]!.missionId).toBe("m-1");
    expect(diff.indicatorOps.update).toHaveLength(0);
    expect(diff.indicatorOps.delete).toHaveLength(0);
  });

  it("updates an indicator when a tracked field differs", () => {
    const original = baseKR({ id: "ind-1", title: "Churn", currentValue: "0" });
    const edited = baseKR({ id: "ind-1", title: "Churn", currentValue: "42" });
    const diff = diffMission(
      baseMission({ keyResults: [original] }),
      baseMission({ keyResults: [edited] }),
    );
    expect(diff.indicatorOps.update).toEqual([{ id: "ind-1", patch: { currentValue: "42" } }]);
    expect(diff.indicatorOps.create).toHaveLength(0);
    expect(diff.indicatorOps.delete).toHaveLength(0);
  });

  it("deletes an indicator that disappeared from the form", () => {
    const diff = diffMission(
      baseMission({ keyResults: [baseKR({ id: "ind-1" }), baseKR({ id: "ind-2", title: "B" })] }),
      baseMission({ keyResults: [baseKR({ id: "ind-1" })] }),
    );
    expect(diff.indicatorOps.delete).toEqual(["ind-2"]);
  });

  it("never deletes a draft id (it never existed on the server)", () => {
    const diff = diffMission(
      baseMission({ keyResults: [baseKR({ id: "draft-x" })] }),
      baseMission({ keyResults: [] }),
    );
    expect(diff.indicatorOps.delete).toHaveLength(0);
  });

  it("emits no ops when keyResults are deeply equal", () => {
    const kr = baseKR();
    const diff = diffMission(
      baseMission({ keyResults: [kr] }),
      baseMission({ keyResults: [{ ...kr }] }),
    );
    expect(diff.indicatorOps.create).toHaveLength(0);
    expect(diff.indicatorOps.update).toHaveLength(0);
    expect(diff.indicatorOps.delete).toHaveLength(0);
  });
});

describe("diffMission - tasks", () => {
  it("creates a task with isDone passed through", () => {
    const diff = diffMission(
      baseMission(),
      baseMission({ tasks: [baseTask({ id: "draft-y", title: "novo", isDone: true })] }),
    );
    expect(diff.taskOps.create).toHaveLength(1);
    expect(diff.taskOps.create[0]!.title).toBe("novo");
    expect(diff.taskOps.create[0]!.isDone).toBe(true);
  });

  it("updates a task when isDone changes", () => {
    const diff = diffMission(
      baseMission({ tasks: [baseTask({ id: "srv-task-1", isDone: false })] }),
      baseMission({ tasks: [baseTask({ id: "srv-task-1", isDone: true })] }),
    );
    expect(diff.taskOps.update).toEqual([{ id: "srv-task-1", patch: { isDone: true } }]);
  });

  it("never deletes a task whose id matches a client-draft prefix", () => {
    // Regression: subtask ids minted by materializeMissionItems use the
    // "t-" prefix. They must not appear in DELETE ops even if they end up
    // in current.tasks but not in form.tasks.
    const diff = diffMission(
      baseMission({ tasks: [baseTask({ id: "t-12345-abc" })] }),
      baseMission({ tasks: [] }),
    );
    expect(diff.taskOps.delete).toHaveLength(0);
  });

  it("never deletes a task whose id starts with task- (local-only)", () => {
    const diff = diffMission(
      baseMission({ tasks: [baseTask({ id: "task-12345" })] }),
      baseMission({ tasks: [] }),
    );
    expect(diff.taskOps.delete).toHaveLength(0);
  });

  it("deletes a task removed from the form", () => {
    const diff = diffMission(
      baseMission({ tasks: [baseTask({ id: "srv-task-1" }), baseTask({ id: "srv-task-2", title: "B" })] }),
      baseMission({ tasks: [baseTask({ id: "srv-task-1" })] }),
    );
    expect(diff.taskOps.delete).toEqual(["srv-task-2"]);
  });
});

describe("diffMission - mixed", () => {
  it("emits all three categories at once", () => {
    const current = baseMission({
      keyResults: [baseKR({ id: "ind-1", title: "old" }), baseKR({ id: "ind-2", title: "removed" })],
      tasks: [baseTask({ id: "srv-task-1", title: "old" })],
    });
    const form = baseMission({
      title: "novo",
      keyResults: [
        baseKR({ id: "ind-1", title: "new" }),
        baseKR({ id: "draft-add" }),
      ],
      tasks: [
        baseTask({ id: "srv-task-1", title: "novo" }),
        baseTask({ id: "draft-task" }),
      ],
    });
    const diff = diffMission(current, form);
    expect(diff.missionPatch).toEqual({ title: "novo" });
    expect(diff.indicatorOps.create).toHaveLength(1);
    expect(diff.indicatorOps.update).toEqual([{ id: "ind-1", patch: { title: "new" } }]);
    expect(diff.indicatorOps.delete).toEqual(["ind-2"]);
    expect(diff.taskOps.create).toHaveLength(1);
    expect(diff.taskOps.update).toEqual([{ id: "srv-task-1", patch: { title: "novo" } }]);
  });
});
