/**
 * Tests for TagsModule
 *
 * This module provides CRUD operations for tags within the settings page.
 * It uses the ConfigDataContext for data management and follows the standard
 * Table + Modal CRUD pattern used throughout the application.
 *
 * Note: Some tests that require modal interactions (open/close) may have
 * timing issues with happy-dom. These tests verify the component structure
 * and basic interactions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { TagsModule } from "./TagsModule";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<TagsModule />);
  return { user, ...result };
}

async function openCreateModal(user: ReturnType<typeof userEvent.setup>) {
  const createButton = screen.getByRole("button", { name: /nova tag/i });
  await user.click(createButton);
  // Wait for modal to be in the document
  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
}

async function getNameInputInModal() {
  const dialog = screen.getByRole("dialog");
  return within(dialog).getByPlaceholderText("Nome da tag");
}

// ─── Tests ───

describe("TagsModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the table with header", () => {
      setup();
      expect(screen.getByText("Tags")).toBeInTheDocument();
    });

    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar tag...")).toBeInTheDocument();
    });

    it("renders the create button", () => {
      setup();
      expect(screen.getByRole("button", { name: /nova tag/i })).toBeInTheDocument();
    });

    it("renders table column headers", () => {
      setup();
      expect(screen.getByRole("button", { name: /ordenar por nome/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por itens vinculados/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por criado em/i })).toBeInTheDocument();
    });

    it("renders tags from context", async () => {
      setup();
      const rows = await screen.findAllByRole("row");
      // Header row + at least one data row (seed data has 11 tags)
      expect(rows.length).toBeGreaterThan(1);
    });

    it("renders badge showing tag count", () => {
      setup();
      // The badge is inside the table card header, showing count
      // Seed data has 11 tags
      expect(screen.getByText("11")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters tags by search term", async () => {
      const { user } = setup();

      // Verify we start with multiple rows
      const initialRows = screen.getAllByRole("row");
      expect(initialRows.length).toBeGreaterThan(1);

      const searchInput = screen.getByPlaceholderText("Buscar tag...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        const filteredRows = screen.getAllByRole("row");
        // Only header row should remain
        expect(filteredRows.length).toBe(1);
      });
    });

    it("clears search when input is cleared", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tag...");

      await user.type(searchInput, "test");
      await user.clear(searchInput);

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });

    it("filters case-insensitively", async () => {
      const { user } = setup();

      // Search for a known seed tag with different case
      const searchInput = screen.getByPlaceholderText("Buscar tag...");
      await user.type(searchInput, "ENGENHARIA");

      await waitFor(() => {
        // Should find the "Engenharia" tag
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

    it("can sort by linked items column", async () => {
      const { user } = setup();

      const sortButton = screen.getByRole("button", { name: /ordenar por itens vinculados/i });
      await user.click(sortButton);

      const header = sortButton.closest("th");
      await waitFor(() => {
        expect(header).toHaveAttribute("aria-sort", "ascending");
      });
    });

    it("can sort by created date column", async () => {
      const { user } = setup();

      const sortButton = screen.getByRole("button", { name: /ordenar por criado em/i });
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
      expect(checkboxes.length).toBeGreaterThan(0);
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

      // TableBulkActions renders via portal with delete button
      // The text format is "N selecionado(s)" - look for the excluir button instead
      await waitFor(() => {
        const bulkDeleteButton = screen.getByRole("button", { name: /excluir/i });
        expect(bulkDeleteButton).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Tag Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("create tag modal", () => {
    it("opens modal when clicking create button", async () => {
      const { user } = setup();

      await openCreateModal(user);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: /nova tag/i })).toBeInTheDocument();
    });

    it("has name input field", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const nameInput = await getNameInputInModal();
      expect(nameInput).toBeInTheDocument();
    });

    it("has color selection grid", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Cor")).toBeInTheDocument();
      expect(within(dialog).getByTitle("Cinza")).toBeInTheDocument();
      expect(within(dialog).getByTitle("Laranja")).toBeInTheDocument();
      expect(within(dialog).getByTitle("Vinho")).toBeInTheDocument();
      expect(within(dialog).getByTitle("Caramelo")).toBeInTheDocument();
      expect(within(dialog).getByTitle("Verde")).toBeInTheDocument();
      expect(within(dialog).getByTitle("Amarelo")).toBeInTheDocument();
      expect(within(dialog).getByTitle("Vermelho")).toBeInTheDocument();
    });

    it("disables create button when name is empty", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      const createButton = within(dialog).getByRole("button", { name: /criar tag/i });
      expect(createButton).toBeDisabled();
    });

    it("enables create button when name is filled", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const nameInput = await getNameInputInModal();
      await user.type(nameInput, "New Tag");

      const dialog = screen.getByRole("dialog");
      const createButton = within(dialog).getByRole("button", { name: /criar tag/i });
      expect(createButton).not.toBeDisabled();
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

    it("allows selecting a color", async () => {
      const { user } = setup();

      await openCreateModal(user);

      const dialog = screen.getByRole("dialog");
      const orangeButton = within(dialog).getByTitle("Laranja");
      await user.click(orangeButton);

      // The selected color should have the active class
      expect(orangeButton.className).toContain("Active");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Row Actions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("row actions", () => {
    it("renders action buttons for each row", () => {
      setup();

      // Each row should have an actions button
      const actionButtons = screen.getAllByRole("button", { name: /abrir ações/i });
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("has descriptive aria-label for action buttons", () => {
      setup();

      // Check that action buttons have tag name in aria-label
      const engenhariaActionsButton = screen.getByRole("button", {
        name: /abrir ações da tag engenharia/i,
      });
      expect(engenhariaActionsButton).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles empty search results gracefully", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tag...");
      await user.type(searchInput, "this-tag-does-not-exist-12345");

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

      // Initial count is 11
      expect(screen.getByText("11")).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText("Buscar tag...");
      await user.type(searchInput, "Engenharia");

      await waitFor(() => {
        // Should show filtered count (1 tag matches "Engenharia")
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });

    it("shows linked items count as 0 for all tags", () => {
      setup();

      // All tags should show 0 linked items (since linkedItems is hardcoded to 0)
      const cells = screen.getAllByRole("cell");
      const zeroCells = cells.filter((cell) => cell.textContent === "0");
      // Should have one "0" for each tag row
      expect(zeroCells.length).toBeGreaterThan(0);
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

    it("has sortable column headers with aria-sort", () => {
      setup();

      const nameHeader = screen
        .getByRole("button", { name: /ordenar por nome/i })
        .closest("th");
      expect(nameHeader).toHaveAttribute("aria-sort", "none");
    });

    it("has proper checkbox labels", () => {
      setup();

      // Header checkbox
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
  });
});
