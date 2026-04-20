import type { Mission, MissionTask, MissionMember, SubTask, CheckIn, Tag, GoalType, KRStatus, KeyResult } from "@/types";
import {
  getCurrentCycleInfo,
  deterministicCreatedAt,
  deterministicUpdatedAt,
  generateCheckInsForKR,
  toIsoDate,
  getQuarter,
  today,
  addDays,
} from "@/lib/seed-utils";

/* ——— Mock data ——— */

// User IDs must match people-store.ts exactly
const MS_OWNER = { id: "ms", firstName: "Maria", lastName: "Soares", initials: "MS" };
const BR_OWNER = { id: "br", firstName: "Beatriz", lastName: "Ramos", initials: "BR" };
const LO_OWNER = { id: "lo", firstName: "Lucas", lastName: "Oliveira", initials: "LO" };
const JM_OWNER = { id: "jm", firstName: "Joao", lastName: "Martins", initials: "JM" };
const AF_OWNER = { id: "af", firstName: "Ana", lastName: "Ferreira", initials: "AF" };
const CS_OWNER = { id: "cs", firstName: "Carla", lastName: "Santos", initials: "CS" };
const RM_OWNER = { id: "rm", firstName: "Rafael", lastName: "Mendes", initials: "RM" };
const CM_OWNER = { id: "cm", firstName: "Carlos", lastName: "Mendes", initials: "CM" };

// Time Produto — IDs must match people-store.ts exactly
const BS_OWNER = { id: "bs", firstName: "Beatriz", lastName: "Santos", initials: "BS" };
const CR_OWNER = { id: "cr", firstName: "Camila", lastName: "Rocha", initials: "CR" };
const GF_OWNER = { id: "gf", firstName: "Gustavo", lastName: "Fonseca", initials: "GF" };

// Time Engenharia
const PA_OWNER = { id: "pa", firstName: "Pedro", lastName: "Almeida", initials: "PA" };
const MD_OWNER = { id: "md", firstName: "Mariana", lastName: "Duarte", initials: "MD" };
const TB_OWNER = { id: "tb", firstName: "Thiago", lastName: "Barbosa", initials: "TB" };
const IM_OWNER = { id: "im", firstName: "Isabela", lastName: "Moreira", initials: "IM" };

// Time Marketing
const FR_OWNER = { id: "fr", firstName: "Fernando", lastName: "Rodrigues", initials: "FR" };
const JC_OWNER = { id: "jc", firstName: "Juliana", lastName: "Costa", initials: "JC" };
const AP_OWNER = { id: "ap", firstName: "Andre", lastName: "Peixoto", initials: "AP" };

// Time Customer Success
const FD_OWNER = { id: "fd", firstName: "Fernanda", lastName: "Dias", initials: "FD" };

// Time Executivo
const CEO_OWNER = { id: "ceo", firstName: "Roberto", lastName: "Nascimento", initials: "RN" };

// Time Design
const PR_OWNER = { id: "pr", firstName: "Paula", lastName: "Ribeiro", initials: "PR" };
const VT_OWNER = { id: "vt", firstName: "Vinicius", lastName: "Teixeira", initials: "VT" };

// Time RH
const RL_OWNER = { id: "rl", firstName: "Rafael", lastName: "Lima", initials: "RL" };
const LN_OWNER = { id: "ln", firstName: "Larissa", lastName: "Nunes", initials: "LN" };
const BC_OWNER = { id: "bc", firstName: "Bruno", lastName: "Cardoso", initials: "BC" };

// Time Vendas
const GN_OWNER = { id: "gn", firstName: "Gabriel", lastName: "Nunes", initials: "GN" };

// Time Financeiro
const IF_OWNER = { id: "if", firstName: "Isabela", lastName: "Freitas", initials: "IF" };

// Time Operações
const DM_OWNER = { id: "dm", firstName: "Diego", lastName: "Martins", initials: "DM" };
const RV_OWNER = { id: "rv", firstName: "Renata", lastName: "Vieira", initials: "RV" };

const ORG_ID = "org-1";

// Helper to build a MissionMember entry for a supporter
function mkSupporter(
  missionId: string,
  user: typeof MS_OWNER,
  addedBy: string,
  addedAt: string,
): MissionMember {
  return {
    missionId,
    userId: user.id,
    role: "supporter",
    addedAt,
    addedBy,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      initials: user.initials,
      jobTitle: null,
      avatarUrl: null,
    },
  };
}

function mkTask(
  id: string,
  title: string,
  isDone: boolean,
  owner: typeof MS_OWNER,
  opts?: { description?: string; missionId?: string | null; keyResultId?: string | null; subtasks?: SubTask[]; contributesTo?: { missionId: string; missionTitle: string }[] },
): MissionTask {
  return {
    id,
    missionId: opts?.missionId ?? null,
    keyResultId: opts?.keyResultId ?? null,
    title,
    description: opts?.description ?? null,
    ownerId: owner.id,
    teamId: null,
    dueDate: null,
    isDone,
    sortOrder: 0,
    completedAt: isDone ? "2026-03-01T00:00:00Z" : null,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-03-07T00:00:00Z",
    owner,
    subtasks: opts?.subtasks,
    contributesTo: opts?.contributesTo,
  };
}

