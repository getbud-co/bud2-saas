/**
 * Conversations Store — Local-first persistence for AI assistant conversations
 *
 * This store follows the same architectural patterns as settings-store
 * for consistency and future backend integration.
 */

import { today, addDays, toIsoDateTime } from "./seed-utils";

// ─── Types ───

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  messages: ConversationMessage[];
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsStoreSnapshot {
  schemaVersion: number;
  updatedAt: string;
  conversationsByUser: Record<string, Conversation[]>;
}

// ─── Constants ───

const STORAGE_KEY = "bud.saas.conversations-store";
const STORE_SCHEMA_VERSION = 1;
const DEFAULT_USER_ID = "user-1";
const DEFAULT_ORG_ID = "org-1";

// ─── Utility Functions ───

function cloneDeep<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Seed Data ───

function createSeedConversations(
  userId: string,
  orgId: string,
): Conversation[] {
  const now = today();

  // Conversation 1: 1:1 prep — 2 days ago
  const conv1Date = addDays(now, -2);
  const conv1Iso = toIsoDateTime(conv1Date);
  const conv1Updated = toIsoDateTime(addDays(conv1Date, 0));

  // Conversation 2: OKR suggestions — 5 days ago
  const conv2Date = addDays(now, -5);
  const conv2Iso = toIsoDateTime(conv2Date);
  const conv2Updated = toIsoDateTime(addDays(conv2Date, 0));

  // Conversation 3: Engagement analysis — 8 days ago
  const conv3Date = addDays(now, -8);
  const conv3Iso = toIsoDateTime(conv3Date);
  const conv3Updated = toIsoDateTime(addDays(conv3Date, 0));

  return [
    {
      id: "conv-1",
      orgId,
      userId,
      title: "Preparação 1:1 com Ana",
      pinned: true,
      archived: false,
      createdAt: conv1Iso,
      updatedAt: conv1Updated,
      messages: [
        {
          id: "msg-1-1",
          role: "user",
          content:
            "Tenho uma 1:1 com a Ana amanhã. Pode me ajudar a preparar a pauta? Ela tem parecido um pouco desmotivada nas últimas semanas.",
          createdAt: conv1Iso,
        },
        {
          id: "msg-1-2",
          role: "assistant",
          content:
            "Claro! Com base nos dados recentes da Ana, identifiquei alguns pontos relevantes:\n\n1. **Check-ins:** A frequência dos check-ins dela caiu de semanal para quinzenal no último mês.\n2. **OKRs:** O KR de \"Reduzir tempo de resposta ao cliente\" está em 45%, abaixo do esperado (65%).\n3. **Engajamento:** A nota de satisfação no último pulse survey foi 6/10, abaixo da média do time (7.8).\n\nSugestão de pauta:\n- Abrir com reconhecimento de uma entrega recente\n- Perguntar como ela está se sentindo no papel atual\n- Explorar se há algum bloqueio nos OKRs\n- Alinhar expectativas para as próximas semanas",
          createdAt: toIsoDateTime(addDays(conv1Date, 0)),
        },
        {
          id: "msg-1-3",
          role: "user",
          content:
            "Ótimo, obrigado. Alguma sugestão de como abordar a questão da desmotivação sem parecer invasivo?",
          createdAt: toIsoDateTime(addDays(conv1Date, 0)),
        },
        {
          id: "msg-1-4",
          role: "assistant",
          content:
            'Uma abordagem empática seria usar perguntas abertas e demonstrar interesse genuíno. Por exemplo:\n\n- "Notei que as últimas semanas foram mais corridas. Como você tem se sentido em relação ao trabalho?"\n- "Tem algo que eu possa fazer diferente para te apoiar melhor?"\n- "Existe algum projeto ou responsabilidade que te energiza mais que os outros?"\n\nEvite começar com dados ou métricas — comece pela pessoa. Se ela mesma trouxer a questão, aí sim você pode mencionar os indicadores como forma de apoio.',
          createdAt: toIsoDateTime(addDays(conv1Date, 0)),
        },
      ],
    },
    {
      id: "conv-2",
      orgId,
      userId,
      title: "Sugestões de OKR Q2",
      pinned: false,
      archived: false,
      createdAt: conv2Iso,
      updatedAt: conv2Updated,
      messages: [
        {
          id: "msg-2-1",
          role: "user",
          content:
            "Preciso definir os OKRs do meu time para o próximo trimestre. Somos o time de Produto, 8 pessoas. Pode sugerir alguns objetivos estratégicos?",
          createdAt: conv2Iso,
        },
        {
          id: "msg-2-2",
          role: "assistant",
          content:
            'Com base no desempenho do time neste trimestre e nas metas da empresa, sugiro 3 objetivos:\n\n**Objetivo 1: Aumentar a retenção de usuários no produto**\n- KR1: Reduzir churn mensal de 5.2% para 3.5%\n- KR2: Aumentar NPS de 42 para 55\n- KR3: Implementar 3 melhorias baseadas em feedback de clientes\n\n**Objetivo 2: Acelerar o ciclo de entrega de features**\n- KR1: Reduzir lead time médio de 18 para 12 dias\n- KR2: Aumentar frequência de deploys de 2x para 4x por semana\n- KR3: Alcançar 80% de cobertura de testes automatizados\n\n**Objetivo 3: Fortalecer a cultura de experimentação**\n- KR1: Rodar pelo menos 5 experimentos A/B no trimestre\n- KR2: Documentar e compartilhar learnings de 100% dos experimentos\n- KR3: Ter 4 de 8 membros do time liderando pelo menos 1 experimento\n\nQuer que eu ajuste algum desses com base em prioridades específicas?',
          createdAt: toIsoDateTime(addDays(conv2Date, 0)),
        },
        {
          id: "msg-2-3",
          role: "user",
          content:
            "Gostei do Objetivo 1 e 3. O 2 é mais de engenharia. Pode substituir por algo focado em discovery?",
          createdAt: toIsoDateTime(addDays(conv2Date, 0)),
        },
      ],
    },
    {
      id: "conv-3",
      orgId,
      userId,
      title: "Análise de engajamento do time",
      pinned: false,
      archived: false,
      createdAt: conv3Iso,
      updatedAt: conv3Updated,
      messages: [
        {
          id: "msg-3-1",
          role: "user",
          content:
            "O resultado da última pesquisa de engajamento saiu. Pode fazer uma análise geral do meu time?",
          createdAt: conv3Iso,
        },
        {
          id: "msg-3-2",
          role: "assistant",
          content:
            "Analisei os resultados da pesquisa de engajamento do seu time (8 respondentes de 8 — 100% de participação, ótimo sinal). Aqui vai o resumo:\n\n**Score geral: 7.4/10** (acima da média da empresa: 7.1)\n\n**Pontos fortes:**\n- Colaboração entre pares: 8.6/10\n- Clareza de papel: 8.2/10\n- Confiança na liderança: 8.0/10\n\n**Oportunidades de melhoria:**\n- Crescimento profissional: 6.1/10 (abaixo da média)\n- Equilíbrio vida-trabalho: 6.4/10\n- Reconhecimento: 6.8/10\n\n**Comparativo com trimestre anterior:**\n- Colaboração subiu +0.8 (bom!)\n- Crescimento caiu -0.5 (atenção)\n- Reconhecimento estável\n\nRecomendo focar em criar planos de desenvolvimento individuais e aumentar momentos de reconhecimento público nas reuniões de time.",
          createdAt: toIsoDateTime(addDays(conv3Date, 0)),
        },
      ],
    },
  ];
}

