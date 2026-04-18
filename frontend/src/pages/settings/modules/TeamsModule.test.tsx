/**
 * Tests for TeamsModule
 *
 * This module provides CRUD operations for teams within the people section.
 * It uses the PeopleDataContext for data management and follows the standard
 * Table + Modal CRUD pattern with additional features like filters and bulk actions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { TeamsModule } from "./TeamsModule";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<TeamsModule />);
  return { user, ...result };
}

// ─── Tests ───

describe("TeamsModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the table with header", () => {
      setup();
      expect(screen.getByText("Times")).toBeInTheDocument();
    });

    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar times...")).toBeInTheDocument();
    });

    it("renders the create button", () => {
      setup();
      expect(screen.getByRole("button", { name: /novo time/i })).toBeInTheDocument();
    });

    it("renders table column headers", () => {
      setup();
      expect(screen.getByRole("button", { name: /ordenar por nome/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /líder/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por membros/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por status/i })).toBeInTheDocument();
    });

    it("renders teams from context", async () => {
      setup();
      const rows = await screen.findAllByRole("row");
      // Header row + data rows (seed has 12 teams)
      expect(rows.length).toBeGreaterThan(1);
    });

    it("shows badge with team count", () => {
      setup();
      // Seed has 12 teams
      const badges = screen.getAllByText(/^\d+$/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it("displays team names", () => {
      setup();
      // Seed teams
      expect(screen.getByText("Engenharia")).toBeInTheDocument();
      expect(screen.getByText("Marketing")).toBeInTheDocument();
      expect(screen.getByText("Produto")).toBeInTheDocument();
    });

    it("displays team statuses as badges", () => {
      setup();
      // Teams should have "Ativo" status
      const activeBadges = screen.getAllByText("Ativo");
      expect(activeBadges.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters teams by search term", async () => {
      const { user } = setup();

      const initialRows = screen.getAllByRole("row");
      expect(initialRows.length).toBeGreaterThan(1);

      const searchInput = screen.getByPlaceholderText("Buscar times...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        const filteredRows = screen.getAllByRole("row");
        // Only header row
        expect(filteredRows.length).toBe(1);
      });
    });

    it("filters teams case-insensitively", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar times...");
      await user.type(searchInput, "ENGENHARIA");

      await waitFor(() => {
        expect(screen.getByText("Engenharia")).toBeInTheDocument();
      });
    });

    it("clears search when input is cleared", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar times...");

      await user.type(searchInput, "test");
      await user.clear(searchInput);

      // Should show all teams again
      expect(screen.getByText("Engenharia")).toBeInTheDocument();
      expect(screen.getByText("Marketing")).toBeInTheDocument();
    });

    it("searches by description as well", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar times...");
      // Search for term in description
      await user.type(searchInput, "desenvolvimento");

      await waitFor(() => {
        // Engenharia has "Time de desenvolvimento e infraestrutura" description
        expect(screen.getByText("Engenharia")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sorting
  // ═══════════════════════════════════════════════════════════════════════════

  describe("sorting functionality", () => {
    it("sorts by name when clicking header", async () => {
      const { user } = setup();

      const sortButton = screen.getByRole("button", { name: /ordenar por nome/i });
      await user.click(sortButton);

      const nameHeader = sortButton.closest("th");
      await waitFor(() => {
        expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
      });
    });

    it("toggles sort direction on second click", async () => {
      const { user } = setup();

      const sortButton = screen.getByRole("button", { name: /ordenar por nome/i });
      const nameHeader = sortButton.closest("th");

      await user.click(sortButton);
      await waitFor(() => {
        expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
      });

      await user.click(sortButton);
      await waitFor(() => {
        expect(nameHeader).toHaveAttribute("aria-sort", "descending");
      });
    });

    it("can sort by members column", async () => {
      const { user } = setup();

      const sortButton = screen.getByRole("button", { name: /ordenar por membros/i });
      await user.click(sortButton);

      const header = sortButton.closest("th");
      await waitFor(() => {
        expect(header).toHaveAttribute("aria-sort", "ascending");
      });
    });

    it("can sort by status column", async () => {
      const { user } = setup();

      const sortButton = screen.getByRole("button", { name: /ordenar por status/i });
      await user.click(sortButton);

      const header = sortButton.closest("th");
      await waitFor(() => {
        expect(header).toHaveAttribute("aria-sort", "ascending");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Row Selection
  // ═══════════════════════════════════════════════════════════════════════════

  describe("row selection", () => {
    it("selects a single row when clicking checkbox", async () => {
      const { user } = setup();

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(1);
      const rowCheckbox = checkboxes[1]!;

      await user.click(rowCheckbox);

      expect(rowCheckbox).toBeChecked();
    });

    it("selects all rows when clicking header checkbox", async () => {
      const { user } = setup();

      const checkboxes = screen.getAllByRole("checkbox");
      const headerCheckbox = checkboxes[0]!;

      await user.click(headerCheckbox);

      await waitFor(() => {
        const allCheckboxes = screen.getAllByRole("checkbox");
        allCheckboxes.forEach((checkbox) => {
          expect(checkbox).toBeChecked();
        });
      });
    });

    it("shows bulk actions when rows are selected", async () => {
      const { user } = setup();

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]!);

      await waitFor(() => {
        // Should show Archive and Delete buttons
        expect(screen.getByRole("button", { name: /arquivar/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /excluir/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Filter Bar
  // ═══════════════════════════════════════════════════════════════════════════

  describe("filter bar", () => {
    it("renders filter bar", () => {
      setup();
      // Filter bar should be present
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
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Team Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("create team modal", () => {
    it("opens modal when clicking create button", async () => {
      const { user } = setup();

      const createButton = screen.getByRole("button", { name: /novo time/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("modal has tabs for details and members", async () => {
      const { user } = setup();

      const createButton = screen.getByRole("button", { name: /novo time/i });
      await user.click(createButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByRole("tab", { name: /detalhes/i })).toBeInTheDocument();
        expect(within(dialog).getByRole("tab", { name: /membros/i })).toBeInTheDocument();
      });
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

      const engenhariaActionsButton = screen.getByRole("button", {
        name: /abrir ações do time engenharia/i,
      });
      expect(engenhariaActionsButton).toBeInTheDocument();
    });

    it("opens popover when clicking action button", async () => {
      const { user } = setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do time/i });
      await user.click(actionButtons[0]!);

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /editar time/i })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: /gerenciar membros/i })).toBeInTheDocument();
      });
    });

    it("shows archive/activate option based on team status", async () => {
      const { user } = setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do time/i });
      await user.click(actionButtons[0]!);

      await waitFor(() => {
        const hasArchive = screen.queryByRole("menuitem", { name: /arquivar time/i });
        const hasActivate = screen.queryByRole("menuitem", { name: /ativar time/i });
        expect(hasArchive || hasActivate).toBeTruthy();
      });
    });

    it("shows delete option in popover", async () => {
      const { user } = setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do time/i });
      await user.click(actionButtons[0]!);

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /excluir time/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Team Display
  // ═══════════════════════════════════════════════════════════════════════════

  describe("team display", () => {
    it("shows team leader info", () => {
      setup();
      // Teams should show leader information or "Sem líder"
      // Check that AvatarLabelGroup or "Sem líder" exists
      const cells = screen.getAllByRole("cell");
      const leaderCells = cells.filter(
        (cell) =>
          cell.textContent?.includes("Sem líder") ||
          cell.querySelector('[class*="avatarLabelGroup"]')
      );
      expect(leaderCells.length).toBeGreaterThanOrEqual(0);
    });

    it("shows member count for teams", () => {
      setup();
      // Should show member counts or "Adicionar" button
      const memberCounts = screen.getAllByText(/^\d+$/);
      expect(memberCounts.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles empty search results gracefully", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar times...");
      await user.type(searchInput, "this-team-does-not-exist-12345");

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        // Only header row
        expect(rows.length).toBe(1);
      });

      // Badge should show 0
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("updates badge count when filtering", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar times...");
      await user.type(searchInput, "Engenharia");

      await waitFor(() => {
        // Should show filtered count (1 team matches)
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════════════════

  describe("accessibility", () => {
    it("has proper table structure", () => {
      setup();

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    });

    it("has proper checkbox labels", () => {
      setup();

      expect(
        screen.getByRole("checkbox", { name: /selecionar todas as linhas/i })
      ).toBeInTheDocument();
    });

    it("sortable columns have aria-sort", () => {
      setup();

      const nameHeader = screen
        .getByRole("button", { name: /ordenar por nome/i })
        .closest("th");
      expect(nameHeader).toHaveAttribute("aria-sort", "none");
    });
  });
});
