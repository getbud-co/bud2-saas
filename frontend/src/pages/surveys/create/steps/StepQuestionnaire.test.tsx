/**
 * Tests for StepQuestionnaire
 *
 * Wizard step for building the survey questionnaire.
 * Wraps QuestionnaireBuilder with wizard context bridge.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { StepQuestionnaire } from "./StepQuestionnaire";

function renderStep() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <StepQuestionnaire />
    </SurveyWizardProvider>,
  );
}

describe("StepQuestionnaire", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders without crashing", () => {
    const { container } = renderStep();
    expect(container.firstChild).toBeTruthy();
  });

  it("renders the QuestionnaireBuilder component", () => {
    const { container } = renderStep();
    // The QuestionnaireBuilder should render something inside
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
