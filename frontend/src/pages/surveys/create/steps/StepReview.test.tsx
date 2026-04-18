/**
 * Tests for StepReview
 *
 * Final wizard step showing a review/summary of all survey
 * configuration before launching.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { StepReview } from "./StepReview";

function renderStep() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <StepReview />
    </SurveyWizardProvider>,
  );
}

describe("StepReview", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders heading", () => {
    renderStep();
    expect(screen.getByText("Revisar e lançar")).toBeInTheDocument();
  });

  it("renders subheading", () => {
    renderStep();
    expect(screen.getByText(/Confira o resumo antes de/)).toBeInTheDocument();
  });

  it("renders Sobre a pesquisa section", () => {
    renderStep();
    expect(screen.getByText("Sobre a pesquisa")).toBeInTheDocument();
  });

  it("renders Quem participa section", () => {
    renderStep();
    expect(screen.getByText("Quem participa")).toBeInTheDocument();
  });

  it("renders Fluxo de aplicacao section", () => {
    renderStep();
    expect(screen.getByText("Fluxo de aplicação")).toBeInTheDocument();
  });

  it("renders Inteligencia e privacidade section", () => {
    renderStep();
    expect(screen.getByText("Inteligência e privacidade")).toBeInTheDocument();
  });

  it("renders Lancamento section", () => {
    renderStep();
    expect(screen.getByText("Lançamento")).toBeInTheDocument();
  });

  it("renders launch options", () => {
    renderStep();
    expect(screen.getByText("Lançar agora")).toBeInTheDocument();
    expect(screen.getByText("Agendar lançamento")).toBeInTheDocument();
  });

  it("shows dash for empty name", () => {
    renderStep();
    // Initial state has name="" → displayed as "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows question count", () => {
    renderStep();
    // Initial state has 0 questions
    expect(screen.getByText(/0 perguntas/)).toBeInTheDocument();
  });
});
