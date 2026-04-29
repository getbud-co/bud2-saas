import { describe, it, expect } from "vitest";
import { getKanbanStatus, taskColToApiStatus, missionColToApiStatus } from "./kanbanUtils";

describe("getKanbanStatus — task", () => {
  it("maps in_progress to doing", () => {
    expect(getKanbanStatus({ type: "task", status: "in_progress" })).toBe("doing");
  });

  it("maps done to done", () => {
    expect(getKanbanStatus({ type: "task", status: "done" })).toBe("done");
  });

  it("maps todo to todo", () => {
    expect(getKanbanStatus({ type: "task", status: "todo" })).toBe("todo");
  });

  it("falls back to todo for unknown task status", () => {
    expect(getKanbanStatus({ type: "task", status: "cancelled" })).toBe("todo");
  });
});

describe("getKanbanStatus — mission", () => {
  it("maps active to doing", () => {
    expect(getKanbanStatus({ type: "mission", status: "active" })).toBe("doing");
  });

  it("maps completed to done", () => {
    expect(getKanbanStatus({ type: "mission", status: "completed" })).toBe("done");
  });

  it("maps draft to todo", () => {
    expect(getKanbanStatus({ type: "mission", status: "draft" })).toBe("todo");
  });

  it("falls back to todo for paused/cancelled (should not appear on board, but safe)", () => {
    expect(getKanbanStatus({ type: "mission", status: "paused" })).toBe("todo");
    expect(getKanbanStatus({ type: "mission", status: "cancelled" })).toBe("todo");
  });
});

describe("taskColToApiStatus", () => {
  it("doing maps to in_progress", () => {
    expect(taskColToApiStatus("doing")).toBe("in_progress");
  });

  it("todo passes through", () => {
    expect(taskColToApiStatus("todo")).toBe("todo");
  });

  it("done passes through", () => {
    expect(taskColToApiStatus("done")).toBe("done");
  });
});

describe("missionColToApiStatus", () => {
  it("todo maps to draft", () => {
    expect(missionColToApiStatus("todo")).toBe("draft");
  });

  it("doing maps to active", () => {
    expect(missionColToApiStatus("doing")).toBe("active");
  });

  it("done maps to completed", () => {
    expect(missionColToApiStatus("done")).toBe("completed");
  });
});
