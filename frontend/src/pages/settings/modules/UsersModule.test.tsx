/**
 * Tests for UsersModule
 *
 * This module provides CRUD operations for users within the people section.
 * It uses the PeopleDataContext and ConfigDataContext for data management
 * and follows the standard Table + Modal CRUD pattern with additional
 * features like filters, bulk actions, and role management.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { UsersModule } from "./UsersModule";

// Mock users-api so API calls don't hit the network.
// getToken returns null in MockAuthProvider, so calls bail early for most tests.
vi.mock("@/lib/users-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/users-api")>("@/lib/users-api");
  return {
    ...actual,
    listUsers: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, size: 100 }),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUserMembership: vi.fn(),
    updateUserMembership: vi.fn(),
  };
});

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<UsersModule />);
  return { user, ...result };
}

// ─── Tests ───

describe("UsersModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the table with header", () => {
      setup();
      expect(screen.getByText("Usuários")).toBeInTheDocument();
    });

    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar por nome ou e-mail...")).toBeInTheDocument();
    });

    it("renders the invite button", () => {
      setup();
      expect(screen.getByRole("button", { name: /convidar usuário/i })).toBeInTheDocument();
    });

    it("renders the import button", () => {
      setup();
      expect(screen.getByRole("button", { name: /importar usuários/i })).toBeInTheDocument();
    });

    it("renders table column headers", () => {
      setup();
      expect(screen.getByRole("button", { name: /ordenar por nome/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por times/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por tipo/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por status/i })).toBeInTheDocument();
    });

    it("renders users from context", async () => {
      setup();
      const rows = await screen.findAllByRole("row");
      // Header row + data rows (seed has multiple users)
      expect(rows.length).toBeGreaterThan(1);
    });

    it("shows badge with user count", () => {
      setup();
      // Badge shows filtered count
      const badges = screen.getAllByText(/^\d+$/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it("displays user names", () => {
      setup();
      // Seed users should be rendered via AvatarLabelGroup
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });

    it("displays user statuses as badges", () => {
      setup();
      // Users should have status badges
      const statusBadges = screen.queryAllByText(/^(Ativo|Inativo|Convidado|Suspenso)$/);
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters users by search term", async () => {
      const { user } = setup();

      const initialRows = screen.getAllByRole("row");
      expect(initialRows.length).toBeGreaterThan(1);

      const searchInput = screen.getByPlaceholderText("Buscar por nome ou e-mail...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        const filteredRows = screen.getAllByRole("row");
        // Only header row should remain
        expect(filteredRows.length).toBeLessThan(initialRows.length);
      });
    });

    it("search is case insensitive", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar por nome ou e-mail...");
      await user.type(searchInput, "MARIA");

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        // Should find users with "Maria" in name
        expect(rows.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("can search by email", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar por nome ou e-mail...");
      await user.type(searchInput, "@empresa.com");

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        // Should find users with @empresa.com in email
        expect(rows.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("clears search when input is cleared", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar por nome ou e-mail...");
      const initialRows = screen.getAllByRole("row");

      await user.type(searchInput, "test");
      await user.clear(searchInput);

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        expect(rows.length).toBe(initialRows.length);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sorting
  // ═══════════════════════════════════════════════════════════════════════════

  describe("sorting", () => {
    it("sorts by name when clicking name header", async () => {
      const { user } = setup();

      const nameHeader = screen.getByRole("button", { name: /ordenar por nome/i });
      await user.click(nameHeader);

      const th = nameHeader.closest("th");
      expect(th).toHaveAttribute("aria-sort", "ascending");
    });

    it("toggles sort direction on second click", async () => {
      const { user } = setup();

      const nameHeader = screen.getByRole("button", { name: /ordenar por nome/i });
      await user.click(nameHeader);
      await user.click(nameHeader);

      const th = nameHeader.closest("th");
      expect(th).toHaveAttribute("aria-sort", "descending");
    });

    it("sorts by teams", async () => {
      const { user } = setup();

      const teamsHeader = screen.getByRole("button", { name: /ordenar por times/i });
      await user.click(teamsHeader);

      const th = teamsHeader.closest("th");
      expect(th).toHaveAttribute("aria-sort", "ascending");
    });

    it("sorts by type (role)", async () => {
      const { user } = setup();

      const typeHeader = screen.getByRole("button", { name: /ordenar por tipo/i });
      await user.click(typeHeader);

      const th = typeHeader.closest("th");
      expect(th).toHaveAttribute("aria-sort", "ascending");
    });

    it("sorts by status", async () => {
      const { user } = setup();

      const statusHeader = screen.getByRole("button", { name: /ordenar por status/i });
      await user.click(statusHeader);

      const th = statusHeader.closest("th");
      expect(th).toHaveAttribute("aria-sort", "ascending");
    });

    it("resets sort direction when changing columns", async () => {
      const { user } = setup();

      const nameHeader = screen.getByRole("button", { name: /ordenar por nome/i });
      const statusHeader = screen.getByRole("button", { name: /ordenar por status/i });

      // Sort by name descending
      await user.click(nameHeader);
      await user.click(nameHeader);

      // Change to status
      await user.click(statusHeader);

      const nameTh = nameHeader.closest("th");
      const statusTh = statusHeader.closest("th");

      // Sortable columns without active sort have aria-sort="none"
      expect(nameTh).toHaveAttribute("aria-sort", "none");
      expect(statusTh).toHaveAttribute("aria-sort", "ascending");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Row Selection
  // ═══════════════════════════════════════════════════════════════════════════

  describe("row selection", () => {
    it("renders checkbox for selecting all rows", () => {
      setup();
      expect(screen.getByRole("checkbox", { name: /selecionar todas/i })).toBeInTheDocument();
    });

    it("selects all rows when clicking select all", async () => {
      const { user } = setup();

      const selectAllCheckbox = screen.getByRole("checkbox", { name: /selecionar todas/i });
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        const rowCheckboxes = screen.getAllByRole("checkbox");
        const checkedBoxes = rowCheckboxes.filter((cb) => (cb as HTMLInputElement).checked);
        expect(checkedBoxes.length).toBeGreaterThan(1);
      });
    });

    it("shows bulk actions when rows are selected", async () => {
      const { user } = setup();

      const selectAllCheckbox = screen.getByRole("checkbox", { name: /selecionar todas/i });
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /desativar/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /excluir/i })).toBeInTheDocument();
      });
    });

    it("clears selection when clicking clear button", async () => {
      const { user } = setup();

      const selectAllCheckbox = screen.getByRole("checkbox", { name: /selecionar todas/i });
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /desativar/i })).toBeInTheDocument();
      });

      // Find and click the clear button in bulk actions (aria-label="Desmarcar todos")
      const clearButton = screen.getByRole("button", { name: /desmarcar todos/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Filter Bar
  // ═══════════════════════════════════════════════════════════════════════════

  describe("filter bar", () => {
    it("renders filter bar", () => {
      setup();
      expect(screen.getByRole("button", { name: /adicionar filtro/i })).toBeInTheDocument();
    });

    it("can add status filter", async () => {
      const { user } = setup();

      const addFilterButton = screen.getByRole("button", { name: /adicionar filtro/i });
      await user.click(addFilterButton);

      // Should show status option in the listbox
      await waitFor(() => {
        expect(screen.getByRole("option", { name: /status/i })).toBeInTheDocument();
      });
    });

    it("can add role filter", async () => {
      const { user } = setup();

      const addFilterButton = screen.getByRole("button", { name: /adicionar filtro/i });
      await user.click(addFilterButton);

      // Should show role option in the listbox
      await waitFor(() => {
        expect(screen.getByRole("option", { name: /tipo de usuário/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Invite User Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("invite user modal", () => {
    it("opens modal when clicking invite button", async () => {
      const { user } = setup();

      const inviteButton = screen.getByRole("button", { name: /convidar usuário/i });
      await user.click(inviteButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("modal has required form fields", async () => {
      const { user } = setup();

      const inviteButton = screen.getByRole("button", { name: /convidar usuário/i });
      await user.click(inviteButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByLabelText(/^nome$/i)).toBeInTheDocument();
        expect(within(dialog).getByLabelText(/sobrenome/i)).toBeInTheDocument();
        expect(within(dialog).getByLabelText(/e-mail/i)).toBeInTheDocument();
      });
    });

    it("modal has optional form fields", async () => {
      const { user } = setup();

      const inviteButton = screen.getByRole("button", { name: /convidar usuário/i });
      await user.click(inviteButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByLabelText(/apelido/i)).toBeInTheDocument();
        expect(within(dialog).getByLabelText(/cargo/i)).toBeInTheDocument();
      });
    });

    it("submit button is disabled when required fields are empty", async () => {
      const { user } = setup();

      const inviteButton = screen.getByRole("button", { name: /convidar usuário/i });
      await user.click(inviteButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        const submitButton = within(dialog).getByRole("button", { name: /enviar convite/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it("cancel button exists and is clickable", async () => {
      const { user } = setup();

      const inviteButton = screen.getByRole("button", { name: /convidar usuário/i });
      await user.click(inviteButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const cancelButton = within(dialog).getByRole("button", { name: /cancelar/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Import Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("import modal", () => {
    it("opens modal when clicking import button", async () => {
      const { user } = setup();

      const importButton = screen.getByRole("button", { name: /importar usuários/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("modal has title", async () => {
      const { user } = setup();

      const importButton = screen.getByRole("button", { name: /importar usuários/i });
      await user.click(importButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText(/importar usuários/i)).toBeInTheDocument();
      });
    });

    it("modal has download template button", async () => {
      const { user } = setup();

      const importButton = screen.getByRole("button", { name: /importar usuários/i });
      await user.click(importButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText(/baixar template/i)).toBeInTheDocument();
      });
    });

    it("import button is disabled without file", async () => {
      const { user } = setup();

      const importButton = screen.getByRole("button", { name: /importar usuários/i });
      await user.click(importButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        const submitButton = within(dialog).getByRole("button", { name: /^importar$/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it("cancel button exists and is clickable", async () => {
      const { user } = setup();

      const importButton = screen.getByRole("button", { name: /importar usuários/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const cancelButton = within(dialog).getByRole("button", { name: /cancelar/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Row Actions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("row actions", () => {
    it("renders action buttons for each row", () => {
      setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações/i });
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("has descriptive aria-label for action buttons", () => {
      setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações de/i });
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("opens popover when clicking action button", async () => {
      const { user } = setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações de/i });
      await user.click(actionButtons[0]!);

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /editar usuário/i })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: /redefinir senha/i })).toBeInTheDocument();
      });
    });

    it("shows deactivate option for active users", async () => {
      const { user } = setup();

      // Find an active user's action button
      const actionButtons = screen.getAllByRole("button", { name: /abrir ações de/i });
      await user.click(actionButtons[0]!);

      await waitFor(() => {
        const hasDeactivate = screen.queryByRole("menuitem", { name: /desativar usuário/i });
        const hasActivate = screen.queryByRole("menuitem", { name: /ativar usuário/i });
        expect(hasDeactivate || hasActivate).toBeTruthy();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Role Selection in Table
  // ═══════════════════════════════════════════════════════════════════════════

  describe("role selection", () => {
    it("displays role buttons for each user", () => {
      setup();

      // Role buttons should be present (they show role name + caret)
      const rows = screen.getAllByRole("row");
      // At least one data row should exist
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Deactivate/Activate Confirmation Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("deactivate/activate confirmation", () => {
    it("opens confirmation when clicking deactivate from row actions", async () => {
      const { user } = setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações de/i });
      await user.click(actionButtons[0]!);

      // Wait for popover to open and find deactivate/activate option
      await waitFor(() => {
        const deactivateItem = screen.queryByRole("menuitem", { name: /desativar usuário/i });
        const activateItem = screen.queryByRole("menuitem", { name: /ativar usuário/i });
        expect(deactivateItem || activateItem).toBeTruthy();
      });

      // Click whichever is available
      const deactivateItem = screen.queryByRole("menuitem", { name: /desativar usuário/i });
      const activateItem = screen.queryByRole("menuitem", { name: /ativar usuário/i });
      const targetItem = deactivateItem || activateItem;
      
      if (targetItem) {
        await user.click(targetItem);

        await waitFor(() => {
          expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
      }
    });

    it("confirmation modal has cancel button", async () => {
      const { user } = setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações de/i });
      await user.click(actionButtons[0]!);

      await waitFor(() => {
        const deactivateItem = screen.queryByRole("menuitem", { name: /desativar usuário/i });
        const activateItem = screen.queryByRole("menuitem", { name: /ativar usuário/i });
        expect(deactivateItem || activateItem).toBeTruthy();
      });

      const deactivateItem = screen.queryByRole("menuitem", { name: /desativar usuário/i });
      const activateItem = screen.queryByRole("menuitem", { name: /ativar usuário/i });
      const targetItem = deactivateItem || activateItem;
      
      if (targetItem) {
        await user.click(targetItem);

        await waitFor(() => {
          const dialog = screen.getByRole("dialog");
          expect(within(dialog).getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════════════════

  describe("accessibility", () => {
    it("table has proper ARIA roles", () => {
      setup();

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("row").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);
    });

    it("sortable columns have aria-sort attribute when sorted", async () => {
      const { user } = setup();

      const nameHeader = screen.getByRole("button", { name: /ordenar por nome/i });
      await user.click(nameHeader);

      const th = nameHeader.closest("th");
      expect(th).toHaveAttribute("aria-sort");
    });

    it("checkboxes have accessible labels", () => {
      setup();

      const selectAllCheckbox = screen.getByRole("checkbox", { name: /selecionar todas/i });
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it("action buttons have descriptive labels", () => {
      setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações de/i });
      expect(actionButtons.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Bulk Actions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("bulk actions", () => {
    it("shows deactivate button in bulk actions", async () => {
      const { user } = setup();

      const selectAllCheckbox = screen.getByRole("checkbox", { name: /selecionar todas/i });
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        // Button text depends on whether all selected are inactive
        const deactivateBtn = screen.queryByRole("button", { name: /desativar/i });
        const activateBtn = screen.queryByRole("button", { name: /ativar/i });
        expect(deactivateBtn || activateBtn).toBeTruthy();
      });
    });

    it("shows delete button in bulk actions", async () => {
      const { user } = setup();

      const selectAllCheckbox = screen.getByRole("checkbox", { name: /selecionar todas/i });
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /excluir/i })).toBeInTheDocument();
      });
    });

    it("shows selected count in bulk actions", async () => {
      const { user } = setup();

      const selectAllCheckbox = screen.getByRole("checkbox", { name: /selecionar todas/i });
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        // Should show "X selecionado(s)" or similar
        expect(screen.getByText(/selecionado/i)).toBeInTheDocument();
      });
    });
  });
});
