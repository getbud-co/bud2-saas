/**
 * Tests for WizardFooter
 *
 * Bottom navigation of the survey wizard with Cancel/Voltar,
 * Salvar rascunho, and Proximo/Lancar buttons.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { WizardFooter } from "./WizardFooter";

function renderWithWizard() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <WizardFooter />
    </SurveyWizardProvider>,
  );
}

describe("WizardFooter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Cancelar button on first step", () => {
    renderWithWizard();
    // Initial step is 0, so step <= 1 → "Cancelar"
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("renders Salvar rascunho button", () => {
    renderWithWizard();
    expect(screen.getByText("Salvar rascunho")).toBeInTheDocument();
  });

  it("renders Proximo button when not on last step", () => {
    renderWithWizard();
    // Initial step = 0, not last → "Próximo"
    expect(screen.getByText("Próximo")).toBeInTheDocument();
  });

  it("does not show Lançar pesquisa on initial step", () => {
    renderWithWizard();
    expect(screen.queryByText("Lançar pesquisa")).not.toBeInTheDocument();
  });

  it("Proximo button is disabled when canProceed is false", () => {
    renderWithWizard();
    // On step 0 with type=null, canProceed = false
    const button = screen.getByText("Próximo").closest("button");
    expect(button).toBeDisabled();
  });

  it("renders three action buttons", () => {
    renderWithWizard();
    const buttons = screen.getAllByRole("button");
    // Cancelar + Salvar rascunho + Próximo = 3
    expect(buttons.length).toBe(3);
  });
});
