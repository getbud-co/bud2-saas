/**
 * Tests for StepTemplate
 *
 * First step of the survey wizard. Displays a grid of
 * template cards for the user to choose from.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { StepTemplate } from "./StepTemplate";

function renderStep() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <StepTemplate />
    </SurveyWizardProvider>,
  );
}

describe("StepTemplate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the heading", () => {
    renderStep();
    expect(screen.getByText("Escolha o tipo de pesquisa")).toBeInTheDocument();
  });

  it("renders the subheading", () => {
    renderStep();
    expect(
      screen.getByText("Selecione um template para começar ou crie uma pesquisa personalizada"),
    ).toBeInTheDocument();
  });

  it("renders template cards from context data", () => {
    renderStep();
    // System templates like Pulse should be available from SurveysDataContext
    expect(screen.getByText("Pulse")).toBeInTheDocument();
  });

  it("renders Pesquisa category badge", () => {
    renderStep();
    const badges = screen.getAllByText("Pesquisa");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders question count badges", () => {
    renderStep();
    const badges = screen.getAllByText(/\d+ perguntas/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders template cards as buttons", () => {
    renderStep();
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders template subtitle text", () => {
    renderStep();
    // Pulse template has "Sentimento semanal da equipe" subtitle
    expect(screen.getByText("Sentimento semanal da equipe")).toBeInTheDocument();
  });
});
