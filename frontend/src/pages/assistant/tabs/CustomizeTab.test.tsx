/**
 * Tests for CustomizeTab
 *
 * Aba de personalização do assistente que permite configurar tom de voz,
 * idioma, sugestões, proatividade e transparência de dados.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { CustomizeTab } from "./CustomizeTab";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<CustomizeTab />);
  return { user, ...result };
}

// ─── Tests ───

describe("CustomizeTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Renderização e estado inicial
  // ═══════════════════════════════════════════════════════════════════════════

  describe("renderização e estado inicial", () => {
    it("renderiza presets de tom de voz", () => {
      setup();
      expect(screen.getByText("Profissional")).toBeInTheDocument();
      expect(screen.getByText("Direto e objetivo")).toBeInTheDocument();
      expect(screen.getByText("Empático e acolhedor")).toBeInTheDocument();
      expect(screen.getByText("Coach")).toBeInTheDocument();
      expect(screen.getByText("Energético e motivacional")).toBeInTheDocument();
    });

    it("renderiza seção de idioma", () => {
      setup();
      expect(screen.getByText("Idioma")).toBeInTheDocument();
    });

    it("renderiza toggles de sugestões", () => {
      setup();
      expect(screen.getByText("Tipos de sugestão")).toBeInTheDocument();
      expect(screen.getByText("Preparação de 1:1")).toBeInTheDocument();
      expect(screen.getByText("Coaching e dicas de gestão")).toBeInTheDocument();
      expect(screen.getByText("Alertas sobre liderados")).toBeInTheDocument();
      expect(screen.getByText("Rascunho de avaliação")).toBeInTheDocument();
      expect(screen.getByText("Sugestão de OKRs")).toBeInTheDocument();
      expect(screen.getByText("Briefing diário")).toBeInTheDocument();
    });

    it("renderiza opções de proatividade", () => {
      setup();
      expect(screen.getByText("Mínimo")).toBeInTheDocument();
      expect(screen.getByText("Moderado")).toBeInTheDocument();
      expect(screen.getByText("Padrão")).toBeInTheDocument();
      expect(screen.getByText("Máximo")).toBeInTheDocument();
    });

    it("renderiza seção de transparência de dados", () => {
      setup();
      expect(screen.getByText("Transparência de dados")).toBeInTheDocument();
      expect(
        screen.getByText("Mostrar sempre quais dados a IA está usando"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Mostrar fontes apenas quando eu pedir"),
      ).toBeInTheDocument();
    });

    it("mostra botão 'Salvar preferências'", () => {
      setup();
      expect(
        screen.getByRole("button", { name: /salvar preferências/i }),
      ).toBeInTheDocument();
    });

    it("mostra botão 'Criar tom personalizado'", () => {
      setup();
      expect(
        screen.getByRole("button", { name: /criar tom personalizado/i }),
      ).toBeInTheDocument();
    });

    it("renderiza seção de LLM própria", () => {
      setup();
      expect(screen.getByText("LLM própria")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /adicionar provedor/i }),
      ).toBeInTheDocument();
    });

    it("mostra exemplo de tom de voz ativo", () => {
      setup();
      expect(
        screen.getByText(/exemplo de como o bud vai falar/i),
      ).toBeInTheDocument();
    });
  });
});
