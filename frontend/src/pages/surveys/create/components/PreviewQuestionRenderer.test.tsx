/**
 * Tests for PreviewQuestionRenderer
 *
 * Renders a single question in survey preview modal context.
 * Similar to QuestionField but with custom Likert/NPS/Star components.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderMinimal } from "../../../../../tests/setup/test-utils";
import { PreviewQuestionRenderer } from "./PreviewQuestionRenderer";
import type { WizardQuestion } from "@/types/survey";

// ─── Fixtures ───

function makeQuestion(overrides: Partial<WizardQuestion> = {}): WizardQuestion {
  return {
    id: "pq1",
    sectionId: null,
    type: "text_short",
    text: "Descreva sua experiência",
    isRequired: false,
    ...overrides,
  };
}

// ─── Tests ───

describe("PreviewQuestionRenderer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders question number", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion()}
        index={0}
        total={5}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Pergunta 1 de 5")).toBeInTheDocument();
  });

  it("renders question text", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion()}
        index={0}
        total={3}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Descreva sua experiência")).toBeInTheDocument();
  });

  it("renders required badge when question is required", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion({ isRequired: true })}
        index={0}
        total={1}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Obrigatória")).toBeInTheDocument();
  });

  it("does not render required badge when question is not required", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion({ isRequired: false })}
        index={0}
        total={1}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("Obrigatória")).not.toBeInTheDocument();
  });

  it("renders description when provided", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion({ description: "Campo opcional" })}
        index={0}
        total={1}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Campo opcional")).toBeInTheDocument();
  });

  it("renders text input for text_short type", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion({ type: "text_short" })}
        index={0}
        total={1}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Digite sua resposta...")).toBeInTheDocument();
  });

  it("renders yes/no options for yes_no type", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion({ type: "yes_no" })}
        index={0}
        total={1}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.getByText("Não")).toBeInTheDocument();
  });

  it("renders multiple choice options", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion({
          type: "multiple_choice",
          options: [
            { id: "a", label: "Alternativa A" },
            { id: "b", label: "Alternativa B" },
          ],
        })}
        index={0}
        total={1}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Alternativa A")).toBeInTheDocument();
    expect(screen.getByText("Alternativa B")).toBeInTheDocument();
  });

  it("renders NPS scale labels", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion({ type: "nps" })}
        index={0}
        total={1}
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Nada provável")).toBeInTheDocument();
    expect(screen.getByText("Extremamente provável")).toBeInTheDocument();
  });

  it("renders star rating buttons", () => {
    renderMinimal(
      <PreviewQuestionRenderer
        question={makeQuestion({ type: "rating", ratingMax: 5 })}
        index={0}
        total={1}
        value={null}
        onChange={vi.fn()}
      />,
    );
    // 5 star buttons with aria-labels
    expect(screen.getByLabelText("1 de 5")).toBeInTheDocument();
    expect(screen.getByLabelText("5 de 5")).toBeInTheDocument();
  });
});
