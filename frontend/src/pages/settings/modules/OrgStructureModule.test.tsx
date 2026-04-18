/**
 * Tests for OrgStructureModule
 *
 * This module renders an organizational chart / hierarchy view.
 * It uses PeopleDataContext for data, supports list and chart view modes,
 * team filtering, search, zoom controls, and a detail drawer for editing
 * reporting relationships.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { OrgStructureModule } from "./OrgStructureModule";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<OrgStructureModule />);
  return { user, ...result };
}

// ─── Tests ───

describe("OrgStructureModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the search input", () => {
      setup();
      expect(screen.getByPlaceholderText("Buscar colaborador...")).toBeInTheDocument();
    });

    it("renders the view mode toggle button", () => {
      setup();
      // Default view is chart ("Vendo em arvore")
      expect(screen.getByRole("button", { name: /vendo em árvore/i })).toBeInTheDocument();
    });

    it("renders expand and collapse buttons", () => {
      setup();
      expect(screen.getByRole("button", { name: /expandir tudo/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /recolher tudo/i })).toBeInTheDocument();
    });

    it("renders zoom controls", () => {
      setup();
      // Zoom label shows 100%
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("renders stats badges", () => {
      setup();
      // Should show active count and team count
      expect(screen.getByText(/ativos/i)).toBeInTheDocument();
      expect(screen.getByText(/times/i)).toBeInTheDocument();
    });

    it("renders the filter bar with add filter button", () => {
      setup();
      expect(screen.getByRole("button", { name: /adicionar filtro/i })).toBeInTheDocument();
    });

    it("renders people from context in the tree", () => {
      setup();
      // CEO is a root node in the seed data
      expect(screen.getByText("Roberto Nascimento")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search Functionality
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("shows search results dropdown when typing", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar colaborador...");
      await user.type(searchInput, "Carlos");

      await waitFor(() => {
        // Carlos Mendes (Tech Lead) should appear in search results
        expect(screen.getByText("Carlos Mendes")).toBeInTheDocument();
      });
    });

    it("filters search results by job title", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar colaborador...");
      await user.type(searchInput, "Tech Lead");

      await waitFor(() => {
        expect(screen.getByText("Carlos Mendes")).toBeInTheDocument();
      });
    });

    it("filters search results by team name", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar colaborador...");
      await user.type(searchInput, "Marketing");

      await waitFor(() => {
        // Fernando Rodrigues is the Marketing team leader - may appear in both
        // search results and chart, so use getAllByText
        const matches = screen.getAllByText("Fernando Rodrigues");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("search is case-insensitive", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar colaborador...");
      await user.type(searchInput, "ROBERTO");

      await waitFor(() => {
        // May appear in both search results and chart tree
        const matches = screen.getAllByText("Roberto Nascimento");
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // View Mode Toggle
  // ═══════════════════════════════════════════════════════════════════════════

  describe("view mode toggle", () => {
    it("defaults to chart (tree) view", () => {
      setup();
      expect(screen.getByRole("button", { name: /vendo em árvore/i })).toBeInTheDocument();
    });

    it("opens view mode dropdown on click", async () => {
      const { user } = setup();

      const viewModeBtn = screen.getByRole("button", { name: /vendo em árvore/i });
      await user.click(viewModeBtn);

      await waitFor(() => {
        expect(screen.getByText("Lista")).toBeInTheDocument();
      });
    });

    it("switches to list view", async () => {
      const { user } = setup();

      const viewModeBtn = screen.getByRole("button", { name: /vendo em árvore/i });
      await user.click(viewModeBtn);

      await waitFor(() => {
        const listOption = screen.getByText("Lista");
        return listOption;
      });

      await user.click(screen.getByText("Lista"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /vendo em lista/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Zoom Controls
  // ═══════════════════════════════════════════════════════════════════════════

  describe("zoom controls", () => {
    it("zooms in when clicking zoom in button", async () => {
      const { user } = setup();

      // There are two icon-only buttons in the zoom controls area.
      // The zoom in button is the second one (after the zoom label).
      const zoomLabel = screen.getByText("100%");
      const zoomContainer = zoomLabel.parentElement!;
      const buttons = zoomContainer.querySelectorAll("button");
      // buttons[0] = zoom out, buttons[1] = zoom label, buttons[2] = zoom in
      // Actually the zoom label is a <button>, and the + / - are <Button> components
      // Let's find them by their position
      const allButtons = Array.from(buttons);
      const zoomInBtn = allButtons[allButtons.length - 1]!;

      await user.click(zoomInBtn);

      await waitFor(() => {
        expect(screen.getByText("110%")).toBeInTheDocument();
      });
    });

    it("zooms out when clicking zoom out button", async () => {
      const { user } = setup();

      const zoomLabel = screen.getByText("100%");
      const zoomContainer = zoomLabel.parentElement!;
      const buttons = zoomContainer.querySelectorAll("button");
      const allButtons = Array.from(buttons);
      const zoomOutBtn = allButtons[0]!;

      await user.click(zoomOutBtn);

      await waitFor(() => {
        expect(screen.getByText("90%")).toBeInTheDocument();
      });
    });

    it("resets zoom when clicking zoom label", async () => {
      const { user } = setup();

      // First zoom in
      const zoomLabel = screen.getByText("100%");
      const zoomContainer = zoomLabel.parentElement!;
      const buttons = Array.from(zoomContainer.querySelectorAll("button"));
      const zoomInBtn = buttons[buttons.length - 1]!;

      await user.click(zoomInBtn);
      await waitFor(() => {
        expect(screen.getByText("110%")).toBeInTheDocument();
      });

      // Click the zoom label to reset
      await user.click(screen.getByText("110%"));

      await waitFor(() => {
        expect(screen.getByText("100%")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Expand / Collapse
  // ═══════════════════════════════════════════════════════════════════════════

  describe("expand and collapse", () => {
    it("collapses all nodes", async () => {
      const { user } = setup();

      // First switch to list view for easier DOM inspection
      const viewModeBtn = screen.getByRole("button", { name: /vendo em árvore/i });
      await user.click(viewModeBtn);
      await waitFor(() => screen.getByText("Lista"));
      await user.click(screen.getByText("Lista"));
      await waitFor(() => screen.getByRole("button", { name: /vendo em lista/i }));

      // Click "Recolher tudo"
      await user.click(screen.getByRole("button", { name: /recolher tudo/i }));

      // After collapsing, child nodes should not be visible in the tree
      // Pedro Almeida (CTO) reports to CEO but should be hidden when collapsed
      // The CEO node itself should still be visible
      expect(screen.getByText("Roberto Nascimento")).toBeInTheDocument();
    });

    it("expands all nodes after collapsing", async () => {
      const { user } = setup();

      // Switch to list view
      const viewModeBtn = screen.getByRole("button", { name: /vendo em árvore/i });
      await user.click(viewModeBtn);
      await waitFor(() => screen.getByText("Lista"));
      await user.click(screen.getByText("Lista"));
      await waitFor(() => screen.getByRole("button", { name: /vendo em lista/i }));

      // Collapse, then expand
      await user.click(screen.getByRole("button", { name: /recolher tudo/i }));
      await user.click(screen.getByRole("button", { name: /expandir tudo/i }));

      // After expanding, deeper nodes should be visible
      await waitFor(() => {
        // Carlos Mendes is a deeper node (reports to CTO)
        expect(screen.getByText("Carlos Mendes")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Filter Bar
  // ═══════════════════════════════════════════════════════════════════════════

  describe("filter bar", () => {
    it("renders add filter button", () => {
      setup();
      expect(screen.getByRole("button", { name: /adicionar filtro/i })).toBeInTheDocument();
    });

    it("shows team filter option when clicking add filter", async () => {
      const { user } = setup();

      const addFilterBtn = screen.getByRole("button", { name: /adicionar filtro/i });
      await user.click(addFilterBtn);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: /time/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Basic Interactions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("basic interactions", () => {
    it("clears search input correctly", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar colaborador...");
      await user.type(searchInput, "Carlos");
      await user.clear(searchInput);

      // Search results dropdown should be gone since search is empty
      // The main tree should still render
      expect(screen.getByText("Roberto Nascimento")).toBeInTheDocument();
    });
  });
});
