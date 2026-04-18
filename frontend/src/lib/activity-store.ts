// ─── Activity Store ───────────────────────────────────────────────────────────
// Persistência e seed de atividades dos usuários.
// TODO: Integrar com autenticação real para rastreamento de logins.

import type { UserActivity, ActivityEntityType } from "@/types/activity";
import { today, addDays, toIsoDateTime, hashString } from "@/lib/seed-utils";

// ── Schema ────────────────────────────────────────────────────────────────────

const STORE_SCHEMA_VERSION = 5;
const STORE_KEY = "bud_activity_store_v1";

export interface ActivityStoreSnapshot {
  version: number;
  activities: UserActivity[];
}

// ── Seed ──────────────────────────────────────────────────────────────────────

// Membros do time Produto (espelha people-store.ts)
// All team members across the organization (matches people-store IDs)
const ALL_TEAM_MEMBERS = [
  // Executivo + Produto (active, engaged)
  { id: "ceo", name: "Roberto Nascimento" },
  { id: "pa", name: "Pedro Almeida" },
  { id: "bs", name: "Beatriz Santos" },
  { id: "ms", name: "Maria Soares" },
  { id: "fr", name: "Fernando Rodrigues" },
  // Engenharia
  { id: "cm", name: "Carlos Mendes" },
  { id: "lo", name: "Lucas Oliveira" },
  { id: "md", name: "Mariana Duarte" },
  { id: "tb", name: "Thiago Barbosa" },
  { id: "im", name: "Isabela Moreira" },
  { id: "dm", name: "Diego Martins" },
  { id: "rv", name: "Renata Vieira" },
  { id: "rm", name: "Rafael Mendes" },
  // Produto
  { id: "cr", name: "Camila Rocha" },
  { id: "gf", name: "Gustavo Fonseca" },
  { id: "jm", name: "Joao Martins" },
  { id: "br", name: "Beatriz Ramos" },
  // Design
  { id: "af", name: "Ana Ferreira" },
  { id: "pr", name: "Paula Ribeiro" },
  { id: "vt", name: "Vinicius Teixeira" },
  // RH + People
  { id: "rl", name: "Rafael Lima" },
  { id: "ln", name: "Larissa Nunes" },
  { id: "cs", name: "Carla Santos" },
  // Marketing + Vendas
  { id: "jc", name: "Juliana Costa" },
  { id: "ap", name: "Andre Peixoto" },
  { id: "gn", name: "Gabriel Nunes" },
  // CS + Finance
  { id: "fd", name: "Fernanda Dias" },
  { id: "if", name: "Isabela Freitas" },
];

// KRs de todos os times (espelha missions.ts)
const TEAM_KR_IDS = [
  // Produto
  "kp1", "kp2", "kp3", "kp4", "kp5", "kp6", "kp7", "kp8", "kp9",
  // Engenharia
  "ke1", "ke2", "ke3", "ke4", "ke5", "ke8",
  // Marketing
  "km1", "km2", "km3", "km4", "km5",
  // Customer Success
  "kc1", "kc2", "kc3", "kc4",
  // Design
  "kd1", "kd2", "kd3",
  // RH
  "kr1", "kr2",
  // People
  "kpe1", "kpe2",
  // Vendas
  "kv1", "kv2",
  // Financeiro
  "kf1", "kf2",
  // Recrutamento
  "krc1", "krc2",
  // Operações
  "ko1", "ko2",
  // Executivo
  "kx1", "kx2",
];


/**
 * Gera um ID determinístico baseado em índice e tipo.
 */
function makeActivityId(type: string, userId: string, daysAgo: number, index: number): string {
  const hash = hashString(`${type}-${userId}-${daysAgo}-${index}`);
  return `act-${hash.toString(16)}`;
}

/**
 * Gera atividades de login para um usuário nos últimos 30 dias.
 * Cada usuário tem um padrão de acesso ligeiramente diferente.
 */
