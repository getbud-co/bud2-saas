/**
 * Tests for MissionsCard
 *
 * Card that displays mission progress with a GoalProgressBar.
 * Optionally shows a team filter dropdown.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { MissionsCard } from "./MissionsCard";

// ─── Test Helpers ───

interface SetupProps {
  title?: string;
  value?: number;
  expected?: number;
  target?: number;
  showTeamFilter?: boolean;
  expandRoute?: string;
}

function setup(props: SetupProps = {}) {
  const user = userEvent.setup();
  const result = renderWithProviders(
    <MissionsCard
      title={props.title ?? "Missões trimestrais"}
      value={props.value ?? 45}
      expected={props.expected ?? 60}
      target={props.target ?? 100}
      showTeamFilter={props.showTeamFilter}
      expandRoute={props.expandRoute ?? "/missions"}
    />,
  );
  return { user, ...result };
}

// ─── Tests ───

describe("MissionsCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      setup();
      expect(screen.getByText("Missões trimestrais")).toBeInTheDocument();
    });

    it("displays the card title", () => {
      setup({ title: "Missões anuais" });
      expect(screen.getByText("Missões anuais")).toBeInTheDocument();
    });

    it("displays the formatted progress value", () => {
      setup({ value: 72 });
      expect(screen.getByText("72%")).toBeInTheDocument();
    });

    it("displays the expected progress text", () => {
      setup({ expected: 60 });
      expect(screen.getByText("Esperado 60%")).toBeInTheDocument();
    });

    it("renders the expand button", () => {
      setup();
      expect(screen.getByRole("button", { name: "Expandir" })).toBeInTheDocument();
    });
  });

  describe("team filter", () => {
    it("does not render team filter when showTeamFilter is false", () => {
      setup({ showTeamFilter: false });
      // No "Todos os times" dropdown visible
      expect(screen.queryByText("Todos os times")).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("renders with zero progress", () => {
      setup({ value: 0, expected: 50 });
      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("Esperado 50%")).toBeInTheDocument();
    });

    it("renders with 100% progress", () => {
      setup({ value: 100, expected: 80 });
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });
});
