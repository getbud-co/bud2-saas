/**
 * Tests for SurveyRespondPage
 *
 * This is the respondent-facing survey page. It shows the survey form using
 * SurveyRenderer, or an error/not-found state when the survey ID is invalid.
 * On submission it shows a thank-you screen.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { SurveyRespondPage } from "./SurveyRespondPage";

// ─── Test Helpers ───

function setup(surveyId = "10") {
  const result = render(
    <ConfigDataProvider>
      <ActivityDataProvider>
        <PeopleDataProvider>
          <MissionsDataProvider>
            <SurveysDataProvider>
              <SettingsDataProvider>
                <IntegrationsDataProvider>
                  <MemoryRouter initialEntries={[`/surveys/${surveyId}/respond`]}>
                    <Routes>
                      <Route path="/surveys/:surveyId/respond" element={<SurveyRespondPage />} />
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
  return result;
}

// ─── Tests ───

describe("SurveyRespondPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering", () => {
    it("renders the survey form for a valid survey ID", () => {
      setup("10");
      // Survey 10 has questions, the renderer should show a submit/next button
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("renders the survey name for a valid survey", () => {
      setup("10");
      // Survey 10 is a Pulse Check
      const headings = screen.getAllByText(/Pulse Check/i);
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Not Found
  // ═══════════════════════════════════════════════════════════════════════════

  describe("not found state", () => {
    it("shows error message for invalid survey ID", () => {
      setup("nonexistent-id");
      expect(screen.getByText("Pesquisa não encontrada")).toBeInTheDocument();
    });

    it("shows explanation text when survey is not found", () => {
      setup("nonexistent-id");
      expect(screen.getByText(/não foi possível carregar a pesquisa/i)).toBeInTheDocument();
    });

    it("shows back button when survey is not found", () => {
      setup("nonexistent-id");
      expect(screen.getByRole("button", { name: /voltar para pesquisas/i })).toBeInTheDocument();
    });
  });
});