function generateLoginActivities(userId: string): UserActivity[] {
  const activities: UserActivity[] = [];
  const now = today();
  const hash = hashString(userId);

  // Padrão de acesso: bs=muito ativo, cr=ativo, gf=regular, jm=irregular, br=ativo
  const accessPatterns: Record<string, number> = {
    // Healthy — high access (70-95%)
    ceo: 0.70, pa: 0.80, bs: 0.90, ms: 0.85, fr: 0.75,
    cm: 0.85, lo: 0.80, md: 0.75, rm: 0.80,
    cr: 0.80, br: 0.85, af: 0.80,
    rl: 0.75, cs: 0.70, fd: 0.75,
    // Attention — moderate access (45-60%)
    tb: 0.50, im: 0.55, rv: 0.45,
    gf: 0.55, pr: 0.50, vt: 0.45,
    ln: 0.50, ap: 0.55,
    // Critical — low access (10-25%)
    jm: 0.20, dm: 0.15,
    jc: 0.25, gn: 0.20, "if": 0.15
  };
  const accessRate = accessPatterns[userId] ?? 0.65;

  for (let daysAgo = 0; daysAgo <= 30; daysAgo++) {
    // Skipa fins de semana (dia 0=dom, 6=sab)
    const d = addDays(now, -daysAgo);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 6) continue;

    // Determina se o usuário acessou neste dia (determinístico)
    const dayHash = hashString(`${userId}-login-${daysAgo}`);
    const accessed = (dayHash % 100) / 100 < accessRate;
    if (!accessed) continue;

    activities.push({
      id: makeActivityId("login", userId, daysAgo, hash),
      userId,
      type: "login",
      entityId: null,
      entityType: null,
      metadata: null,
      createdAt: toIsoDateTime(d),
    });
  }

  return activities;
}

/**
 * Gera atividades de check-in para um usuário.
 */
function generateCheckInActivities(userId: string): UserActivity[] {
  const activities: UserActivity[] = [];
  const now = today();

  // Padrões de check-in por usuário
  const checkinPatterns: Record<string, number[]> = {
    // Healthy — weekly check-ins (streak 3-5)
    ceo: [1, 8, 15, 22],       pa: [0, 7, 14, 21, 28],  bs: [2, 9, 16, 23],
    ms: [1, 8, 15, 22, 29],    fr: [3, 10, 17, 24],      cm: [0, 7, 14, 21],
    lo: [2, 9, 16, 23],        md: [1, 8, 15, 22],       rm: [3, 10, 17, 24],
    cr: [2, 9, 16, 25],        br: [3, 10, 17, 24],      af: [1, 8, 15, 22],
    rl: [2, 9, 16, 23],        cs: [3, 10, 17],           fd: [1, 8, 15, 22],
    // Attention — sparse check-ins (streak 1-2)
    tb: [5, 19],               im: [4, 18],               rv: [6, 20],
    gf: [5, 19],               pr: [7, 21],               vt: [8, 22],
    ln: [4, 18],               ap: [6, 20],
    // Critical — almost no check-ins
    jm: [28],                  dm: [25],
    jc: [27],                  gn: [],                    "if": [29]
  };

  const pattern = checkinPatterns[userId] ?? [7, 14, 21];

  pattern.forEach((daysAgo, index) => {
    // Escolhe um KR do time de forma determinística
    const krIndex = hashString(`${userId}-kr-${daysAgo}`) % TEAM_KR_IDS.length;
    const krId = TEAM_KR_IDS[krIndex]!;

    const date = addDays(now, -daysAgo);

    // Cria check-in
    activities.push({
      id: makeActivityId("checkin_create", userId, daysAgo, index),
      userId,
      type: "checkin_create",
      entityId: krId,
      entityType: "checkin" as ActivityEntityType,
      metadata: { keyResultId: krId },
      createdAt: toIsoDateTime(date),
    });

    // Às vezes atualiza o check-in (bs e cr são mais diligentes)
    if (userId === "bs" || userId === "cr") {
      activities.push({
        id: makeActivityId("checkin_update", userId, daysAgo, index + 100),
        userId,
        type: "checkin_update",
        entityId: krId,
        entityType: "checkin" as ActivityEntityType,
        metadata: { keyResultId: krId },
        createdAt: toIsoDateTime(addDays(date, 1)),
      });
    }
  });

  return activities;
}

