import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDragToClose } from "./useDragToClose";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockPanel(): HTMLDivElement {
  const el = document.createElement("div");
  // Simula getBoundingClientRect no topo da janela
  el.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    right: 400,
    bottom: 600,
    width: 400,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  document.body.appendChild(el);
  return el;
}

function createTouchEvent(type: string, clientY: number): TouchEvent {
  const touch = { clientY, clientX: 100, identifier: 0 } as Touch;

  return new TouchEvent(type, {
    touches: type === "touchend" ? [] as unknown as Touch[] : [touch],
    changedTouches: [touch],
    bubbles: true,
    cancelable: true,
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("useDragToClose", () => {
  let panel: HTMLDivElement;

  beforeEach(() => {
    panel = createMockPanel();
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(panel);
    vi.useRealTimers();
  });

  it("registra event listeners no painel quando enabled", () => {
    const addSpy = vi.spyOn(panel, "addEventListener");
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose));

    expect(addSpy).toHaveBeenCalledWith("touchstart", expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith("touchmove", expect.any(Function), { passive: false });
    expect(addSpy).toHaveBeenCalledWith("touchend", expect.any(Function), { passive: true });
  });

  it("remove event listeners ao desmontar", () => {
    const removeSpy = vi.spyOn(panel, "removeEventListener");
    const ref = { current: panel };
    const onClose = vi.fn();

    const { unmount } = renderHook(() => useDragToClose(ref, onClose));
    unmount();

    expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchend", expect.any(Function));
  });

  it("nao registra listeners quando enabled = false", () => {
    const addSpy = vi.spyOn(panel, "addEventListener");
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose, { enabled: false }));

    expect(addSpy).not.toHaveBeenCalledWith("touchstart", expect.any(Function), expect.anything());
  });

  it("nao registra listeners quando ref.current e null", () => {
    const ref = { current: null };
    const onClose = vi.fn();

    // Nao deve lancar erro
    expect(() => {
      renderHook(() => useDragToClose(ref, onClose));
    }).not.toThrow();
  });

  it("chama onClose quando arraste excede o threshold padrao (80px)", () => {
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose));

    // Touch start na zona superior (dentro dos 60px)
    panel.dispatchEvent(createTouchEvent("touchstart", 30));
    // Touch move para baixo (arraste)
    panel.dispatchEvent(createTouchEvent("touchmove", 130));
    // Touch end com delta > 80px
    panel.dispatchEvent(createTouchEvent("touchend", 130));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("nao chama onClose quando arraste fica abaixo do threshold e velocidade baixa", () => {
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose));

    panel.dispatchEvent(createTouchEvent("touchstart", 30));
    // Avanca o tempo para garantir velocidade baixa (delta=30px / 5000ms = 0.006 px/ms)
    vi.advanceTimersByTime(5000);
    panel.dispatchEvent(createTouchEvent("touchmove", 60));
    panel.dispatchEvent(createTouchEvent("touchend", 60));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("nao ativa arraste se touch comecar fora da zona superior (>60px)", () => {
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose));

    // Touch start fora da zona superior (acima de 60px do topo do painel)
    panel.dispatchEvent(createTouchEvent("touchstart", 100));
    panel.dispatchEvent(createTouchEvent("touchmove", 300));
    panel.dispatchEvent(createTouchEvent("touchend", 300));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("respeita threshold personalizado", () => {
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose, { threshold: 200 }));

    // Arraste de 150px — abaixo do threshold personalizado de 200
    panel.dispatchEvent(createTouchEvent("touchstart", 30));
    // Avanca tempo para velocidade baixa (150px / 5000ms = 0.03 px/ms)
    vi.advanceTimersByTime(5000);
    panel.dispatchEvent(createTouchEvent("touchmove", 180));
    panel.dispatchEvent(createTouchEvent("touchend", 180));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("aplica transform no painel durante o arraste para baixo", () => {
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose));

    panel.dispatchEvent(createTouchEvent("touchstart", 30));
    panel.dispatchEvent(createTouchEvent("touchmove", 80));

    expect(panel.style.transform).toBe("translateY(50px)");
  });

  it("reseta transform quando arraste nao atinge o threshold", () => {
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose));

    panel.dispatchEvent(createTouchEvent("touchstart", 30));
    // Avanca tempo para velocidade baixa (20px / 5000ms = 0.004 px/ms)
    vi.advanceTimersByTime(5000);
    panel.dispatchEvent(createTouchEvent("touchmove", 50));
    panel.dispatchEvent(createTouchEvent("touchend", 50));

    // Deve aplicar transicao suave de reset
    expect(panel.style.transition).toContain("transform");
    expect(panel.style.transition).toContain("opacity");

    // Apos timeout, limpa transition
    vi.advanceTimersByTime(250);
    expect(panel.style.transition).toBe("");
  });

  it("reduz opacidade durante o arraste", () => {
    const ref = { current: panel };
    const onClose = vi.fn();

    renderHook(() => useDragToClose(ref, onClose));

    panel.dispatchEvent(createTouchEvent("touchstart", 30));
    panel.dispatchEvent(createTouchEvent("touchmove", 230));

    // Opacidade reduzida proporcional ao delta: max(0.3, 1 - 200/400) = 0.5
    expect(Number(panel.style.opacity)).toBeLessThan(1);
    expect(Number(panel.style.opacity)).toBeGreaterThanOrEqual(0.3);
  });
});