function mkKR(
  id: string,
  title: string,
  opts: {
    missionId: string;
    goalType: GoalType;
    progress: number;
    targetValue?: string;
    currentValue?: string;
    startValue?: string;
    lowThreshold?: string;
    highThreshold?: string;
    expectedValue?: string;
    status: KRStatus;
    owner: typeof MS_OWNER;
    periodLabel?: string;
    periodStart?: string;
    periodEnd?: string;
    unit?: string;
    unitLabel?: string;
    children?: KeyResult[];
    tasks?: MissionTask[];
    contributesTo?: { missionId: string; missionTitle: string }[];
  },
): KeyResult {
  return {
    id,
    orgId: ORG_ID,
    missionId: opts.missionId,
    parentKrId: null,
    title,
    description: null,
    ownerId: opts.owner.id,
    teamId: null,
    measurementMode: "manual",
    linkedMissionId: null,
    linkedSurveyId: null,
    externalSource: null,
    externalConfig: null,
    goalType: opts.goalType,
    targetValue: opts.targetValue ?? "100",
    currentValue: opts.currentValue ?? String(opts.progress),
    startValue: opts.startValue ?? "0",
    lowThreshold: opts.lowThreshold ?? null,
    highThreshold: opts.highThreshold ?? null,
    unit: (opts.unit as KeyResult["unit"]) ?? "percent",
    unitLabel: opts.unitLabel ?? null,
    expectedValue: opts.expectedValue ?? null,
    status: opts.status,
    progress: opts.progress,
    periodLabel: opts.periodLabel ?? `Q${CURRENT_QUARTER} ${CURRENT_YEAR}`,
    periodStart: opts.periodStart ?? CYCLE_START_ISO,
    periodEnd: opts.periodEnd ?? CYCLE_END_ISO,
    sortOrder: 0,
    createdAt: deterministicCreatedAt(id, cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt(id),
    deletedAt: null,
    owner: opts.owner,
    children: opts.children,
    tasks: opts.tasks,
    contributesTo: opts.contributesTo,
  };
}

// Get current cycle info for date generation
const cycleInfo = getCurrentCycleInfo();
const CURRENT_CYCLE_ID = cycleInfo.quarterId;
const CYCLE_START_ISO = toIsoDate(cycleInfo.quarterStart);
const CYCLE_END_ISO = toIsoDate(cycleInfo.quarterEnd);
const CURRENT_QUARTER = getQuarter(today());
const CURRENT_YEAR = today().getFullYear();

// Due dates relativos ao dia atual — usados nas missões do time Produto
const _now = today();
const DUE_14_DAYS = toIsoDate(addDays(_now, 14));
const DUE_21_DAYS = toIsoDate(addDays(_now, 21));
const DUE_30_DAYS = toIsoDate(addDays(_now, 30));
const COMPLETED_7_DAYS_AGO = toIsoDate(addDays(_now, -7));

// ─── Tag helpers ─────────────────────────────────────────────────────────────
// IDs devem bater com config-store.ts (tags de org-1)
function mkTag(id: string, name: string, color: string): Tag {
  const now = new Date().toISOString();
  return { id, orgId: ORG_ID, name, color, createdAt: now, updatedAt: now, deletedAt: null };
}

const TAG_ESTRATEGIA = mkTag("tag-estrategia", "Estratégia", "wine");
const TAG_CRESCIMENTO = mkTag("tag-crescimento", "Crescimento", "orange");
const TAG_DESIGN = mkTag("tag-design", "Design", "wine");
const TAG_CULTURA = mkTag("tag-cultura", "Cultura", "caramel");
const TAG_ENGENHARIA = mkTag("tag-engenharia", "Engenharia", "orange");

export const MOCK_MISSIONS: Mission[] = [
  {
    id: "m1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["m1"],
    title: "Usar o nosso conhecimento para mudar o patamar do negócio",
    description: null,
    ownerId: MS_OWNER.id,
    teamId: null,
    status: "active",
    visibility: "public",
    progress: 75,
    kanbanStatus: "doing",
    sortOrder: 0,
    dueDate: null,
    completedAt: null,
    createdAt: deterministicCreatedAt("m1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("m1"),
    deletedAt: null,
    owner: MS_OWNER,
    keyResults: [
      mkKR("i1", "Receita de Crédito Imobiliário", {
        missionId: "m1",
        goalType: "reach",
        progress: 30,
        targetValue: "100",
        expectedValue: "66",
        status: "attention",
        owner: MS_OWNER,
        unitLabel: "R$",
        contributesTo: [{ missionId: "m2", missionTitle: "Acelerar a governança, a performance e o desenvolvimento interno colaborativo" }],
        tasks: [
          mkTask("it1", "Mapear leads qualificados do trimestre", true, MS_OWNER, {
            keyResultId: "i1",
            description: "Identificar e qualificar os leads com maior potencial de conversão",
          }),
          mkTask("it2", "Negociar condições com banco parceiro", false, BR_OWNER, {
            keyResultId: "i1",
          }),
          mkTask("it3", "Atualizar projeção financeira", false, LO_OWNER, { keyResultId: "i1" }),
        ],
      }),
      mkKR("i2", "NPS do onboarding", {
        missionId: "m1",
        goalType: "between",
        progress: 65,
        targetValue: "100",
        lowThreshold: "50",
        highThreshold: "90",
        status: "on_track",
        owner: JM_OWNER,
      }),
    ],
    tasks: [
      mkTask("tk1", "Revisar contratos pendentes com jurídico", true, MS_OWNER, { missionId: "m1" }),
      mkTask("tk2", "Agendar reunião com time comercial", true, AF_OWNER, { missionId: "m1" }),
      mkTask("tk3", "Preparar relatório de pipeline Q1", false, MS_OWNER, { missionId: "m1", contributesTo: [{ missionId: "m2", missionTitle: "Acelerar a governança, a performance e o desenvolvimento interno colaborativo" }] }),
    ],
    children: [
      {
        id: "m1-sub",
        orgId: ORG_ID,
        cycleId: CURRENT_CYCLE_ID,
        parentId: "m1",
        depth: 1,
        path: ["m1", "m1-sub"],
        title: "Expandir a base de clientes enterprise",
        description: null,
        ownerId: CS_OWNER.id,
        teamId: null,
        status: "active",
        visibility: "public",
        progress: 42,
        kanbanStatus: "doing",
        sortOrder: 0,
        dueDate: null,
        completedAt: null,
        createdAt: deterministicCreatedAt("m1-sub", cycleInfo.quarterStart),
        updatedAt: deterministicUpdatedAt("m1-sub"),
        deletedAt: null,
        owner: CS_OWNER,
        keyResults: [
          mkKR("i8", "Novos contratos enterprise", {
            missionId: "m1-sub",
            goalType: "reach",
            progress: 40,
            targetValue: "100",
            expectedValue: "66",
            status: "off_track",
            owner: CS_OWNER,
          }),
          mkKR("i9", "Ticket médio enterprise", {
            missionId: "m1-sub",
            goalType: "above",
            progress: 72,
            targetValue: "100",
            lowThreshold: "50",
            status: "on_track",
            owner: RM_OWNER,
          }),
        ],
      },
    ],
    restrictedSummary: { keyResults: 2, tasks: 1, children: 0 },
  },
  {
    id: "m2",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["m2"],
    title: "Acelerar a governança, a performance e o desenvolvimento interno colaborativo",
    description: null,
    ownerId: MS_OWNER.id,
    teamId: null,
    status: "active",
    visibility: "public",
    progress: 55,
    kanbanStatus: "doing",
    sortOrder: 1,
    dueDate: null,
    completedAt: null,
    createdAt: deterministicCreatedAt("m2", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("m2"),
    deletedAt: null,
    owner: MS_OWNER,
    keyResults: [
      mkKR("i5", "Módulo de pesquisas v2", {
        missionId: "m2",
        goalType: "reach",
        progress: 72,
        targetValue: "100",
        expectedValue: "66",
        status: "on_track",
        owner: MS_OWNER,
      }),
      mkKR("i6", "Integração Slack e Teams", {
        missionId: "m2",
        goalType: "reach",
        progress: 85,
        targetValue: "100",
        expectedValue: "66",
        status: "on_track",
        owner: CM_OWNER, // Carlos Mendes - Tech Lead (Engenharia)
      }),
      mkKR("i7", "Adesão aos check-ins semanais", {
        missionId: "m2",
        goalType: "reach",
        progress: 35,
        targetValue: "100",
        expectedValue: "66",
        status: "off_track",
        owner: CS_OWNER, // Carla Santos - People Business Partner
        periodLabel: "Q1 2026",
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
      }),
    ],
    tasks: [
      mkTask("tk5", "Definir escopo do módulo de pesquisas v2", true, MS_OWNER, { missionId: "m2" }),
      mkTask("tk6", "Criar protótipos de alta fidelidade", false, JM_OWNER, { missionId: "m2" }),
      mkTask("tk7", "Validar fluxo com 3 clientes beta", false, MS_OWNER, { missionId: "m2" }),
    ],
    externalContributions: [
      {
        type: "indicator",
        id: "i1",
        title: "Receita de Crédito Imobiliário",
        progress: 30,
        status: "attention",
        owner: MS_OWNER,
        sourceMission: { id: "m1", title: "Usar o nosso conhecimento para mudar o patamar do negócio" },
      },
      {
        type: "task",
        id: "tk3",
        title: "Preparar relatório de pipeline Q1",
        isDone: false,
        owner: MS_OWNER,
        sourceMission: { id: "m1", title: "Usar o nosso conhecimento para mudar o patamar do negócio" },
      },
    ],
  },
  {
    id: "m3",
    orgId: ORG_ID,
    cycleId: null,
    parentId: null,
    depth: 0,
    path: ["m3"],
    title: "Implementar programa de mentoria entre líderes",
    description: null,
    ownerId: MS_OWNER.id,
    teamId: null,
    status: "draft",
    visibility: "public",
    progress: 0,
    kanbanStatus: "uncategorized",
    sortOrder: 2,
    dueDate: null,
    completedAt: null,
    createdAt: deterministicCreatedAt("m3", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("m3"),
    deletedAt: null,
    owner: MS_OWNER,
    keyResults: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Missões do Time Produto (team-produto)
  // Owners: bs (CPO), cr (PM), gf (Designer), jm (People Ops), br (PM)
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: "mp1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mp1"],
    title: "Lançar módulo de Missões v2",
    description: "Redesenhar e reimplementar o módulo de OKRs com nova UX e integrações.",
    ownerId: BS_OWNER.id,
    teamId: "team-produto",
    status: "active",
    visibility: "public",
    progress: 72,
    kanbanStatus: "doing",
    sortOrder: 3,
    dueDate: DUE_30_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mp1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mp1"),
    deletedAt: null,
    owner: BS_OWNER,
    team: { id: "team-produto", name: "Produto", color: "caramel" },
    tags: [TAG_ESTRATEGIA],
    keyResults: [
      mkKR("kp1", "Entregar 3 features core do módulo", {
        missionId: "mp1",
        goalType: "reach",
        progress: 80,
        targetValue: "3",
        currentValue: "2.4",
        startValue: "0",
        expectedValue: "2",
        status: "on_track",
        owner: BS_OWNER,
        unit: "number",
        unitLabel: "features",
      }),
      mkKR("kp2", "Zero bugs críticos em produção", {
        missionId: "mp1",
        goalType: "below",
        progress: 65,
        targetValue: "0",
        currentValue: "2",
        startValue: "8",
        highThreshold: "0",
        status: "on_track",
        owner: GF_OWNER,
        unit: "number",
        unitLabel: "bugs",
      }),
    ],
    tasks: [
      mkTask("tp1", "Finalizar especificação técnica das APIs", true, BS_OWNER, { missionId: "mp1" }),
      mkTask("tp2", "Implementar tela de Kanban de missões", true, GF_OWNER, { missionId: "mp1" }),
      mkTask("tp3", "Validar UX com 5 clientes beta", false, CR_OWNER, { missionId: "mp1" }),
    ],
    members: [
      mkSupporter("mp1", CR_OWNER, BS_OWNER.id, deterministicCreatedAt("mp1", cycleInfo.quarterStart)),
      mkSupporter("mp1", GF_OWNER, BS_OWNER.id, deterministicCreatedAt("mp1", cycleInfo.quarterStart)),
    ],
  },

  {
    id: "mp2",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mp2"],
    title: "Aumentar adoção do produto em 50%",
    description: "Crescer a base de usuários ativos diários e melhorar o NPS do produto.",
    ownerId: CR_OWNER.id,
    teamId: "team-produto",
    status: "active",
    visibility: "public",
    progress: 45,
    kanbanStatus: "doing",
    sortOrder: 4,
    dueDate: DUE_14_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mp2", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mp2"),
    deletedAt: null,
    owner: CR_OWNER,
    team: { id: "team-produto", name: "Produto", color: "caramel" },
    tags: [TAG_CRESCIMENTO],
    keyResults: [
      mkKR("kp3", "DAU crescer de 2.000 para 3.000 usuários", {
        missionId: "mp2",
        goalType: "reach",
        progress: 42,
        targetValue: "3000",
        currentValue: "2252",
        startValue: "2000",
        expectedValue: "66",
        status: "attention",
        owner: CR_OWNER,
        unit: "number",
        unitLabel: "usuários",
      }),
      mkKR("kp4", "NPS do produto atingir 50 pontos", {
        missionId: "mp2",
        goalType: "above",
        progress: 48,
        targetValue: "100",
        currentValue: "48",
        startValue: "32",
        lowThreshold: "50",
        status: "attention",
        owner: CR_OWNER,
        unit: "number",
        unitLabel: "NPS",
      }),
    ],
    tasks: [
      mkTask("tp4", "Redesenhar tela de boas-vindas para novos usuários", true, GF_OWNER, { missionId: "mp2" }),
      mkTask("tp5", "Criar campanha de reativação para usuários inativos", false, CR_OWNER, { missionId: "mp2" }),
      mkTask("tp6", "Implementar tour guiado de onboarding", false, GF_OWNER, { missionId: "mp2" }),
    ],
    members: [
      mkSupporter("mp2", BS_OWNER, CR_OWNER.id, deterministicCreatedAt("mp2", cycleInfo.quarterStart)),
      mkSupporter("mp2", JM_OWNER, CR_OWNER.id, deterministicCreatedAt("mp2", cycleInfo.quarterStart)),
    ],
  },

  {
    id: "mp3",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mp3"],
    title: "Redesenhar fluxo de onboarding",
    description: "Simplificar o processo de onboarding para reduzir time-to-value do cliente.",
    ownerId: GF_OWNER.id,
    teamId: "team-produto",
    status: "active",
    visibility: "public",
    progress: 88,
    kanbanStatus: "doing",
    sortOrder: 5,
    dueDate: null,
    completedAt: null,
    createdAt: deterministicCreatedAt("mp3", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mp3"),
    deletedAt: null,
    owner: GF_OWNER,
    team: { id: "team-produto", name: "Produto", color: "caramel" },
    tags: [TAG_DESIGN],
    keyResults: [
      mkKR("kp5", "Reduzir tempo médio de onboarding em 40%", {
        missionId: "mp3",
        goalType: "reduce",
        progress: 90,
        targetValue: "12",
        currentValue: "13",
        startValue: "20",
        status: "on_track",
        owner: GF_OWNER,
        unit: "number",
        unitLabel: "min",
      }),
      mkKR("kp6", "Taxa de completude do onboarding ≥ 85%", {
        missionId: "mp3",
        goalType: "above",
        progress: 86,
        targetValue: "100",
        currentValue: "86",
        startValue: "58",
        lowThreshold: "85",
        status: "on_track",
        owner: BR_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("tp7", "Mapear jornada atual do usuário com analytics", true, GF_OWNER, { missionId: "mp3" }),
      mkTask("tp8", "Prototipar novo fluxo em Figma", true, GF_OWNER, { missionId: "mp3" }),
      mkTask("tp9", "Testar protótipo com 10 usuários reais", true, CR_OWNER, { missionId: "mp3" }),
      mkTask("tp10", "Implementar e deployar novo fluxo", false, BS_OWNER, { missionId: "mp3" }),
    ],
    members: [
      mkSupporter("mp3", BS_OWNER, GF_OWNER.id, deterministicCreatedAt("mp3", cycleInfo.quarterStart)),
      mkSupporter("mp3", CR_OWNER, GF_OWNER.id, deterministicCreatedAt("mp3", cycleInfo.quarterStart)),
    ],
  },

  {
    id: "mp4",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mp4"],
    title: "Implementar sistema de feedback contínuo",
    description: "Criar ciclo de feedback estruturado entre gestores e times via plataforma.",
    ownerId: JM_OWNER.id,
    teamId: "team-produto",
    status: "active",
    visibility: "public",
    progress: 28,
    kanbanStatus: "doing",
    sortOrder: 6,
    dueDate: DUE_21_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mp4", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mp4"),
    deletedAt: null,
    owner: JM_OWNER,
    team: { id: "team-produto", name: "Produto", color: "caramel" },
    tags: [TAG_CULTURA],
    keyResults: [
      mkKR("kp7", "Ciclo completo de feedback 360 implementado na plataforma", {
        missionId: "mp4",
        goalType: "reach",
        progress: 25,
        targetValue: "100",
        currentValue: "25",
        startValue: "0",
        expectedValue: "66",
        status: "off_track",
        owner: JM_OWNER,
        unit: "percent",
      }),
      mkKR("kp8", "80% dos gestores usando o sistema semanalmente", {
        missionId: "mp4",
        goalType: "above",
        progress: 30,
        targetValue: "100",
        currentValue: "30",
        startValue: "0",
        lowThreshold: "80",
        status: "off_track",
        owner: JM_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("tp11", "Mapear requisitos com time de People", true, JM_OWNER, { missionId: "mp4" }),
      mkTask("tp12", "Criar wireframes do módulo de feedback", false, GF_OWNER, { missionId: "mp4" }),
      mkTask("tp13", "Desenvolver API de feedback 360", false, BS_OWNER, { missionId: "mp4" }),
      mkTask("tp14", "Treinar gestores no novo módulo", false, JM_OWNER, { missionId: "mp4" }),
    ],
    members: [
      mkSupporter("mp4", GF_OWNER, JM_OWNER.id, deterministicCreatedAt("mp4", cycleInfo.quarterStart)),
      mkSupporter("mp4", BS_OWNER, JM_OWNER.id, deterministicCreatedAt("mp4", cycleInfo.quarterStart)),
    ],
  },

  {
    id: "mp5",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mp5"],
    title: "Documentar e publicar APIs públicas v1",
    description: "Criar documentação completa das APIs públicas para integração de parceiros.",
    ownerId: BR_OWNER.id,
    teamId: "team-produto",
    status: "completed",
    visibility: "public",
    progress: 100,
    kanbanStatus: "done",
    sortOrder: 7,
    dueDate: null,
    completedAt: COMPLETED_7_DAYS_AGO,
    createdAt: deterministicCreatedAt("mp5", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mp5"),
    deletedAt: null,
    owner: BR_OWNER,
    team: { id: "team-produto", name: "Produto", color: "caramel" },
    tags: [TAG_ENGENHARIA],
    keyResults: [
      mkKR("kp9", "100% das APIs públicas documentadas no Swagger", {
        missionId: "mp5",
        goalType: "reach",
        progress: 100,
        targetValue: "100",
        currentValue: "100",
        startValue: "0",
        status: "completed",
        owner: BR_OWNER,
        unit: "percent",
      }),
    ],
    tasks: [
      mkTask("tp15", "Auditar todos os endpoints existentes", true, BR_OWNER, { missionId: "mp5" }),
      mkTask("tp16", "Escrever documentação no Swagger/OpenAPI", true, BR_OWNER, { missionId: "mp5" }),
      mkTask("tp17", "Criar exemplos de uso para cada endpoint", true, BR_OWNER, { missionId: "mp5" }),
      mkTask("tp18", "Publicar portal do desenvolvedor", true, BS_OWNER, { missionId: "mp5" }),
    ],
    members: [
      mkSupporter("mp5", BS_OWNER, BR_OWNER.id, deterministicCreatedAt("mp5", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time Engenharia ────────────────────────────────────────────────────────

  {
    id: "me1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["me1"],
    title: "Reduzir tempo de deploy para menos de 15 minutos",
    description: "Automatizar e otimizar o pipeline de CI/CD para deploys mais rápidos e seguros.",
    ownerId: PA_OWNER.id,
    teamId: "team-engenharia",
    status: "active",
    visibility: "public",
    progress: 62,
    kanbanStatus: "doing",
    sortOrder: 8,
    dueDate: DUE_30_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("me1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("me1"),
    deletedAt: null,
    owner: PA_OWNER,
    team: { id: "team-engenharia", name: "Engenharia", color: "orange" },
    tags: [TAG_ENGENHARIA],
    keyResults: [
      mkKR("ke1", "Tempo médio de deploy reduzido de 45min para 15min", {
        missionId: "me1",
        goalType: "reduce",
        progress: 58,
        targetValue: "15",
        currentValue: "26",
        startValue: "45",
        status: "attention",
        owner: CM_OWNER,
        unit: "number",
        unitLabel: "min",
      }),
      mkKR("ke2", "100% dos deploys via pipeline automatizado", {
        missionId: "me1",
        goalType: "reach",
        progress: 75,
        targetValue: "100",
        currentValue: "75",
        startValue: "40",
        expectedValue: "66",
        status: "on_track",
        owner: PA_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
      mkKR("ke3", "Zero rollbacks não planejados no trimestre", {
        missionId: "me1",
        goalType: "below",
        progress: 50,
        targetValue: "0",
        currentValue: "3",
        startValue: "7",
        highThreshold: "0",
        status: "attention",
        owner: MD_OWNER,
        unit: "number",
        unitLabel: "rollbacks",
      }),
    ],
    tasks: [
      mkTask("te1", "Migrar pipelines para GitHub Actions", true, CM_OWNER, { missionId: "me1" }),
      mkTask("te2", "Configurar deploy canário para produção", false, PA_OWNER, { missionId: "me1" }),
      mkTask("te3", "Automatizar rollback em caso de falha de healthcheck", false, MD_OWNER, { missionId: "me1" }),
    ],
    members: [
      mkSupporter("me1", CM_OWNER, PA_OWNER.id, deterministicCreatedAt("me1", cycleInfo.quarterStart)),
      mkSupporter("me1", MD_OWNER, PA_OWNER.id, deterministicCreatedAt("me1", cycleInfo.quarterStart)),
    ],
  },

  {
    id: "me2",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["me2"],
    title: "Aumentar cobertura de testes para 80%",
    description: "Elevar a qualidade do código com testes automatizados abrangentes.",
    ownerId: CM_OWNER.id,
    teamId: "team-engenharia",
    status: "active",
    visibility: "public",
    progress: 55,
    kanbanStatus: "doing",
    sortOrder: 9,
    dueDate: DUE_21_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("me2", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("me2"),
    deletedAt: null,
    owner: CM_OWNER,
    team: { id: "team-engenharia", name: "Engenharia", color: "orange" },
    tags: [TAG_ENGENHARIA],
    keyResults: [
      mkKR("ke4", "Cobertura de testes unitários ≥ 80%", {
        missionId: "me2",
        goalType: "above",
        progress: 52,
        targetValue: "100",
        currentValue: "52",
        startValue: "35",
        lowThreshold: "80",
        status: "attention",
        owner: CM_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
      mkKR("ke5", "Testes de integração para 100% das APIs críticas", {
        missionId: "me2",
        goalType: "reach",
        progress: 60,
        targetValue: "100",
        currentValue: "60",
        startValue: "20",
        expectedValue: "66",
        status: "on_track",
        owner: TB_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
      mkKR("ke8", "Cobertura de testes E2E para fluxos críticos ≥ 70%", {
        missionId: "me2",
        goalType: "above",
        progress: 40,
        targetValue: "100",
        currentValue: "40",
        startValue: "10",
        lowThreshold: "70",
        status: "off_track",
        owner: IM_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("te4", "Configurar relatório de cobertura no CI", true, TB_OWNER, { missionId: "me2" }),
      mkTask("te5", "Escrever testes para módulo de autenticação", true, IM_OWNER, { missionId: "me2" }),
      mkTask("te6", "Criar testes E2E para fluxos críticos", false, MD_OWNER, { missionId: "me2" }),
      mkTask("te7", "Definir quality gate mínimo de cobertura", false, PA_OWNER, { missionId: "me2" }),
    ],
    members: [
      mkSupporter("me2", TB_OWNER, CM_OWNER.id, deterministicCreatedAt("me2", cycleInfo.quarterStart)),
      mkSupporter("me2", IM_OWNER, CM_OWNER.id, deterministicCreatedAt("me2", cycleInfo.quarterStart)),
    ],
  },

  {
    id: "me3",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["me3"],
    title: "Migrar infraestrutura para Kubernetes",
    description: "Containerizar serviços e migrar para orquestração K8s para melhor escalabilidade.",
    ownerId: PA_OWNER.id,
    teamId: "team-engenharia",
    status: "active",
    visibility: "public",
    progress: 35,
    kanbanStatus: "todo",
    sortOrder: 10,
    dueDate: null,
    completedAt: null,
    createdAt: deterministicCreatedAt("me3", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("me3"),
    deletedAt: null,
    owner: PA_OWNER,
    team: { id: "team-engenharia", name: "Engenharia", color: "orange" },
    tags: [TAG_ENGENHARIA, TAG_ESTRATEGIA],
    keyResults: [
      mkKR("ke6", "80% dos serviços migrados para containers", {
        missionId: "me3",
        goalType: "reach",
        progress: 30,
        targetValue: "80",
        currentValue: "24",
        startValue: "0",
        expectedValue: "50",
        status: "off_track",
        owner: PA_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
      mkKR("ke7", "Uptime de 99.9% após migração", {
        missionId: "me3",
        goalType: "above",
        progress: 40,
        targetValue: "100",
        currentValue: "99.5",
        startValue: "99.2",
        lowThreshold: "99.9",
        status: "attention",
        owner: CM_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("te8", "Definir arquitetura de clusters K8s", true, PA_OWNER, { missionId: "me3" }),
      mkTask("te9", "Containerizar serviço de autenticação", true, MD_OWNER, { missionId: "me3" }),
      mkTask("te10", "Migrar API principal para K8s", false, CM_OWNER, { missionId: "me3" }),
      mkTask("te11", "Configurar monitoramento com Prometheus/Grafana", false, TB_OWNER, { missionId: "me3" }),
    ],
    members: [
      mkSupporter("me3", CM_OWNER, PA_OWNER.id, deterministicCreatedAt("me3", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time Marketing ─────────────────────────────────────────────────────────

  {
    id: "mm1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mm1"],
    title: "Dobrar geração de leads qualificados (MQLs)",
    description: "Expandir estratégia de inbound e outbound para gerar mais leads qualificados.",
    ownerId: FR_OWNER.id,
    teamId: "team-marketing",
    status: "active",
    visibility: "public",
    progress: 58,
    kanbanStatus: "doing",
    sortOrder: 11,
    dueDate: DUE_30_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mm1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mm1"),
    deletedAt: null,
    owner: FR_OWNER,
    team: { id: "team-marketing", name: "Marketing", color: "warning" },
    tags: [TAG_CRESCIMENTO],
    keyResults: [
      mkKR("km1", "Gerar 500 MQLs no trimestre (vs 250 anterior)", {
        missionId: "mm1",
        goalType: "reach",
        progress: 55,
        targetValue: "500",
        currentValue: "275",
        startValue: "0",
        expectedValue: "333",
        status: "attention",
        owner: JC_OWNER,
        unit: "number",
        unitLabel: "MQLs",
      }),
      mkKR("km2", "Taxa de conversão landing page ≥ 8%", {
        missionId: "mm1",
        goalType: "above",
        progress: 62,
        targetValue: "100",
        currentValue: "7.2",
        startValue: "4.5",
        lowThreshold: "8",
        status: "attention",
        owner: AP_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("tm1", "Lançar campanha de Google Ads segmentada por ICP", true, JC_OWNER, { missionId: "mm1" }),
      mkTask("tm2", "Criar 10 artigos de blog otimizados para SEO", false, AP_OWNER, { missionId: "mm1" }),
      mkTask("tm3", "Configurar automação de nurturing no HubSpot", false, JC_OWNER, { missionId: "mm1" }),
    ],
    members: [
      mkSupporter("mm1", JC_OWNER, FR_OWNER.id, deterministicCreatedAt("mm1", cycleInfo.quarterStart)),
      mkSupporter("mm1", AP_OWNER, FR_OWNER.id, deterministicCreatedAt("mm1", cycleInfo.quarterStart)),
    ],
  },

  {
    id: "mm2",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mm2"],
    title: "Posicionar Bud como referência em gestão contínua",
    description: "Construir autoridade de marca via conteúdo, eventos e PR.",
    ownerId: FR_OWNER.id,
    teamId: "team-marketing",
    status: "active",
    visibility: "public",
    progress: 42,
    kanbanStatus: "doing",
    sortOrder: 12,
    dueDate: null,
    completedAt: null,
    createdAt: deterministicCreatedAt("mm2", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mm2"),
    deletedAt: null,
    owner: FR_OWNER,
    team: { id: "team-marketing", name: "Marketing", color: "warning" },
    tags: [TAG_ESTRATEGIA],
    keyResults: [
      mkKR("km3", "Publicar whitepaper de gestão contínua com 1.000 downloads", {
        missionId: "mm2",
        goalType: "reach",
        progress: 35,
        targetValue: "1000",
        currentValue: "350",
        startValue: "0",
        expectedValue: "666",
        status: "off_track",
        owner: AP_OWNER,
        unit: "number",
        unitLabel: "downloads",
      }),
      mkKR("km4", "Participar de 3 eventos como palestrante", {
        missionId: "mm2",
        goalType: "reach",
        progress: 33,
        targetValue: "3",
        currentValue: "1",
        startValue: "0",
        expectedValue: "2",
        status: "attention",
        owner: FR_OWNER,
        unit: "number",
        unitLabel: "eventos",
      }),
      mkKR("km5", "Crescer seguidores LinkedIn da marca em 40%", {
        missionId: "mm2",
        goalType: "reach",
        progress: 60,
        targetValue: "40",
        currentValue: "24",
        startValue: "0",
        expectedValue: "26",
        status: "on_track",
        owner: JC_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("tm4", "Escrever e revisar whitepaper com equipe de produto", false, AP_OWNER, { missionId: "mm2" }),
      mkTask("tm5", "Submeter proposta para RD Summit e HR Tech", true, FR_OWNER, { missionId: "mm2" }),
      mkTask("tm6", "Criar série de posts sobre gestão contínua", true, JC_OWNER, { missionId: "mm2" }),
    ],
    members: [
      mkSupporter("mm2", AP_OWNER, FR_OWNER.id, deterministicCreatedAt("mm2", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time Customer Success ──────────────────────────────────────────────────

  {
    id: "mc1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mc1"],
    title: "Reduzir churn para menos de 3% mensal",
    description: "Implementar estratégias proativas de retenção e sucesso do cliente.",
    ownerId: FD_OWNER.id,
    teamId: "team-cs",
    status: "active",
    visibility: "public",
    progress: 70,
    kanbanStatus: "doing",
    sortOrder: 13,
    dueDate: DUE_14_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mc1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mc1"),
    deletedAt: null,
    owner: FD_OWNER,
    team: { id: "team-cs", name: "Customer Success", color: "warning" },
    tags: [TAG_CRESCIMENTO],
    keyResults: [
      mkKR("kc1", "Churn mensal reduzido de 5.2% para ≤ 3%", {
        missionId: "mc1",
        goalType: "below",
        progress: 65,
        targetValue: "0",
        currentValue: "3.8",
        startValue: "5.2",
        highThreshold: "3",
        status: "attention",
        owner: FD_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
      mkKR("kc2", "NPS de clientes ativos ≥ 60", {
        missionId: "mc1",
        goalType: "above",
        progress: 78,
        targetValue: "100",
        currentValue: "58",
        startValue: "42",
        lowThreshold: "60",
        status: "on_track",
        owner: CS_OWNER,
        unit: "number",
        unitLabel: "NPS",
      }),
    ],
    tasks: [
      mkTask("tc1", "Implementar health score automatizado por conta", true, FD_OWNER, { missionId: "mc1" }),
      mkTask("tc2", "Criar playbook de intervenção para contas em risco", true, CS_OWNER, { missionId: "mc1" }),
      mkTask("tc3", "Agendar QBR com top 20 contas", false, FD_OWNER, { missionId: "mc1" }),
      mkTask("tc4", "Lançar programa de advocacy com clientes promotores", false, CS_OWNER, { missionId: "mc1" }),
    ],
    members: [
      mkSupporter("mc1", CS_OWNER, FD_OWNER.id, deterministicCreatedAt("mc1", cycleInfo.quarterStart)),
    ],
  },

  {
    id: "mc2",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mc2"],
    title: "Escalar onboarding de novos clientes",
    description: "Criar processo escalável de ativação para reduzir time-to-value.",
    ownerId: FD_OWNER.id,
    teamId: "team-cs",
    status: "active",
    visibility: "public",
    progress: 48,
    kanbanStatus: "doing",
    sortOrder: 14,
    dueDate: DUE_21_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mc2", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mc2"),
    deletedAt: null,
    owner: FD_OWNER,
    team: { id: "team-cs", name: "Customer Success", color: "warning" },
    tags: [TAG_CULTURA],
    keyResults: [
      mkKR("kc3", "Time-to-value médio reduzido de 30 para 14 dias", {
        missionId: "mc2",
        goalType: "reduce",
        progress: 45,
        targetValue: "14",
        currentValue: "22",
        startValue: "30",
        status: "attention",
        owner: FD_OWNER,
        unit: "number",
        unitLabel: "dias",
      }),
      mkKR("kc4", "90% dos novos clientes ativados em 7 dias", {
        missionId: "mc2",
        goalType: "above",
        progress: 52,
        targetValue: "100",
        currentValue: "68",
        startValue: "45",
        lowThreshold: "90",
        status: "off_track",
        owner: CS_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("tc5", "Gravar série de vídeos de onboarding self-service", true, CS_OWNER, { missionId: "mc2" }),
      mkTask("tc6", "Criar checklist automatizado de ativação", false, FD_OWNER, { missionId: "mc2" }),
      mkTask("tc7", "Integrar health score ao fluxo de onboarding", false, CS_OWNER, { missionId: "mc2" }),
    ],
    members: [
      mkSupporter("mc2", CS_OWNER, FD_OWNER.id, deterministicCreatedAt("mc2", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time Executivo ─────────────────────────────────────────────────────────

  {
    id: "mx1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mx1"],
    title: "Atingir R$ 5M de ARR até o final do trimestre",
    description: "Meta estratégica de receita recorrente anual para viabilizar a próxima rodada de investimento.",
    ownerId: CEO_OWNER.id,
    teamId: "team-executivo",
    status: "active",
    visibility: "public",
    progress: 68,
    kanbanStatus: "doing",
    sortOrder: 15,
    dueDate: DUE_30_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mx1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mx1"),
    deletedAt: null,
    owner: CEO_OWNER,
    team: { id: "team-executivo", name: "Executivo", color: "wine" },
    tags: [TAG_ESTRATEGIA],
    keyResults: [
      mkKR("kx1", "ARR crescer de R$ 3.2M para R$ 5M", {
        missionId: "mx1",
        goalType: "reach",
        progress: 65,
        targetValue: "5000000",
        currentValue: "4170000",
        startValue: "3200000",
        expectedValue: "4400000",
        status: "attention",
        owner: CEO_OWNER,
        unit: "currency",
        unitLabel: "R$",
      }),
      mkKR("kx2", "Margem bruta ≥ 75%", {
        missionId: "mx1",
        goalType: "above",
        progress: 80,
        targetValue: "100",
        currentValue: "76",
        startValue: "68",
        lowThreshold: "75",
        status: "on_track",
        owner: IF_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("tx1", "Preparar deck de resultados para board", false, CEO_OWNER, { missionId: "mx1" }),
      mkTask("tx2", "Revisar projeção de runway com CFO", true, IF_OWNER, { missionId: "mx1" }),
    ],
  },

  // ─── Time Design ────────────────────────────────────────────────────────────

  {
    id: "md1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["md1"],
    title: "Consolidar Design System e melhorar consistência visual",
    description: "Garantir que todos os novos fluxos usem o DS atualizado e reduzir dívida de UX.",
    ownerId: AF_OWNER.id,
    teamId: "team-design",
    status: "active",
    visibility: "public",
    progress: 60,
    kanbanStatus: "doing",
    sortOrder: 16,
    dueDate: DUE_30_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("md1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("md1"),
    deletedAt: null,
    owner: AF_OWNER,
    team: { id: "team-design", name: "Design", color: "success" },
    tags: [TAG_DESIGN],
    keyResults: [
      mkKR("kd1", "100% das telas novas usando componentes do DS", {
        missionId: "md1",
        goalType: "reach",
        progress: 72,
        targetValue: "100",
        currentValue: "72",
        startValue: "45",
        expectedValue: "80",
        status: "on_track",
        owner: AF_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
      mkKR("kd2", "Criar 8 novos componentes no DS para cobrir gaps", {
        missionId: "md1",
        goalType: "reach",
        progress: 50,
        targetValue: "8",
        currentValue: "4",
        startValue: "0",
        expectedValue: "5",
        status: "on_track",
        owner: PR_OWNER,
        unit: "number",
        unitLabel: "componentes",
      }),
      mkKR("kd3", "Score SUS de usabilidade ≥ 80 pontos", {
        missionId: "md1",
        goalType: "above",
        progress: 55,
        targetValue: "100",
        currentValue: "74",
        startValue: "65",
        lowThreshold: "80",
        status: "attention",
        owner: VT_OWNER,
        unit: "number",
        unitLabel: "SUS",
      }),
    ],
    tasks: [
      mkTask("td1", "Auditar telas existentes contra o DS", true, PR_OWNER, { missionId: "md1" }),
      mkTask("td2", "Conduzir 5 testes de usabilidade com usuários reais", false, VT_OWNER, { missionId: "md1" }),
      mkTask("td3", "Documentar guidelines de uso de cada componente", false, AF_OWNER, { missionId: "md1" }),
    ],
    members: [
      mkSupporter("md1", PR_OWNER, AF_OWNER.id, deterministicCreatedAt("md1", cycleInfo.quarterStart)),
      mkSupporter("md1", VT_OWNER, AF_OWNER.id, deterministicCreatedAt("md1", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time RH ────────────────────────────────────────────────────────────────

  {
    id: "mr1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mr1"],
    title: "Implementar ciclo de avaliação de desempenho trimestral",
    description: "Substituir avaliação anual por ciclos trimestrais com feedback contínuo.",
    ownerId: MS_OWNER.id,
    teamId: "team-rh",
    status: "active",
    visibility: "public",
    progress: 52,
    kanbanStatus: "doing",
    sortOrder: 17,
    dueDate: DUE_21_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mr1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mr1"),
    deletedAt: null,
    owner: MS_OWNER,
    team: { id: "team-rh", name: "RH", color: "neutral" },
    tags: [TAG_CULTURA],
    keyResults: [
      mkKR("kr1", "90% dos gestores realizaram avaliação no ciclo", {
        missionId: "mr1",
        goalType: "above",
        progress: 48,
        targetValue: "100",
        currentValue: "48",
        startValue: "0",
        lowThreshold: "90",
        status: "off_track",
        owner: RL_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
      mkKR("kr2", "Tempo médio de calibração reduzido de 5 para 2 dias", {
        missionId: "mr1",
        goalType: "reduce",
        progress: 55,
        targetValue: "2",
        currentValue: "3.5",
        startValue: "5",
        status: "attention",
        owner: LN_OWNER,
        unit: "number",
        unitLabel: "dias",
      }),
    ],
    tasks: [
      mkTask("tr1", "Configurar templates de avaliação na plataforma", true, RL_OWNER, { missionId: "mr1" }),
      mkTask("tr2", "Treinar gestores no novo processo", false, LN_OWNER, { missionId: "mr1" }),
      mkTask("tr3", "Criar dashboard de acompanhamento para CHRO", false, MS_OWNER, { missionId: "mr1" }),
    ],
    members: [
      mkSupporter("mr1", RL_OWNER, MS_OWNER.id, deterministicCreatedAt("mr1", cycleInfo.quarterStart)),
      mkSupporter("mr1", LN_OWNER, MS_OWNER.id, deterministicCreatedAt("mr1", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time People ────────────────────────────────────────────────────────────

  {
    id: "mpe1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mpe1"],
    title: "Elevar eNPS da organização para 70+",
    description: "Melhorar a experiência do colaborador com iniciativas de cultura e bem-estar.",
    ownerId: JM_OWNER.id,
    teamId: "team-people",
    status: "active",
    visibility: "public",
    progress: 55,
    kanbanStatus: "doing",
    sortOrder: 18,
    dueDate: null,
    completedAt: null,
    createdAt: deterministicCreatedAt("mpe1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mpe1"),
    deletedAt: null,
    owner: JM_OWNER,
    team: { id: "team-people", name: "People", color: "neutral" },
    tags: [TAG_CULTURA],
    keyResults: [
      mkKR("kpe1", "eNPS subir de 52 para 70+", {
        missionId: "mpe1",
        goalType: "above",
        progress: 50,
        targetValue: "100",
        currentValue: "61",
        startValue: "52",
        lowThreshold: "70",
        status: "attention",
        owner: JM_OWNER,
        unit: "number",
        unitLabel: "eNPS",
      }),
      mkKR("kpe2", "Taxa de participação em pesquisas de clima ≥ 85%", {
        missionId: "mpe1",
        goalType: "above",
        progress: 60,
        targetValue: "100",
        currentValue: "78",
        startValue: "62",
        lowThreshold: "85",
        status: "attention",
        owner: CS_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("tpe1", "Lançar pesquisa de clima Q1", true, CS_OWNER, { missionId: "mpe1" }),
      mkTask("tpe2", "Criar comitê de cultura com representantes de cada time", false, JM_OWNER, { missionId: "mpe1" }),
      mkTask("tpe3", "Implementar programa de reconhecimento peer-to-peer", false, CS_OWNER, { missionId: "mpe1" }),
    ],
    members: [
      mkSupporter("mpe1", CS_OWNER, JM_OWNER.id, deterministicCreatedAt("mpe1", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time Vendas ────────────────────────────────────────────────────────────

  {
    id: "mv1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mv1"],
    title: "Fechar 30 novos clientes enterprise no trimestre",
    description: "Expandir a carteira enterprise com foco em empresas de 500+ colaboradores.",
    ownerId: FR_OWNER.id,
    teamId: "team-vendas",
    status: "active",
    visibility: "public",
    progress: 47,
    kanbanStatus: "doing",
    sortOrder: 19,
    dueDate: DUE_30_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mv1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mv1"),
    deletedAt: null,
    owner: FR_OWNER,
    team: { id: "team-vendas", name: "Vendas", color: "caramel" },
    tags: [TAG_CRESCIMENTO],
    keyResults: [
      mkKR("kv1", "Fechar 30 contratos enterprise (vs 18 anterior)", {
        missionId: "mv1",
        goalType: "reach",
        progress: 43,
        targetValue: "30",
        currentValue: "13",
        startValue: "0",
        expectedValue: "20",
        status: "attention",
        owner: GN_OWNER,
        unit: "number",
        unitLabel: "contratos",
      }),
      mkKR("kv2", "Ticket médio enterprise ≥ R$ 15.000/mês", {
        missionId: "mv1",
        goalType: "above",
        progress: 52,
        targetValue: "100",
        currentValue: "13200",
        startValue: "9800",
        lowThreshold: "15000",
        status: "attention",
        owner: FR_OWNER,
        unit: "currency",
        unitLabel: "R$",
      }),
    ],
    tasks: [
      mkTask("tv1", "Mapear 100 contas-alvo no ICP enterprise", true, GN_OWNER, { missionId: "mv1" }),
      mkTask("tv2", "Criar pitch deck específico para enterprise", true, FR_OWNER, { missionId: "mv1" }),
      mkTask("tv3", "Agendar 20 demos com decisores de RH/People", false, GN_OWNER, { missionId: "mv1" }),
    ],
    members: [
      mkSupporter("mv1", GN_OWNER, FR_OWNER.id, deterministicCreatedAt("mv1", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time Financeiro ────────────────────────────────────────────────────────

  {
    id: "mf1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mf1"],
    title: "Automatizar processos financeiros e reduzir ciclo de fechamento",
    description: "Reduzir trabalho manual no financeiro e acelerar o fechamento mensal.",
    ownerId: IF_OWNER.id,
    teamId: "team-financeiro",
    status: "active",
    visibility: "public",
    progress: 38,
    kanbanStatus: "doing",
    sortOrder: 20,
    dueDate: DUE_21_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mf1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mf1"),
    deletedAt: null,
    owner: IF_OWNER,
    team: { id: "team-financeiro", name: "Financeiro", color: "neutral" },
    tags: [TAG_ESTRATEGIA],
    keyResults: [
      mkKR("kf1", "Fechamento mensal em até 3 dias úteis (vs 8 atual)", {
        missionId: "mf1",
        goalType: "reduce",
        progress: 35,
        targetValue: "3",
        currentValue: "6",
        startValue: "8",
        status: "attention",
        owner: IF_OWNER,
        unit: "number",
        unitLabel: "dias",
      }),
      mkKR("kf2", "80% das conciliações automatizadas", {
        missionId: "mf1",
        goalType: "reach",
        progress: 40,
        targetValue: "80",
        currentValue: "32",
        startValue: "10",
        expectedValue: "53",
        status: "off_track",
        owner: IF_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
    ],
    tasks: [
      mkTask("tf1", "Integrar ERP com sistema de cobrança", true, IF_OWNER, { missionId: "mf1" }),
      mkTask("tf2", "Automatizar emissão de NFs recorrentes", false, IF_OWNER, { missionId: "mf1" }),
      mkTask("tf3", "Criar dashboard financeiro em tempo real", false, IF_OWNER, { missionId: "mf1" }),
    ],
  },

  // ─── Time Recrutamento e Seleção ────────────────────────────────────────────

  {
    id: "mrc1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mrc1"],
    title: "Contratar 15 posições estratégicas no trimestre",
    description: "Preencher posições críticas para suportar o crescimento planejado.",
    ownerId: RL_OWNER.id,
    teamId: "team-recrutamento",
    status: "active",
    visibility: "public",
    progress: 53,
    kanbanStatus: "doing",
    sortOrder: 21,
    dueDate: DUE_30_DAYS,
    completedAt: null,
    createdAt: deterministicCreatedAt("mrc1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mrc1"),
    deletedAt: null,
    owner: RL_OWNER,
    team: { id: "team-recrutamento", name: "Recrutamento e Seleção", color: "neutral" },
    tags: [TAG_CULTURA],
    keyResults: [
      mkKR("krc1", "15 posições preenchidas (8 eng, 4 produto, 3 comercial)", {
        missionId: "mrc1",
        goalType: "reach",
        progress: 47,
        targetValue: "15",
        currentValue: "7",
        startValue: "0",
        expectedValue: "10",
        status: "attention",
        owner: BC_OWNER,
        unit: "number",
        unitLabel: "posições",
      }),
      mkKR("krc2", "Time-to-hire médio ≤ 25 dias", {
        missionId: "mrc1",
        goalType: "below",
        progress: 60,
        targetValue: "0",
        currentValue: "28",
        startValue: "38",
        highThreshold: "25",
        status: "attention",
        owner: RL_OWNER,
        unit: "number",
        unitLabel: "dias",
      }),
    ],
    tasks: [
      mkTask("trc1", "Publicar vagas em 5 plataformas-chave", true, BC_OWNER, { missionId: "mrc1" }),
      mkTask("trc2", "Criar programa de indicação com bônus", true, RL_OWNER, { missionId: "mrc1" }),
      mkTask("trc3", "Implementar assessment técnico padronizado", false, BC_OWNER, { missionId: "mrc1" }),
      mkTask("trc4", "Mapear candidatos passivos no LinkedIn", false, LN_OWNER, { missionId: "mrc1" }),
    ],
    members: [
      mkSupporter("mrc1", BC_OWNER, RL_OWNER.id, deterministicCreatedAt("mrc1", cycleInfo.quarterStart)),
      mkSupporter("mrc1", LN_OWNER, RL_OWNER.id, deterministicCreatedAt("mrc1", cycleInfo.quarterStart)),
    ],
  },

  // ─── Time Operações ─────────────────────────────────────────────────────────

  {
    id: "mo1",
    orgId: ORG_ID,
    cycleId: CURRENT_CYCLE_ID,
    parentId: null,
    depth: 0,
    path: ["mo1"],
    title: "Garantir 99.9% de uptime e reduzir incidentes em produção",
    description: "Melhorar observabilidade e resposta a incidentes para manter SLAs.",
    ownerId: DM_OWNER.id,
    teamId: "team-operacoes",
    status: "active",
    visibility: "public",
    progress: 72,
    kanbanStatus: "doing",
    sortOrder: 22,
    dueDate: null,
    completedAt: null,
    createdAt: deterministicCreatedAt("mo1", cycleInfo.quarterStart),
    updatedAt: deterministicUpdatedAt("mo1"),
    deletedAt: null,
    owner: DM_OWNER,
    team: { id: "team-operacoes", name: "Operações", color: "neutral" },
    tags: [TAG_ENGENHARIA],
    keyResults: [
      mkKR("ko1", "Uptime mensal ≥ 99.9%", {
        missionId: "mo1",
        goalType: "above",
        progress: 85,
        targetValue: "100",
        currentValue: "99.92",
        startValue: "99.5",
        lowThreshold: "99.9",
        status: "on_track",
        owner: DM_OWNER,
        unit: "percent",
        unitLabel: "%",
      }),
      mkKR("ko2", "MTTR (tempo médio de resolução) ≤ 30 min", {
        missionId: "mo1",
        goalType: "below",
        progress: 60,
        targetValue: "0",
        currentValue: "42",
        startValue: "75",
        highThreshold: "30",
        status: "attention",
        owner: RV_OWNER,
        unit: "number",
        unitLabel: "min",
      }),
    ],
    tasks: [
      mkTask("to1", "Configurar alertas PagerDuty para todos os serviços", true, RV_OWNER, { missionId: "mo1" }),
      mkTask("to2", "Criar runbooks para os 10 incidentes mais comuns", false, DM_OWNER, { missionId: "mo1" }),
      mkTask("to3", "Implementar dashboard de SLIs/SLOs no Grafana", false, RV_OWNER, { missionId: "mo1" }),
    ],
    members: [
      mkSupporter("mo1", RV_OWNER, DM_OWNER.id, deterministicCreatedAt("mo1", cycleInfo.quarterStart)),
    ],
  },
];

/* ——— Check-in mock data (generated with relative dates) ——— */

// Generate check-in dates for each KR
const i1Dates = generateCheckInsForKR("i1", 5);
const i2Dates = generateCheckInsForKR("i2", 2);
const i5Dates = generateCheckInsForKR("i5", 2);

// Time Produto — check-in dates
const kp1Dates = generateCheckInsForKR("kp1", 4);
const kp2Dates = generateCheckInsForKR("kp2", 3);
const kp3Dates = generateCheckInsForKR("kp3", 5);
const kp4Dates = generateCheckInsForKR("kp4", 3);
const kp5Dates = generateCheckInsForKR("kp5", 3);
const kp7Dates = generateCheckInsForKR("kp7", 4);
const kp9Dates = generateCheckInsForKR("kp9", 2);

// Time Engenharia
const ke1Dates = generateCheckInsForKR("ke1", 4);
const ke2Dates = generateCheckInsForKR("ke2", 3);
const ke4Dates = generateCheckInsForKR("ke4", 3);

// Time Marketing
const km1Dates = generateCheckInsForKR("km1", 4);
const km4Dates = generateCheckInsForKR("km4", 3);

// Time CS
const kc1Dates = generateCheckInsForKR("kc1", 3);
const kc2Dates = generateCheckInsForKR("kc2", 2);

// Time Design
const kd1Dates = generateCheckInsForKR("kd1", 3);
const kd2Dates = generateCheckInsForKR("kd2", 2);

// Time RH
const kr1Dates = generateCheckInsForKR("kr1", 3);

// Time People
const kpe1Dates = generateCheckInsForKR("kpe1", 2);

// Time Vendas
const kv1Dates = generateCheckInsForKR("kv1", 3);

// Time Financeiro
const kf1Dates = generateCheckInsForKR("kf1", 2);

// Time Recrutamento
const krc1Dates = generateCheckInsForKR("krc1", 3);

// Time Operações
const ko1Dates = generateCheckInsForKR("ko1", 3);
const ko2Dates = generateCheckInsForKR("ko2", 2);

// Time Executivo
const kx1Dates = generateCheckInsForKR("kx1", 3);

export const MOCK_CHECKIN_HISTORY: Record<string, CheckIn[]> = {
  i1: [
    { id: "ck1", keyResultId: "i1", authorId: MS_OWNER.id, value: "30", previousValue: "22", confidence: "medium", note: "Fechamos 3 novos contratos essa semana, pipeline está avançando bem.", mentions: ["Ana Ferreira"], createdAt: i1Dates[0]?.dateIso ?? "", author: MS_OWNER },
    { id: "ck2", keyResultId: "i1", authorId: MS_OWNER.id, value: "22", previousValue: "15", confidence: "medium", note: "Reunião com diretoria trouxe novas metas.", mentions: null, createdAt: i1Dates[1]?.dateIso ?? "", author: MS_OWNER },
    { id: "ck3", keyResultId: "i1", authorId: AF_OWNER.id, value: "15", previousValue: "10", confidence: "low", note: null, mentions: null, createdAt: i1Dates[2]?.dateIso ?? "", author: AF_OWNER },
    { id: "ck4", keyResultId: "i1", authorId: MS_OWNER.id, value: "10", previousValue: "5", confidence: "low", note: "Início do trimestre, pipeline sendo construído.", mentions: null, createdAt: i1Dates[3]?.dateIso ?? "", author: MS_OWNER },
    { id: "ck5", keyResultId: "i1", authorId: AF_OWNER.id, value: "5", previousValue: "0", confidence: null, note: null, mentions: null, createdAt: i1Dates[4]?.dateIso ?? "", author: AF_OWNER },
  ],
  i2: [
    { id: "ck6", keyResultId: "i2", authorId: JM_OWNER.id, value: "65", previousValue: "60", confidence: "high", note: "NPS subiu após melhorias no onboarding.", mentions: null, createdAt: i2Dates[0]?.dateIso ?? "", author: JM_OWNER },
    { id: "ck7", keyResultId: "i2", authorId: JM_OWNER.id, value: "60", previousValue: "55", confidence: "high", note: null, mentions: null, createdAt: i2Dates[1]?.dateIso ?? "", author: JM_OWNER },
  ],
  i5: [
    { id: "ck8", keyResultId: "i5", authorId: MS_OWNER.id, value: "72", previousValue: "65", confidence: "high", note: "Sprint finalizado, 3 features entregues.", mentions: null, createdAt: i5Dates[0]?.dateIso ?? "", author: MS_OWNER },
    { id: "ck9", keyResultId: "i5", authorId: MS_OWNER.id, value: "65", previousValue: "50", confidence: "high", note: null, mentions: null, createdAt: i5Dates[1]?.dateIso ?? "", author: MS_OWNER },
  ],

  // ── Time Produto ──────────────────────────────────────────────────────────

  kp1: [
    { id: "ckp1-1", keyResultId: "kp1", authorId: BS_OWNER.id, value: "80", previousValue: "68", confidence: "high", note: "2 features entregues no sprint. Kanban e listagem prontos, falta o painel de detalhes.", mentions: null, createdAt: kp1Dates[0]?.dateIso ?? "", author: BS_OWNER },
    { id: "ckp1-2", keyResultId: "kp1", authorId: BS_OWNER.id, value: "68", previousValue: "52", confidence: "high", note: "Velocidade do time está ótima. Refinando edge cases antes de marcar feature como pronta.", mentions: null, createdAt: kp1Dates[1]?.dateIso ?? "", author: BS_OWNER },
    { id: "ckp1-3", keyResultId: "kp1", authorId: GF_OWNER.id, value: "52", previousValue: "38", confidence: "medium", note: "Revisão de UX concluída. Ajustes no componente de GoalProgressBar integrados ao design.", mentions: null, createdAt: kp1Dates[2]?.dateIso ?? "", author: GF_OWNER },
    { id: "ckp1-4", keyResultId: "kp1", authorId: BS_OWNER.id, value: "38", previousValue: "0", confidence: "medium", note: "Início do sprint. Especificações aprovadas e dev iniciado.", mentions: null, createdAt: kp1Dates[3]?.dateIso ?? "", author: BS_OWNER },
  ],

  kp2: [
    { id: "ckp2-1", keyResultId: "kp2", authorId: GF_OWNER.id, value: "2", previousValue: "4", confidence: "high", note: "2 bugs críticos corrigidos. Pipeline de testes automatizados ajudando muito.", mentions: null, createdAt: kp2Dates[0]?.dateIso ?? "", author: GF_OWNER },
    { id: "ckp2-2", keyResultId: "kp2", authorId: GF_OWNER.id, value: "4", previousValue: "6", confidence: "medium", note: "Ajustes de performance na árvore de missões reduziram bugs de rendering.", mentions: null, createdAt: kp2Dates[1]?.dateIso ?? "", author: GF_OWNER },
    { id: "ckp2-3", keyResultId: "kp2", authorId: BS_OWNER.id, value: "6", previousValue: "8", confidence: "medium", note: "Identificamos origem dos bugs: estado compartilhado no context. Refatorando.", mentions: null, createdAt: kp2Dates[2]?.dateIso ?? "", author: BS_OWNER },
  ],

  kp3: [
    { id: "ckp3-1", keyResultId: "kp3", authorId: CR_OWNER.id, value: "2252", previousValue: "2180", confidence: "medium", note: "Crescimento abaixo do esperado. Precisamos intensificar ações de ativação de novos usuários.", mentions: null, createdAt: kp3Dates[0]?.dateIso ?? "", author: CR_OWNER },
    { id: "ckp3-2", keyResultId: "kp3", authorId: CR_OWNER.id, value: "2180", previousValue: "2090", confidence: "medium", note: null, mentions: null, createdAt: kp3Dates[1]?.dateIso ?? "", author: CR_OWNER },
    { id: "ckp3-3", keyResultId: "kp3", authorId: CR_OWNER.id, value: "2090", previousValue: "2041", confidence: "low", note: "Campanha de reativação não atingiu resultado esperado. Repensando abordagem.", mentions: null, createdAt: kp3Dates[2]?.dateIso ?? "", author: CR_OWNER },
    { id: "ckp3-4", keyResultId: "kp3", authorId: CR_OWNER.id, value: "2041", previousValue: "2020", confidence: "low", note: "Crescimento orgânico fraco. Precisamos de incentivos para novos usuários.", mentions: null, createdAt: kp3Dates[3]?.dateIso ?? "", author: CR_OWNER },
    { id: "ckp3-5", keyResultId: "kp3", authorId: BS_OWNER.id, value: "2020", previousValue: "2000", confidence: "medium", note: "Baseline definido. Estratégia de crescimento apresentada para o time.", mentions: null, createdAt: kp3Dates[4]?.dateIso ?? "", author: BS_OWNER },
  ],

  kp4: [
    { id: "ckp4-1", keyResultId: "kp4", authorId: CR_OWNER.id, value: "48", previousValue: "42", confidence: "medium", note: "NPS subiu após melhorias no onboarding, mas ainda abaixo da meta de 50.", mentions: null, createdAt: kp4Dates[0]?.dateIso ?? "", author: CR_OWNER },
    { id: "ckp4-2", keyResultId: "kp4", authorId: CR_OWNER.id, value: "42", previousValue: "36", confidence: "medium", note: "Feedback de usuários: interface mais clara mas integrações ainda confusas.", mentions: null, createdAt: kp4Dates[1]?.dateIso ?? "", author: CR_OWNER },
    { id: "ckp4-3", keyResultId: "kp4", authorId: CR_OWNER.id, value: "36", previousValue: "32", confidence: "low", note: "NPS inicial coletado. Principais reclamações: velocidade da plataforma e falta de mobile.", mentions: null, createdAt: kp4Dates[2]?.dateIso ?? "", author: CR_OWNER },
  ],

  kp5: [
    { id: "ckp5-1", keyResultId: "kp5", authorId: GF_OWNER.id, value: "13", previousValue: "16", confidence: "high", note: "Novo fluxo validado com usuários beta. Redução de 35% no tempo médio. Ajustes finais em progresso.", mentions: null, createdAt: kp5Dates[0]?.dateIso ?? "", author: GF_OWNER },
    { id: "ckp5-2", keyResultId: "kp5", authorId: GF_OWNER.id, value: "16", previousValue: "18", confidence: "high", note: "Protótipo testado com 10 usuários. Eliminamos 4 etapas redundantes do fluxo.", mentions: null, createdAt: kp5Dates[1]?.dateIso ?? "", author: GF_OWNER },
    { id: "ckp5-3", keyResultId: "kp5", authorId: GF_OWNER.id, value: "18", previousValue: "20", confidence: "medium", note: "Mapeamento de jornada concluído. Identificamos gargalo no passo de configuração inicial.", mentions: null, createdAt: kp5Dates[2]?.dateIso ?? "", author: GF_OWNER },
  ],

  kp7: [
    { id: "ckp7-1", keyResultId: "kp7", authorId: JM_OWNER.id, value: "25", previousValue: "20", confidence: "low", note: "Desenvolvimento mais lento que o esperado. Dependência de API do módulo de People ainda pendente.", mentions: null, createdAt: kp7Dates[0]?.dateIso ?? "", author: JM_OWNER },
    { id: "ckp7-2", keyResultId: "kp7", authorId: JM_OWNER.id, value: "20", previousValue: "15", confidence: "low", note: "Wireframes aprovados. Início de desenvolvimento, mas cronograma está apertado.", mentions: null, createdAt: kp7Dates[1]?.dateIso ?? "", author: JM_OWNER },
    { id: "ckp7-3", keyResultId: "kp7", authorId: JM_OWNER.id, value: "15", previousValue: "8", confidence: "medium", note: null, mentions: null, createdAt: kp7Dates[2]?.dateIso ?? "", author: JM_OWNER },
    { id: "ckp7-4", keyResultId: "kp7", authorId: JM_OWNER.id, value: "8", previousValue: "0", confidence: "medium", note: "Requisitos mapeados com time de People. Arquitetura definida.", mentions: null, createdAt: kp7Dates[3]?.dateIso ?? "", author: JM_OWNER },
  ],

  kp9: [
    { id: "ckp9-1", keyResultId: "kp9", authorId: BR_OWNER.id, value: "100", previousValue: "85", confidence: "high", note: "Portal do desenvolvedor publicado. Todas as APIs documentadas e revisadas. Missão concluída!", mentions: null, createdAt: kp9Dates[0]?.dateIso ?? "", author: BR_OWNER },
    { id: "ckp9-2", keyResultId: "kp9", authorId: BR_OWNER.id, value: "85", previousValue: "60", confidence: "high", note: "Últimas 3 APIs documentadas. Revisão de qualidade em andamento.", mentions: null, createdAt: kp9Dates[1]?.dateIso ?? "", author: BR_OWNER },
  ],

  // ─── Time Engenharia ────────────────────────────────────────────────────────
  ke1: [
    { id: "cke1-1", keyResultId: "ke1", authorId: CM_OWNER.id, value: "26", previousValue: "30", confidence: "medium", note: "Pipeline migrado para GitHub Actions. Deploy médio caiu de 35min para 26min.", mentions: null, createdAt: ke1Dates[0]?.dateIso ?? "", author: CM_OWNER },
    { id: "cke1-2", keyResultId: "ke1", authorId: CM_OWNER.id, value: "30", previousValue: "35", confidence: "medium", note: "Configuração de cache em CI reduziu tempo de build em 15%.", mentions: null, createdAt: ke1Dates[1]?.dateIso ?? "", author: CM_OWNER },
    { id: "cke1-3", keyResultId: "ke1", authorId: PA_OWNER.id, value: "35", previousValue: "40", confidence: "low", note: "Primeiros testes com deploy canário. Ainda instável.", mentions: null, createdAt: ke1Dates[2]?.dateIso ?? "", author: PA_OWNER },
    { id: "cke1-4", keyResultId: "ke1", authorId: PA_OWNER.id, value: "40", previousValue: "45", confidence: "low", note: "Baseline medido: 45min em média. Meta é 15min.", mentions: null, createdAt: ke1Dates[3]?.dateIso ?? "", author: PA_OWNER },
  ],
  ke2: [
    { id: "cke2-1", keyResultId: "ke2", authorId: PA_OWNER.id, value: "75", previousValue: "65", confidence: "high", note: "Mais 3 serviços migraram para pipeline automatizado essa semana.", mentions: null, createdAt: ke2Dates[0]?.dateIso ?? "", author: PA_OWNER },
    { id: "cke2-2", keyResultId: "ke2", authorId: PA_OWNER.id, value: "65", previousValue: "55", confidence: "medium", note: "Infraestrutura de CD pronta. Começando a migrar serviços.", mentions: null, createdAt: ke2Dates[1]?.dateIso ?? "", author: PA_OWNER },
    { id: "cke2-3", keyResultId: "ke2", authorId: CM_OWNER.id, value: "55", previousValue: "40", confidence: "medium", note: "Pipeline base criado. Falta configurar ambientes de staging.", mentions: null, createdAt: ke2Dates[2]?.dateIso ?? "", author: CM_OWNER },
  ],
  ke4: [
    { id: "cke4-1", keyResultId: "ke4", authorId: CM_OWNER.id, value: "52", previousValue: "45", confidence: "medium", note: "Cobertura subiu 7% com testes do módulo de auth. Quality gate configurado.", mentions: null, createdAt: ke4Dates[0]?.dateIso ?? "", author: CM_OWNER },
    { id: "cke4-2", keyResultId: "ke4", authorId: TB_OWNER.id, value: "45", previousValue: "40", confidence: "low", note: "Testes de integração para API de missões adicionados.", mentions: null, createdAt: ke4Dates[1]?.dateIso ?? "", author: TB_OWNER },
    { id: "cke4-3", keyResultId: "ke4", authorId: IM_OWNER.id, value: "40", previousValue: "35", confidence: "low", note: "Relatório de cobertura configurado no CI. Baseline: 35%.", mentions: null, createdAt: ke4Dates[2]?.dateIso ?? "", author: IM_OWNER },
  ],

  // ─── Time Marketing ─────────────────────────────────────────────────────────
  km1: [
    { id: "ckm1-1", keyResultId: "km1", authorId: JC_OWNER.id, value: "275", previousValue: "220", confidence: "medium", note: "Campanha Google Ads gerou 55 novos MQLs. CTR acima da média do setor.", mentions: null, createdAt: km1Dates[0]?.dateIso ?? "", author: JC_OWNER },
    { id: "ckm1-2", keyResultId: "km1", authorId: JC_OWNER.id, value: "220", previousValue: "165", confidence: "medium", note: "Blog posts de SEO começaram a ranquear. Tráfego orgânico +18%.", mentions: null, createdAt: km1Dates[1]?.dateIso ?? "", author: JC_OWNER },
    { id: "ckm1-3", keyResultId: "km1", authorId: AP_OWNER.id, value: "165", previousValue: "100", confidence: "low", note: "Automação de nurturing configurada no HubSpot. Primeiros leads entrando no funil.", mentions: null, createdAt: km1Dates[2]?.dateIso ?? "", author: AP_OWNER },
    { id: "ckm1-4", keyResultId: "km1", authorId: FR_OWNER.id, value: "100", previousValue: "0", confidence: "medium", note: "Estratégia de inbound definida. Campanha de Google Ads lançada.", mentions: null, createdAt: km1Dates[3]?.dateIso ?? "", author: FR_OWNER },
  ],
  km4: [
    { id: "ckm4-1", keyResultId: "km4", authorId: FR_OWNER.id, value: "1", previousValue: "0", confidence: "medium", note: "Palestra aceita no RD Summit. Preparando deck.", mentions: null, createdAt: km4Dates[0]?.dateIso ?? "", author: FR_OWNER },
    { id: "ckm4-2", keyResultId: "km4", authorId: FR_OWNER.id, value: "0", previousValue: "0", confidence: "low", note: "Proposta submetida para HR Tech e RD Summit. Aguardando resposta.", mentions: null, createdAt: km4Dates[1]?.dateIso ?? "", author: FR_OWNER },
    { id: "ckm4-3", keyResultId: "km4", authorId: AP_OWNER.id, value: "0", previousValue: "0", confidence: "low", note: "Lista de eventos mapeada. Priorizamos RD Summit e HR Tech.", mentions: null, createdAt: km4Dates[2]?.dateIso ?? "", author: AP_OWNER },
  ],

  // ─── Time Customer Success ──────────────────────────────────────────────────
  kc1: [
    { id: "ckc1-1", keyResultId: "kc1", authorId: FD_OWNER.id, value: "3.8", previousValue: "4.2", confidence: "medium", note: "Health score ajudou a identificar 3 contas em risco. Intervenção preventiva em andamento.", mentions: null, createdAt: kc1Dates[0]?.dateIso ?? "", author: FD_OWNER },
    { id: "ckc1-2", keyResultId: "kc1", authorId: FD_OWNER.id, value: "4.2", previousValue: "4.8", confidence: "low", note: "Playbook de retenção em uso. 2 contas recuperadas esse mês.", mentions: null, createdAt: kc1Dates[1]?.dateIso ?? "", author: FD_OWNER },
    { id: "ckc1-3", keyResultId: "kc1", authorId: CS_OWNER.id, value: "4.8", previousValue: "5.2", confidence: "low", note: "Health score implementado. Primeiros dados sendo coletados.", mentions: null, createdAt: kc1Dates[2]?.dateIso ?? "", author: CS_OWNER },
  ],
  kc2: [
    { id: "ckc2-1", keyResultId: "kc2", authorId: CS_OWNER.id, value: "58", previousValue: "50", confidence: "medium", note: "NPS subiu 8 pontos após QBR com top 10 contas. Programa de advocacy lançado.", mentions: null, createdAt: kc2Dates[0]?.dateIso ?? "", author: CS_OWNER },
    { id: "ckc2-2", keyResultId: "kc2", authorId: FD_OWNER.id, value: "50", previousValue: "42", confidence: "medium", note: "Pesquisa NPS enviada. Taxa de resposta: 72%.", mentions: null, createdAt: kc2Dates[1]?.dateIso ?? "", author: FD_OWNER },
  ],

  // ─── Time Design ────────────────────────────────────────────────────────────
  kd1: [
    { id: "ckd1-1", keyResultId: "kd1", authorId: AF_OWNER.id, value: "72", previousValue: "60", confidence: "high", note: "Auditoria visual concluída. 8 telas migradas para DS essa sprint.", mentions: null, createdAt: kd1Dates[0]?.dateIso ?? "", author: AF_OWNER },
    { id: "ckd1-2", keyResultId: "kd1", authorId: AF_OWNER.id, value: "60", previousValue: "50", confidence: "medium", note: "Guidelines documentados para os 10 componentes mais usados.", mentions: null, createdAt: kd1Dates[1]?.dateIso ?? "", author: AF_OWNER },
    { id: "ckd1-3", keyResultId: "kd1", authorId: PR_OWNER.id, value: "50", previousValue: "45", confidence: "medium", note: "Auditoria de telas iniciada. 15 inconsistências identificadas.", mentions: null, createdAt: kd1Dates[2]?.dateIso ?? "", author: PR_OWNER },
  ],
  kd2: [
    { id: "ckd2-1", keyResultId: "kd2", authorId: PR_OWNER.id, value: "4", previousValue: "3", confidence: "high", note: "Componente DateRangePicker entregue e documentado no Storybook.", mentions: null, createdAt: kd2Dates[0]?.dateIso ?? "", author: PR_OWNER },
    { id: "ckd2-2", keyResultId: "kd2", authorId: VT_OWNER.id, value: "3", previousValue: "1", confidence: "medium", note: "Teste de usabilidade validou os 2 novos componentes. Score SUS: 82.", mentions: null, createdAt: kd2Dates[1]?.dateIso ?? "", author: VT_OWNER },
  ],

  // ─── Time RH ────────────────────────────────────────────────────────────────
  kr1: [
    { id: "ckr1-1", keyResultId: "kr1", authorId: RL_OWNER.id, value: "48", previousValue: "35", confidence: "low", note: "Templates configurados na plataforma. Treinamento de gestores em andamento.", mentions: null, createdAt: kr1Dates[0]?.dateIso ?? "", author: RL_OWNER },
    { id: "ckr1-2", keyResultId: "kr1", authorId: LN_OWNER.id, value: "35", previousValue: "15", confidence: "low", note: "Primeiro ciclo piloto com 3 times. Feedback positivo dos gestores.", mentions: null, createdAt: kr1Dates[1]?.dateIso ?? "", author: LN_OWNER },
    { id: "ckr1-3", keyResultId: "kr1", authorId: RL_OWNER.id, value: "15", previousValue: "0", confidence: "medium", note: "Definição do processo com CHRO. Templates sendo criados.", mentions: null, createdAt: kr1Dates[2]?.dateIso ?? "", author: RL_OWNER },
  ],

  // ─── Time People ────────────────────────────────────────────────────────────
  kpe1: [
    { id: "ckpe1-1", keyResultId: "kpe1", authorId: JM_OWNER.id, value: "61", previousValue: "56", confidence: "medium", note: "Pesquisa de clima Q1 realizada. eNPS subiu 5 pontos após ações do comitê de cultura.", mentions: null, createdAt: kpe1Dates[0]?.dateIso ?? "", author: JM_OWNER },
    { id: "ckpe1-2", keyResultId: "kpe1", authorId: CS_OWNER.id, value: "56", previousValue: "52", confidence: "low", note: "Comitê de cultura formado com 8 representantes. Primeiras iniciativas definidas.", mentions: null, createdAt: kpe1Dates[1]?.dateIso ?? "", author: CS_OWNER },
  ],

  // ─── Time Vendas ────────────────────────────────────────────────────────────
  kv1: [
    { id: "ckv1-1", keyResultId: "kv1", authorId: GN_OWNER.id, value: "13", previousValue: "10", confidence: "medium", note: "3 novos contratos fechados essa semana. Pipeline enterprise com 8 deals em negociação.", mentions: null, createdAt: kv1Dates[0]?.dateIso ?? "", author: GN_OWNER },
    { id: "ckv1-2", keyResultId: "kv1", authorId: GN_OWNER.id, value: "10", previousValue: "6", confidence: "medium", note: "Demos com 12 empresas realizadas. Taxa de conversão demo→proposta: 58%.", mentions: null, createdAt: kv1Dates[1]?.dateIso ?? "", author: GN_OWNER },
    { id: "ckv1-3", keyResultId: "kv1", authorId: FR_OWNER.id, value: "6", previousValue: "0", confidence: "low", note: "100 contas mapeadas. Pitch deck criado. Primeiras demos agendadas.", mentions: null, createdAt: kv1Dates[2]?.dateIso ?? "", author: FR_OWNER },
  ],

  // ─── Time Financeiro ────────────────────────────────────────────────────────
  kf1: [
    { id: "ckf1-1", keyResultId: "kf1", authorId: IF_OWNER.id, value: "6", previousValue: "7", confidence: "medium", note: "ERP integrado com cobrança. Fechamento de fevereiro em 6 dias úteis.", mentions: null, createdAt: kf1Dates[0]?.dateIso ?? "", author: IF_OWNER },
    { id: "ckf1-2", keyResultId: "kf1", authorId: IF_OWNER.id, value: "7", previousValue: "8", confidence: "low", note: "Mapeamento de processos concluído. Integrações priorizadas.", mentions: null, createdAt: kf1Dates[1]?.dateIso ?? "", author: IF_OWNER },
  ],

  // ─── Time Recrutamento ──────────────────────────────────────────────────────
  krc1: [
    { id: "ckrc1-1", keyResultId: "krc1", authorId: BC_OWNER.id, value: "7", previousValue: "5", confidence: "medium", note: "2 engenheiros e 1 PM contratados essa quinzena. Pipeline com 15 candidatos em entrevista final.", mentions: null, createdAt: krc1Dates[0]?.dateIso ?? "", author: BC_OWNER },
    { id: "ckrc1-2", keyResultId: "krc1", authorId: BC_OWNER.id, value: "5", previousValue: "3", confidence: "medium", note: "Programa de indicação lançado. 12 indicações recebidas na primeira semana.", mentions: null, createdAt: krc1Dates[1]?.dateIso ?? "", author: BC_OWNER },
    { id: "ckrc1-3", keyResultId: "krc1", authorId: RL_OWNER.id, value: "3", previousValue: "0", confidence: "low", note: "Vagas publicadas em 5 plataformas. Assessment técnico padronizado em uso.", mentions: null, createdAt: krc1Dates[2]?.dateIso ?? "", author: RL_OWNER },
  ],

  // ─── Time Operações ─────────────────────────────────────────────────────────
  ko1: [
    { id: "cko1-1", keyResultId: "ko1", authorId: DM_OWNER.id, value: "99.92", previousValue: "99.8", confidence: "high", note: "Alertas PagerDuty configurados. MTTR caiu 30% com runbooks padronizados.", mentions: null, createdAt: ko1Dates[0]?.dateIso ?? "", author: DM_OWNER },
    { id: "cko1-2", keyResultId: "ko1", authorId: DM_OWNER.id, value: "99.8", previousValue: "99.6", confidence: "medium", note: "Monitoramento Prometheus implementado. Dashboard de SLOs criado.", mentions: null, createdAt: ko1Dates[1]?.dateIso ?? "", author: DM_OWNER },
    { id: "cko1-3", keyResultId: "ko1", authorId: RV_OWNER.id, value: "99.6", previousValue: "99.5", confidence: "medium", note: "Baseline de uptime medido. Principais pontos de falha identificados.", mentions: null, createdAt: ko1Dates[2]?.dateIso ?? "", author: RV_OWNER },
  ],
  ko2: [
    { id: "cko2-1", keyResultId: "ko2", authorId: RV_OWNER.id, value: "42", previousValue: "55", confidence: "medium", note: "Runbooks para 5 incidentes mais comuns criados. Tempo de resolução caindo.", mentions: null, createdAt: ko2Dates[0]?.dateIso ?? "", author: RV_OWNER },
    { id: "cko2-2", keyResultId: "ko2", authorId: DM_OWNER.id, value: "55", previousValue: "75", confidence: "low", note: "Análise de incidentes dos últimos 3 meses. Padrões identificados.", mentions: null, createdAt: ko2Dates[1]?.dateIso ?? "", author: DM_OWNER },
  ],

  // ─── Time Executivo ─────────────────────────────────────────────────────────
  kx1: [
    { id: "ckx1-1", keyResultId: "kx1", authorId: CEO_OWNER.id, value: "4170000", previousValue: "3900000", confidence: "medium", note: "Fechamos 5 novos contratos enterprise. MRR cresceu 7% no mês. Pipeline robusto para o trimestre.", mentions: null, createdAt: kx1Dates[0]?.dateIso ?? "", author: CEO_OWNER },
    { id: "ckx1-2", keyResultId: "kx1", authorId: CEO_OWNER.id, value: "3900000", previousValue: "3500000", confidence: "medium", note: "Expansão de 3 contas enterprise. Churn controlado em 3.8%.", mentions: null, createdAt: kx1Dates[1]?.dateIso ?? "", author: CEO_OWNER },
    { id: "ckx1-3", keyResultId: "kx1", authorId: IF_OWNER.id, value: "3500000", previousValue: "3200000", confidence: "low", note: "ARR base: R$ 3.2M. Projeção de crescimento alinhada com board.", mentions: null, createdAt: kx1Dates[2]?.dateIso ?? "", author: IF_OWNER },
  ],
};

export const DRAWER_TASKS_BY_INDICATOR: Record<string, { id: string; title: string; isDone: boolean }[]> = {
  i1: [
    { id: "t1", title: "Revisar contratos pendentes com jurídico", isDone: true },
    { id: "t2", title: "Agendar reunião com time comercial", isDone: true },
    { id: "t3", title: "Preparar relatório de pipeline Q1", isDone: false },
  ],
  i5: [
    { id: "t4", title: "Definir escopo do módulo de pesquisas v2", isDone: true },
    { id: "t5", title: "Criar protótipos de alta fidelidade", isDone: false },
    { id: "t6", title: "Validar fluxo com 3 clientes beta", isDone: false },
  ],
};