/**
 * Gera atividades de pesquisa para um usuário.
 */
function generateSurveyActivities(userId: string): UserActivity[] {
  const activities: UserActivity[] = [];
  const now = today();

  // Padrões de resposta por usuário (surveyId → daysAgo de quando respondeu)
  // IDs: "1" = Pulse Check, "2" = Clima, "4" = Avaliação de Desempenho
  const surveyPatterns: Record<string, Record<string, number | null>> = {
    // Healthy — responderam quase tudo
    ceo: { "1": 14, "2": 7, "4": 1 },   pa: { "1": 15, "2": 8, "4": 2 },
    bs: { "1": 15, "2": 8, "4": null },  ms: { "1": 13, "2": 6, "4": 1 },
    fr: { "1": 14, "2": 7, "4": 2 },    cm: { "1": 15, "2": 8, "4": 1 },
    lo: { "1": 14, "2": 7, "4": 2 },    md: { "1": 13, "2": 6, "4": 1 },
    rm: { "1": 15, "2": 8, "4": 2 },    cr: { "1": 14, "2": 7, "4": 1 },
    br: { "1": 13, "2": 6, "4": 3 },    af: { "1": 14, "2": 7, "4": 1 },
    rl: { "1": 15, "2": 8, "4": 2 },    cs: { "1": 13, "2": 6, "4": 1 },
    fd: { "1": 14, "2": 7, "4": 2 },
    // Attention — responderam parcialmente
    tb: { "1": 16, "2": null, "4": 2 }, im: { "1": 16, "2": 9, "4": null },
    rv: { "1": null, "2": 9, "4": 2 },  gf: { "1": 16, "2": 9, "4": 2 },
    pr: { "1": 16, "2": null, "4": 2 }, vt: { "1": null, "2": 9, "4": null },
    ln: { "1": 16, "2": null, "4": 2 }, ap: { "1": 16, "2": 9, "4": null },
    // Critical — não responderam
    jm: { "1": null, "2": null, "4": null },
    dm: { "1": null, "2": null, "4": null },
    jc: { "1": null, "2": null, "4": null },
    gn: { "1": null, "2": null, "4": null },
    "if": { "1": null, "2": null, "4": null },
  };

  const pattern = surveyPatterns[userId] ?? {};

  for (const [surveyId, daysAgo] of Object.entries(pattern)) {
    if (daysAgo === null) continue; // Não respondeu

    const date = addDays(now, -(daysAgo + 2)); // Start 2 dias antes

    // survey_start
    activities.push({
      id: makeActivityId("survey_start", userId, daysAgo + 2, hashString(surveyId)),
      userId,
      type: "survey_start",
      entityId: surveyId,
      entityType: "survey" as ActivityEntityType,
      metadata: { surveyId },
      createdAt: toIsoDateTime(date),
    });

    // survey_complete
    activities.push({
      id: makeActivityId("survey_complete", userId, daysAgo, hashString(surveyId) + 1),
      userId,
      type: "survey_complete",
      entityId: surveyId,
      entityType: "survey" as ActivityEntityType,
      metadata: { surveyId, responseTimeHours: daysAgo > 0 ? 48 : 6 },
      createdAt: toIsoDateTime(addDays(now, -daysAgo)),
    });
  }

  return activities;
}

/**
 * Gera atividades de atualização de missões/KRs.
 */
