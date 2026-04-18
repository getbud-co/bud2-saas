/**
 * Tests for WizardBreadcrumb
 *
 * Renders breadcrumb navigation for the survey wizard steps.
 * Uses the wizard context for step state and navigation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { WizardBreadcrumb } from "./WizardBreadcrumb";

function renderWithWizard() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <WizardBreadcrumb />
    </SurveyWizardProvider>,
  );
}

describe("WizardBreadcrumb", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the Escolher template step label", () => {
    renderWithWizard();
    expect(screen.getByText("Escolher template")).toBeInTheDocument();
  });

  it("renders Participantes step label", () => {
    renderWithWizard();
    expect(screen.getByText("Participantes")).toBeInTheDocument();
  });

  it("renders Questionário step label", () => {
    renderWithWizard();
    expect(screen.getByText("Questionário")).toBeInTheDocument();
  });

  it("renders Fluxo de aplicação step label", () => {
    renderWithWizard();
    expect(screen.getByText("Fluxo de aplicação")).toBeInTheDocument();
  });

  it("renders Resumo step label", () => {
    renderWithWizard();
    expect(screen.getByText("Resumo")).toBeInTheDocument();
  });

  it("hides peer assignment step for non-ciclo surveys by default", () => {
    renderWithWizard();
    // In initial state (type=null, no peers needed), "Atribuição de pares" is hidden
    expect(screen.queryByText("Atribuição de pares")).not.toBeInTheDocument();
  });
});
