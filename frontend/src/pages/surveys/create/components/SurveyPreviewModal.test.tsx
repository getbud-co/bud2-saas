/**
 * Tests for SurveyPreviewModal
 *
 * Modal that shows a live preview of the survey being built.
 * Uses wizard context for questions and sections data.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { SurveyPreviewModal } from "./SurveyPreviewModal";

function renderWithWizard(open: boolean, onClose = vi.fn()) {
  return renderWithProviders(
    <SurveyWizardProvider>
      <SurveyPreviewModal open={open} onClose={onClose} />
    </SurveyWizardProvider>,
  );
}

describe("SurveyPreviewModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing when closed", () => {
    const { container } = renderWithWizard(false);
    // When open=false, returns null
    expect(container.querySelector("[class*='previewContainer']")).not.toBeInTheDocument();
  });

  it("renders modal with title when open", () => {
    renderWithWizard(true);
    expect(screen.getByText("Preview da pesquisa")).toBeInTheDocument();
  });

  it("renders Modo preview badge when open", () => {
    renderWithWizard(true);
    expect(screen.getByText("Modo preview")).toBeInTheDocument();
  });

  it("shows default survey title when name is empty", () => {
    renderWithWizard(true);
    // Initial wizard state has name = ""
    expect(screen.getByText("Pesquisa sem título")).toBeInTheDocument();
  });

  it("shows empty state when no questions", () => {
    renderWithWizard(true);
    expect(
      screen.getByText('Adicione perguntas no passo "Questionário" para visualizar o preview.'),
    ).toBeInTheDocument();
  });

  it("shows disclaimer text", () => {
    renderWithWizard(true);
    expect(
      screen.getByText("As respostas neste preview não são salvas. Esta é apenas uma visualização."),
    ).toBeInTheDocument();
  });

  it("renders navigation buttons", () => {
    renderWithWizard(true);
    expect(screen.getByText("Anterior")).toBeInTheDocument();
    expect(screen.getByText("Finalizar preview")).toBeInTheDocument();
  });

  it("disables Anterior button at first section", () => {
    renderWithWizard(true);
    const prevButton = screen.getByText("Anterior").closest("button");
    expect(prevButton).toBeDisabled();
  });
});
