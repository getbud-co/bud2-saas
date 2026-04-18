/**
 * Tests for QuestionField
 *
 * Renders a single survey question as an interactive form field.
 * Maps QuestionType to the appropriate DS component.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderMinimal } from "../../../../tests/setup/test-utils";
import { QuestionField } from "./QuestionField";
import type { QuestionFieldProps } from "./QuestionField";
import type { WizardQuestion } from "@/types/survey";

// ─── Fixtures ───

function makeQuestion(overrides: Partial<WizardQuestion> = {}): WizardQuestion {
  return {
    id: "q1",
    sectionId: null,
    type: "text_short",
    text: "Qual o seu nome?",
    isRequired: false,
    ...overrides,
  };
}

function defaultProps(overrides: Partial<QuestionFieldProps> = {}): QuestionFieldProps {
  return {
    question: makeQuestion(),
    index: 0,
    total: 5,
    value: "",
    onChange: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ───

describe("QuestionField", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders question number", () => {
    renderMinimal(<QuestionField {...defaultProps({ index: 2, total: 10 })} />);
    expect(screen.getByText("Pergunta 3 de 10")).toBeInTheDocument();
  });

  it("renders question text", () => {
    renderMinimal(<QuestionField {...defaultProps()} />);
    expect(screen.getByText("Qual o seu nome?")).toBeInTheDocument();
  });

  it("renders required badge when question is required", () => {
    const question = makeQuestion({ isRequired: true });
    renderMinimal(<QuestionField {...defaultProps({ question })} />);
    expect(screen.getByText("Obrigatória")).toBeInTheDocument();
  });

  it("does not render required badge when question is not required", () => {
    renderMinimal(<QuestionField {...defaultProps()} />);
    expect(screen.queryByText("Obrigatória")).not.toBeInTheDocument();
  });

  it("renders description when provided", () => {
    const question = makeQuestion({ description: "Informe seu nome completo" });
    renderMinimal(<QuestionField {...defaultProps({ question })} />);
    expect(screen.getByText("Informe seu nome completo")).toBeInTheDocument();
  });

  it("shows error message when error prop is true", () => {
    renderMinimal(<QuestionField {...defaultProps({ error: true })} />);
    expect(screen.getByText("Esta pergunta é obrigatória")).toBeInTheDocument();
  });

  it("does not show error message when error prop is false", () => {
    renderMinimal(<QuestionField {...defaultProps({ error: false })} />);
    expect(screen.queryByText("Esta pergunta é obrigatória")).not.toBeInTheDocument();
  });

  it("renders text_short input with placeholder", () => {
    renderMinimal(<QuestionField {...defaultProps()} />);
    expect(screen.getByPlaceholderText("Digite sua resposta...")).toBeInTheDocument();
  });

  it("renders yes_no radio options", () => {
    const question = makeQuestion({ type: "yes_no" });
    renderMinimal(<QuestionField {...defaultProps({ question })} />);
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.getByText("Não")).toBeInTheDocument();
  });

  it("renders multiple_choice options", () => {
    const question = makeQuestion({
      type: "multiple_choice",
      options: [
        { id: "opt1", label: "Opção A" },
        { id: "opt2", label: "Opção B" },
      ],
    });
    renderMinimal(<QuestionField {...defaultProps({ question })} />);
    expect(screen.getByText("Opção A")).toBeInTheDocument();
    expect(screen.getByText("Opção B")).toBeInTheDocument();
  });
});
