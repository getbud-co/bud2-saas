import type { CyclePhase } from "@/types/survey";

export const CYCLE_PHASE_LABELS: Record<CyclePhase, string> = {
  self_evaluation: "Autoavaliação",
  peer_nomination: "Nomeação de pares",
  peer_approval: "Aprovação de pares",
  peer_evaluation: "Avaliação de pares",
  manager_evaluation: "Avaliação do gestor",
  calibration: "Calibração",
  feedback: "Feedback",
};

export const ALL_CYCLE_PHASES: CyclePhase[] = [
  "self_evaluation",
  "peer_nomination",
  "peer_approval",
  "peer_evaluation",
  "manager_evaluation",
  "calibration",
  "feedback",
];

export const NOMINATION_PHASES = new Set<CyclePhase>(["peer_nomination", "peer_approval"]);
