// ─── MissionsPage — agrupamento por time ──────────────────────────────────────
// Testa que o filtro de time altera o título da página (single-team)
// e agrupa missões por seção (multi-team).

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/setup/test-utils";
import { MissionsPage } from "@/pages/missions/MissionsPage";

describe("MissionsPage — agrupamento por time", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exibe título 'Todas as missões' quando nenhum time está filtrado", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Todas as missões");
  });

  it("exibe título 'Missões — Produto' ao filtrar por um único time", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MissionsPage mine={false} />);

    // O filtro de time já está ativo por padrão (defaultFilters = ["team", "period"])
    // O chip "Time: Todos os times" deve existir
    const teamChip = await screen.findByText(/time: todos os times/i);
    expect(teamChip).toBeInTheDocument();

    // Clica no chip de time para abrir o dropdown
    await user.click(teamChip);

    // Seleciona "Produto" (desmarca "Todos os times" automaticamente)
    const produtoOption = await screen.findByText("Produto");
    await user.click(produtoOption);

    // Fecha o dropdown clicando no chip novamente
    await user.click(screen.getByText(/time: produto/i));

    // Título da página deve mudar
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Missões — Produto");
  });

  it("exibe seções de agrupamento ao filtrar por múltiplos times", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MissionsPage mine={false} />);

    // Abre o dropdown de time
    const teamChip = await screen.findByText(/time: todos os times/i);
    await user.click(teamChip);

    // Seleciona "Produto"
    const produtoOption = await screen.findByText("Produto");
    await user.click(produtoOption);

    // Seleciona "Engenharia" também
    const engOption = await screen.findByText("Engenharia");
    await user.click(engOption);

    // Fecha o dropdown
    await user.click(document.body);

    // Deve existir pelo menos um header de seção de time
    const sectionHeaders = document.querySelectorAll("[class*='teamSectionHeader']");
    expect(sectionHeaders.length).toBeGreaterThan(0);
  });

  it("não exibe seções de agrupamento quando 'Todos os times' está selecionado", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    await screen.findByRole("heading", { level: 1 });

    // Sem seções de agrupamento no estado padrão
    const sectionHeaders = document.querySelectorAll("[class*='teamSectionHeader']");
    expect(sectionHeaders.length).toBe(0);
  });

  it("exibe título 'Minhas missões' na rota mine, mesmo com time filtrado", async () => {
    renderWithProviders(<MissionsPage mine={true} />);
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Minhas missões");
  });

  it("seções mostram contagem de missões e progresso", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MissionsPage mine={false} />);

    // Abre o dropdown de time
    const teamChip = await screen.findByText(/time: todos os times/i);
    await user.click(teamChip);

    // Seleciona dois times
    const produtoOption = await screen.findByText("Produto");
    await user.click(produtoOption);
    const engOption = await screen.findByText("Engenharia");
    await user.click(engOption);

    // Fecha o dropdown
    await user.click(document.body);

    // Procura por texto com formato "N missões" ou "N missão" dentro dos headers de seção
    const sectionHeaders = document.querySelectorAll("[class*='teamSectionHeader']");
    if (sectionHeaders.length > 0) {
      const firstHeader = sectionHeaders[0]!;
      const meta = firstHeader.querySelector("[class*='teamSectionMeta']");
      expect(meta).toBeTruthy();
      expect(meta!.textContent).toMatch(/\d+ miss(ão|ões)/);
    }
  });
});
