import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  QuestionnaireProvider,
  QuestionnaireContextBridge,
  useQuestionnaire,
} from "./QuestionnaireContext";
import type { WizardQuestion, WizardSection } from "@/types/survey";

/* ——— Helpers ——— */

function makeQuestion(overrides: Partial<WizardQuestion> = {}): WizardQuestion {
  return {
    id: "q-1",
    sectionId: null,
    type: "text_short",
    text: "Pergunta padrão",
    isRequired: true,
    ...overrides,
  };
}

function makeSection(overrides: Partial<WizardSection> = {}): WizardSection {
  return {
    id: "s-1",
    title: "Seção padrão",
    ...overrides,
  };
}

/* ——— Tests ——— */

describe("QuestionnaireContext", () => {
  describe("useQuestionnaire fora do provider", () => {
    it("lanca erro quando usado fora do provider", () => {
      // Suppress console.error for the expected error
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => {
        renderHook(() => useQuestionnaire());
      }).toThrow(
        "useQuestionnaire must be used within QuestionnaireProvider or QuestionnaireContextBridge"
      );
      spy.mockRestore();
    });
  });

  describe("QuestionnaireProvider", () => {
    it("inicializa com listas vazias por padrao", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider>{children}</QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      expect(result.current.questions).toEqual([]);
      expect(result.current.sections).toEqual([]);
      expect(typeof result.current.dispatch).toBe("function");
    });

    it("inicializa com dados iniciais", () => {
      const q = makeQuestion();
      const s = makeSection();
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider initialQuestions={[q]} initialSections={[s]}>
          {children}
        </QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      expect(result.current.questions).toHaveLength(1);
      expect(result.current.questions[0]!.text).toBe("Pergunta padrão");
      expect(result.current.sections).toHaveLength(1);
      expect(result.current.sections[0]!.title).toBe("Seção padrão");
    });

    it("ADD_QUESTION adiciona pergunta ao estado", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider>{children}</QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "ADD_QUESTION",
          payload: makeQuestion({ id: "q-new" }),
        });
      });

      expect(result.current.questions).toHaveLength(1);
      expect(result.current.questions[0]!.id).toBe("q-new");
    });

    it("REMOVE_QUESTION remove pergunta pelo id", () => {
      const q1 = makeQuestion({ id: "q-1" });
      const q2 = makeQuestion({ id: "q-2", text: "Segunda pergunta" });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider initialQuestions={[q1, q2]}>
          {children}
        </QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      act(() => {
        result.current.dispatch({ type: "REMOVE_QUESTION", payload: "q-1" });
      });

      expect(result.current.questions).toHaveLength(1);
      expect(result.current.questions[0]!.id).toBe("q-2");
    });

    it("UPDATE_QUESTION atualiza campos da pergunta", () => {
      const q = makeQuestion({ id: "q-1", text: "Texto original" });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider initialQuestions={[q]}>
          {children}
        </QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "UPDATE_QUESTION",
          payload: { id: "q-1", changes: { text: "Texto atualizado" } },
        });
      });

      expect(result.current.questions[0]!.text).toBe("Texto atualizado");
    });

    it("ADD_SECTION adiciona secao ao estado", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider>{children}</QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "ADD_SECTION",
          payload: makeSection({ id: "s-new", title: "Nova seção" }),
        });
      });

      expect(result.current.sections).toHaveLength(1);
      expect(result.current.sections[0]!.title).toBe("Nova seção");
    });

    it("UPDATE_SECTION atualiza campos da secao", () => {
      const s = makeSection({ id: "s-1", title: "Titulo original" });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider initialSections={[s]}>
          {children}
        </QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "UPDATE_SECTION",
          payload: { id: "s-1", changes: { title: "Titulo atualizado" } },
        });
      });

      expect(result.current.sections[0]!.title).toBe("Titulo atualizado");
    });

    it("REMOVE_SECTION remove secao e desvincula perguntas", () => {
      const s = makeSection({ id: "s-1" });
      const q1 = makeQuestion({ id: "q-1", sectionId: "s-1" });
      const q2 = makeQuestion({ id: "q-2", sectionId: null });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider initialSections={[s]} initialQuestions={[q1, q2]}>
          {children}
        </QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      act(() => {
        result.current.dispatch({ type: "REMOVE_SECTION", payload: "s-1" });
      });

      expect(result.current.sections).toHaveLength(0);
      // q-1 should be unlinked (sectionId = null)
      expect(result.current.questions[0]!.sectionId).toBeNull();
      // q-2 should remain unchanged
      expect(result.current.questions[1]!.sectionId).toBeNull();
    });

    it("REORDER_ALL substitui secoes e perguntas", () => {
      const q1 = makeQuestion({ id: "q-1", text: "Primeira" });
      const q2 = makeQuestion({ id: "q-2", text: "Segunda" });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireProvider initialQuestions={[q1, q2]}>
          {children}
        </QuestionnaireProvider>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "REORDER_ALL",
          payload: { sections: [], questions: [q2, q1] },
        });
      });

      expect(result.current.questions[0]!.id).toBe("q-2");
      expect(result.current.questions[1]!.id).toBe("q-1");
    });
  });

  describe("QuestionnaireContextBridge", () => {
    it("expoe estado externo via hook", () => {
      const questions = [makeQuestion()];
      const sections = [makeSection()];
      const dispatch = vi.fn();

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QuestionnaireContextBridge
          questions={questions}
          sections={sections}
          dispatch={dispatch}
        >
          {children}
        </QuestionnaireContextBridge>
      );
      const { result } = renderHook(() => useQuestionnaire(), { wrapper });

      expect(result.current.questions).toBe(questions);
      expect(result.current.sections).toBe(sections);
      expect(result.current.dispatch).toBe(dispatch);
    });
  });
});
