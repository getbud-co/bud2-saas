import type { EvaluationPerspective } from "@/types/survey";

/* ——— Types ——— */

export interface PreviewPerson {
  name: string;
  initials: string;
  role: string;
}

export interface PerspectiveInfo {
  /** Canonical label — matches StepParticipants definitions */
  label: string;
  /** Label for "Visualizando como:" chip — describes WHO the user is */
  viewAsLabel: string;
  /** Instruction shown in the evaluation card */
  instruction: string;
  /** Relationship label badge (e.g. "Liderado direto", "Par") */
  relationLabel: string;
  /** Simulated evaluatees for preview mode */
  previewEvaluatees: PreviewPerson[];
}

/* ——— Configuration ——— */

/**
 * Single source of truth for perspective labels, instructions, and preview data.
 *
 * Labels and instructions MUST be consistent with StepParticipants.tsx definitions:
 * - self:    "Cada colaborador irá fazer uma avaliação de si próprio"
 * - manager: "Gestor irá avaliar quem está diretamente abaixo"
 * - peers:   "Defina o modelo de seleção de pares"
 * - reports: "Liderados irão avaliar os seus gestores diretos"
 */
export const PERSPECTIVE_CONFIG: Record<EvaluationPerspective, PerspectiveInfo> = {
  self: {
    label: "Autoavaliação",
    viewAsLabel: "Colaborador (autoavaliação)",
    instruction: "Você está fazendo uma avaliação de si próprio",
    relationLabel: "Autoavaliação",
    previewEvaluatees: [
      { name: "Você mesmo(a)", initials: "EU", role: "Analista de Produto" },
    ],
  },
  manager: {
    label: "Avaliação do gestor",
    viewAsLabel: "Gestor (avaliando liderados)",
    instruction: "Gestor avaliando quem está diretamente abaixo:",
    relationLabel: "Liderado direto",
    previewEvaluatees: [
      { name: "Ana Carolina Silva", initials: "AC", role: "Analista de Produto" },
      { name: "Pedro Henrique Santos", initials: "PH", role: "Engenheiro de Software" },
      { name: "Juliana Ferreira", initials: "JF", role: "Analista de Dados" },
    ],
  },
  peers: {
    label: "Avaliação dos pares",
    viewAsLabel: "Par (avaliando colegas)",
    instruction: "Você está avaliando um par:",
    relationLabel: "Par",
    previewEvaluatees: [
      { name: "Rafael Oliveira", initials: "RO", role: "Designer de Produto" },
      { name: "Camila Rodrigues", initials: "CR", role: "Product Manager" },
      { name: "Lucas Almeida", initials: "LA", role: "Engenheiro de Software" },
    ],
  },
  reports: {
    label: "Upward (liderados)",
    viewAsLabel: "Liderado (avaliando gestor)",
    instruction: "Liderado avaliando seu gestor direto:",
    relationLabel: "Gestor direto",
    previewEvaluatees: [
      { name: "Mariana Costa", initials: "MC", role: "Head de Produto" },
      { name: "Fernando Barbosa", initials: "FB", role: "Tech Lead" },
    ],
  },
};

/** Instruction text for respond mode (no preview context) */
export const PERSPECTIVE_INSTRUCTION: Record<EvaluationPerspective, string> = {
  self: PERSPECTIVE_CONFIG.self.instruction,
  manager: PERSPECTIVE_CONFIG.manager.instruction,
  peers: PERSPECTIVE_CONFIG.peers.instruction,
  reports: PERSPECTIVE_CONFIG.reports.instruction,
};

/** Relationship label for respond mode (no preview context) */
export const PERSPECTIVE_RELATION_LABEL: Record<EvaluationPerspective, string> = {
  self: PERSPECTIVE_CONFIG.self.relationLabel,
  manager: PERSPECTIVE_CONFIG.manager.relationLabel,
  peers: PERSPECTIVE_CONFIG.peers.relationLabel,
  reports: PERSPECTIVE_CONFIG.reports.relationLabel,
};
