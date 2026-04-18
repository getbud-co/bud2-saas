/**
 * Tests for AiModule
 *
 * This module provides AI configuration settings organized in 4 tabs:
 * Assistente (tone, working hours, language), Sugestões (proactivity, suggestion types,
 * transparency), Fontes de dados (connected sources, catalog), and Avançado
 * (custom instructions, LLM providers, channels, bias/data sharing, usage limits).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { AiModule } from "./AiModule";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<AiModule />);
  return { user, ...result };
}

// ─── Tests ───

describe("AiModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the component with TabBar", () => {
      setup();
      expect(screen.getByRole("tablist", { name: /configurações de ia/i })).toBeInTheDocument();
    });

    it("renders all four tabs", () => {
      setup();
      expect(screen.getByRole("tab", { name: /assistente/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /sugestões/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /fontes de dados/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /avançado/i })).toBeInTheDocument();
    });

    it("shows the assistant tab content by default", () => {
      setup();
      expect(screen.getByText("Tom de voz")).toBeInTheDocument();
    });

    it("renders tone preset cards", () => {
      setup();
      expect(screen.getByText("Profissional")).toBeInTheDocument();
      expect(screen.getByText("Direto e objetivo")).toBeInTheDocument();
      expect(screen.getByText("Empático e acolhedor")).toBeInTheDocument();
      expect(screen.getByText("Coach")).toBeInTheDocument();
      expect(screen.getByText("Energético e motivacional")).toBeInTheDocument();
    });

    it("shows tone preview box", () => {
      setup();
      expect(screen.getByText("Exemplo de como o Bud vai falar")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab Navigation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("tab navigation", () => {
    it("switches to suggestions tab", async () => {
      const { user } = setup();

      const suggestionsTab = screen.getByRole("tab", { name: /sugestões/i });
      await user.click(suggestionsTab);

      expect(screen.getByText("Nível de proatividade")).toBeInTheDocument();
    });

    it("switches to data sources tab", async () => {
      const { user } = setup();

      const sourcesTab = screen.getByRole("tab", { name: /fontes de dados/i });
      await user.click(sourcesTab);

      expect(screen.getByText("Adicionar fonte")).toBeInTheDocument();
    });

    it("switches to advanced tab", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText("Instruções personalizadas")).toBeInTheDocument();
    });

    it("hides assistant content when switching tabs", async () => {
      const { user } = setup();

      expect(screen.getByText("Tom de voz")).toBeInTheDocument();

      const suggestionsTab = screen.getByRole("tab", { name: /sugestões/i });
      await user.click(suggestionsTab);

      expect(screen.queryByText("Tom de voz")).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 1: Assistente
  // ═══════════════════════════════════════════════════════════════════════════

  describe("assistente tab", () => {
    it("shows working hours toggle", () => {
      setup();
      expect(screen.getByText("Respeitar horário de trabalho")).toBeInTheDocument();
    });

    it("shows language selector", () => {
      setup();
      expect(screen.getByText("Idioma do assistente")).toBeInTheDocument();
    });

    it("shows save button", () => {
      setup();
      expect(screen.getByRole("button", { name: /salvar alterações/i })).toBeInTheDocument();
    });

    it("selects a different tone preset", async () => {
      const { user } = setup();

      // Click on "Direto e objetivo" tone
      const diretoButton = screen.getByText("Direto e objetivo").closest("button")!;
      await user.click(diretoButton);

      // The preview should update with the example from "direto" tone
      await waitFor(() => {
        expect(screen.getByText(/Engajamento de Design caiu 12%\. Ação sugerida/)).toBeInTheDocument();
      });
    });

    it("shows working hours inputs when toggle is enabled", () => {
      setup();
      // Default has respectWorkingHours = true
      expect(screen.getByPlaceholderText("08:00")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("19:00")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 2: Sugestões
  // ═══════════════════════════════════════════════════════════════════════════

  describe("sugestões tab", () => {
    it("renders proactivity level options", async () => {
      const { user } = setup();

      const suggestionsTab = screen.getByRole("tab", { name: /sugestões/i });
      await user.click(suggestionsTab);

      expect(screen.getByText("Mínimo")).toBeInTheDocument();
      expect(screen.getByText("Moderado")).toBeInTheDocument();
      expect(screen.getByText("Padrão")).toBeInTheDocument();
      expect(screen.getByText("Máximo")).toBeInTheDocument();
    });

    it("renders suggestion type toggles", async () => {
      const { user } = setup();

      const suggestionsTab = screen.getByRole("tab", { name: /sugestões/i });
      await user.click(suggestionsTab);

      expect(screen.getByText("Preparação de 1:1")).toBeInTheDocument();
      expect(screen.getByText("Coaching e dicas de gestão")).toBeInTheDocument();
      expect(screen.getByText("Alertas sobre liderados")).toBeInTheDocument();
      expect(screen.getByText("Rascunho de avaliação")).toBeInTheDocument();
      expect(screen.getByText("Sugestão de OKRs")).toBeInTheDocument();
      expect(screen.getByText("Briefing diário")).toBeInTheDocument();
    });

    it("renders transparency mode radio buttons", async () => {
      const { user } = setup();

      const suggestionsTab = screen.getByRole("tab", { name: /sugestões/i });
      await user.click(suggestionsTab);

      expect(screen.getByText("Transparência de dados")).toBeInTheDocument();
      expect(screen.getByText("Mostrar sempre quais dados a IA está usando")).toBeInTheDocument();
      expect(screen.getByText("Mostrar fontes apenas quando eu pedir")).toBeInTheDocument();
    });

    it("switches proactivity level when clicking", async () => {
      const { user } = setup();

      const suggestionsTab = screen.getByRole("tab", { name: /sugestões/i });
      await user.click(suggestionsTab);

      // Default proactivity is "default" (Padrão)
      const maximoButton = screen.getByText("Máximo").closest("button")!;
      await user.click(maximoButton);

      // "Sempre sugerindo" is the description for maximum
      expect(screen.getByText("Sempre sugerindo")).toBeInTheDocument();
    });

    it("shows view suggestion history link", async () => {
      const { user } = setup();

      const suggestionsTab = screen.getByRole("tab", { name: /sugestões/i });
      await user.click(suggestionsTab);

      expect(screen.getByText("Ver histórico de sugestões")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 3: Fontes de dados
  // ═══════════════════════════════════════════════════════════════════════════

  describe("fontes de dados tab", () => {
    it("shows info alert", async () => {
      const { user } = setup();

      const sourcesTab = screen.getByRole("tab", { name: /fontes de dados/i });
      await user.click(sourcesTab);

      expect(screen.getByText(/Conecte ferramentas da sua empresa/)).toBeInTheDocument();
    });

    it("shows connected data sources from seed", async () => {
      const { user } = setup();

      const sourcesTab = screen.getByRole("tab", { name: /fontes de dados/i });
      await user.click(sourcesTab);

      // Seed has 2 connected sources
      expect(screen.getByText("Base de conhecimento interna")).toBeInTheDocument();
      expect(screen.getByText("Dados de performance")).toBeInTheDocument();
    });

    it("shows available data sources catalog", async () => {
      const { user } = setup();

      const sourcesTab = screen.getByRole("tab", { name: /fontes de dados/i });
      await user.click(sourcesTab);

      // Catalog items not yet connected should appear
      expect(screen.getByText("Adicionar fonte")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 4: Avançado
  // ═══════════════════════════════════════════════════════════════════════════

  describe("avançado tab", () => {
    it("renders custom instructions textarea", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText("Instruções personalizadas")).toBeInTheDocument();
      // Default instructions from seed
      expect(screen.getByDisplayValue(/Use linguagem acessível/i)).toBeInTheDocument();
    });

    it("renders LLM provider section", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText("LLM própria")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /adicionar provedor/i })).toBeInTheDocument();
    });

    it("renders channels section", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText("Canais de atuação")).toBeInTheDocument();
      expect(screen.getByText("Plataforma Bud")).toBeInTheDocument();
    });

    it("renders bias detection toggle", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText("Detecção de viés")).toBeInTheDocument();
    });

    it("renders data sharing toggle", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText("Compartilhar dados anônimos")).toBeInTheDocument();
    });

    it("renders usage limit selector", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText("Limite de uso mensal")).toBeInTheDocument();
    });

    it("shows manage integrations link", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText("Gerenciar integrações")).toBeInTheDocument();
    });

    it("shows empty LLM provider message when none added", async () => {
      const { user } = setup();

      const advancedTab = screen.getByRole("tab", { name: /avançado/i });
      await user.click(advancedTab);

      expect(screen.getByText(/Nenhum provedor de LLM adicionado/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Save Confirmation Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("save confirmation modal", () => {
    it("opens confirmation modal when clicking save", async () => {
      const { user } = setup();

      const saveButton = screen.getByRole("button", { name: /salvar alterações/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Confirmar alterações")).toBeInTheDocument();
        expect(screen.getByText(/todos os usuários/)).toBeInTheDocument();
      });
    });

    it("confirms and saves when clicking confirm button", async () => {
      const { user } = setup();

      const saveButton = screen.getByRole("button", { name: /salvar alterações/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const confirmButton = within(dialog).getByRole("button", { name: /confirmar e salvar/i });
      expect(confirmButton).toBeInTheDocument();
    });
  });
});
