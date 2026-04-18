import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AllProviders } from "../../tests/setup/test-utils";
import { useTeamOverviewData, type PeriodFilter } from "./useTeamOverviewData";

function wrapper({ children }: { children: ReactNode }) {
  return <AllProviders>{children}</AllProviders>;
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("useTeamOverviewData", () => {
  beforeEach(() => localStorage.clear());

  // ═══════════════════════════════════════════════════════════════════════════
  // Estrutura de retorno
  // ═══════════════════════════════════════════════════════════════════════════

  it("retorna objeto com todas as propriedades esperadas", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    expect(result.current).toHaveProperty("teamIds");
    expect(result.current).toHaveProperty("teamNames");
    expect(result.current).toHaveProperty("memberCount");
    expect(result.current).toHaveProperty("periodFilter");
    expect(result.current).toHaveProperty("memberEngagements");
    expect(result.current).toHaveProperty("teamEngagement");
  });

  it("retorna teamIds iguais aos fornecidos", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-a", "team-b"]),
      { wrapper },
    );

    expect(result.current.teamIds).toEqual(["team-a", "team-b"]);
  });

  it("retorna periodFilter null quando nenhum filtro e fornecido", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    expect(result.current.periodFilter).toBeNull();
  });

  it("retorna periodFilter com valor quando filtro e fornecido", () => {
    const period: PeriodFilter = {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    };

    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"], period),
      { wrapper },
    );

    expect(result.current.periodFilter).toEqual(period);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // teamNames
  // ═══════════════════════════════════════════════════════════════════════════

  it("retorna teamNames como array", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    expect(Array.isArray(result.current.teamNames)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // memberCount
  // ═══════════════════════════════════════════════════════════════════════════

  it("retorna memberCount como numero", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    expect(typeof result.current.memberCount).toBe("number");
    expect(result.current.memberCount).toBeGreaterThanOrEqual(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // memberEngagements
  // ═══════════════════════════════════════════════════════════════════════════

  it("retorna memberEngagements como array", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    expect(Array.isArray(result.current.memberEngagements)).toBe(true);
  });

  it("cada membro tem propriedades obrigatorias", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    for (const member of result.current.memberEngagements) {
      expect(member).toHaveProperty("userId");
      expect(member).toHaveProperty("name");
      expect(member).toHaveProperty("engagementScore");
      expect(member).toHaveProperty("performanceScore");
      expect(member).toHaveProperty("overallScore");
      expect(member).toHaveProperty("healthStatus");
      expect(member).toHaveProperty("alerts");
      expect(member).toHaveProperty("trend");
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // teamEngagement
  // ═══════════════════════════════════════════════════════════════════════════

  it("retorna teamEngagement com estrutura correta", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    const te = result.current.teamEngagement;
    expect(te).toHaveProperty("teamId");
    expect(te).toHaveProperty("memberCount");
    expect(te).toHaveProperty("avgEngagementScore");
    expect(te).toHaveProperty("avgPerformanceScore");
    expect(te).toHaveProperty("engagementTrend");
    expect(te).toHaveProperty("performanceTrend");
    expect(te).toHaveProperty("byHealthStatus");
  });

  it("avgEngagementScore esta entre 0 e 100", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    expect(result.current.teamEngagement.avgEngagementScore).toBeGreaterThanOrEqual(0);
    expect(result.current.teamEngagement.avgEngagementScore).toBeLessThanOrEqual(100);
  });

  it("avgPerformanceScore esta entre 0 e 100", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    expect(result.current.teamEngagement.avgPerformanceScore).toBeGreaterThanOrEqual(0);
    expect(result.current.teamEngagement.avgPerformanceScore).toBeLessThanOrEqual(100);
  });

  it("byHealthStatus tem chaves healthy, attention, critical", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["team-1"]),
      { wrapper },
    );

    const hs = result.current.teamEngagement.byHealthStatus;
    expect(hs).toHaveProperty("healthy");
    expect(hs).toHaveProperty("attention");
    expect(hs).toHaveProperty("critical");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IDs inexistentes
  // ═══════════════════════════════════════════════════════════════════════════

  it("retorna memberCount 0 para team IDs inexistentes", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["nonexistent-team"]),
      { wrapper },
    );

    expect(result.current.memberCount).toBe(0);
  });

  it("retorna memberEngagements vazio para team IDs inexistentes", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["nonexistent-team"]),
      { wrapper },
    );

    expect(result.current.memberEngagements).toHaveLength(0);
  });

  it("retorna teamNames vazio para team IDs inexistentes", () => {
    const { result } = renderHook(
      () => useTeamOverviewData(["nonexistent-team"]),
      { wrapper },
    );

    expect(result.current.teamNames).toHaveLength(0);
  });
});
