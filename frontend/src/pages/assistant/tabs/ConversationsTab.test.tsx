/**
 * Tests for ConversationsTab
 *
 * Aba de conversas do assistente que exibe sidebar com lista de conversas,
 * busca, e área de chat principal.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import { ConversationsTab } from "./ConversationsTab";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(
    <ConversationsProvider>
      <ConversationsTab />
    </ConversationsProvider>,
  );
  return { user, ...result };
}

// ─── Tests ───

describe("ConversationsTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Renderização e estado inicial
  // ═══════════════════════════════════════════════════════════════════════════

  describe("renderização e estado inicial", () => {
    it("renderiza a sidebar com as conversas seed", () => {
      setup();
      expect(screen.getByText("Preparação 1:1 com Ana")).toBeInTheDocument();
      expect(screen.getByText("Sugestões de OKR Q2")).toBeInTheDocument();
      expect(screen.getByText("Análise de engajamento do time")).toBeInTheDocument();
    });

    it("mostra o botão 'Nova conversa'", () => {
      setup();
      // There are 2 "Nova conversa" buttons — one in sidebar and one in empty state
      const buttons = screen.getAllByRole("button", { name: /nova conversa/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it("mostra o campo de busca", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar conversas...")).toBeInTheDocument();
    });

    it("mostra estado vazio quando nenhuma conversa está selecionada", () => {
      setup();
      expect(screen.getByText("Converse com o Bud")).toBeInTheDocument();
      expect(
        screen.getByText(/selecione uma conversa existente/i),
      ).toBeInTheDocument();
    });

    it("mostra seção 'Fixadas' para conversas pinned", () => {
      setup();
      expect(screen.getByText("Fixadas")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Interações
  // ═══════════════════════════════════════════════════════════════════════════

  describe("interações", () => {
    it("clicar em uma conversa a seleciona", async () => {
      const { user } = setup();

      const conversationButton = screen.getByText("Preparação 1:1 com Ana");
      await user.click(conversationButton);

      await waitFor(() => {
        // When a conversation is selected, the empty state disappears
        expect(screen.queryByText("Converse com o Bud")).not.toBeInTheDocument();
      });
    });

    it("campo de busca filtra conversas", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar conversas...");
      await user.type(searchInput, "OKR");

      await waitFor(() => {
        expect(screen.getByText("Sugestões de OKR Q2")).toBeInTheDocument();
        expect(screen.queryByText("Preparação 1:1 com Ana")).not.toBeInTheDocument();
        expect(
          screen.queryByText("Análise de engajamento do time"),
        ).not.toBeInTheDocument();
      });
    });

    it("busca sem resultados mostra mensagem vazia", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar conversas...");
      await user.type(searchInput, "xyz inexistente");

      await waitFor(() => {
        expect(
          screen.getByText("Nenhuma conversa encontrada"),
        ).toBeInTheDocument();
      });
    });

    it("clicar em 'Nova conversa' cria uma nova conversa", async () => {
      const { user } = setup();

      // Click the first "Nova conversa" button (sidebar one)
      const buttons = screen.getAllByRole("button", { name: /nova conversa/i });
      await user.click(buttons[0]!);

      await waitFor(() => {
        // New conversation is created and becomes active, so empty state disappears
        expect(screen.queryByText("Converse com o Bud")).not.toBeInTheDocument();
      });
    });
  });
});
