// ─── MissionsPage — filtro de time de apoio ───────────────────────────────────
// Testa que o filtro "Apoio" está registrado nas FILTER_OPTIONS,
// pode ser adicionado via FilterBar e ativado corretamente.

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/setup/test-utils";
import { MissionsPage } from "@/pages/missions/MissionsPage";

describe("MissionsPage — filtro 'Time de apoio'", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renderiza a página de missões sem erros", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    // Aguarda carregamento inicial — botão "Adicionar filtro" sempre presente
    const addFilterBtn = await screen.findByRole("button", {
      name: /adicionar filtro/i,
    });
    expect(addFilterBtn).toBeInTheDocument();
  });

  it("exibe opção 'Time de apoio' no menu de filtros", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MissionsPage mine={false} />);

    // Abre o FilterBar ("Adicionar filtro")
    const addFilterBtn = await screen.findByRole("button", {
      name: /adicionar filtro/i,
    });
    await user.click(addFilterBtn);

    // Confirma que "Apoio" aparece entre as opções disponíveis
    const option = await screen.findByRole("option", { name: /apoio/i });
    expect(option).toBeInTheDocument();
  });

  it("remove a opção 'Time de apoio' do menu após adicioná-la ao filtro ativo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MissionsPage mine={false} />);

    const addFilterBtn = await screen.findByRole("button", {
      name: /adicionar filtro/i,
    });
    await user.click(addFilterBtn);

    const option = await screen.findByRole("option", { name: /apoio/i });
    await user.click(option);

    // Após ativar, a opção sai do dropdown
    // (FilterBar remove opções já ativas)
    await user.click(addFilterBtn);
    const optionAfter = screen.queryByRole("option", { name: /apoio/i });
    expect(optionAfter).not.toBeInTheDocument();
  });

  it("o filtro 'Time de apoio' está presente entre todos os filtros disponíveis", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MissionsPage mine={false} />);

    const addFilterBtn = await screen.findByRole("button", {
      name: /adicionar filtro/i,
    });
    await user.click(addFilterBtn);

    // Verifica que "Apoio" está entre as opções do listbox
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    const labels = options.map((o) => o.textContent?.toLowerCase() ?? "");
    expect(labels.some((l) => l.includes("apoio"))).toBe(true);
  });
});

// ── Seed data com members (time de apoio) ─────────────────────────────────────

describe("MissionsPage — seed data com members no apoio", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exibe missão 'Lançar módulo de Missões v2' que tem apoio", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    expect(
      await screen.findByText(/Lançar módulo de Missões v2/i),
    ).toBeInTheDocument();
  });

  it("exibe missão 'Aumentar adoção do produto em 50%' que tem apoio", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    expect(
      await screen.findByText(/Aumentar adoção do produto em 50%/i),
    ).toBeInTheDocument();
  });

  it("missões do seed com time de apoio são renderizadas corretamente", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    // Aguarda carregamento; verifica que pelo menos uma missão do time produto aparece
    const mp1 = await screen.findByText(/Lançar módulo de Missões v2/i);
    expect(mp1).toBeInTheDocument();

    const mp2 = await screen.findByText(/Aumentar adoção/i);
    expect(mp2).toBeInTheDocument();
  });
});
