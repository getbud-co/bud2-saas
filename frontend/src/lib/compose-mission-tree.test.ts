import { describe, expect, it } from "vitest";
import { composeMissionTree } from "./compose-mission-tree";
import type { components } from "@/lib/types";
import type { KeyResult, MissionTask } from "@/types";

type ApiMission = components["schemas"]["Mission"];

const apiMission: ApiMission = {
  id: "m-1",
  org_id: "org-1",
  parent_id: null,
  owner_id: "u-1",
  team_id: null,
  title: "Reduzir churn",
  description: null,
  status: "active",
  visibility: "public",
  kanban_status: "todo",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  completed_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const kr: KeyResult = {
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
};

const task: MissionTask = {
  id: "t-1",
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
};

describe("composeMissionTree", () => {
  it("returns empty when no missions", () => {
    expect(composeMissionTree(undefined, [kr], [task])).toEqual([]);
    expect(composeMissionTree([], [kr], [task])).toEqual([]);
  });

  it("attaches indicators and mission-level tasks by mission_id", () => {
    const tree = composeMissionTree([apiMission], [kr], [task]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe("m-1");
    expect(tree[0]!.keyResults).toHaveLength(1);
    expect(tree[0]!.keyResults![0]!.id).toBe(kr.id);
    // Indicators are returned with their own tasks array (empty when no
    // tasks are nested under that indicator).
    expect(tree[0]!.keyResults![0]!.tasks).toEqual([]);
    expect(tree[0]!.tasks).toEqual([task]);
  });

  it("attaches a task to its indicator when keyResultId is set", () => {
    const indTask: MissionTask = { ...task, id: "t-ind", keyResultId: kr.id };
    const tree = composeMissionTree([apiMission], [kr], [indTask]);
    expect(tree[0]!.tasks).toEqual([]);
    expect(tree[0]!.keyResults![0]!.tasks).toHaveLength(1);
    expect(tree[0]!.keyResults![0]!.tasks![0]!.id).toBe("t-ind");
  });

  it("returns mission with empty children arrays when no matches", () => {
    const tree = composeMissionTree([apiMission], [], []);
    expect(tree[0]!.keyResults).toEqual([]);
    expect(tree[0]!.tasks).toEqual([]);
  });

  it("does not attach orphan indicators (no parent in missions list)", () => {
    const orphan: KeyResult = { ...kr, id: "ind-2", missionId: "m-other" };
    const tree = composeMissionTree([apiMission], [kr, orphan], []);
    expect(tree[0]!.keyResults).toHaveLength(1);
    expect(tree[0]!.keyResults![0]!.id).toBe("ind-1");
  });

  it("groups multiple indicators and tasks under the same mission", () => {
    const tree = composeMissionTree(
      [apiMission],
      [kr, { ...kr, id: "ind-2" }],
      [task, { ...task, id: "t-2" }],
    );
    expect(tree[0]!.keyResults).toHaveLength(2);
    expect(tree[0]!.tasks).toHaveLength(2);
  });

  it("wires children by parent_id and computes depth/path", () => {
    const root: ApiMission = { ...apiMission, id: "m-root", title: "root" };
    const child: ApiMission = { ...apiMission, id: "m-child", title: "child", parent_id: "m-root" };
    const grand: ApiMission = { ...apiMission, id: "m-grand", title: "grand", parent_id: "m-child" };

    const tree = composeMissionTree([root, child, grand], [], []);
    expect(tree).toHaveLength(3);

    const r = tree.find((m) => m.id === "m-root")!;
    const c = tree.find((m) => m.id === "m-child")!;
    const g = tree.find((m) => m.id === "m-grand")!;

    expect(r.depth).toBe(0);
    expect(r.path).toEqual(["m-root"]);
    expect(r.children?.map((m) => m.id)).toEqual(["m-child"]);

    expect(c.depth).toBe(1);
    expect(c.path).toEqual(["m-root", "m-child"]);
    expect(c.children?.map((m) => m.id)).toEqual(["m-grand"]);

    expect(g.depth).toBe(2);
    expect(g.path).toEqual(["m-root", "m-child", "m-grand"]);
    expect(g.children).toEqual([]);
  });

  it("orphans (parent missing in input) are promoted to roots", () => {
    const orphan: ApiMission = { ...apiMission, id: "m-orphan", parent_id: "m-not-in-input" };
    const tree = composeMissionTree([orphan], [], []);
    expect(tree[0]!.parentId).toBeNull();
    expect(tree[0]!.depth).toBe(0);
  });

  it("two siblings appear in input order under the same parent", () => {
    const root: ApiMission = { ...apiMission, id: "r" };
    const a: ApiMission = { ...apiMission, id: "a", parent_id: "r" };
    const b: ApiMission = { ...apiMission, id: "b", parent_id: "r" };
    const tree = composeMissionTree([root, a, b], [], []);
    const r = tree.find((m) => m.id === "r")!;
    expect(r.children?.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("handles two missions in one call", () => {
    const m2: ApiMission = { ...apiMission, id: "m-2", title: "Other" };
    const kr2: KeyResult = { ...kr, id: "ind-2", missionId: "m-2" };
    const tree = composeMissionTree([apiMission, m2], [kr, kr2], []);
    expect(tree.map((m) => m.id)).toEqual(["m-1", "m-2"]);
    expect(tree[0]!.keyResults![0]!.id).toBe("ind-1");
    expect(tree[1]!.keyResults![0]!.id).toBe("ind-2");
  });
});
