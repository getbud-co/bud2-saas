// ─── useMissionMentions — testes do hook ───────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMissionMentions } from "./useMissionMentions";
import { createRef } from "react";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const people = [
  { id: "u1", label: "João Silva", initials: "JS" },
  { id: "u2", label: "Maria Santos", initials: "MS" },
  { id: "u3", label: "Ana Oliveira", initials: "AO" },
];

function setup(initialNote = "") {
  let note = initialNote;
  const setDrawerNote = vi.fn((value: string) => {
    note = value;
  });
  const drawerNoteRef = createRef<HTMLTextAreaElement>();

  return {
    getNote: () => note,
    setDrawerNote,
    drawerNoteRef,
    hookParams: () => ({
      people,
      drawerNote: note,
      setDrawerNote,
      drawerNoteRef: drawerNoteRef as React.MutableRefObject<HTMLTextAreaElement | null>,
    }),
  };
}

/* ─── Testes ────────────────────────────────────────────────────────────────── */

describe("useMissionMentions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retorna a estrutura correta", () => {
    const ctx = setup();
    const { result } = renderHook(() => useMissionMentions(ctx.hookParams()));

    expect(result.current).toHaveProperty("mentionQuery");
    expect(result.current).toHaveProperty("setMentionQuery");
    expect(result.current).toHaveProperty("mentionIndex");
    expect(result.current).toHaveProperty("mentionResults");
    expect(result.current).toHaveProperty("insertMention");
    expect(result.current).toHaveProperty("handleNoteChange");
    expect(result.current).toHaveProperty("handleNoteKeyDown");
  });

  it("mentionQuery inicia como null", () => {
    const ctx = setup();
    const { result } = renderHook(() => useMissionMentions(ctx.hookParams()));
    expect(result.current.mentionQuery).toBeNull();
  });

  it("mentionResults inicia vazio quando mentionQuery é null", () => {
    const ctx = setup();
    const { result } = renderHook(() => useMissionMentions(ctx.hookParams()));
    expect(result.current.mentionResults).toEqual([]);
  });

  it("filtra pessoas quando mentionQuery é definido", () => {
    const ctx = setup();
    const { result } = renderHook(() => useMissionMentions(ctx.hookParams()));

    act(() => {
      result.current.setMentionQuery("joão");
    });

    expect(result.current.mentionResults).toHaveLength(1);
    expect(result.current.mentionResults[0]!.id).toBe("u1");
  });

  it("filtra com string vazia retorna todos", () => {
    const ctx = setup();
    const { result } = renderHook(() => useMissionMentions(ctx.hookParams()));

    act(() => {
      result.current.setMentionQuery("");
    });

    expect(result.current.mentionResults).toHaveLength(3);
  });

  it("mentionIndex inicia como 0", () => {
    const ctx = setup();
    const { result } = renderHook(() => useMissionMentions(ctx.hookParams()));
    expect(result.current.mentionIndex).toBe(0);
  });
});
