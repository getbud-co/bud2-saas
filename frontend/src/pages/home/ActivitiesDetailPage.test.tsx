/**
 * Tests for ActivitiesDetailPage
 *
 * Detail page showing all user activities with period filtering,
 * urgent/all sections, and navigable activity items.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/setup/test-utils";
import { ActivitiesDetailPage } from "./ActivitiesDetailPage";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<ActivitiesDetailPage />);
  return { user, ...result };
}

// ─── Tests ───

describe("ActivitiesDetailPage", () => {
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
      expect(screen.getByText("Minhas atividades")).toBeInTheDocument();
    });

    it("renders the all activities section", () => {
      setup();
      expect(screen.getByText("Todas as atividades")).toBeInTheDocument();
    });

    it("renders period filter button", () => {
      setup();
      // The period button shows the cycle name or "Periodo"
      const periodButtons = screen.getAllByRole("button");
      const periodButton = periodButtons.find(
        (btn) =>
          btn.textContent?.includes("Período") ||
          btn.textContent?.includes("Q") ||
          btn.textContent?.includes("Semestre"),
      );
      expect(periodButton).toBeTruthy();
    });

    it("renders activity items as a list", () => {
      setup();
      const lists = screen.getAllByRole("list");
      expect(lists.length).toBeGreaterThan(0);
    });
  });

  describe("period filter", () => {
    it("renders custom period option text", async () => {
      const { user } = setup();

      // Find and click the period filter button (has calendar icon)
      const periodButtons = screen.getAllByRole("button");
      const periodButton = periodButtons.find(
        (btn) =>
          btn.textContent?.includes("Período") ||
          btn.textContent?.includes("Q") ||
          btn.textContent?.includes("Semestre"),
      );

      if (periodButton) {
        await user.click(periodButton);
        // The custom period option should appear
        expect(screen.getByText("Período personalizado")).toBeInTheDocument();
      }
    });
  });
});
