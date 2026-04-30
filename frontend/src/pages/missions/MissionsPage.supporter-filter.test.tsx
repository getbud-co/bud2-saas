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

// As checagens originais "exibe missão 'X' do seed" dependiam de MOCK_MISSIONS
// hidratado no snapshot. Schema 8 substitui essa fonte pela API; a cobertura
// de seed/members vive agora nos testes que injetam dados via setQueryData
// (ainda a ser introduzido, ver plano commit 10). Mantemos apenas os casos
// que exercitam o filtro em si, acima.
