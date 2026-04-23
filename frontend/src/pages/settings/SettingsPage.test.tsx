/**
 * Tests for SettingsPage
 *
 * SettingsPage is a navigation shell that uses React Router Routes
 * to render different settings modules based on the URL path.
 * It shows a PageHeader with a dynamic title based on the current route segment.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SettingsPage } from "./SettingsPage";

import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { MockAuthProvider } from "../../../tests/setup/MockAuthProvider";

// ─── Test Helpers ───

function setup(initialPath = "/settings") {
  const user = userEvent.setup();
  const result = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <MockAuthProvider>
        <ConfigDataProvider>
          <ActivityDataProvider>
            <PeopleDataProvider>
              <MissionsDataProvider>
                <SurveysDataProvider>
                  <SettingsDataProvider>
                    <IntegrationsDataProvider>
                      <Routes>
                        <Route path="/settings/*" element={<SettingsPage />} />
                      </Routes>
                    </IntegrationsDataProvider>
                  </SettingsDataProvider>
                </SurveysDataProvider>
              </MissionsDataProvider>
            </PeopleDataProvider>
          </ActivityDataProvider>
        </ConfigDataProvider>
      </MockAuthProvider>
    </MemoryRouter>,
  );
  return { user, ...result };
}

// ─── Tests ───

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering", () => {
    it("renders with providers without crashing", () => {
      setup("/settings/company");
      // The page should render without errors
      expect(document.body).toBeTruthy();
    });

    it("renders the page header with title for company route", () => {
      setup("/settings/company");
      expect(screen.getByText("Dados da empresa")).toBeInTheDocument();
    });

    it("renders the page header with title for users route", () => {
      setup("/settings/users");
      expect(screen.getByRole("heading", { level: 1, name: "Usuários" })).toBeInTheDocument();
    });

    it("renders the page header with title for teams route", () => {
      setup("/settings/teams");
      expect(screen.getByRole("heading", { level: 1, name: "Times" })).toBeInTheDocument();
    });

    it("renders the page header with title for tags route", () => {
      setup("/settings/tags");
      expect(screen.getByText("Tags e organizadores")).toBeInTheDocument();
    });

    it("renders the page header with title for cycles route", () => {
      setup("/settings/cycles");
      expect(screen.getByText("Ciclos e períodos")).toBeInTheDocument();
    });

    it("renders the page header with title for integrations route", () => {
      setup("/settings/integrations");
      expect(screen.getByText("Integrações")).toBeInTheDocument();
    });

    it("renders the page header with title for survey-templates route", () => {
      setup("/settings/survey-templates");
      expect(screen.getByRole("heading", { level: 1, name: "Templates de pesquisa" })).toBeInTheDocument();
    });

    it("renders the page header with title for roles route", () => {
      setup("/settings/roles");
      expect(screen.getByText("Tipos de usuário")).toBeInTheDocument();
    });

    it("renders the page header with title for org-structure route", () => {
      setup("/settings/org-structure");
      expect(screen.getByText("Estrutura organizacional")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Route Content
  // ═══════════════════════════════════════════════════════════════════════════

  describe("route content", () => {
    it("renders CompanyModule content for company route", () => {
      setup("/settings/company");
      // CompanyModule renders a tab bar with "Dados gerais"
      expect(screen.getByRole("tab", { name: /dados gerais/i })).toBeInTheDocument();
    });

    it("renders IntegrationsModule content for integrations route", () => {
      setup("/settings/integrations");
      // IntegrationsModule renders tabs with "Conectadas" and "Disponíveis"
      expect(screen.getByRole("tab", { name: /conectadas/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /disponíveis/i })).toBeInTheDocument();
    });

    it("renders TagsModule content for tags route", () => {
      setup("/settings/tags");
      // TagsModule renders a table with "Tags" header and search
      expect(screen.getByPlaceholderText("Buscar tag...")).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Default Redirect
  // ═══════════════════════════════════════════════════════════════════════════

  describe("default redirect", () => {
    it("redirects to company when accessing /settings", async () => {
      setup("/settings");

      await waitFor(() => {
        // After redirect, should show the company module title
        expect(screen.getByText("Dados da empresa")).toBeInTheDocument();
      });
    });
  });
});
