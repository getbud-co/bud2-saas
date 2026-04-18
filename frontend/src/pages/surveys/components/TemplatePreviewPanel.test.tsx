/**
 * Tests for TemplatePreviewPanel
 *
 * Displays a detailed preview panel for a survey template,
 * showing config, flow steps, and questions by section.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderMinimal } from "../../../../tests/setup/test-utils";
import { TemplatePreviewPanel } from "./TemplatePreviewPanel";
import type { SurveyTemplate } from "../templates/surveyTemplates";
import { Lightning } from "@phosphor-icons/react";

// ─── Fixtures ───

function makeTemplate(overrides: Partial<SurveyTemplate> = {}): SurveyTemplate {
  return {
    type: "pulse",
    category: "pesquisa",
    name: "Pulse",
    subtitle: "Sentimento semanal da equipe",
    icon: Lightning,
    defaultQuestionCount: 3,
    flowSteps: [
      { label: "Disparo automático", description: "Pesquisa enviada" },
      { label: "Resposta rápida" },
    ],
    sections: [
      {
        title: "Sentimento geral",
        questions: [
          { type: "rating", text: "Como se sentiu?", isRequired: true, ratingMax: 5 },
          {
            type: "multiple_choice",
            text: "Carga de trabalho?",
            isRequired: true,
            options: [
              { id: "low", label: "Baixa" },
              { id: "high", label: "Alta" },
            ],
          },
          { type: "text_short", text: "Comentários?", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: true,
      recurrence: "weekly",
    },
    ...overrides,
  };
}

// ─── Tests ───

describe("TemplatePreviewPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the template name", () => {
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={vi.fn()} />);
    expect(screen.getByText("Pulse")).toBeInTheDocument();
  });

  it("renders the template subtitle", () => {
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={vi.fn()} />);
    expect(screen.getByText("Sentimento semanal da equipe")).toBeInTheDocument();
  });

  it("renders close button with accessible label", () => {
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Fechar preview")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={onClose} />);

    await user.click(screen.getByLabelText("Fechar preview"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows anonymous config label", () => {
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={vi.fn()} />);
    expect(screen.getByText("Respostas anônimas")).toBeInTheDocument();
  });

  it("shows identified config label for non-anonymous", () => {
    const template = makeTemplate({ defaultConfig: { isAnonymous: false } });
    renderMinimal(<TemplatePreviewPanel template={template} onClose={vi.fn()} />);
    expect(screen.getByText("Respostas identificadas")).toBeInTheDocument();
  });

  it("renders flow steps", () => {
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={vi.fn()} />);
    expect(screen.getByText("Fluxo de aplicação")).toBeInTheDocument();
    expect(screen.getByText("Disparo automático")).toBeInTheDocument();
    expect(screen.getByText("Resposta rápida")).toBeInTheDocument();
  });

  it("renders question count badge", () => {
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders section title and question texts", () => {
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={vi.fn()} />);
    expect(screen.getByText("Sentimento geral")).toBeInTheDocument();
    expect(screen.getByText("Como se sentiu?")).toBeInTheDocument();
    expect(screen.getByText("Carga de trabalho?")).toBeInTheDocument();
  });

  it("renders option chips for multiple choice questions", () => {
    renderMinimal(<TemplatePreviewPanel template={makeTemplate()} onClose={vi.fn()} />);
    expect(screen.getByText("Baixa")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });
});
