import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/contexts/AuthContext";
import { useMissions } from "./use-missions";

const organization = {
  id: "org-1",
  name: "Org 1",
  domain: "org-1.example.com",
  workspace: "org-1",
  status: "active",
  membership_role: "super-admin",
  membership_status: "active",
};

const mission = {
  id: "m-1",
  org_id: "org-1",
  cycle_id: null,
  parent_id: null,
  owner_id: "u-1",
  team_id: null,
  title: "Reduzir churn",
  description: null,
  status: "active",
  visibility: "public",
  kanban_status: "todo",
  sort_order: 0,
  due_date: null,
  completed_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function createWrapper(
  activeOrganization: typeof organization | null,
  token = activeOrganization ? "token" : null,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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

function payload(missions: object[] = [], extra: Partial<{ total: number; page: number; size: number }> = {}) {
  return { data: missions, page: 1, size: 100, total: missions.length, ...extra };
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

describe("useMissions", () => {
  it("does not fetch without an active organization", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(null);

    const { result } = renderHook(() => useMissions(), { wrapper: Wrapper });

    expect(result.current.data).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fetch without an auth token", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization, null);

    const { result } = renderHook(() => useMissions(), { wrapper: Wrapper });

    expect(result.current.data).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("scopes the query cache by active organization", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload([mission], { total: 42 })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { Wrapper, queryClient } = createWrapper(organization);

    const { result } = renderHook(() => useMissions(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    expect(result.current.total).toBe(42);
    expect(queryClient.getQueryData(["missions", "org-1", undefined])).toBeDefined();
  });

  it("omits parent_id from the URL when params do not include parentId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization);

    const { result } = renderHook(() => useMissions({}), { wrapper: Wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    void result.current;

    const url = lastFetchedURL(fetchMock);
    expect(url).not.toContain("parent_id");
  });

  it("sends parent_id=null when parentId is explicitly null (root-only filter)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization);

    renderHook(() => useMissions({ parentId: null }), { wrapper: Wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const url = lastFetchedURL(fetchMock);
    expect(url).toContain("parent_id=null");
  });

  it("sends parent_id=<uuid> when parentId is a UUID", async () => {
    const parentID = "11111111-1111-1111-1111-111111111111";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization);

    renderHook(() => useMissions({ parentId: parentID }), { wrapper: Wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const url = lastFetchedURL(fetchMock);
    expect(url).toContain(`parent_id=${parentID}`);
  });

  it("propagates status, cycle_id, owner_id, team_id filters to the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization);

    renderHook(
      () =>
        useMissions({
          status: "active",
          cycleId: "cycle-1",
          ownerId: "user-1",
          teamId: "team-1",
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const url = lastFetchedURL(fetchMock);
    expect(url).toContain("status=active");
    expect(url).toContain("cycle_id=cycle-1");
    expect(url).toContain("owner_id=user-1");
    expect(url).toContain("team_id=team-1");
  });
});
