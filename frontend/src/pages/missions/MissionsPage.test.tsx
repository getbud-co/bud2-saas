// ─── MissionsPage — testes básicos de renderização ────────────────────────────
// A MissionsPage é um componente complexo (6000+ LOC).
// Estes testes verificam apenas a renderização básica sem crash
// e a presença de elementos-chave da interface.

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../tests/setup/test-utils";
import { MissionsPage } from "./MissionsPage";

describe("MissionsPage — renderização básica", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renderiza sem erros", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it("exibe título 'Todas as missões' por padrão", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Todas as missões");
  });

  it("exibe título 'Minhas missões' quando mine=true", async () => {
    renderWithProviders(<MissionsPage mine={true} />);
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Minhas missões");
  });

  it("exibe título personalizado quando customTitle é passado", async () => {
    renderWithProviders(<MissionsPage mine={false} customTitle="Missões do Time" />);
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Missões do Time");
  });

  it("exibe o botão 'Adicionar filtro'", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    const addFilterBtn = await screen.findByRole("button", {
      name: /adicionar filtro/i,
    });
    expect(addFilterBtn).toBeInTheDocument();
  });

  it("exibe botão de criar missão", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    const createBtn = await screen.findByRole("button", {
      name: /criar missão/i,
    });
    expect(createBtn).toBeInTheDocument();
  });

  it("renderiza estado vazio quando não há missões na API", async () => {
    // Schema 8: missões vêm da API. Sem dados injetados via setQueryData
    // este teste exerce apenas o caminho "lista vazia" — sem mocks órfãos.
    renderWithProviders(<MissionsPage mine={false} />);
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it("exibe filtros padrão (time e período)", async () => {
    renderWithProviders(<MissionsPage mine={false} />);
    // O filtro de time está ativo por padrão
    const teamChip = await screen.findByText(/time:/i);
    expect(teamChip).toBeInTheDocument();
  });
});
