import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/contexts/AuthContext";
import {
  useIndicators,
  useCreateIndicator,
  apiIndicatorToKeyResult,
  keyResultToCreateIndicatorBody,
  keyResultToPatchIndicatorBody,
  type ApiIndicator,
} from "./use-indicators";

const organization = {
  id: "org-1",
  name: "Org 1",
  domain: "org-1.example.com",
  workspace: "org-1",
  status: "active",
  membership_role: "super-admin",
  membership_status: "active",
};

const apiIndicator: ApiIndicator = {
  id: "ind-1",
  org_id: "org-1",
  mission_id: "m-1",
  owner_id: "u-1",
  title: "Churn",
  description: null,
  target_value: 100,
  current_value: 50,
  unit: "%",
  status: "active",
  sort_order: 0,
  due_date: null,
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

describe("useIndicators", () => {
  it("does not fetch without an active organization", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(null);
    const { result } = renderHook(() => useIndicators(), { wrapper: Wrapper });
    expect(result.current.data).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns adapted KeyResult objects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [apiIndicator], total: 1, page: 1, size: 100 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { Wrapper } = createWrapper(organization);
    const { result } = renderHook(() => useIndicators({ missionId: "m-1" }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    const kr = result.current.data[0];
    expect(kr.id).toBe("ind-1");
    expect(kr.missionId).toBe("m-1");
    expect(kr.title).toBe("Churn");
    expect(kr.targetValue).toBe("100");
    expect(kr.currentValue).toBe("50");
    expect(kr.unit).toBe("percent");
    expect(kr.status).toBe("on_track");
  });

  it("propagates mission_id and owner_id filters to the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [], total: 0, page: 1, size: 100 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization);
    renderHook(() => useIndicators({ missionId: "m-1", ownerId: "u-1" }), { wrapper: Wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = lastFetchedURL(fetchMock);
    expect(url).toContain("mission_id=m-1");
    expect(url).toContain("owner_id=u-1");
  });
});

describe("useCreateIndicator", () => {
  it("posts a create body and returns the adapted KeyResult", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(apiIndicator), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper(organization);
    const { result } = renderHook(() => useCreateIndicator(), { wrapper: Wrapper });

    const created = await result.current.mutateAsync({
      missionId: "m-1",
      ownerId: "u-1",
      title: "Churn",
      targetValue: "100",
      currentValue: "50",
      unitLabel: "%",
    });
    expect(created.id).toBe("ind-1");
    expect(fetchMock).toHaveBeenCalled();
    const url = lastFetchedURL(fetchMock);
    expect(url).toContain("/indicators");
  });
});

describe("apiIndicatorToKeyResult", () => {
  it("uses safe defaults for fields the API does not own", () => {
    const kr = apiIndicatorToKeyResult(apiIndicator);
    expect(kr.measurementMode).toBe("manual");
    expect(kr.goalType).toBe("reach");
    expect(kr.parentKrId).toBeNull();
    expect(kr.linkedMissionId).toBeNull();
    expect(kr.startValue).toBe("0");
  });

  it("normalizes nullable numerics to strings or null", () => {
    const kr = apiIndicatorToKeyResult({ ...apiIndicator, target_value: null, current_value: null });
    expect(kr.targetValue).toBeNull();
    expect(kr.currentValue).toBe("0");
  });

  it("maps API status to UI status", () => {
    expect(apiIndicatorToKeyResult({ ...apiIndicator, status: "draft" }).status).toBe("on_track");
    expect(apiIndicatorToKeyResult({ ...apiIndicator, status: "at_risk" }).status).toBe("attention");
    expect(apiIndicatorToKeyResult({ ...apiIndicator, status: "done" }).status).toBe("completed");
    expect(apiIndicatorToKeyResult({ ...apiIndicator, status: "archived" }).status).toBe("off_track");
  });
});

describe("keyResultToCreateIndicatorBody", () => {
  it("trims to API-known fields and parses numerics", () => {
    const body = keyResultToCreateIndicatorBody({
      missionId: "m-1",
      ownerId: "u-1",
      title: "Churn",
      targetValue: "100.5",
      currentValue: "",
      unitLabel: "%",
      status: "completed",
    });
    expect(body.mission_id).toBe("m-1");
    expect(body.title).toBe("Churn");
    expect(body.target_value).toBe(100.5);
    expect(body.current_value).toBeUndefined();
    expect(body.unit).toBe("%");
    expect(body.status).toBe("done");
  });
});

describe("keyResultToPatchIndicatorBody", () => {
  it("only includes keys that were provided in the patch", () => {
    const body = keyResultToPatchIndicatorBody({ title: "new" });
    expect(Object.keys(body)).toEqual(["title"]);
  });
});
