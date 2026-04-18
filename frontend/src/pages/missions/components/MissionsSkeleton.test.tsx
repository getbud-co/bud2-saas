// ─── MissionsSkeleton — testes de componente ──────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MissionsPageSkeleton } from "./MissionsSkeleton";

describe("MissionsPageSkeleton", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renderiza sem erros", () => {
    render(<MissionsPageSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
  });

  it("possui aria-label 'Carregando'", () => {
    render(<MissionsPageSkeleton />);
    const status = screen.getByLabelText("Carregando");
    expect(status).toBeInTheDocument();
  });

  it("renderiza múltiplos itens de missão skeleton", () => {
    const { container } = render(<MissionsPageSkeleton />);
    // Deve ter pelo menos 5 itens de missão (3 no primeiro bloco + 2 no segundo)
    const missionItems = container.querySelectorAll("[class*='missionItem']");
    expect(missionItems.length).toBeGreaterThanOrEqual(5);
  });

  it("renderiza cabeçalhos de seção de time", () => {
    const { container } = render(<MissionsPageSkeleton />);
    const teamHeaders = container.querySelectorAll("[class*='teamHeader']");
    expect(teamHeaders.length).toBe(2);
  });
});
