/**
 * Tests for SurveyRespondLayout
 *
 * Standalone layout for the survey respondent experience.
 * Renders a header with the Bud logo, a main content area (Outlet), and a footer.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SurveyRespondLayout } from "./SurveyRespondLayout";

// ─── Test Helpers ───

function setup() {
  const result = render(
    <MemoryRouter initialEntries={["/surveys/1/respond"]}>
      <Routes>
        <Route element={<SurveyRespondLayout />}>
          <Route path="/surveys/:surveyId/respond" element={<div>Conteudo do outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return result;
}

// ─── Tests ───

describe("SurveyRespondLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the Bud logo in the header", () => {
    setup();
    // BudLogo renders an SVG
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders the footer text", () => {
    setup();
    expect(screen.getByText(/powered by/i)).toBeInTheDocument();
    expect(screen.getByText(/gestão de desempenho contínua/i)).toBeInTheDocument();
  });

  it("renders the outlet content", () => {
    setup();
    expect(screen.getByText("Conteudo do outlet")).toBeInTheDocument();
  });
});
