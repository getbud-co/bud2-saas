import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/contexts/AuthContext";
import { useCycles } from "./use-cycles";
import { useRoles } from "./use-roles";
import { useTeams } from "./use-teams";
import { useUsers } from "./use-users";

vi.unmock("@/hooks/use-cycles");

const organization = {
  id: "org-1",
  name: "Org 1",
  domain: "org-1.example.com",
  workspace: "org-1",
  status: "active",
  membership_role: "super-admin",
  membership_status: "active",
};

const user = {
  id: "u1",
  first_name: "Maria",
  last_name: "Soares",
  email: "maria@example.com",
  status: "active",
  is_system_admin: false,
  language: "pt-br",
  role: "colaborador",
  membership_status: "active",
  team_ids: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const team = {
  id: "team-1",
  org_id: "org-1",
  name: "Engenharia",
  description: null,
  color: "neutral",
  status: "active",
  members: [],
  member_count: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const cycle = {
  id: "cycle-1",
  org_id: "org-1",
  name: "Q1 2026",
  type: "quarterly",
  start_date: "2026-01-01",
  end_date: "2026-03-31",
  status: "active",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const role = {
  id: "role-1",
  slug: "colaborador",
  name: "Colaborador",
  description: "Acesso padrão",
  type: "system",
  scope: "self",
  is_default: true,
  permission_ids: [],
  users_count: 1,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function createWrapper(activeOrganization: typeof organization | null, token = activeOrganization ? "token" : null) {
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useUsers", () => {
  it("does not fetch without an active organization", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(null);

    const { result } = renderHook(() => useUsers(), { wrapper: Wrapper });

    expect(result.current.data).toEqual([]);
    expect(result.current.isTruncated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fetch without an auth token", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization, null);

    const { result } = renderHook(() => useUsers(), { wrapper: Wrapper });

    expect(result.current.data).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("scopes the query cache by active organization and exposes pagination metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [user], page: 1, size: 100, total: 125 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { Wrapper, queryClient } = createWrapper(organization);

    const { result } = renderHook(() => useUsers(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    expect(result.current.total).toBe(125);
    expect(result.current.isTruncated).toBe(true);
    expect(queryClient.getQueryData(["users", "org-1", undefined])).toEqual({
      data: [user],
      page: 1,
      size: 100,
      total: 125,
    });
  });
});

describe("tenant scoped API hooks", () => {
  it("scopes teams and cycles by active organization and exposes pagination metadata", async () => {
    const teamsPayload = { data: [team], page: 1, size: 100, total: 101 };
    const cyclesPayload = { data: [cycle], page: 1, size: 100, total: 102 };
    const fetchMock = vi.fn().mockImplementation((request: Request | string) => {
      const url = typeof request === "string" ? request : request.url;
      const payload = url.includes("/teams") ? teamsPayload : cyclesPayload;
      return Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper, queryClient } = createWrapper(organization);

    const { result: teamsResult } = renderHook(() => useTeams(), { wrapper: Wrapper });
    const { result: cyclesResult } = renderHook(() => useCycles(), { wrapper: Wrapper });

    await waitFor(() => expect(teamsResult.current.data).toHaveLength(1));
    await waitFor(() => expect(cyclesResult.current.data).toHaveLength(1));

    expect(teamsResult.current.isTruncated).toBe(true);
    expect(cyclesResult.current.isTruncated).toBe(true);
    expect(queryClient.getQueryData(["teams", "org-1", undefined])).toEqual(teamsPayload);
    expect(queryClient.getQueryData(["cycles", "org-1", undefined])).toEqual(cyclesPayload);
  });

  it("scopes roles by active organization", async () => {
    const payload = { data: [role] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { Wrapper, queryClient } = createWrapper(organization);

    const { result } = renderHook(() => useRoles(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    expect(queryClient.getQueryData(["roles", "org-1"])).toEqual([role]);
  });
});
