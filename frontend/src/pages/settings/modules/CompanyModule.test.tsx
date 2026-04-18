/**
 * Tests for CompanyModule
 *
 * Two tabs: "Dados gerais" (company info form) and "Valores da empresa" (company values CRUD).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { CompanyModule } from "./CompanyModule";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<CompanyModule />);
  return { user, ...result };
}

// ─── Tests ───

describe("CompanyModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Tabs
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and tabs", () => {
    it("renders tab bar", () => {
      setup();
      expect(screen.getByRole("tab", { name: /dados gerais/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /valores da empresa/i })).toBeInTheDocument();
    });

    it("shows Dados gerais tab by default", () => {
      setup();
      expect(screen.getByLabelText(/nome da empresa/i)).toBeInTheDocument();
    });

    it("switches to Valores da empresa tab", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /valores da empresa/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /novo valor/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Dados Gerais Tab
  // ═══════════════════════════════════════════════════════════════════════════

  describe("dados gerais tab", () => {
    it("renders company name input", () => {
      setup();
      expect(screen.getByLabelText(/nome da empresa/i)).toBeInTheDocument();
    });

    it("renders CNPJ input", () => {
      setup();
      expect(screen.getByLabelText(/cnpj/i)).toBeInTheDocument();
    });

    it("renders save button", () => {
      setup();
      expect(screen.getByRole("button", { name: /salvar alterações/i })).toBeInTheDocument();
    });

    it("renders logo section", () => {
      setup();
      expect(screen.getByText("Símbolo da empresa")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Valores da Empresa Tab
  // ═══════════════════════════════════════════════════════════════════════════

  describe("valores da empresa tab", () => {
    async function switchToValuesTab() {
      const { user } = setup();
      await user.click(screen.getByRole("tab", { name: /valores da empresa/i }));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /novo valor/i })).toBeInTheDocument();
      });
      return { user };
    }

    it("renders search input", async () => {
      await switchToValuesTab();
      expect(screen.getByPlaceholderText("Buscar valor...")).toBeInTheDocument();
    });

    it("renders create button", async () => {
      await switchToValuesTab();
      expect(screen.getByRole("button", { name: /novo valor/i })).toBeInTheDocument();
    });

    it("displays existing values", async () => {
      await switchToValuesTab();
      // Seed data has company values
      const valueElements = screen.getAllByText(/0 pesquisas/i);
      expect(valueElements.length).toBeGreaterThan(0);
    });

    it("filters values by search", async () => {
      const { user } = await switchToValuesTab();
      const searchInput = screen.getByPlaceholderText("Buscar valor...");

      await user.type(searchInput, "zzzznonexistent");

      await waitFor(() => {
        expect(screen.getByText("Nenhum valor encontrado")).toBeInTheDocument();
      });
    });

    it("opens create modal", async () => {
      const { user } = await switchToValuesTab();

      await user.click(screen.getByRole("button", { name: /novo valor/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Novo valor da empresa")).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/nome do valor/i)).toBeInTheDocument();
    });

    it("disables create button when name is empty", async () => {
      const { user } = await switchToValuesTab();

      await user.click(screen.getByRole("button", { name: /novo valor/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const submitBtn = within(dialog).getByRole("button", { name: /criar valor/i });
      expect(submitBtn).toBeDisabled();
    });

    it("creates a new value", async () => {
      const { user } = await switchToValuesTab();

      await user.click(screen.getByRole("button", { name: /novo valor/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const nameInput = within(dialog).getByLabelText(/nome do valor/i);
      await user.type(nameInput, "Resiliência Test");

      const submitBtn = within(dialog).getByRole("button", { name: /criar valor/i });
      expect(submitBtn).not.toBeDisabled();
      await user.click(submitBtn);

      // Value should appear in the list after creation
      await waitFor(() => {
        expect(screen.getByText("Resiliência Test")).toBeInTheDocument();
      });
    });

    it("opens row actions popover", async () => {
      const { user } = await switchToValuesTab();

      const actionBtns = screen.getAllByRole("button", { name: /abrir ações do valor/i });
      expect(actionBtns.length).toBeGreaterThan(0);

      await user.click(actionBtns[0]!);

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /editar/i })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: /excluir/i })).toBeInTheDocument();
      });
    });
  });
});
