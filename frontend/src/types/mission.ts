export type MissionStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type MissionVisibility = "public" | "team_only" | "private";

export type KanbanStatus = "uncategorized" | "todo" | "doing" | "done";

export type MissionMemberRole = "owner" | "supporter" | "observer";

export type MissionLinkType =
  | "related"
  | "depends_on"
  | "contributes_to"
  | "blocks"
  | "duplicates";

export interface MissionMember {
  missionId: string;
  userId: string;
  role: MissionMemberRole;
  addedAt: string;
  addedBy: string | null;
  /** Dados do usuário (preenchido em queries com join) */
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    initials: string | null;
    jobTitle: string | null;
    avatarUrl: string | null;
  };
}

export interface MissionLink {
  id: string;
  sourceMissionId: string;
  targetMissionId: string;
  linkType: MissionLinkType;
  createdBy: string | null;
  createdAt: string;
  /** Missão alvo (preenchido em queries com join) */
  target?: { id: string; title: string; status: MissionStatus; progress: number };
  /** Missão origem (preenchido em queries com join) */
  source?: { id: string; title: string; status: MissionStatus; progress: number };
}

export interface ExternalContribution {
  type: "indicator" | "task";
  id: string;
  title: string;
  progress?: number;
  isDone?: boolean;
  status?: import("./key-result").KRStatus;
  owner?: { firstName: string; lastName: string; initials: string | null };
  sourceMission: { id: string; title: string };
}

export interface Mission {
  // Core identification
  id: string;
  orgId: string;
  
  // Hierarchy
  cycleId: string | null;
  parentId: string | null;
  /** Profundidade na árvore: 0 = raiz, 1 = filha, etc. */
  depth: number;
  /** Materialized path: [raiz_id, ..., self_id] para queries eficientes de subárvore */
  path: string[];
  
  // Content
  title: string;
  description: string | null;
  
  // Ownership
  ownerId: string;
  teamId: string | null;
  
  // Status and progress
  status: MissionStatus;
  visibility: MissionVisibility;
  progress: number;
  kanbanStatus: KanbanStatus;
  sortOrder: number;
  dueDate: string | null;
  completedAt: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  
  // ─── Relações (preenchidas em queries com join) ───
  
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    initials: string | null;
  };
  team?: { id: string; name: string; color: string };
  
  // Core relations (actively used)
  keyResults?: import("./key-result").KeyResult[];
  tasks?: import("./mission-task").MissionTask[];
  children?: Mission[];
  tags?: import("./tag").Tag[];
  
  // ─── Future features (not yet implemented) ───
  
  /** Time de apoio (N usuários com papéis) - FUTURE */
  members?: MissionMember[];
  /** Conexões com outras missões - FUTURE */
  outgoingLinks?: MissionLink[];
  incomingLinks?: MissionLink[];
  /** Contribuições externas - FUTURE */
  externalContributions?: ExternalContribution[];
  /** Resumo de itens ocultos - FUTURE (para permissões granulares) */
  restrictedSummary?: {
    keyResults: number;
    tasks: number;
    children: number;
  };
}
