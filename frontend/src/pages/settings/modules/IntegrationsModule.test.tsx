/**
 * Tests for IntegrationsModule
 *
 * This module displays connected and available integrations.
 * It uses the IntegrationsDataContext for data management and features
 * a tab-based UI with connected/available views, search, category filters,
 * and connect/disconnect/configure actions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { IntegrationsModule } from "./IntegrationsModule";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<IntegrationsModule />);
  return { user, ...result };
}

// ─── Tests ───

describe("IntegrationsModule", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering and Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and initial state", () => {
    it("renders the main tab bar with connected and available tabs", () => {
      setup();
      expect(screen.getByRole("tab", { name: /conectadas/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /disponíveis/i })).toBeInTheDocument();
    });

    it("shows the connected tab by default", () => {
      setup();
      // Connected tab should be active and show connected integrations
      const connectedTab = screen.getByRole("tab", { name: /conectadas/i });
      expect(connectedTab).toHaveAttribute("aria-selected", "true");
    });

    it("renders connected integrations from seed data", () => {
      setup();
      // Seed data has Slack, E-mail (SMTP), Google Calendar, Google Sheets, Google SSO, REST API as connected
      expect(screen.getByText("Slack")).toBeInTheDocument();
      expect(screen.getByText("Google Calendar")).toBeInTheDocument();
      expect(screen.getByText("Google SSO")).toBeInTheDocument();
    });

    it("shows Conectado badge for each connected integration", () => {
      setup();
      const badges = screen.getAllByText("Conectado");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("shows Desconectar button for connected integrations", () => {
      setup();
      const disconnectButtons = screen.getAllByRole("button", { name: /desconectar/i });
      expect(disconnectButtons.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Available Tab
  // ═══════════════════════════════════════════════════════════════════════════

  describe("available integrations tab", () => {
    it("switches to available tab when clicked", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Buscar integração...")).toBeInTheDocument();
      });
    });

    it("renders integration cards in the available tab", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        // Microsoft Teams is disconnected in seed data
        expect(screen.getByText("Microsoft Teams")).toBeInTheDocument();
      });
    });

    it("renders category filter tabs", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "Todas" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /comunicação/i })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /calendário/i })).toBeInTheDocument();
      });
    });

    it("shows Popular badge on popular integrations", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        const popularBadges = screen.getAllByText("Popular");
        expect(popularBadges.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Search and Filtering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("search and filtering", () => {
    it("filters available integrations by search term", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Buscar integração...")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Buscar integração...");
      await user.type(searchInput, "Jira");

      await waitFor(() => {
        expect(screen.getByText("Jira")).toBeInTheDocument();
        // Other integrations should not be visible
        expect(screen.queryByText("Microsoft Teams")).not.toBeInTheDocument();
      });
    });

    it("shows empty state when no integrations match search", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Buscar integração...")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Buscar integração...");
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        expect(screen.getByText("Nenhuma integração encontrada")).toBeInTheDocument();
      });
    });

    it("filters by category when clicking a category tab", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /comunicação/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /comunicação/i }));

      await waitFor(() => {
        // Microsoft Teams and WhatsApp are disconnected communication integrations
        expect(screen.getByText("Microsoft Teams")).toBeInTheDocument();
        expect(screen.getByText("WhatsApp Business")).toBeInTheDocument();
        // Jira is PM category, should not be shown
        expect(screen.queryByText("Jira")).not.toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Connect / Disconnect Actions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("connect and disconnect actions", () => {
    it("opens detail modal when clicking an available integration card", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        expect(screen.getByText("Microsoft Teams")).toBeInTheDocument();
      });

      // Click on the Microsoft Teams card button
      const teamsCard = screen.getByRole("button", { name: /microsoft teams/i });
      await user.click(teamsCard);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText(/conectar microsoft teams/i)).toBeInTheDocument();
      });
    });

    it("shows connect button in the detail modal", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        expect(screen.getByText("Microsoft Teams")).toBeInTheDocument();
      });

      const teamsCard = screen.getByRole("button", { name: /microsoft teams/i });
      await user.click(teamsCard);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByRole("button", { name: /conectar microsoft teams/i })).toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
      });
    });

    it("disconnects an integration when clicking Desconectar", async () => {
      const { user } = setup();

      // Find the first disconnect button and click it
      const disconnectButtons = screen.getAllByRole("button", { name: /desconectar/i });
      const slackDisconnect = disconnectButtons[0]!;

      await user.click(slackDisconnect);

      // After disconnect, the integration count should decrease
      await waitFor(() => {
        const remainingDisconnects = screen.getAllByRole("button", { name: /desconectar/i });
        expect(remainingDisconnects.length).toBe(disconnectButtons.length - 1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Empty State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("empty state", () => {
    it("shows empty state when all integrations are disconnected", async () => {
      const { user } = setup();

      // Disconnect all connected integrations
      const disconnectButtons = screen.getAllByRole("button", { name: /desconectar/i });
      for (const button of disconnectButtons) {
        await user.click(button);
      }

      await waitFor(() => {
        expect(screen.getByText("Nenhuma integração conectada")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════════════════

  describe("accessibility", () => {
    it("has proper tab structure with aria attributes", () => {
      setup();
      const tabList = screen.getByRole("tablist", { name: /navegação de integrações/i });
      expect(tabList).toBeInTheDocument();
    });

    it("detail modal has proper dialog role", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("tab", { name: /disponíveis/i }));

      await waitFor(() => {
        expect(screen.getByText("Microsoft Teams")).toBeInTheDocument();
      });

      const teamsCard = screen.getByRole("button", { name: /microsoft teams/i });
      await user.click(teamsCard);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveAttribute("aria-modal", "true");
      });
    });
  });
});
