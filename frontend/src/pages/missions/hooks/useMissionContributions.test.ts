// ─── useMissionContributions — testes do hook ─────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMissionContributions } from "./useMissionContributions";
import type { Mission } from "@/types";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function makeSetState<T>(initial: T) {
  let value = initial;
  const setter = vi.fn((updater: T | ((prev: T) => T)) => {
    value = typeof updater === "function" ? (updater as (prev: T) => T)(value) : updater;
  });
  return { get: () => value, setter };
}

function setupHook() {
  const missions = makeSetState<Mission[]>([]);
  const contributesTo = makeSetState<{ missionId: string; missionTitle: string }[]>([]);
  const openRowMenu = makeSetState<string | null>(null);
  const openContributeFor = makeSetState<string | null>(null);
  const contributePickerSearch = makeSetState<string>("");

  return {
    missions,
    contributesTo,
    openRowMenu,
    openContributeFor,
    contributePickerSearch,
    hookParams: () => ({
      setMissions: missions.setter as unknown as React.Dispatch<React.SetStateAction<Mission[]>>,
      setDrawerContributesTo: contributesTo.setter as unknown as React.Dispatch<React.SetStateAction<{ missionId: string; missionTitle: string }[]>>,
      setOpenRowMenu: openRowMenu.setter as unknown as React.Dispatch<React.SetStateAction<string | null>>,
      setOpenContributeFor: openContributeFor.setter as unknown as React.Dispatch<React.SetStateAction<string | null>>,
      setContributePickerSearch: contributePickerSearch.setter as unknown as React.Dispatch<React.SetStateAction<string>>,
    }),
  };
}

/* ─── Testes ────────────────────────────────────────────────────────────────── */

describe("useMissionContributions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retorna a estrutura correta", () => {
    const ctx = setupHook();
    const { result } = renderHook(() => useMissionContributions(ctx.hookParams()));

    expect(result.current).toHaveProperty("removeContribConfirm");
    expect(result.current).toHaveProperty("setRemoveContribConfirm");
    expect(result.current).toHaveProperty("handleRequestRemoveContribution");
    expect(result.current).toHaveProperty("handleRemoveContribution");
    expect(result.current).toHaveProperty("handleAddContribution");
  });

  it("removeContribConfirm inicia como null", () => {
    const ctx = setupHook();
    const { result } = renderHook(() => useMissionContributions(ctx.hookParams()));
    expect(result.current.removeContribConfirm).toBeNull();
  });

  it("handleRequestRemoveContribution define removeContribConfirm", () => {
    const ctx = setupHook();
    const { result } = renderHook(() => useMissionContributions(ctx.hookParams()));

    act(() => {
      result.current.handleRequestRemoveContribution("kr-1", "indicator", "m-target", "Missão Alvo");
    });

    expect(result.current.removeContribConfirm).toEqual({
      itemId: "kr-1",
      itemType: "indicator",
      targetMissionId: "m-target",
      targetMissionTitle: "Missão Alvo",
    });
  });

  it("setRemoveContribConfirm pode limpar o estado de confirmação", () => {
    const ctx = setupHook();
    const { result } = renderHook(() => useMissionContributions(ctx.hookParams()));

    act(() => {
      result.current.handleRequestRemoveContribution("kr-1", "indicator", "m-t", "Alvo");
    });
    expect(result.current.removeContribConfirm).not.toBeNull();

    act(() => {
      result.current.setRemoveContribConfirm(null);
    });
    expect(result.current.removeContribConfirm).toBeNull();
  });

  it("handleRemoveContribution limpa openRowMenu e openContributeFor", () => {
    const ctx = setupHook();
    const { result } = renderHook(() => useMissionContributions(ctx.hookParams()));

    act(() => {
      result.current.handleRemoveContribution("kr-1", "indicator", "m-target");
    });

    expect(ctx.openRowMenu.setter).toHaveBeenCalledWith(null);
    expect(ctx.openContributeFor.setter).toHaveBeenCalledWith(null);
  });

  it("handleAddContribution limpa openRowMenu, openContributeFor e search", () => {
    const ctx = setupHook();
    const { result } = renderHook(() => useMissionContributions(ctx.hookParams()));

    const mockKR = {
      id: "kr-1",
      title: "Indicador teste",
      progress: 50,
      status: "on_track" as const,
      owner: { firstName: "João", lastName: "Silva", initials: "JS" },
    };

    act(() => {
      result.current.handleAddContribution(
        mockKR as any,
        "indicator",
        "m-source",
        "Missão Origem",
        "m-target",
        "Missão Alvo",
      );
    });

    expect(ctx.openRowMenu.setter).toHaveBeenCalledWith(null);
    expect(ctx.openContributeFor.setter).toHaveBeenCalledWith(null);
    expect(ctx.contributePickerSearch.setter).toHaveBeenCalledWith("");
  });
});
