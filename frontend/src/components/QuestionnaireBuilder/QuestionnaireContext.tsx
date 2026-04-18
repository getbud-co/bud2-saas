import { createContext, useContext, useReducer, useMemo } from "react";
import type { Dispatch, ReactNode } from "react";
import type { WizardQuestion, WizardSection } from "@/types/survey";

/* ——— Actions (intentionally matches WizardAction subset) ——— */

export type QuestionnaireAction =
  | { type: "ADD_QUESTION"; payload: WizardQuestion }
  | { type: "REMOVE_QUESTION"; payload: string }
  | { type: "UPDATE_QUESTION"; payload: { id: string; changes: Partial<WizardQuestion> } }
  | { type: "REORDER_ALL"; payload: { sections: WizardSection[]; questions: WizardQuestion[] } }
  | { type: "ADD_SECTION"; payload: WizardSection }
  | { type: "UPDATE_SECTION"; payload: { id: string; changes: Partial<WizardSection> } }
  | { type: "REMOVE_SECTION"; payload: string };

/* ——— State ——— */

export interface QuestionnaireState {
  questions: WizardQuestion[];
  sections: WizardSection[];
}

/* ——— Reducer ——— */

function questionnaireReducer(state: QuestionnaireState, action: QuestionnaireAction): QuestionnaireState {
  switch (action.type) {
    case "ADD_QUESTION":
      return { ...state, questions: [...state.questions, action.payload] };

    case "REMOVE_QUESTION":
      return { ...state, questions: state.questions.filter((q) => q.id !== action.payload) };

    case "UPDATE_QUESTION":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.id ? { ...q, ...action.payload.changes } : q,
        ),
      };

    case "REORDER_ALL":
      return { ...state, sections: action.payload.sections, questions: action.payload.questions };

    case "ADD_SECTION":
      return { ...state, sections: [...state.sections, action.payload] };

    case "UPDATE_SECTION":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.changes } : s,
        ),
      };

    case "REMOVE_SECTION":
      return {
        ...state,
        sections: state.sections.filter((s) => s.id !== action.payload),
        questions: state.questions.map((q) =>
          q.sectionId === action.payload ? { ...q, sectionId: null } : q,
        ),
      };

    default:
      return state;
  }
}

/* ——— Context ——— */

interface QuestionnaireContextValue {
  questions: WizardQuestion[];
  sections: WizardSection[];
  dispatch: Dispatch<QuestionnaireAction>;
}

const QuestionnaireContext = createContext<QuestionnaireContextValue | null>(null);

/* ——— Standalone Provider (owns its state) ——— */

interface QuestionnaireProviderProps {
  children: ReactNode;
  initialQuestions?: WizardQuestion[];
  initialSections?: WizardSection[];
}

export function QuestionnaireProvider({
  children,
  initialQuestions = [],
  initialSections = [],
}: QuestionnaireProviderProps) {
  const [state, dispatch] = useReducer(questionnaireReducer, {
    questions: initialQuestions,
    sections: initialSections,
  });

  const value = useMemo<QuestionnaireContextValue>(
    () => ({ questions: state.questions, sections: state.sections, dispatch }),
    [state.questions, state.sections],
  );

  return (
    <QuestionnaireContext.Provider value={value}>
      {children}
    </QuestionnaireContext.Provider>
  );
}

/* ——— Bridge Provider (delegates to external state) ——— */

interface QuestionnaireContextBridgeProps {
  children: ReactNode;
  questions: WizardQuestion[];
  sections: WizardSection[];
  dispatch: Dispatch<QuestionnaireAction>;
}

export function QuestionnaireContextBridge({
  children,
  questions,
  sections,
  dispatch,
}: QuestionnaireContextBridgeProps) {
  const value = useMemo<QuestionnaireContextValue>(
    () => ({ questions, sections, dispatch }),
    [questions, sections, dispatch],
  );

  return (
    <QuestionnaireContext.Provider value={value}>
      {children}
    </QuestionnaireContext.Provider>
  );
}

/* ——— Hook ——— */

export function useQuestionnaire(): QuestionnaireContextValue {
  const ctx = useContext(QuestionnaireContext);
  if (!ctx) throw new Error("useQuestionnaire must be used within QuestionnaireProvider or QuestionnaireContextBridge");
  return ctx;
}
