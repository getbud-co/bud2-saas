/**
 * Tests for SurveyResultsPage
 *
 * This page shows survey results with tabs: Visao geral, Resultado por pergunta,
 * Calibragem (ciclo only), Nomeacao de pares (ciclo only), and Configuracao.
 * Data comes from SurveysDataContext, resolved by surveyId from URL params.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { SurveyResultsPage } from "./SurveyResultsPage";

// ─── Test Helpers ───

function setup(surveyId = "10") {
  const user = userEvent.setup();
  const result = render(
    <ConfigDataProvider>
      <ActivityDataProvider>
        <PeopleDataProvider>
          <MissionsDataProvider>
            <SurveysDataProvider>
              <SettingsDataProvider>
                <IntegrationsDataProvider>
                  <MemoryRouter initialEntries={[`/surveys/${surveyId}/results`]}>
                    <Routes>
                      <Route path="/surveys/:surveyId/results" element={<SurveyResultsPage />} />
                    </Routes>
                  </MemoryRouter>
                </IntegrationsDataProvider>
              </SettingsDataProvider>
            </SurveysDataProvider>
          </MissionsDataProvider>
        </PeopleDataProvider>
      </ActivityDataProvider>
    </ConfigDataProvider>,
  );
  return { user, ...result };
}

// ─── Tests ───

describe("SurveyResultsPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering", () => {
    it("renders the survey name in the page header", () => {
      setup("10");
      // Survey 10 is a Pulse Check with a dynamic name containing month/year
      const headings = screen.getAllByText(/Pulse Check/i);
      expect(headings.length).toBeGreaterThan(0);
    });

    it("renders the status badge", () => {
      setup("10");
      // Survey 10 is closed
      expect(screen.getByText("Encerrada")).toBeInTheDocument();
    });

    it("renders the export button", () => {
      setup("10");
      expect(screen.getByRole("button", { name: /exportar/i })).toBeInTheDocument();
    });

    it("renders the tab bar", () => {
      setup("10");
      expect(screen.getByRole("tablist", { name: /abas de resultados da pesquisa/i })).toBeInTheDocument();
    });

    it("renders the default tab (Visao geral)", () => {
      setup("10");
      expect(screen.getByRole("tab", { name: /visão geral/i })).toBeInTheDocument();
    });

    it("renders Resultado por pergunta tab", () => {
      setup("10");
      expect(screen.getByRole("tab", { name: /resultado por pergunta/i })).toBeInTheDocument();
    });

    it("renders Configuracao tab", () => {
      setup("10");
      expect(screen.getByRole("tab", { name: /configuração/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Not Found
  // ═══════════════════════════════════════════════════════════════════════════

  describe("not found state", () => {
    it("shows not found message for invalid survey ID", () => {
      setup("nonexistent-id");
      expect(screen.getByText("Pesquisa não encontrada")).toBeInTheDocument();
    });

    it("shows back button when survey not found", () => {
      setup("nonexistent-id");
      expect(screen.getByRole("button", { name: /voltar para pesquisas/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab Navigation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("tab navigation", () => {
    it("switches to Resultado por pergunta tab on click", async () => {
      const { user } = setup("10");

      const summaryTab = screen.getByRole("tab", { name: /resultado por pergunta/i });
      await user.click(summaryTab);

      await waitFor(() => {
        expect(summaryTab).toHaveAttribute("aria-selected", "true");
      });
    });
  });
});
