import type { SurveyType, SurveyCategory, SurveyStatus, QuestionType } from "@/types/survey";

export interface LikertData {
  distribution: { label: string; count: number; percent: number }[];
  average: number;
}

export interface NpsData {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  distribution: { value: number; count: number }[];
}

export interface ChoiceData {
  options: { label: string; count: number; percent: number }[];
}

export interface TextData {
  responses: string[];
  totalCount: number;
}

export interface YesNoData {
  yes: number;
  no: number;
  yesPercent: number;
  noPercent: number;
}

export interface RankingData {
  items: { label: string; avgPosition: number; count: number }[];
}

export type QuestionResultData = LikertData | NpsData | ChoiceData | TextData | YesNoData | RankingData;

export interface IndividualResponse {
  id: string;
  name: string;
  initials: string;
  department: string;
  answeredAt: string;
  numericValue?: number;
  textValue?: string;
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  responseCount: number;
  data: QuestionResultData;
  individualResponses: IndividualResponse[];
}

export interface ResultSection {
  title: string;
  questions: QuestionResult[];
}

export interface SurveyKpis {
  views: number;
  started: number;
  responses: number;
  completionRate: number;
  avgCompletionTime: string;
}

/** Dimensão avaliada: desempenho (backward-looking) ou potencial (forward-looking) */
export type CalibrationDimension = "performance" | "potential";

/** Nota calibrada por pergunta da pesquisa */
export interface CalibrationQuestionScore {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  /** Dimensão que esta pergunta alimenta no 9-box */
  dimension: CalibrationDimension;
  /** Notas de referência (vindas das avaliações) */
  selfScore?: number;
  managerScore?: number;
  score360?: number;
  /** Nota calibrada dada pelo líder/RH */
  calibratedScore: number | null;
  /** Escala da pergunta */
  scaleMin: number;
  scaleMax: number;
}

export interface CalibrationParticipant {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  department: string;
  selfScore: number;
  managerScore: number;
  score360?: number;
  finalScore: number | null;
  potential: "baixo" | "médio" | "alto";
  status: "calibrado" | "pendente";
  respondedAt: string;
  biasAlert?: string;
  okrCompletion?: number;
  feedbackCount?: number;
  pulseMean?: number;
  /** Notas calibradas por pergunta (preenchidas durante calibração) */
  calibrationScores?: CalibrationQuestionScore[];
  /** Score final calculado a partir das notas calibradas */
  calibratedFinalScore?: number;
  /** Justificativa da calibração */
  calibrationJustification?: string;
}

export interface CalibrationData {
  sessionStatus: "rascunho" | "em_andamento" | "finalizada";
  totalParticipants: number;
  calibratedCount: number;
  participants: CalibrationParticipant[];
}

export interface HeatmapEntry {
  question: string;
  department: string;
  score: number;
}

export interface AttentionPoint {
  id: string;
  questionText: string;
  score: number;
  benchmark: number;
  department: string;
  severity: "critical" | "warning";
  insight: string;
}

export interface TrendPoint {
  questionText: string;
  current: number;
  previous: number;
  delta: number;
  history: number[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "alta" | "média" | "baixa";
  department: string;
  status: "pendente" | "em_andamento" | "concluída";
  assignee?: string;
}

export interface HrReviewData {
  heatmap: {
    entries: HeatmapEntry[];
    questions: string[];
    questionLabels: Record<string, string>;
    departments: string[];
  };
  attentionPoints: AttentionPoint[];
  trends: TrendPoint[];
  actionItems: ActionItem[];
}

export type PeerNominationStatus = "pending" | "approved" | "rejected" | "overridden";

export interface PeerNomination {
  id: string;
  evaluateeId: string;
  evaluateeName: string;
  evaluateeInitials: string;
  evaluateeDepartment: string;
  nominatedPeerId: string;
  nominatedPeerName: string;
  nominatedPeerInitials: string;
  nominatedPeerDepartment: string;
  /** Who submitted this nomination (employee or manager) */
  nominatedById: string;
  nominatedByName: string;
  status: PeerNominationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByName?: string;
  rejectionReason?: string;
  overrideNote?: string;
  /** AI suggestion data if nomination was based on AI recommendation */
  aiSuggested: boolean;
  aiConfidence?: number;
}

export type PeerNominationPhase = "nomination" | "approval" | "in_evaluation" | "closed";

export interface PeerNominationSession {
  phase: PeerNominationPhase;
  peerAssignmentMode: "employee_nominates" | "manager_assigns" | "centralized";
  nominationDeadline: string | null;
  approvalDeadline: string | null;
  totalEvaluatees: number;
  evaluateesWithNominations: number;
  evaluateesFullyApproved: number;
  nominations: PeerNomination[];
}

export interface SurveyResultData {
  surveyId: string;
  surveyName: string;
  surveyType: SurveyType;
  surveyCategory: SurveyCategory;
  status: SurveyStatus;
  period: string;
  isAnonymous: boolean;
  kpis: SurveyKpis;
  sections: ResultSection[];
  calibration?: CalibrationData;
  hrReview?: HrReviewData;
  peerNominationSession?: PeerNominationSession;
}
