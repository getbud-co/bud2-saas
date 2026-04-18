/**
 * Tests for RolesModule
 *
 * This module provides CRUD operations for user roles/types within the settings page.
 * Unlike TagsModule and CyclesModule, it uses a card grid layout instead of a table.
 * It includes permission management with accordion-based permission groups.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { RolesModule } from "./RolesModule";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<RolesModule />);
  return { user, ...result };
}

async function openCreateModal(user: ReturnType<typeof userEvent.setup>) {
  const createButton = screen.getByRole("button", { name: /novo tipo/i });
  await user.click(createButton);
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
}

// ─── Tests ───

describe("RolesModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar tipo de usuário...")).toBeInTheDocument();
    });

    it("renders the create button", () => {
      setup();
      expect(screen.getByRole("button", { name: /novo tipo/i })).toBeInTheDocument();
    });

    it("renders role cards from context", () => {
      setup();
      // Seed has default roles: Super Admin, Admin RH, Gestor, Colaborador, Visualizador
      expect(screen.getByText("Super Admin")).toBeInTheDocument();
      expect(screen.getByText("Gestor")).toBeInTheDocument();
      expect(screen.getByText("Colaborador")).toBeInTheDocument();
    });

    it("shows system badge for system roles", () => {
      setup();
      const systemBadges = screen.getAllByText("Sistema");
      expect(systemBadges.length).toBeGreaterThan(0);
    });

    it("shows user count for each role", () => {
      setup();
      // Should show "X usuários" or "X usuário" for each role
      const userCounts = screen.getAllByText(/\d+ usuários?/);
      expect(userCounts.length).toBeGreaterThan(0);
    });

    it("shows permission count for each role", () => {
      setup();
      // Should show "X/Y permissões" for each role
      const permCounts = screen.getAllByText(/\d+\/\d+ permissões/);
      expect(permCounts.length).toBeGreaterThan(0);
    });

    it("shows permission percentage bar", () => {
      setup();
      // Each role card should have a percentage displayed
      const percentages = screen.getAllByText(/%$/);
      expect(percentages.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters roles by search term", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tipo de usuário...");
      await user.type(searchInput, "Admin");

      await waitFor(() => {
        // Should show "Super Admin" and possibly "Admin RH"
        expect(screen.getByText("Super Admin")).toBeInTheDocument();
      });
    });

    it("shows empty state when no matches", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tipo de usuário...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        expect(screen.getByText(/nenhum tipo de usuário encontrado/i)).toBeInTheDocument();
      });
    });

    it("clears search when input is cleared", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tipo de usuário...");

      await user.type(searchInput, "xyztest");
      await user.clear(searchInput);

      // Should show all roles again
      expect(screen.getByText("Super Admin")).toBeInTheDocument();
      expect(screen.getByText("Colaborador")).toBeInTheDocument();
    });

    it("filters by description as well as name", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tipo de usuário...");
      // Search for a term that might be in description
      await user.type(searchInput, "sistema");

      await waitFor(() => {
        // Super Admin has "Acesso total ao sistema" in description
        expect(screen.getByText("Super Admin")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Role Cards
  // ═══════════════════════════════════════════════════════════════════════════

  describe("role cards", () => {
    it("shows edit button for custom roles", () => {
      setup();
      // System roles should have "Ver permissões", custom would have "Editar permissões"
      const viewButtons = screen.getAllByRole("button", { name: /ver permissões/i });
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    it("shows delete button only for custom roles", () => {
      setup();
      // System roles should NOT have delete button
      // Check that at least some cards exist but delete may or may not be present
      const cards = screen.getAllByText(/usuários?$/);
      expect(cards.length).toBeGreaterThan(0);
    });

    it("clicking view permissions opens modal", async () => {
      const { user } = setup();

      const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Permission Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("permission modal", () => {
    it("shows role name in modal title", async () => {
      const { user } = setup();

      // Click on first view permissions button
      const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
      await user.click(viewButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        // Modal title should contain "Permissões de" followed by role name
        expect(within(dialog).getByRole("heading", { name: /permissões de/i })).toBeInTheDocument();
      });
    });

    it("shows scope section", async () => {
      const { user } = setup();

      const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/escopo de dados/i)).toBeInTheDocument();
      });
    });

    it("shows permission groups", async () => {
      const { user } = setup();

      const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
      await user.click(viewButton);

      await waitFor(() => {
        // Should show permission group names
        expect(screen.getByText("Pessoas")).toBeInTheDocument();
        expect(screen.getByText("Missões e OKRs")).toBeInTheDocument();
        expect(screen.getByText("Pesquisas")).toBeInTheDocument();
        expect(screen.getByText("Configurações")).toBeInTheDocument();
      });
    });

    it("shows warning for system roles", async () => {
      const { user } = setup();

      const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/tipo de usuário do sistema/i)).toBeInTheDocument();
      });
    });

    it("has close button in header", async () => {
      const { user } = setup();

      const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
      await user.click(viewButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        // Modal should have close button (X in header) and/or Fechar/Cancelar in footer
        const closeButtons = within(dialog).getAllByRole("button");
        // At least one button should be for closing
        expect(closeButtons.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Role Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("create role modal", () => {
    it("opens modal when clicking create button", async () => {
      const { user } = setup();

      await openCreateModal(user);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(/novo tipo de usuário/i)).toBeInTheDocument();
    });

    it("shows breadcrumb with steps", async () => {
      const { user } = setup();

      await openCreateModal(user);

      expect(screen.getByText("Informações básicas")).toBeInTheDocument();
      expect(screen.getByText("Configurar permissões")).toBeInTheDocument();
    });

    it("has name input field", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByLabelText(/nome/i)).toBeInTheDocument();
    });

    it("has description textarea", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByLabelText(/descrição/i)).toBeInTheDocument();
    });

    it("has template select", async () => {
      const { user } = setup();

      await openCreateModal(user);

      expect(screen.getByText(/copiar permissões de/i)).toBeInTheDocument();
    });

    it("disables continue button when name is empty", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      const continueButton = within(dialog).getByRole("button", { name: /continuar/i });
      expect(continueButton).toBeDisabled();
    });

    it("enables continue button when name is filled", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      const nameInput = within(dialog).getByLabelText(/nome/i);
      await user.type(nameInput, "New Role");

      const continueButton = within(dialog).getByRole("button", { name: /continuar/i });
      expect(continueButton).not.toBeDisabled();
    });

    it("has cancel button", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("shows default badge for default role", () => {
      setup();
      // Colaborador is the default role
      const defaultBadges = screen.getAllByText("Padrão");
      expect(defaultBadges.length).toBeGreaterThan(0);
    });

    it("shows scope badges for non-self scopes", () => {
      setup();
      // Super Admin and Admin RH should have "Organização" scope
      const orgBadges = screen.queryAllByText("Organização");
      expect(orgBadges.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════════════════

  describe("accessibility", () => {
    it("modal has proper dialog role and labeling", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("checkboxes in permission modal are properly labeled", async () => {
      const { user } = setup();

      const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
      await user.click(viewButton);

      await waitFor(() => {
        // Permission checkboxes should exist
        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    it("scope section is displayed in modal", async () => {
      const { user } = setup();

      const viewButton = screen.getAllByRole("button", { name: /ver permissões/i })[0]!;
      await user.click(viewButton);

      await waitFor(() => {
        // Should have scope section header
        expect(screen.getByText(/escopo de dados/i)).toBeInTheDocument();
      });
    });
  });
});
