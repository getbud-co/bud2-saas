import type { QuestionType } from "@/types/survey";

/**
 * Canonical question type labels (PT-BR).
 * Single source of truth — import this everywhere instead of
 * duplicating the mapping.
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text_short: "Texto curto",
  text_long: "Texto longo",
  multiple_choice: "Múltipla escolha",
  checkbox: "Caixas de seleção",
  dropdown: "Lista suspensa",
  likert: "Escala linear",
  nps: "NPS (0-10)",
  rating: "Avaliação",
  ranking: "Ranking",
  date: "Data",
  yes_no: "Sim / Não",
};

/** Get a human-readable label for a question type. */
export function getQuestionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_LABELS[type] ?? type;
}
