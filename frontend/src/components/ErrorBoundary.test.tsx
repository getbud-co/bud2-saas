// ─── ErrorBoundary — testes unitários ───────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

/* ─── Componentes auxiliares ────────────────────────────────────────────────── */

function NormalChild() {
  return <div>Conteúdo normal</div>;
}

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Erro de teste");
  return <div>Conteúdo sem erro</div>;
}

function ThrowingChildUnknown({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw "string error";
  return <div>OK</div>;
}

/* ─── Suprimir console.error nos testes de erro ─────────────────────────────── */

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ─── Testes ────────────────────────────────────────────────────────────────── */

describe("ErrorBoundary", () => {
  it("renderiza children normalmente quando não há erro", () => {
    render(
      <ErrorBoundary>
        <NormalChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Conteúdo normal")).toBeInTheDocument();
  });

  it("renderiza ErrorScreen quando um filho lança erro", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("passa error.name como errorCode para ErrorScreen", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("mostra 'UnknownError' quando o erro não é instância de Error", () => {
    render(
      <ErrorBoundary>
        <ThrowingChildUnknown shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("UnknownError")).toBeInTheDocument();
  });

  it("botão de retry reseta o boundary e re-renderiza os children", () => {
    // Usa closure para controlar o throw sem precisar de rerender
    let shouldThrow = true;

    function ControlledThrower() {
      if (shouldThrow) throw new Error("Erro controlado");
      return <div>Conteúdo sem erro</div>;
    }

    render(
      <ErrorBoundary>
        <ControlledThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Para de lançar ANTES do click para que o re-render funcione
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Conteúdo sem erro")).toBeInTheDocument();
  });

  it("loga o erro via console.error no componentDidCatch", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>,
    );
    expect(console.error).toHaveBeenCalled();
  });
});
