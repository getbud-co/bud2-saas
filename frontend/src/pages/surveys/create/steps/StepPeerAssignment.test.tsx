/**
 * Tests for StepPeerAssignment
 *
 * Wizard step for configuring how peers are assigned in a 360 survey.
 * Has three modes: employee_nominates, manager_assigns, centralized.
 * When the survey does NOT need peer assignment, shows an info alert.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { StepPeerAssignment } from "./StepPeerAssignment";

function renderStep() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <StepPeerAssignment />
    </SurveyWizardProvider>,
  );
}

describe("StepPeerAssignment", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // Default state: not a ciclo survey, so peer assignment not needed
  // ═══════════════════════════════════════════════════════════════

  describe("when peer assignment is not applicable", () => {
    it("renders info alert indicating peer assignment is not needed", () => {
      renderStep();
      expect(
        screen.getByText("Atribuição de pares não aplicável"),
      ).toBeInTheDocument();
    });

    it("shows guidance to proceed to next step", () => {
      renderStep();
      expect(
        screen.getByText(/não utiliza avaliação de pares/),
      ).toBeInTheDocument();
    });

    it("does not render mode selection when not applicable", () => {
      renderStep();
      expect(
        screen.queryByText("Como os pares serão definidos?"),
      ).not.toBeInTheDocument();
    });
  });
});
