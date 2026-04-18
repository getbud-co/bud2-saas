/**
 * Tests for EngagementCard
 *
 * Card that displays team engagement score with a donut chart
 * and trend indicator. Uses PeopleDataContext and useTeamOverviewData.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { EngagementCard } from "./EngagementCard";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<EngagementCard />);
  return { user, ...result };
}

// ─── Tests ───

describe("EngagementCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      setup();
      expect(screen.getByText("Engajamento")).toBeInTheDocument();
    });

    it("displays the card title", () => {
      setup();
      expect(screen.getByText("Engajamento")).toBeInTheDocument();
    });

    it("renders the expand button", () => {
      setup();
      expect(screen.getByRole("button", { name: "Expandir" })).toBeInTheDocument();
    });

    it("displays the engagement hint text", () => {
      setup();
      expect(
        screen.getByText(/para melhorar, apoie o time/i),
      ).toBeInTheDocument();
    });

    it("displays a trend status message", () => {
      setup();
      // The trend text is either "subiu", "caiu", or "estável"
      const trendText = screen.getByText(/engajamento .* essa semana/i);
      expect(trendText).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("expand button is present and clickable", async () => {
      const { user } = setup();
      const expandBtn = screen.getByRole("button", { name: "Expandir" });
      await user.click(expandBtn);
    });
  });
});
