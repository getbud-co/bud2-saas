/**
 * Tests for SurveysPage
 *
 * This page provides a CRUD table listing surveys with search, sort,
 * filters, indicators, create modal, and row actions.
 * Data comes from SurveysDataContext (seeded with 12 surveys).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockAuthProvider } from "../../../tests/setup/MockAuthProvider";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { SavedViewsProvider } from "@/contexts/SavedViewsContext";
import { SurveysPage } from "./SurveysPage";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <MockAuthProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigDataProvider>
          <ActivityDataProvider>
            <PeopleDataProvider>
              <MissionsDataProvider>
                <SurveysDataProvider>
                  <SettingsDataProvider>
                    <IntegrationsDataProvider>
                      <SavedViewsProvider>
                        <MemoryRouter>
                          <SurveysPage />
                        </MemoryRouter>
                      </SavedViewsProvider>
                    </IntegrationsDataProvider>
                  </SettingsDataProvider>
                </SurveysDataProvider>
              </MissionsDataProvider>
            </PeopleDataProvider>
          </ActivityDataProvider>
        </ConfigDataProvider>
      </QueryClientProvider>
    </MockAuthProvider>,
  );
  return { user, ...result };
}

// ─── Tests ───

describe("SurveysPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the page header", () => {
      setup();
      expect(screen.getByText("Pesquisas")).toBeInTheDocument();
    });

    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar pesquisa...")).toBeInTheDocument();
    });

    it("renders the create button", () => {
      setup();
      expect(screen.getByRole("button", { name: /criar pesquisa/i })).toBeInTheDocument();
    });

    it("renders table column headers", () => {
      setup();
      expect(screen.getByText("Nome")).toBeInTheDocument();
      expect(screen.getByText("Tipo")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("renders the table title", () => {
      setup();
      expect(screen.getByText("Todas as pesquisas")).toBeInTheDocument();
    });

    it("renders surveys from context", () => {
      setup();
      const rows = screen.getAllByRole("row");
      // Header row + data rows (seed has 12 surveys)
      expect(rows.length).toBeGreaterThan(1);
    });

    it("shows badge with survey count", () => {
      setup();
      // Seed has 12 surveys
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("displays survey names", () => {
      setup();
      expect(screen.getByText("Feedback 360° — Lideranca")).toBeInTheDocument();
      expect(screen.getByText("Skip-Level — Diretoria")).toBeInTheDocument();
    });

    it("displays survey statuses as badges", () => {
      setup();
      const activeBadges = screen.getAllByText("Ativa");
      expect(activeBadges.length).toBeGreaterThan(0);
    });

    it("displays indicator cards", () => {
      setup();
      expect(screen.getByText("Pesquisas ativas")).toBeInTheDocument();
      expect(screen.getByText("Taxa média de resposta")).toBeInTheDocument();
      expect(screen.getByText("Pendentes de lançamento")).toBeInTheDocument();
      expect(screen.getByText("Total de respostas")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters surveys by search term", async () => {
      const { user } = setup();

      const initialRows = screen.getAllByRole("row");
      expect(initialRows.length).toBeGreaterThan(1);

      const searchInput = screen.getByPlaceholderText("Buscar pesquisa...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        const filteredRows = screen.getAllByRole("row");
        // Only header row
        expect(filteredRows.length).toBe(1);
      });
    });

    it("filters surveys case-insensitively", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar pesquisa...");
      await user.type(searchInput, "SKIP-LEVEL");

      await waitFor(() => {
        expect(screen.getByText("Skip-Level — Diretoria")).toBeInTheDocument();
      });
    });

    it("clears search when input is cleared", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar pesquisa...");
      await user.type(searchInput, "skip-level");
      await user.clear(searchInput);

      expect(screen.getByText("Skip-Level — Diretoria")).toBeInTheDocument();
      expect(screen.getByText("Feedback 360° — Lideranca")).toBeInTheDocument();
    });

    it("updates badge count when filtering", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar pesquisa...");
      await user.type(searchInput, "Skip-Level");

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });

    it("handles empty search results gracefully", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar pesquisa...");
      await user.type(searchInput, "this-survey-does-not-exist-12345");

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        // Only header row
        expect(rows.length).toBe(1);
      });

      // Badge and indicator cards may all show 0 — just check at least one exists
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sorting
  // ═══════════════════════════════════════════════════════════════════════════

  describe("sorting functionality", () => {
    it("has sortable column headers", () => {
      setup();
      // The Name, Periodo, and Respostas columns are sortable
      const sortableHeaders = screen.getAllByRole("columnheader").filter(
        (header) => header.querySelector("button"),
      );
      expect(sortableHeaders.length).toBeGreaterThanOrEqual(3);
    });

    it("sorts by name when clicking header", async () => {
      const { user } = setup();

      // Find the Name column header's sort button
      const nameHeader = screen.getByText("Nome").closest("th");
      expect(nameHeader).toBeInTheDocument();

      const sortButton = within(nameHeader!).getByRole("button");
      await user.click(sortButton);

      await waitFor(() => {
        expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
      });
    });

    it("toggles sort direction on second click", async () => {
      const { user } = setup();

      const nameHeader = screen.getByText("Nome").closest("th");
      const sortButton = within(nameHeader!).getByRole("button");

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
        expect(screen.getByRole("button", { name: /pausar selecionadas/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Filter Bar
  // ═══════════════════════════════════════════════════════════════════════════

  describe("filter bar", () => {
    it("renders filter bar with add filter button", () => {
      setup();
      expect(screen.getByRole("button", { name: /adicionar filtro/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Survey Modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe("create survey modal", () => {
    it("opens modal when clicking create button", async () => {
      const { user } = setup();

      const createButton = screen.getByRole("button", { name: /criar pesquisa/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("modal shows template selection title", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /criar pesquisa/i }));

      await waitFor(() => {
        expect(screen.getByText("Escolha o seu template de pesquisa")).toBeInTheDocument();
      });
    });

    it("modal has survey name input", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /criar pesquisa/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Nome da pesquisa")).toBeInTheDocument();
      });
    });

    it("modal has cancel and next buttons", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /criar pesquisa/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: /próximo/i })).toBeInTheDocument();
      });
    });

    it("next button is disabled when no template is selected", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /criar pesquisa/i }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByRole("button", { name: /próximo/i })).toBeDisabled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Row Actions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("row actions", () => {
    it("renders action buttons for each row", () => {
      setup();

      const actionButtons = screen.getAllByRole("button", { name: /abrir ações da pesquisa/i });
      expect(actionButtons.length).toBeGreaterThan(0);
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
        screen.getByRole("checkbox", { name: /selecionar todas as linhas/i }),
      ).toBeInTheDocument();
    });
  });
});
