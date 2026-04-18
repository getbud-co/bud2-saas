/**
 * Tests for SurveyTemplatesModule
 *
 * This module provides CRUD operations for survey templates.
 * It uses the SurveysDataContext for data management and displays
 * templates in a table with search, sorting, row actions (edit, duplicate, delete),
 * and a create modal with QuestionnaireBuilder.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { SurveyTemplatesModule } from "./SurveyTemplatesModule";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<SurveyTemplatesModule />);
  return { user, ...result };
}

// ─── Tests ───

describe("SurveyTemplatesModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the table with header title", () => {
      setup();
      expect(screen.getByText("Templates de pesquisa")).toBeInTheDocument();
    });

    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar template...")).toBeInTheDocument();
    });

    it("renders the create button", () => {
      setup();
      expect(screen.getByRole("button", { name: /novo template/i })).toBeInTheDocument();
    });

    it("renders table column headers", () => {
      setup();
      expect(screen.getByRole("button", { name: /ordenar por nome/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por categoria/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por perguntas/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por pesquisas vinculadas/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ordenar por atualizado em/i })).toBeInTheDocument();
    });

    it("renders template rows from context", async () => {
      setup();
      const rows = await screen.findAllByRole("row");
      // Header row + data rows (seed data has system templates)
      expect(rows.length).toBeGreaterThan(1);
    });

    it("renders badge showing template count", () => {
      setup();
      // Seed data has system templates (Pulse, Clima, eNPS, etc.)
      const badges = screen.getAllByText(/^\d+$/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it("displays template names from seed data", () => {
      setup();
      // System templates should be visible
      expect(screen.getByText("Pulse")).toBeInTheDocument();
    });

    it("displays category badges", () => {
      setup();
      // Templates have pesquisa or ciclo categories
      const pesquisaBadges = screen.getAllByText("Pesquisa");
      expect(pesquisaBadges.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters templates by search term", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar template...");
      await user.type(searchInput, "Pulse");

      await waitFor(() => {
        expect(screen.getByText("Pulse")).toBeInTheDocument();
        // Other templates should be filtered out
        expect(screen.queryByText("Clima Organizacional")).not.toBeInTheDocument();
      });
    });

    it("shows no data rows when search has no results", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar template...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        // Only header row should remain
        expect(rows.length).toBe(1);
      });
    });

    it("filters case-insensitively", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar template...");
      await user.type(searchInput, "pulse");

      await waitFor(() => {
        expect(screen.getByText("Pulse")).toBeInTheDocument();
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
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Row Actions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("row actions", () => {
    it("renders action buttons for each row", () => {
      setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações do template/i });
      expect(actionButtons.length).toBeGreaterThan(0);
    });

    it("has descriptive aria-label for action buttons", () => {
      setup();

      const pulseActionsButton = screen.getByRole("button", {
        name: /abrir ações do template pulse$/i,
      });
      expect(pulseActionsButton).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("create modal", () => {
    it("opens create modal when clicking Novo template", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /novo template/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText("Novo template")).toBeInTheDocument();
      });
    });

    it("has form fields in the create modal", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /novo template/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByPlaceholderText("Ex: Pulse semanal")).toBeInTheDocument();
        expect(within(dialog).getByPlaceholderText("Breve descrição")).toBeInTheDocument();
      });
    });

    it("disables create button when name is empty", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /novo template/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        const createButton = within(dialog).getByRole("button", { name: /criar template/i });
        expect(createButton).toBeDisabled();
      });
    });

    it("has cancel button in the create modal", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /novo template/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
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

      expect(
        screen.getByRole("checkbox", { name: /selecionar todas as linhas/i })
      ).toBeInTheDocument();
    });
  });
});
