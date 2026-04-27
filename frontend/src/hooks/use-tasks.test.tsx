import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/contexts/AuthContext";
import {
  useTasks,
  useCreateTask,
  apiTaskToMissionTask,
  missionTaskToCreateTaskBody,
  missionTaskToPatchTaskBody,
  type ApiTask,
} from "./use-tasks";

const organization = {
  id: "org-1",
  name: "Org 1",
  domain: "org-1.example.com",
  workspace: "org-1",
  status: "active",
  membership_role: "super-admin",
  membership_status: "active",
};

const apiTask: ApiTask = {
  id: "t-1",
  org_id: "org-1",
  mission_id: "m-1",
  indicator_id: null,
  assignee_id: "u-1",
  title: "Triage",
  description: null,
  status: "in_progress",
  sort_order: 0,
  due_date: null,
  completed_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function createWrapper(activeOrganization: typeof organization | null, token = activeOrganization ? "token" : null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider
      value={{
        isAuthenticated: activeOrganization !== null,
        initializing: false,
        user: null,
        activeOrganization,
        organizations: activeOrganization ? [activeOrganization] : [],
        login: vi.fn().mockResolvedValue(undefined),
        switchOrganization: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn(),
        getToken: vi.fn().mockReturnValue(token),
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
  return { Wrapper, queryClient };
}

function lastFetchedURL(fetchMock: ReturnType<typeof vi.fn>): string {
  const calls = fetchMock.mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) throw new Error("fetch was not called");
  const arg = lastCall[0] as Request | string;
  return typeof arg === "string" ? arg : arg.url;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTasks", () => {
  it("does not fetch without an active organization", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(null);
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });
    expect(result.current.data).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns adapted MissionTask objects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [apiTask], total: 1, page: 1, size: 100 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { Wrapper } = createWrapper(organization);
    const { result } = renderHook(() => useTasks({ missionId: "m-1" }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    const task = result.current.data[0]!;
    expect(task.id).toBe("t-1");
    expect(task.missionId).toBe("m-1");
    expect(task.ownerId).toBe("u-1");
    expect(task.isDone).toBe(false);
    expect(task.keyResultId).toBeNull();
  });

  it("propagates assignee_id filter to the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [], total: 0, page: 1, size: 100 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization);
    renderHook(() => useTasks({ assigneeId: "u-1" }), { wrapper: Wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastFetchedURL(fetchMock)).toContain("assignee_id=u-1");
  });
});

describe("useCreateTask", () => {
  it("posts a create body and returns the adapted MissionTask", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...apiTask, status: "done", completed_at: "2024-01-02T00:00:00Z" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization);
    const { result } = renderHook(() => useCreateTask(), { wrapper: Wrapper });

    const created = await result.current.mutateAsync({
      missionId: "m-1",
      assigneeId: "u-1",
      title: "Triage",
      isDone: true,
    });
    expect(created.isDone).toBe(true);
    expect(created.completedAt).toBe("2024-01-02T00:00:00Z");
  });
});

describe("apiTaskToMissionTask", () => {
  it("maps assignee_id to ownerId and status=done to isDone=true", () => {
    const t = apiTaskToMissionTask({ ...apiTask, status: "done" });
    expect(t.ownerId).toBe("u-1");
    expect(t.isDone).toBe(true);
  });

  it("isDone is false for any non-done status", () => {
    expect(apiTaskToMissionTask({ ...apiTask, status: "todo" }).isDone).toBe(false);
    expect(apiTaskToMissionTask({ ...apiTask, status: "in_progress" }).isDone).toBe(false);
    expect(apiTaskToMissionTask({ ...apiTask, status: "cancelled" }).isDone).toBe(false);
  });
});

describe("missionTaskToCreateTaskBody", () => {
  it("maps isDone to status", () => {
    const done = missionTaskToCreateTaskBody({ missionId: "m-1", assigneeId: "u-1", title: "x", isDone: true });
    expect(done.status).toBe("done");
    const open = missionTaskToCreateTaskBody({ missionId: "m-1", assigneeId: "u-1", title: "x", isDone: false });
    expect(open.status).toBe("todo");
  });
});

describe("missionTaskToPatchTaskBody", () => {
  it("only includes provided keys", () => {
    expect(Object.keys(missionTaskToPatchTaskBody({ title: "new" }))).toEqual(["title"]);
  });

  it("maps isDone to status when present", () => {
    expect(missionTaskToPatchTaskBody({ isDone: true }).status).toBe("done");
    expect(missionTaskToPatchTaskBody({ isDone: false }).status).toBe("todo");
  });
});
