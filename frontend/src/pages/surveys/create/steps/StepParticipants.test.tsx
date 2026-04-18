/**
 * Tests for StepParticipants
 *
 * Wizard step for selecting who will participate in the survey.
 * Includes scope selection, people list with filters, and
 * perspective toggles for ciclo surveys.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { StepParticipants } from "./StepParticipants";

function renderStep() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <StepParticipants />
    </SurveyWizardProvider>,
  );
}

describe("StepParticipants", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the page title", () => {
    renderStep();
    expect(screen.getByText("Participantes")).toBeInTheDocument();
  });

  it("renders Part 1 section title", () => {
    renderStep();
    expect(screen.getByText("Parte 1: Quem será avaliado?")).toBeInTheDocument();
  });

  it("renders scope select with label", () => {
    renderStep();
    expect(screen.getByText("Escopo dos avaliados")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    renderStep();
    expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument();
  });

  it("shows selected count", () => {
    renderStep();
    // Should show "X de Y selecionados" text
    const selectedText = screen.getByText(/selecionados/);
    expect(selectedText).toBeInTheDocument();
  });

  it("renders exclusion section", () => {
    renderStep();
    // Default state (non-ciclo) shows "Exclusões da pesquisa"
    expect(screen.getByText("Exclusões da pesquisa")).toBeInTheDocument();
  });

  it("renders trial period exclusion toggle", () => {
    renderStep();
    expect(screen.getByText("Período de experiência CLT")).toBeInTheDocument();
  });

  it("renders leave exclusion toggle", () => {
    renderStep();
    expect(screen.getByText("Colaboradores em licença")).toBeInTheDocument();
  });

  it("renders vacation exclusion toggle", () => {
    renderStep();
    expect(screen.getByText("Férias programadas no período")).toBeInTheDocument();
  });

  it("does not show ciclo perspectives on initial state", () => {
    renderStep();
    // Initial state has category=null (not ciclo)
    expect(screen.queryByText("Parte 2: Quem avalia cada pessoa?")).not.toBeInTheDocument();
  });
});
