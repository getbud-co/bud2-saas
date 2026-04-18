/**
 * Tests for SettingsTab and SettingsDangerZone
 *
 * Tab for survey configuration: status, period, delivery channels,
 * reminders, anonymity, AI features, and results visibility.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SettingsTab, SettingsDangerZone } from "./SettingsTab";
import type { SurveyResultData } from "../types";

function buildData(overrides?: Partial<SurveyResultData>): SurveyResultData {
  return {
    surveyId: "s1",
    surveyName: "Pulse Check",
    surveyType: "pulse",
    surveyCategory: "pesquisa",
    status: "active",
    period: "01/01/2026 – 31/01/2026",
    isAnonymous: true,
    kpis: {
      views: 200,
      started: 150,
      responses: 120,
      completionRate: 80,
      avgCompletionTime: "8 min",
    },
    sections: [],
    ...overrides,
  };
}

function renderTab(data?: SurveyResultData) {
  const user = userEvent.setup();
  const result = renderWithProviders(<SettingsTab data={data ?? buildData()} />);
  return { user, ...result };
}

function renderDangerZone() {
  const user = userEvent.setup();
  const result = renderWithProviders(<SettingsDangerZone />);
  return { user, ...result };
}

describe("SettingsTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // Section headings
  // ═══════════════════════════════════════════════════════════════

  it("renders Geral section", () => {
    renderTab();
    expect(screen.getByText("Geral")).toBeInTheDocument();
  });

  it("renders Coleta e entrega section", () => {
    renderTab();
    expect(screen.getByText("Coleta e entrega")).toBeInTheDocument();
  });

  it("renders Resultados e IA section", () => {
    renderTab();
    expect(screen.getByText("Resultados e IA")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Status
  // ═══════════════════════════════════════════════════════════════

  it("renders the status badge as Ativa", () => {
    renderTab();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
  });

  it("renders Pausar pesquisa action for active survey", () => {
    renderTab();
    expect(screen.getByRole("button", { name: /pausar pesquisa/i })).toBeInTheDocument();
  });

  it("renders Encerrar pesquisa action for active survey", () => {
    renderTab();
    expect(screen.getByRole("button", { name: /encerrar pesquisa/i })).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Link
  // ═══════════════════════════════════════════════════════════════

  it("renders survey link field", () => {
    renderTab();
    expect(screen.getByText("Link da pesquisa")).toBeInTheDocument();
  });

  it("renders Copiar button", () => {
    renderTab();
    expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Delivery channels
  // ═══════════════════════════════════════════════════════════════

  it("renders delivery channel checkboxes", () => {
    renderTab();
    expect(screen.getByText("In-App")).toBeInTheDocument();
    expect(screen.getByText("E-mail")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Reminders
  // ═══════════════════════════════════════════════════════════════

  it("renders reminder toggle", () => {
    renderTab();
    expect(screen.getByText("Enviar lembretes")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Privacy
  // ═══════════════════════════════════════════════════════════════

  it("renders anonymous toggle", () => {
    renderTab();
    expect(screen.getByText("Respostas anônimas")).toBeInTheDocument();
  });

  it("renders anonymity active alert", () => {
    renderTab();
    expect(screen.getByText("Anonimato ativo")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // AI
  // ═══════════════════════════════════════════════════════════════

  it("renders AI analysis toggle", () => {
    renderTab();
    expect(screen.getByText("Análise de IA")).toBeInTheDocument();
  });

  it("renders bias detection toggle", () => {
    renderTab();
    expect(screen.getByText("Detecção de viés")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Save
  // ═══════════════════════════════════════════════════════════════

  it("renders save button", () => {
    renderTab();
    expect(screen.getByRole("button", { name: /salvar configurações/i })).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Application mode
  // ═══════════════════════════════════════════════════════════════

  it("renders coleta unica radio", () => {
    renderTab();
    expect(screen.getByText("Coleta única")).toBeInTheDocument();
  });

  it("renders recorrente radio", () => {
    renderTab();
    expect(screen.getByText("Recorrente")).toBeInTheDocument();
  });
});

describe("SettingsDangerZone", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders danger zone title", () => {
    renderDangerZone();
    expect(screen.getByText("Zona de perigo")).toBeInTheDocument();
  });

  it("renders archive button", () => {
    renderDangerZone();
    expect(screen.getByRole("button", { name: /arquivar/i })).toBeInTheDocument();
  });

  it("renders delete button", () => {
    renderDangerZone();
    expect(screen.getByRole("button", { name: /excluir/i })).toBeInTheDocument();
  });

  it("opens delete confirmation modal on click", async () => {
    const { user } = renderDangerZone();
    await user.click(screen.getByRole("button", { name: /excluir/i }));
    expect(screen.getByText(/Tem certeza que deseja excluir/)).toBeInTheDocument();
  });
});
