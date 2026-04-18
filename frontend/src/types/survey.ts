/* ——— Enums ——— */

export type SurveyType =
  | "pulse"
  | "clima"
  | "enps"
  | "health_check"
  | "skip_level"
  | "custom"
  | "performance"
  | "360_feedback"
  | "feedback_solicitado";

export type SurveyCategory = "pesquisa" | "ciclo";

export type SurveyStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "closed"
  | "archived";

export type QuestionType =
  | "text_short"
  | "text_long"
  | "multiple_choice"
  | "checkbox"
  | "dropdown"
  | "likert"
  | "nps"
  | "rating"
  | "ranking"
  | "date"
  | "yes_no";

export type ScopeType = "company" | "department" | "team" | "individual";

export type EvaluationPerspective = "self" | "manager" | "peers" | "reports";

export type PeerSelectionMethod = "manager_assigns" | "self_select" | "automatic";

/**
 * How peer assignment is structured in the survey lifecycle.
 * - employee_nominates: Colaborador nomeia → Gestor aprova (padrão, escala para 1000+)
 * - manager_assigns: Gestor define pares → RH supervisiona (primeira 360, times menores)
 * - centralized: RH define todos os pares no wizard com sugestão IA (<50 pessoas)
 */
export type PeerAssignmentMode = "employee_nominates" | "manager_assigns" | "centralized";

/** Configuration for peer assignment (nomination and manager-assigns modes) */
export interface PeerNominationConfig {
  /** Days allowed for nomination/assignment phase */
  nominationDays: number;
  /** Days allowed for approval/review phase */
  approvalDays: number;
  /** Whether AI suggests peers to the nominator/assigner */
  aiSuggestionsEnabled: boolean;
  /** Whether employees can see who was nominated to evaluate them */
  nominationVisible: boolean;
  /** Max reviews a single person can be assigned as evaluator (prevents overload) */
  maxReviewsPerEvaluator: number;
  /** Whether admin/HR can override any assignment at any time */
  adminOverrideEnabled: boolean;
}

export type ApplicationMode = "single" | "recurring";

export type Recurrence = "weekly" | "biweekly" | "monthly" | "quarterly";

export type WeekDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type ReminderFrequency = "daily" | "every_2_days" | "weekly";

export type CyclePhase =
  | "self_evaluation"
  | "peer_nomination"
  | "peer_approval"
  | "peer_evaluation"
  | "manager_evaluation"
  | "calibration"
  | "feedback";

export type ParticipantRole = "respondent" | "evaluated" | "evaluator";

export type ParticipantStatus = "pending" | "in_progress" | "completed";

/* ——— Entities ——— */

