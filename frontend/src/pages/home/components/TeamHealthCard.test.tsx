/**
 * Tests for TeamHealthCard
 *
 * Card that shows team health summary and a preview of team members
 * with their health status. Uses PeopleDataContext and useTeamOverviewData.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { TeamHealthCard } from "./TeamHealthCard";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<TeamHealthCard />);
  return { user, ...result };
}

// ─── Tests ───

describe("TeamHealthCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      setup();
      expect(screen.getByText("Meu time")).toBeInTheDocument();
    });

    it("displays the card title", () => {
      setup();
      expect(screen.getByText("Meu time")).toBeInTheDocument();
    });

    it("renders the expand button", () => {
      setup();
      expect(screen.getByRole("button", { name: "Expandir" })).toBeInTheDocument();
    });

    it("renders summary counter labels", () => {
      setup();
      // The summary cards render labels: "Bem", "Atenção", "Crítico".
      // "Bem" may appear multiple times (summary + member badges).
      const allBem = screen.getAllByText("Bem");
      expect(allBem.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("summary counters", () => {
    it("renders health status labels for all three categories", () => {
      setup();
      // "Bem" appears in summary card + possibly member badges
      expect(screen.getAllByText("Bem").length).toBeGreaterThanOrEqual(1);
      // "Atenção" and "Crítico" labels are in the summary cards
      const allText = document.body.textContent ?? "";
      expect(allText).toContain("Atenção");
      expect(allText).toContain("Crítico");
    });
  });

  describe("interactions", () => {
    it("expand button is present and clickable", async () => {
      const { user } = setup();
      const expandBtn = screen.getByRole("button", { name: "Expandir" });
      // Should not throw when clicked
      await user.click(expandBtn);
    });
  });
});