function generateMissionActivities(userId: string): UserActivity[] {
  const activities: UserActivity[] = [];
  const now = today();

  // bs e gf atualizam KRs mais frequentemente
  const updateDays: Record<string, number[]> = {
    bs: [1, 5, 10, 15],
    cr: [3, 11, 20],
    gf: [2, 7, 14, 22],
    jm: [25], // Raramente
    br: [4, 12, 19],
  };

  const days = updateDays[userId] ?? [];

  days.forEach((daysAgo, index) => {
    const krIndex = hashString(`${userId}-mission-${daysAgo}`) % TEAM_KR_IDS.length;
    const krId = TEAM_KR_IDS[krIndex]!;

    activities.push({
      id: makeActivityId("kr_update", userId, daysAgo, index),
      userId,
      type: "kr_update",
      entityId: krId,
      entityType: "key-result" as ActivityEntityType,
      metadata: { keyResultId: krId },
      createdAt: toIsoDateTime(addDays(now, -daysAgo)),
    });
  });

  return activities;
}

/**
 * Gera o seed completo de atividades para o time Produto.
 */
function generateSeedActivities(): UserActivity[] {
  const activities: UserActivity[] = [];

  for (const member of ALL_TEAM_MEMBERS) {
    activities.push(...generateLoginActivities(member.id));
    activities.push(...generateCheckInActivities(member.id));
    activities.push(...generateSurveyActivities(member.id));
    activities.push(...generateMissionActivities(member.id));
  }

  // Ordena por data decrescente
  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return activities;
}

// ── Persistência ──────────────────────────────────────────────────────────────

export function loadActivitySnapshot(): ActivityStoreSnapshot {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActivityStoreSnapshot;
      if (parsed.version === STORE_SCHEMA_VERSION) return parsed;
    }
  } catch {
    // Ignora erros de parse
  }

  return getInitialActivitySnapshot();
}

export function saveActivitySnapshot(snapshot: ActivityStoreSnapshot): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignora erros de storage
  }
}

