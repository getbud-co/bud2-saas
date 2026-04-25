/**
 * Tests for CyclesModule
 *
 * This module provides CRUD operations for cycles within the settings page.
 * It uses the ConfigDataContext for data management and follows the standard
 * Table + Modal CRUD pattern.
 *
 * Cycles are generated dynamically relative to the current date, so tests
 * focus on structure and behavior rather than specific cycle names.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderMinimal } from "../../../../tests/setup/test-utils";
import { useCycles, useCreateCycle, useUpdateCycle, useDeleteCycle } from "@/hooks/use-cycles";
import { CyclesModule } from "./CyclesModule";

vi.mock("@/hooks/use-cycles", () => ({
  useCycles: vi.fn(),
  useCreateCycle: vi.fn(),
  useUpdateCycle: vi.fn(),
  useDeleteCycle: vi.fn(),
}));

const apiCycles = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    org_id: "api-org-9",
    name: "Q1 2026",
    type: "quarterly" as const,
    start_date: "2026-01-01",
    end_date: "2026-03-31",
    status: "active" as const,
    okr_definition_deadline: null,
    mid_review_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    org_id: "api-org-9",
    name: "Q2 2026",
    type: "quarterly" as const,
    start_date: "2026-04-01",
    end_date: "2026-06-30",
    status: "planning" as const,
    okr_definition_deadline: null,
    mid_review_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderMinimal(<CyclesModule />);
  return { user, ...result };
}

async function openCreateModal(user: ReturnType<typeof userEvent.setup>) {
  const createButton = screen.getByRole("button", { name: /novo ciclo/i });
  await user.click(createButton);
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
}

// ─── Tests ───

describe("CyclesModule", () => {
  const mockCreateMutate = vi.fn();
  const mockUpdateMutate = vi.fn();
  const mockDeleteMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCycles).mockReturnValue({ data: apiCycles, isLoading: false, error: null } as any);
    vi.mocked(useCreateCycle).mockReturnValue({ mutateAsync: mockCreateMutate } as any);
    vi.mocked(useUpdateCycle).mockReturnValue({ mutateAsync: mockUpdateMutate } as any);
    vi.mocked(useDeleteCycle).mockReturnValue({ mutateAsync: mockDeleteMutate } as any);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the info alert about cycles", () => {
      setup();
      expect(
        screen.getByText(/defina os períodos da sua organização/i)
      ).toBeInTheDocument();
    });

    it("renders the table with header", () => {
      setup();
      expect(screen.getByText("Ciclos")).toBeInTheDocument();
    });

    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar ciclo...")).toBeInTheDocument();
    });

    it("renders the create button", () => {
      setup();
      expect(screen.getByRole("button", { name: /novo ciclo/i })).toBeInTheDocument();
    });

    it("renders table column headers", () => {
      setup();
      expect(screen.getByRole("columnheader", { name: /nome/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /tipo/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /início/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /fim/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();
    });

    it("renders cycles from context", async () => {
      setup();
      const rows = await screen.findAllByRole("row");
      // Header row + data rows (seed generates at least 3 cycles)
      expect(rows.length).toBeGreaterThan(1);
    });

    it("shows badge with cycle count", () => {
      setup();
      // Count is dynamic but should be > 0
      const badges = screen.getAllByText(/^\d+$/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it("displays cycle types correctly", () => {
      setup();
      // Seed generates quarterly cycles
      expect(screen.getAllByText("Trimestral").length).toBeGreaterThan(0);
    });

    it("displays cycle statuses as badges", () => {
      setup();
      // Seed generates cycles with different statuses
      // At least one should be active (may have multiple)
      const activeLabels = screen.getAllByText("Ativo");
      expect(activeLabels.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters cycles by search term", async () => {
      const { user } = setup();

      const initialRows = screen.getAllByRole("row");
      expect(initialRows.length).toBeGreaterThan(1);

      const searchInput = screen.getByPlaceholderText("Buscar ciclo...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        const filteredRows = screen.getAllByRole("row");
        // Only header row
        expect(filteredRows.length).toBe(1);
      });
    });

    it("filters cycles case-insensitively", async () => {
      const { user } = setup();

      // Search for "Q" which should match quarterly cycles (Q1, Q2, etc.)
      const searchInput = screen.getByPlaceholderText("Buscar ciclo...");
      await user.type(searchInput, "q");

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        // Should have matches (header + at least one Q cycle)
        expect(rows.length).toBeGreaterThan(1);
      });
    });

    it("clears search when input is cleared", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar ciclo...");

      await user.type(searchInput, "test");
      await user.clear(searchInput);

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
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

    it("deselects row when clicking checkbox again", async () => {
      const { user } = setup();

      const checkboxes = screen.getAllByRole("checkbox");
      const rowCheckbox = checkboxes[1]!;

      await user.click(rowCheckbox);
      expect(rowCheckbox).toBeChecked();

      await user.click(rowCheckbox);
      expect(rowCheckbox).not.toBeChecked();
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
        const bulkDeleteButton = screen.getByRole("button", { name: /excluir/i });
        expect(bulkDeleteButton).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Cycle Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("create cycle modal", () => {
    it("opens modal when clicking create button", async () => {
      const { user } = setup();

      await openCreateModal(user);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: /novo ciclo/i })).toBeInTheDocument();
    });

    it("has name input field", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByLabelText(/nome do ciclo/i)).toBeInTheDocument();
    });

    it("has type select field", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(/tipo/i)).toBeInTheDocument();
    });

    it("has date range picker", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(/período/i)).toBeInTheDocument();
    });

    it("has status choice boxes", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(/status/i)).toBeInTheDocument();
      expect(within(dialog).getByText("Ativo")).toBeInTheDocument();
      expect(within(dialog).getByText("Futuro")).toBeInTheDocument();
      expect(within(dialog).getByText("Encerrado")).toBeInTheDocument();
    });

    it("disables create button when form is incomplete", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      const createButton = within(dialog).getByRole("button", { name: /criar ciclo/i });
      // Button should be disabled because name and dates are empty
      expect(createButton).toBeDisabled();
    });

    it("has cancel button", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    });

    it("has close button in header", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("button", { name: /fechar/i })).toBeInTheDocument();
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

      // Get all action buttons and check they have cycle name in aria-label
      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do ciclo/i });
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("opens popover when clicking action button", async () => {
      const { user } = setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do ciclo/i });
      await user.click(actionButtons[0]!);

      // Should show edit option
      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /editar/i })).toBeInTheDocument();
      });
    });

    it("shows activate/end option based on cycle status", async () => {
      const { user } = setup();

      // Find an action button and click it
      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do ciclo/i });
      await user.click(actionButtons[0]!);

      // Should show either "Ativar" or "Encerrar" depending on status
      await waitFor(() => {
        const hasActivate = screen.queryByRole("menuitem", { name: /ativar/i });
        const hasEnd = screen.queryByRole("menuitem", { name: /encerrar/i });
        expect(hasActivate || hasEnd).toBeTruthy();
      });
    });

    it("shows delete option in popover", async () => {
      const { user } = setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do ciclo/i });
      await user.click(actionButtons[0]!);

      await waitFor(() => {
        expect(screen.getByRole("menuitem", { name: /excluir/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles empty search results gracefully", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar ciclo...");
      await user.type(searchInput, "this-cycle-does-not-exist-12345");

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

      // Get initial count
      const initialBadges = screen.getAllByText(/^\d+$/);
      const initialCount = parseInt(initialBadges[0]?.textContent || "0", 10);
      expect(initialCount).toBeGreaterThan(0);

      // Filter to get fewer results
      const searchInput = screen.getByPlaceholderText("Buscar ciclo...");
      await user.type(searchInput, "nonexistent");

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
      });
    });

    it("displays dates in DD/MM/YYYY format", () => {
      setup();

      // Dates should be formatted as DD/MM/YYYY
      // Look for cells with date pattern
      const cells = screen.getAllByRole("cell");
      const dateCells = cells.filter((cell) =>
        /^\d{2}\/\d{2}\/\d{4}$/.test(cell.textContent || "")
      );
      expect(dateCells.length).toBeGreaterThan(0);
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

    it("modal has proper dialog role and labeling", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("alert has proper role", () => {
      setup();

      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });
});
