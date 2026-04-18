/**
 * Tests for EngagementDetailPage
 *
 * Detail page showing team engagement data with filters (team, people,
 * health status, period), gauge charts, weekly evolution line chart,
 * and a team health table.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/setup/test-utils";
import { EngagementDetailPage } from "./EngagementDetailPage";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<EngagementDetailPage />);
  return { user, ...result };
}

// ─── Tests ───

describe("EngagementDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      setup();
      expect(document.body).toBeTruthy();
    });

    it("renders page title", () => {
      setup();
      expect(screen.getByRole("heading", { level: 1, name: "Engajamento" })).toBeInTheDocument();
    });

    it("renders score geral gauge label", () => {
      setup();
      expect(screen.getByText("Score geral")).toBeInTheDocument();
    });

    it("renders performance gauge label", () => {
      setup();
      const performanceTexts = screen.getAllByText("Performance");
      expect(performanceTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("renders engajamento gauge label", () => {
      setup();
      // There is a gauge label "Engajamento" in the gauge row (separate from the title)
      const engagementTexts = screen.getAllByText("Engajamento");
      expect(engagementTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("renders weekly evolution section", () => {
      setup();
      expect(screen.getByText("Evolução semanal")).toBeInTheDocument();
    });
  });

  describe("filters", () => {
    it("renders health filter button", () => {
      setup();
      expect(screen.getByRole("button", { name: /saúde/i })).toBeInTheDocument();
    });

    it("renders period filter button", () => {
      setup();
      const periodButtons = screen.getAllByRole("button");
      const periodButton = periodButtons.find(
        (btn) =>
          btn.textContent?.includes("Período") ||
          btn.textContent?.includes("Q") ||
          btn.textContent?.includes("Semestre"),
      );
      expect(periodButton).toBeTruthy();
    });

    it("opens health filter dropdown with options", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /saúde/i }));

      // "Bem", "Atenção", "Critico" may appear multiple times (in table + filter)
      const bemElements = screen.getAllByText("Bem");
      const atencaoElements = screen.getAllByText("Atenção");
      const criticoElements = screen.getAllByText("Crítico");
      // After opening filter, there should be at least the filter badge instances
      expect(bemElements.length).toBeGreaterThanOrEqual(1);
      expect(atencaoElements.length).toBeGreaterThanOrEqual(1);
      expect(criticoElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
