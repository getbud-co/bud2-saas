/**
 * Tests for StepFlow
 *
 * Wizard step for configuring the survey flow: period, application mode,
 * privacy, AI settings, reminders, and delivery channels.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SurveyWizardProvider } from "../SurveyWizardContext";
import { StepFlow } from "./StepFlow";

function renderStep() {
  return renderWithProviders(
    <SurveyWizardProvider>
      <StepFlow />
    </SurveyWizardProvider>,
  );
}

describe("StepFlow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders heading", () => {
    renderStep();
    expect(screen.getByText("Configuração")).toBeInTheDocument();
  });

  it("renders subheading for pesquisa mode", () => {
    renderStep();
    // Default state has category=null, so isCiclo=false
    expect(screen.getByText(/Defina as configurações/)).toBeInTheDocument();
  });

  it("renders Periodo section", () => {
    renderStep();
    expect(screen.getByText("Período")).toBeInTheDocument();
  });

  it("renders date pickers", () => {
    renderStep();
    expect(screen.getByText("Data de início")).toBeInTheDocument();
    expect(screen.getByText("Data de término")).toBeInTheDocument();
  });

  it("renders Aplicacao section", () => {
    renderStep();
    expect(screen.getByText("Aplicação")).toBeInTheDocument();
  });

  it("renders coleta unica radio option", () => {
    renderStep();
    expect(screen.getByText("Coleta única")).toBeInTheDocument();
  });

  it("renders recorrente radio option", () => {
    renderStep();
    expect(screen.getByText("Recorrente")).toBeInTheDocument();
  });

  it("renders Privacidade section", () => {
    renderStep();
    expect(screen.getByText("Privacidade")).toBeInTheDocument();
  });

  it("renders anonymous toggle", () => {
    renderStep();
    expect(screen.getByText("Respostas anônimas")).toBeInTheDocument();
  });

  it("renders IA section", () => {
    renderStep();
    expect(screen.getByText("Inteligência Artificial")).toBeInTheDocument();
  });

  it("renders AI analysis toggle", () => {
    renderStep();
    expect(screen.getByText("Análise de IA")).toBeInTheDocument();
  });

  it("renders reminder section", () => {
    renderStep();
    expect(screen.getByText("Lembretes e notificações")).toBeInTheDocument();
  });

  it("renders delivery channels section", () => {
    renderStep();
    expect(screen.getByText("Canais de entrega")).toBeInTheDocument();
  });

  it("renders delivery channel checkboxes", () => {
    renderStep();
    expect(screen.getByText("In-App")).toBeInTheDocument();
    expect(screen.getByText("E-mail")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
  });
});
