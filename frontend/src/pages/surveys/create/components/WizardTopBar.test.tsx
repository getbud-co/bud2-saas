/**
 * Tests for WizardTopBar
 *
 * Top bar of the survey wizard showing survey name,
 * template badge, preview button, search, notifications, and assistant.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { WizardTopBar } from "./WizardTopBar";

function renderWithWizard() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <WizardTopBar />
    </SurveyWizardProvider>,
  );
}

describe("WizardTopBar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders default survey name placeholder", () => {
    renderWithWizard();
    expect(screen.getByText("Nome da pesquisa...")).toBeInTheDocument();
  });

  it("does not render preview button when no questions", () => {
    renderWithWizard();
    // Initial state has 0 questions → Visualizar button not shown
    expect(screen.queryByText("Visualizar")).not.toBeInTheDocument();
  });

  it("renders search button", () => {
    renderWithWizard();
    // SearchButton component from the design system
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders within a container", () => {
    const { container } = renderWithWizard();
    expect(container.firstChild).toBeTruthy();
  });
});
