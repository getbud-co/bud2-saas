export type GoalType = "reach" | "above" | "below" | "between" | "reduce" | "survey";

export type MeasurementMode = "manual" | "task" | "mission" | "external";

export type KRUnit =
  | "percent"
  | "currency"
  | "count"
  | "custom";

export type KRStatus =
  | "on_track"
  | "attention"
  | "off_track"
  | "completed";

export interface KeyResult {
  // Core identification
  id: string;
  orgId: string;
  missionId: string;
  parentKrId: string | null;
  
  // Content
  title: string;
  description: string | null;
  ownerId: string;
  teamId: string | null;
  
  // Measurement configuration
  /** Como o KR é medido */
  measurementMode: MeasurementMode;
  goalType: GoalType;
  targetValue: string | null;
  currentValue: string;
  startValue: string;
  lowThreshold: string | null;
  highThreshold: string | null;
  unit: KRUnit;
  unitLabel: string | null;
  expectedValue: string | null;
  
  // Status and progress
  status: KRStatus;
  progress: number;
  
  // Period
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  sortOrder: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  
  // ─── Integration links (actively used) ───
  
  /** Missão referenciada (quando measurementMode = "mission") — progresso vem dela */
  linkedMissionId: string | null;
  /** Pesquisa vinculada (quando goalType = "survey") — valor vem dos resultados */
  linkedSurveyId: string | null;
  
  // ─── External integrations (FUTURE - not yet implemented) ───
  
  /** Fonte externa: google_sheets / power_bi / api (quando measurementMode = "external") */
  externalSource: string | null;
  /** Config JSON da fonte externa (URL, credenciais, mapeamento) */
  externalConfig: string | null;
  
  // ─── Relações (preenchidas em queries com join) ───
  
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    initials: string | null;
  };
  checkIns?: import("./check-in").CheckIn[];
  tasks?: import("./mission-task").MissionTask[];
  children?: KeyResult[];
  /** Missão vinculada (quando measurementMode = "mission") */
  linkedMission?: import("./mission").Mission;
  /** Missões adicionais para as quais este KR contribui - FUTURE */
  contributesTo?: { missionId: string; missionTitle: string }[];
}
