import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { TagsModule } from "./TagsModule";

// ─── Mocks ───

const mockTags = [
  {
    id: "tag-1",
    org_id: "org-1",
    name: "Engenharia",
    color: "orange" as const,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "tag-2",
    org_id: "org-1",
    name: "Design",
    color: "wine" as const,
    created_at: "2024-02-20T14:30:00Z",
    updated_at: "2024-02-20T14:30:00Z",
  },
  {
    id: "tag-3",
    org_id: "org-1",
    name: "Produto",
    color: "success" as const,
    created_at: "2024-03-01T09:00:00Z",
    updated_at: "2024-03-01T09:00:00Z",
  },
];

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-tags", () => ({
  useTags: () => ({
    data: mockTags,
    isLoading: false,
    error: null,
    total: mockTags.length,
  }),
  useCreateTag: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useUpdateTag: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useDeleteTag: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<TagsModule />);
  return { user, ...result };
}

async function openCreateModal(user: ReturnType<typeof userEvent.setup>) {
  const createButton = screen.getByRole("button", { name: /nova tag/i });
  await user.click(createButton);
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
    mockMutateAsync.mockClear();
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

    it("renders tags from API", async () => {
      setup();
      const rows = await screen.findAllByRole("row");
      // Header row + 3 data rows
      expect(rows.length).toBe(4);
    });

    it("renders badge showing tag count", () => {
      setup();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders tag names in the table", () => {
      setup();
      expect(screen.getByText("Engenharia")).toBeInTheDocument();
      expect(screen.getByText("Design")).toBeInTheDocument();
      expect(screen.getByText("Produto")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search/Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search functionality", () => {
    it("filters tags by search term", async () => {
      const { user } = setup();

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
      await user.type(searchInput, "eng");
      await user.clear(searchInput);

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBe(4);
    });

    it("filters case-insensitively", async () => {
      const { user } = setup();

      const searchInput = screen.getByPlaceholderText("Buscar tag...");
      await user.type(searchInput, "ENGENHARIA");

      await waitFor(() => {
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

      expect(orangeButton.className).toContain("Active");
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
        expect(rows.length).toBe(1);
      });

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("updates badge count when filtering", async () => {
      const { user } = setup();

      expect(screen.getByText("3")).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText("Buscar tag...");
      await user.type(searchInput, "Engenharia");

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });

    it("shows linked items count as 0 for all tags", () => {
      setup();

      const cells = screen.getAllByRole("cell");
      const zeroCells = cells.filter((cell) => cell.textContent === "0");
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