export interface Survey {
  id: string;
  orgId: string;
  createdBy: string;
  type: SurveyType;
  category: SurveyCategory;
  name: string;
  description: string | null;
  status: SurveyStatus;
  isAnonymous: boolean;
  lgpdMinGroupSize: number;
  excludeTrialPeriod: boolean;
  excludeLeave: boolean;
  excludeVacation: boolean;
  aiAnalysisEnabled: boolean;
  aiPrefillOkrs: boolean;
  aiPrefillFeedback: boolean;
  aiBiasDetection: boolean;
  recurrence: Recurrence | null;
  reminderEnabled: boolean;
  reminderFrequency: ReminderFrequency | null;
  notifyManagers: boolean;
  deliveryInApp: boolean;
  deliveryEmail: boolean;
  deliverySlack: boolean;
  startDate: string | null;
  endDate: string | null;
  scheduledLaunchAt: string | null;
  launchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveySection {
  id: string;
  surveyId: string;
  title: string;
  description: string | null;
  sortOrder: number;
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  sectionId: string | null;
  type: QuestionType;
  text: string;
  isRequired: boolean;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  options?: SurveyQuestionOption[];
}

export interface SurveyQuestionOption {
  id: string;
  questionId: string;
  label: string;
  value: string | null;
  sortOrder: number;
}

export interface SurveyParticipant {
  id: string;
  surveyId: string;
  userId: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  notifiedAt: string | null;   // Quando o participante foi notificado
  viewedAt: string | null;     // Quando o participante abriu a pesquisa
  completedAt: string | null;
  createdAt: string;
}

export interface SurveyScope {
  id: string;
  surveyId: string;
  scopeType: ScopeType;
  teamId: string | null;
  userId: string | null;
}

export interface EvaluationPerspectiveConfig {
  id: string;
  surveyId: string;
  perspective: EvaluationPerspective;
  enabled: boolean;
  isAnonymous: boolean;
  peerSelectionMethod: PeerSelectionMethod | null;
  minEvaluators: number | null;
  maxEvaluators: number | null;
}

export interface SurveyCyclePhase {
  id: string;
  surveyId: string;
  phase: CyclePhase;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
}

/* ——— Wizard State ——— */

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface QuestionOption {
  id: string;
  label: string;
}

export interface WizardQuestion {
  id: string;
  sectionId: string | null;
  type: QuestionType;
  text: string;
  description?: string;
  isRequired: boolean;
  /** Options for multiple_choice, checkbox, dropdown, ranking */
  options?: QuestionOption[];
  /** Scale endpoints for likert (e.g. 1-5, 1-7, 1-10) */
  scaleMin?: number;
  scaleMax?: number;
  /** Endpoint labels for likert/nps (e.g. { min: "Discordo", max: "Concordo" }) */
  scaleLabels?: Record<string, string>;
  /** Star count for rating type (default 5) */
  ratingMax?: number;
  /** Linked company value ID */
  companyValueId?: string | null;
  /** Linked cycle ID */
  cycleId?: string | null;
}

export interface WizardSection {
  id: string;
  title: string;
  description?: string;
}

export interface WizardScope {
  scopeType: ScopeType;
  teamIds: string[];
  userIds: string[];
}

export interface WizardPerspective {
  perspective: EvaluationPerspective;
  enabled: boolean;
  isAnonymous: boolean;
  peerSelectionMethod: PeerSelectionMethod;
  minEvaluators: number;
  maxEvaluators: number;
}

/** Reason why AI suggested a specific peer for an evaluatee */
export type PeerSuggestionReason =
  | "same_team"
  | "shared_okr"
  | "frequent_feedback"
  | "cross_functional"
  | "direct_collaboration"
  | "manager_recommendation";

export interface PeerSuggestion {
  peerId: string;
  /** Why AI suggested this peer */
  reasons: PeerSuggestionReason[];
  /** Confidence score 0-1 */
  confidence: number;
}

export interface PeerAssignment {
  evaluateeId: string;
  /** AI-suggested peers with explanations */
  suggestions: PeerSuggestion[];
  /** Final assigned peer IDs (accepted by manager/HR) */
  assignedPeerIds: string[];
}

export interface WizardCyclePhase {
  phase: CyclePhase;
  startDate: string | null;
  endDate: string | null;
}

export interface SurveyWizardState {
  step: WizardStep;
  type: SurveyType | null;
  category: SurveyCategory | null;
  name: string;
  description: string;
  ownerIds: string[];
  managerIds: string[];
  tagIds: string[];
  cycleId: string | null;

  /* Step 2 — Participants */
  scope: WizardScope;
  excludedUserIds: string[];
  excludeTrialPeriod: boolean;
  excludeLeave: boolean;
  excludeVacation: boolean;
  perspectives: WizardPerspective[];

  /* Step — Peer Assignment (ciclo 360 only) */
  peerAssignmentMode: PeerAssignmentMode;
  peerNominationConfig: PeerNominationConfig;
  peerAssignments: PeerAssignment[];

  /* Step 3 — Questionnaire */
  sections: WizardSection[];
  questions: WizardQuestion[];

  /* Step 4 — Flow */
  isAnonymous: boolean;
  lgpdMinGroupSize: number;
  aiAnalysisEnabled: boolean;
  aiPrefillOkrs: boolean;
  aiPrefillFeedback: boolean;
  aiBiasDetection: boolean;
  applicationMode: ApplicationMode;
  recurrence: Recurrence | null;
  recurrenceDay: WeekDay | null;
  reminderEnabled: boolean;
  reminderFrequency: ReminderFrequency | null;
  notifyManagers: boolean;
  managerNotificationTemplate: string;
  nonRespondentNotificationTemplate: string;
  deliveryInApp: boolean;
  deliveryEmail: boolean;
  deliverySlack: boolean;
  startDate: string | null;
  endDate: string | null;
  cyclePhases: WizardCyclePhase[];

  /* Step 5 — Launch */
  launchOption: "now" | "scheduled";
  scheduledLaunchAt: string | null;
}
