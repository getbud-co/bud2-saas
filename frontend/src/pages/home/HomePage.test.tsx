/**
 * Tests for HomePage
 *
 * Dashboard home page with greeting, briefing card, missions cards,
 * engagement card, activities card, team health card, and widget builder.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/setup/test-utils";
import { HomePage } from "./HomePage";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<HomePage />);
  return { user, ...result };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// ─── Tests ───

describe("HomePage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders without crashing", () => {
      setup();
      expect(document.body).toBeTruthy();
    });

    it("renders greeting with time-based message", () => {
      setup();
      const greeting = getGreeting();
      expect(screen.getByText(new RegExp(`${greeting},`))).toBeInTheDocument();
    });

    it("renders streak badge", () => {
      setup();
      expect(screen.getByText("7 sem.")).toBeInTheDocument();
    });

    it("renders briefing card", () => {
      setup();
      expect(screen.getByText("Briefing do dia")).toBeInTheDocument();
    });

    it("renders engagement card", () => {
      setup();
      expect(screen.getByText("Engajamento")).toBeInTheDocument();
    });

    it("renders activities card", () => {
      setup();
      expect(screen.getByText("Minhas atividades")).toBeInTheDocument();
    });

    it("renders team health card", () => {
      setup();
      expect(screen.getByText("Meu time")).toBeInTheDocument();
    });

    it("renders add widget button", () => {
      setup();
      expect(screen.getByRole("button", { name: /adicionar widget/i })).toBeInTheDocument();
    });
  });

  describe("widget builder", () => {
    it("opens widget builder modal when add widget button is clicked", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /adicionar widget/i }));

      await waitFor(() => {
        // After clicking, the modal opens with a heading "Adicionar widget"
        expect(screen.getByRole("heading", { name: /adicionar widget/i })).toBeInTheDocument();
      });
    });
  });
});