export function getInitialActivitySnapshot(): ActivityStoreSnapshot {
  return {
    version: STORE_SCHEMA_VERSION,
    activities: generateSeedActivities(),
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Retorna atividades de um usuário nos últimos N dias.
 */
export function getActivitiesForUser(
  activities: UserActivity[],
  userId: string,
  days: number = 30,
): UserActivity[] {
  const cutoff = addDays(today(), -days);
  return activities.filter(
    (a) => a.userId === userId && new Date(a.createdAt) >= cutoff,
  );
}

/**
 * Conta dias únicos de acesso (login) para um usuário nos últimos N dias.
 */
export function countActiveDaysForUser(
  activities: UserActivity[],
  userId: string,
  days: number = 30,
): number {
  const cutoff = addDays(today(), -days);
  const loginDays = new Set<string>();

  for (const activity of activities) {
    if (
      activity.userId === userId &&
      activity.type === "login" &&
      new Date(activity.createdAt) >= cutoff
    ) {
      const day = activity.createdAt.split("T")[0]!;
      loginDays.add(day);
    }
  }

  return loginDays.size;
}

/**
 * Retorna a data da última atividade de um usuário.
 */
export function getLastActiveAt(
  activities: UserActivity[],
  userId: string,
): string | null {
  const userActivities = activities
    .filter((a) => a.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return userActivities[0]?.createdAt ?? null;
}

/**
 * Conta pesquisas respondidas por um usuário.
 */
export function countSurveysCompletedForUser(
  activities: UserActivity[],
  userId: string,
  surveyIds: string[],
): number {
  const completedIds = new Set<string>();
  for (const activity of activities) {
    if (
      activity.userId === userId &&
      activity.type === "survey_complete" &&
      activity.entityId &&
      surveyIds.includes(activity.entityId)
    ) {
      completedIds.add(activity.entityId);
    }
  }
  return completedIds.size;
}

/**
 * Calcula tempo médio de resposta a pesquisas (em horas) para um usuário.
 */
export function calcAvgSurveyResponseTime(
  activities: UserActivity[],
  userId: string,
): number | null {
  const completions = activities.filter(
    (a) => a.userId === userId && a.type === "survey_complete",
  );

  if (completions.length === 0) return null;

  const times: number[] = [];
  for (const completion of completions) {
    const meta = completion.metadata;
    if (meta && typeof meta["responseTimeHours"] === "number") {
      times.push(meta["responseTimeHours"] as number);
    }
  }

  if (times.length === 0) return null;
  return Math.round(times.reduce((s, v) => s + v, 0) / times.length);
}

// ── Pulse insights ────────────────────────────────────────────────────────────

type PulseWorkload = "low" | "normal" | "high" | "overload";

interface PulseInsights {
  lastPulseSentiment: number | null;
  lastPulseDate: string | null;
  lastPulseWorkload: PulseWorkload | null;
  pulseSentimentTrend: "improving" | "stable" | "declining" | null;
}

/**
 * Retorna os dados do último pulse de um colaborador.
 *
 * Em produção, esses valores viriam de uma query nas respostas de pesquisas
 * não-anônimas vinculadas ao usuário. No mock, são determinísticos por userId
 * para simular o que seria visível ao gestor direto.
 *
 * Reflete o seed de activities-store: bs/cr/gf/br responderam surveys 10–11,
 * jm não respondeu nenhuma (todos pendentes).
 */
export function getPulseInsights(userId: string): PulseInsights {
  const now = today();

  const MOCK: Record<string, PulseInsights> = {
    bs: {
      lastPulseSentiment: 4,
      lastPulseDate: toIsoDateTime(addDays(now, -8)),
      lastPulseWorkload: "normal",
      pulseSentimentTrend: "improving",
    },
    cr: {
      lastPulseSentiment: 4,
      lastPulseDate: toIsoDateTime(addDays(now, -7)),
      lastPulseWorkload: "high",
      pulseSentimentTrend: "stable",
    },
    gf: {
      lastPulseSentiment: 5,
      lastPulseDate: toIsoDateTime(addDays(now, -9)),
      lastPulseWorkload: "normal",
      pulseSentimentTrend: "improving",
    },
    jm: {
      lastPulseSentiment: null,
      lastPulseDate: null,
      lastPulseWorkload: null,
      pulseSentimentTrend: null,
    },
    br: {
      lastPulseSentiment: 3,
      lastPulseDate: toIsoDateTime(addDays(now, -6)),
      lastPulseWorkload: "high",
      pulseSentimentTrend: "declining",
    },
  };

  return MOCK[userId] ?? {
    lastPulseSentiment: null,
    lastPulseDate: null,
    lastPulseWorkload: null,
    pulseSentimentTrend: null,
  };
}

/**
 * Retorna IDs de pesquisas que um usuário NÃO respondeu (mas deveria).
 */
export function getPendingSurveyIds(
  activities: UserActivity[],
  userId: string,
  allSurveyIds: string[],
): string[] {
  const completedIds = new Set(
    activities
      .filter((a) => a.userId === userId && a.type === "survey_complete" && a.entityId)
      .map((a) => a.entityId!),
  );
  return allSurveyIds.filter((id) => !completedIds.has(id));
}

/**
 * Adiciona uma nova atividade ao snapshot.
 */
export function addActivity(
  snapshot: ActivityStoreSnapshot,
  activity: Omit<UserActivity, "id" | "createdAt">,
): ActivityStoreSnapshot {
  const newActivity: UserActivity = {
    ...activity,
    id: makeActivityId(activity.type, activity.userId, 0, Date.now()),
    createdAt: toIsoDateTime(new Date()),
  };

  return {
    ...snapshot,
    activities: [newActivity, ...snapshot.activities],
  };
}
