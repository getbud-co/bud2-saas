/**
 * Tests for PopoverSelect
 *
 * Custom popover dropdown supporting single/multi select with search,
 * avatars, icons, and creatable options.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { PopoverSelect, formatMultiLabel, type PopoverSelectOption } from "./PopoverSelect";

// ─── Test Helpers ───

const OPTIONS: PopoverSelectOption[] = [
  { id: "1", label: "Option A" },
  { id: "2", label: "Option B" },
  { id: "3", label: "Option C" },
];

function SingleSelectWrapper(props: {
  options?: PopoverSelectOption[];
  searchable?: boolean;
  initialValue?: string | null;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const onChange = vi.fn();

  return (
    <>
      <button ref={anchorRef}>Trigger</button>
      <PopoverSelect
        mode="single"
        open
        onClose={vi.fn()}
        anchorRef={anchorRef}
        options={props.options ?? OPTIONS}
        value={props.initialValue ?? null}
        onChange={onChange}
        searchable={props.searchable}
      />
    </>
  );
}

function MultiSelectWrapper(props: {
  options?: PopoverSelectOption[];
  initialValue?: string[];
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const onChange = vi.fn();

  return (
    <>
      <button ref={anchorRef}>Trigger</button>
      <PopoverSelect
        mode="multiple"
        open
        onClose={vi.fn()}
        anchorRef={anchorRef}
        options={props.options ?? OPTIONS}
        value={props.initialValue ?? []}
        onChange={onChange}
      />
    </>
  );
}

// ─── Tests ───

describe("PopoverSelect", () => {
  describe("single select", () => {
    it("renders all options", () => {
      render(<SingleSelectWrapper />);
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
      expect(screen.getByText("Option C")).toBeInTheDocument();
    });

    it("renders options as buttons", () => {
      render(<SingleSelectWrapper />);
      // Each option is a button
      const buttons = screen.getAllByRole("button");
      // At least 3 option buttons + 1 trigger
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("multi select", () => {
    it("renders all options", () => {
      render(<MultiSelectWrapper />);
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
      expect(screen.getByText("Option C")).toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("renders search input when searchable", () => {
      render(<SingleSelectWrapper searchable />);
      expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument();
    });

    it("filters options by search term", async () => {
      const user = userEvent.setup();
      render(<SingleSelectWrapper searchable />);

      const searchInput = screen.getByPlaceholderText("Buscar...");
      await user.type(searchInput, "Option A");

      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.queryByText("Option B")).not.toBeInTheDocument();
      expect(screen.queryByText("Option C")).not.toBeInTheDocument();
    });

    it("shows empty text when no results", async () => {
      const user = userEvent.setup();
      render(<SingleSelectWrapper searchable />);

      const searchInput = screen.getByPlaceholderText("Buscar...");
      await user.type(searchInput, "xyz nonexistent");

      expect(screen.getByText("Nenhum resultado encontrado")).toBeInTheDocument();
    });
  });
});

describe("formatMultiLabel", () => {
  const options = [
    { id: "1", label: "Alpha" },
    { id: "2", label: "Beta" },
    { id: "3", label: "Gamma" },
  ];

  it("returns fallback when no ids", () => {
    expect(formatMultiLabel([], options, "Todos")).toBe("Todos");
  });

  it("returns single label for one id", () => {
    expect(formatMultiLabel(["1"], options, "Todos")).toBe("Alpha");
  });

  it("returns first label +count for multiple ids", () => {
    expect(formatMultiLabel(["1", "2", "3"], options, "Todos")).toBe("Alpha +2");
  });
});
