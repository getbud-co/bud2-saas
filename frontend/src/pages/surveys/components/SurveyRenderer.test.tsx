/**
 * Tests for SurveyRenderer
 *
 * Renders a survey in preview or respond mode, with section-based
 * navigation, progress bar, and answer handling.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderMinimal } from "../../../../tests/setup/test-utils";
import { SurveyRenderer } from "./SurveyRenderer";
import type { SurveyRendererData, SurveyRendererProps } from "./SurveyRenderer";

// ─── Fixtures ───

function makeSurveyData(overrides: Partial<SurveyRendererData> = {}): SurveyRendererData {
  return {
    name: "Pesquisa de engajamento",
    description: "Avalie o clima da equipe",
    isAnonymous: false,
    sections: [],
    questions: [
      {
        id: "q1",
        sectionId: null,
        type: "text_short",
        text: "Como se sente?",
        isRequired: false,
      },
      {
        id: "q2",
        sectionId: null,
        type: "yes_no",
        text: "Recomendaria a empresa?",
        isRequired: true,
      },
    ],
    ...overrides,
  };
}

function defaultProps(overrides: Partial<SurveyRendererProps> = {}): SurveyRendererProps {
  return {
    survey: makeSurveyData(),
    mode: "preview",
    onSubmit: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ───

describe("SurveyRenderer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders survey title", () => {
    renderMinimal(<SurveyRenderer {...defaultProps()} />);
    expect(screen.getByText("Pesquisa de engajamento")).toBeInTheDocument();
  });

  it("renders survey description", () => {
    renderMinimal(<SurveyRenderer {...defaultProps()} />);
    expect(screen.getByText("Avalie o clima da equipe")).toBeInTheDocument();
  });

  it("renders default title when name is empty", () => {
    renderMinimal(
      <SurveyRenderer {...defaultProps({ survey: makeSurveyData({ name: "" }) })} />,
    );
    expect(screen.getByText("Pesquisa sem título")).toBeInTheDocument();
  });

  it("shows preview banner in preview mode", () => {
    renderMinimal(<SurveyRenderer {...defaultProps({ mode: "preview" })} />);
    expect(screen.getByText("Modo de pré-visualização")).toBeInTheDocument();
  });

  it("does not show preview banner in respond mode", () => {
    renderMinimal(<SurveyRenderer {...defaultProps({ mode: "respond" })} />);
    expect(screen.queryByText("Modo de pré-visualização")).not.toBeInTheDocument();
  });

  it("shows anonymous badge when survey is anonymous", () => {
    renderMinimal(
      <SurveyRenderer
        {...defaultProps({ survey: makeSurveyData({ isAnonymous: true }) })}
      />,
    );
    expect(screen.getByText("Anônima")).toBeInTheDocument();
  });

  it("renders all questions", () => {
    renderMinimal(<SurveyRenderer {...defaultProps()} />);
    expect(screen.getByText("Como se sente?")).toBeInTheDocument();
    expect(screen.getByText("Recomendaria a empresa?")).toBeInTheDocument();
  });

  it("shows empty state when no questions", () => {
    renderMinimal(
      <SurveyRenderer
        {...defaultProps({ survey: makeSurveyData({ questions: [] }) })}
      />,
    );
    expect(screen.getByText("Esta pesquisa ainda não possui perguntas.")).toBeInTheDocument();
  });

  it("renders navigation buttons", () => {
    renderMinimal(<SurveyRenderer {...defaultProps()} />);
    expect(screen.getByText("Anterior")).toBeInTheDocument();
    // Single section → last section → "Enviar respostas"
    expect(screen.getByText("Enviar respostas")).toBeInTheDocument();
  });

  it("disables Anterior button on first section", () => {
    renderMinimal(<SurveyRenderer {...defaultProps()} />);
    const prevButton = screen.getByText("Anterior").closest("button");
    expect(prevButton).toBeDisabled();
  });
});
