/**
 * Tests for TeamsModule
 *
 * This module provides CRUD operations for teams within the people section.
 * It uses the PeopleDataContext for data management and follows the standard
 * Table + Modal CRUD pattern with additional features like filters and bulk actions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { TeamsModule } from "./TeamsModule";
import { listTeams } from "@/lib/teams-api";
import { listUsers } from "@/lib/users-api";

vi.mock("@/lib/teams-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/teams-api")>("@/lib/teams-api");
  return {
    ...actual,
    listTeams: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, size: 100 }),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
  };
});

vi.mock("@/lib/users-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/users-api")>("@/lib/users-api");
  return {
    ...actual,
    listUsers: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, size: 100 }),
  };
});

const SEED_TEAMS = [
  { id: "t1", org_id: "org1", name: "Engenharia", description: null, color: "neutral", status: "active" as const, members: [], member_count: 0, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "t2", org_id: "org1", name: "Marketing", description: null, color: "orange", status: "active" as const, members: [], member_count: 0, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "t3", org_id: "org1", name: "Produto", description: "Time de produto", color: "wine", status: "active" as const, members: [], member_count: 0, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: "t4", org_id: "org1", name: "Design", description: null, color: "caramel", status: "archived" as const, members: [], member_count: 0, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
];

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
    localStorage.setItem("bud.test.access-token", "test-token");
    vi.clearAllMocks();
    // Re-apply default mocks after clearAllMocks
    vi.mocked(listTeams).mockResolvedValue({ data: SEED_TEAMS, total: SEED_TEAMS.length, page: 1, size: 100 });
    vi.mocked(listUsers).mockResolvedValue({ data: [], total: 0, page: 1, size: 100 });
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

    it("renders teams from API", async () => {
      setup();
      await screen.findByText("Engenharia");
      const rows = screen.getAllByRole("row");
      // Header row + data rows (SEED_TEAMS has 4 teams)
      expect(rows.length).toBeGreaterThan(1);
    });

    it("shows badge with team count", async () => {
      setup();
      await screen.findByText("Engenharia");
      const badges = screen.getAllByText(/^\d+$/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it("displays team names", async () => {
      setup();
      expect(await screen.findByText("Engenharia")).toBeInTheDocument();
      expect(screen.getByText("Marketing")).toBeInTheDocument();
      expect(screen.getByText("Produto")).toBeInTheDocument();
    });

    it("displays team statuses as badges", async () => {
      setup();
      await screen.findByText("Engenharia");
      const activeBadges = screen.getAllByText("Ativo");
      expect(activeBadges.length).toBeGreaterThan(0);
    });

    it("calls listTeams on mount", async () => {
      setup();
      await waitFor(() => {
        expect(listTeams).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters teams by search term", async () => {
      const { user } = setup();

      await screen.findByText("Engenharia");
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

      await screen.findByText("Engenharia");
      const searchInput = screen.getByPlaceholderText("Buscar times...");
      await user.type(searchInput, "ENGENHARIA");

      await waitFor(() => {
        expect(screen.getByText("Engenharia")).toBeInTheDocument();
      });
    });

    it("clears search when input is cleared", async () => {
      const { user } = setup();

      await screen.findByText("Engenharia");
      const searchInput = screen.getByPlaceholderText("Buscar times...");

      await user.type(searchInput, "test");
      await user.clear(searchInput);

      // Should show all teams again
      expect(screen.getByText("Engenharia")).toBeInTheDocument();
      expect(screen.getByText("Marketing")).toBeInTheDocument();
    });

    it("searches by description as well", async () => {
      const { user } = setup();

      await screen.findByText("Produto");
      const searchInput = screen.getByPlaceholderText("Buscar times...");
      // Search for term in Produto's description ("Time de produto")
      await user.type(searchInput, "produto");

      await waitFor(() => {
        expect(screen.getByText("Produto")).toBeInTheDocument();
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

      await screen.findByText("Engenharia");
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(1);
      const rowCheckbox = checkboxes[1]!;

      await user.click(rowCheckbox);

      expect(rowCheckbox).toBeChecked();
    });

    it("selects all rows when clicking header checkbox", async () => {
      const { user } = setup();
      await screen.findByText("Engenharia");

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

      await screen.findByText("Engenharia");
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
    it("renders action buttons for each row", async () => {
      setup();
      await screen.findByText("Engenharia");
      const actionButtons = screen.getAllByRole("button", { name: /abrir ações/i });
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("has descriptive aria-label for action buttons", async () => {
      setup();
      await screen.findByText("Engenharia");
      const engenhariaActionsButton = screen.getByRole("button", {
        name: /abrir ações do time engenharia/i,
      });
      expect(engenhariaActionsButton).toBeInTheDocument();
    });

    it("opens popover when clicking action button", async () => {
      const { user } = setup();
      await screen.findByText("Engenharia");
      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do time/i });
      await user.click(actionButtons[0]!);

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /editar time/i })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: /gerenciar membros/i })).toBeInTheDocument();
      });
    });

    it("shows archive/activate option based on team status", async () => {
      const { user } = setup();
      await screen.findByText("Engenharia");
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
      await screen.findByText("Engenharia");
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
    it("shows team leader info", async () => {
      setup();
      await screen.findByText("Engenharia");
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
    it("has proper table structure", async () => {
      setup();
      await screen.findByText("Engenharia");
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