// ─── Seed Snapshot ───

function getSeedSnapshot(): ConversationsStoreSnapshot {
  const now = nowIso();

  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    updatedAt: now,
    conversationsByUser: {
      [DEFAULT_USER_ID]: createSeedConversations(
        DEFAULT_USER_ID,
        DEFAULT_ORG_ID,
      ),
    },
  };
}

// ─── Sanitization ───

function sanitizeMessage(raw: unknown): ConversationMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<ConversationMessage>;
  if (!item.id || !item.content) return null;

  const validRoles: ConversationMessage["role"][] = ["user", "assistant"];

  return {
    id: String(item.id),
    role: validRoles.includes(item.role as ConversationMessage["role"])
      ? (item.role as ConversationMessage["role"])
      : "user",
    content: String(item.content),
    createdAt: typeof item.createdAt === "string" ? item.createdAt : nowIso(),
  };
}

function sanitizeConversation(raw: unknown): Conversation | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Conversation>;
  if (!item.id || !item.title) return null;

  const now = nowIso();

  const messages = Array.isArray(item.messages)
    ? item.messages
        .map((m) => sanitizeMessage(m))
        .filter((m): m is ConversationMessage => m !== null)
    : [];

  return {
    id: String(item.id),
    orgId: typeof item.orgId === "string" ? item.orgId : DEFAULT_ORG_ID,
    userId: typeof item.userId === "string" ? item.userId : DEFAULT_USER_ID,
    title: String(item.title),
    messages,
    pinned: typeof item.pinned === "boolean" ? item.pinned : false,
    archived: typeof item.archived === "boolean" ? item.archived : false,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
  };
}

// ─── Migration ───

function migrateSnapshot(
  raw: Partial<ConversationsStoreSnapshot> | null,
): ConversationsStoreSnapshot {
  const seed = getSeedSnapshot();
  if (!raw || typeof raw !== "object") return seed;

  const conversationsByUser: Record<string, Conversation[]> = {};

  if (raw.conversationsByUser && typeof raw.conversationsByUser === "object") {
    for (const [userId, conversations] of Object.entries(
      raw.conversationsByUser,
    )) {
      if (Array.isArray(conversations)) {
        conversationsByUser[userId] = conversations
          .map((c) => sanitizeConversation(c))
          .filter((c): c is Conversation => c !== null);
      }
    }
  }

  // Ensure default user has conversations
  if (!conversationsByUser[DEFAULT_USER_ID]) {
    conversationsByUser[DEFAULT_USER_ID] =
      seed.conversationsByUser[DEFAULT_USER_ID] ?? [];
  }

  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : seed.updatedAt,
    conversationsByUser,
  };
}

// ─── Public API ───

export function loadConversationsSnapshot(): ConversationsStoreSnapshot {
  if (typeof window === "undefined") {
    return getSeedSnapshot();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = getSeedSnapshot();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ConversationsStoreSnapshot>;
    const migrated = migrateSnapshot(parsed);
    if ((parsed.schemaVersion ?? 0) !== STORE_SCHEMA_VERSION) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    const seed = getSeedSnapshot();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveConversationsSnapshot(
  snapshot: Omit<ConversationsStoreSnapshot, "schemaVersion" | "updatedAt">,
): ConversationsStoreSnapshot {
  const next: ConversationsStoreSnapshot = {
    schemaVersion: STORE_SCHEMA_VERSION,
    updatedAt: nowIso(),
    conversationsByUser: cloneDeep(snapshot.conversationsByUser),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

export function resetConversationsSnapshot(): ConversationsStoreSnapshot {
  const seed = getSeedSnapshot();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  }
  return seed;
}
