import type { FilterOption, CalendarDate, BreadcrumbItem, MissionItem as DsMissionItem } from "@getbud-co/buds";
import {
  Users,
  CalendarBlank,
  ListBullets,
  User,
  FunnelSimple,
  Tag,
  Eye,
  Target,
  Crosshair,
  GitBranch,
  UsersThree,
  ListChecks,
  Gauge,
  UploadSimple,
  ChartLineUp,
  TrendDown,
  ArrowsInLineHorizontal,
  ChartBar,
} from "@phosphor-icons/react";
import type { KanbanStatus, ConfidenceLevel } from "@/types";
import type { TemplateConfig, ExampleCategory } from "./missionTypes";

/* ——— Filter options ——— */

export const FILTER_OPTIONS: FilterOption[] = [
  { id: "team", label: "Time", icon: Users },
  { id: "period", label: "Período", icon: CalendarBlank },
  { id: "status", label: "Status", icon: FunnelSimple },
  { id: "owner", label: "Responsável", icon: User },
  { id: "itemType", label: "Tipo", icon: ListBullets },
  { id: "indicatorType", label: "Indicador", icon: Crosshair },
  { id: "contribution", label: "Contribuição", icon: GitBranch },
  { id: "supporter", label: "Apoio", icon: UsersThree },
  { id: "taskState", label: "Tarefa", icon: ListChecks },
  { id: "missionStatus", label: "Missão", icon: Target },
];

export const STATUS_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "on-track", label: "Dentro do previsto" },
  { id: "attention", label: "Atenção" },
  { id: "off-track", label: "Atrasado" },
  { id: "completed", label: "Concluído" },
];

export const ITEM_TYPE_OPTIONS = [
  { id: "all", label: "Todos os itens" },
  { id: "mission", label: "Missão" },
  { id: "indicator", label: "Indicador" },
  { id: "task", label: "Tarefa" },
];

export const INDICATOR_TYPE_OPTIONS = [
  { id: "all", label: "Todos os tipos" },
  { id: "reach", label: "Atingir" },
  { id: "above", label: "Manter acima" },
  { id: "below", label: "Manter abaixo" },
  { id: "between", label: "Manter entre" },
  { id: "reduce", label: "Reduzir" },
  { id: "survey", label: "Pesquisa" },
  { id: "external", label: "Fonte externa" },
  { id: "linked_mission", label: "Missão vinculada" },
];

export const CONTRIBUTION_OPTIONS = [
  { id: "all", label: "Todas" },
  { id: "contributing", label: "Contribuindo para outras" },
  { id: "receiving", label: "Recebendo contribuição" },
  { id: "none", label: "Sem contribuição" },
];

export const TASK_STATE_OPTIONS = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendentes" },
  { id: "done", label: "Concluídas" },
];

export const MISSION_STATUS_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "draft", label: "Rascunho" },
  { id: "active", label: "Ativa" },
  { id: "paused", label: "Pausada" },
  { id: "completed", label: "Concluída" },
  { id: "cancelled", label: "Cancelada" },
];

/* ——— Mission templates ——— */

export const MISSION_TEMPLATES = [
  { value: "okr", title: "OKR", description: "Objetivo + Key Results" },
  { value: "pdi", title: "PDI", description: "Plano de Desenvolvimento Individual" },
  { value: "bsc", title: "BSC", description: "Balanced Scorecard — 4 perspectivas" },
  { value: "kpi", title: "KPI", description: "Indicador chave com alvo e frequência" },
  { value: "meta", title: "Meta simples", description: "Título, descrição, alvo e prazo" },
  { value: "scratch", title: "Criar do zero", description: "Monte sua estrutura com campos livres" },
];

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  okr: {
    stepTitle: "Definir objetivo",
    namePlaceholder: "Nome do objetivo",
    descPlaceholder: "Descrição do objetivo",
    addItemLabel: "Adicionar resultado-chave (KR)",
    addItemFormTitle: "Adicionar resultado-chave",
    editItemFormTitle: "Editar resultado-chave",
    itemTitlePlaceholder: "Título do resultado-chave",
    itemDescPlaceholder: "Descrição",
    allowedModes: ["manual", "task", "external"],
  },
  pdi: {
    stepTitle: "Montar plano de desenvolvimento",
    namePlaceholder: "Nome do PDI",
    descPlaceholder: "Descreva o foco de desenvolvimento",
    addItemLabel: "Adicionar ação de desenvolvimento",
    addItemFormTitle: "Adicionar ação de desenvolvimento",
    editItemFormTitle: "Editar ação de desenvolvimento",
    itemTitlePlaceholder: "Título da ação",
    itemDescPlaceholder: "Descrição",
    allowedModes: ["task", "manual"],
  },
  bsc: {
    stepTitle: "Objetivo estratégico BSC",
    namePlaceholder: "Objetivo BSC",
    descPlaceholder: "Descreva onde deseja chegar com o objetivo",
    addItemLabel: "Adicionar indicador",
    addItemFormTitle: "Adicionar indicador",
    editItemFormTitle: "Editar indicador",
    itemTitlePlaceholder: "Título do indicador",
    itemDescPlaceholder: "Descrição",
    allowedModes: ["mission", "manual", "task", "external"],
    tagLabel: "Tag / perspectiva",
  },
  kpi: {
    stepTitle: "Definir KPI",
    namePlaceholder: "Nome do KPI",
    descPlaceholder: "Descrição do indicador",
    addItemLabel: "Adicionar meta do KPI",
    addItemFormTitle: "Adicionar meta",
    editItemFormTitle: "Editar meta",
    itemTitlePlaceholder: "Título da meta",
    itemDescPlaceholder: "Descrição",
    allowedModes: ["manual", "external"],
  },
  meta: {
    stepTitle: "Definir meta",
    namePlaceholder: "Nome da meta",
    descPlaceholder: "Descrição da meta",
    addItemLabel: "Adicionar sub-meta",
    addItemFormTitle: "Adicionar sub-meta",
    editItemFormTitle: "Editar sub-meta",
    itemTitlePlaceholder: "Título da sub-meta",
    itemDescPlaceholder: "Descrição",
    allowedModes: ["manual", "task", "external"],
  },
  scratch: {
    stepTitle: "Construir missão",
    namePlaceholder: "Nome da missão",
    descPlaceholder: "Descrição",
    addItemLabel: "Adicionar item",
    addItemFormTitle: "Adicionar item",
    editItemFormTitle: "Editar item",
    itemTitlePlaceholder: "Título",
    itemDescPlaceholder: "Descrição",
    allowedModes: null,
  },
};

export function getTemplateConfig(template: string | undefined): TemplateConfig {
  const key = template ?? "scratch";
  return TEMPLATE_CONFIGS[key] ?? TEMPLATE_CONFIGS["scratch"]!;
}

export function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Example library organized by department — used as inspiration in the AI Assistant panel.
 * Following the Perdoo model: examples are for reference, not pre-filled templates.
 */
export const EXAMPLE_LIBRARY: Record<string, ExampleCategory[]> = {
  okr: [
    { label: "Produto e Engenharia", examples: [
      { objective: "Melhorar a confiabilidade da plataforma", keyResults: ["Atingir 99,9% de uptime", "Reduzir tempo médio de resposta da API para < 200ms", "Zero incidentes críticos (P0) no trimestre"] },
      { objective: "Acelerar a velocidade de entrega", keyResults: ["Reduzir cycle time de 12 para 5 dias", "Aumentar frequência de deploys para 3x/semana", "100% dos PRs revisados em < 24h"] },
    ]},
    { label: "Marketing", examples: [
      { objective: "Fortalecer a marca no mercado mid-market", keyResults: ["Aumentar tráfego orgânico em 40%", "Gerar 500 MQLs no trimestre", "Publicar 12 artigos de thought leadership"] },
    ]},
    { label: "Vendas", examples: [
      { objective: "Expandir receita no segmento Enterprise", keyResults: ["Fechar 5 contas Enterprise com ACV > R$ 200k", "Aumentar pipeline qualificado em 60%", "Reduzir ciclo médio de venda de 90 para 60 dias"] },
    ]},
    { label: "Customer Success", examples: [
      { objective: "Aumentar a retenção de clientes", keyResults: ["Reduzir churn mensal de 5% para 2,5%", "Aumentar NPS de clientes ativos para 75+", "90% dos clientes com health score verde"] },
    ]},
    { label: "People / RH", examples: [
      { objective: "Construir uma cultura de alta performance", keyResults: ["100% dos colaboradores com OKRs definidos até semana 2", "eNPS > 60", "Reduzir turnover voluntário para < 10% anual"] },
    ]},
  ],
  pdi: [
    { label: "Liderança", examples: [
      { objective: "Desenvolver habilidades de liderança", keyResults: ["Completar curso de Liderança Situacional", "Liderar 3 reuniões como facilitador", "Receber feedback 360° ≥ 4 em liderança"] },
    ]},
    { label: "Comunicação", examples: [
      { objective: "Melhorar comunicação assertiva", keyResults: ["Apresentar em 2 all-hands da empresa", "Participar de mentoria mensal com gestor", "Nota ≥ 4 em comunicação na avaliação de pares"] },
    ]},
    { label: "Técnico", examples: [
      { objective: "Dominar nova stack tecnológica", keyResults: ["Completar certificação AWS Solutions Architect", "Implementar 2 projetos usando a nova stack", "Conduzir 1 tech talk para o time"] },
    ]},
  ],
  bsc: [
    { label: "Balanced Scorecard", examples: [
      { objective: "Perspectiva Financeira — Crescimento sustentável", keyResults: ["Aumentar MRR em 30%", "Reduzir CAC para R$ 800", "Atingir margem EBITDA de 15%"] },
      { objective: "Perspectiva do Cliente — Excelência no atendimento", keyResults: ["NPS ≥ 70 em todas as linhas", "Tempo de resposta ao cliente < 4h", "95% de satisfação no onboarding"] },
      { objective: "Perspectiva de Processos — Eficiência operacional", keyResults: ["Reduzir tempo de deploy para < 30min", "Automatizar 80% dos processos repetitivos", "Zero retrabalho em entregas críticas"] },
      { objective: "Perspectiva de Aprendizado — Desenvolvimento do time", keyResults: ["100% dos líderes com PDI ativo", "40h de capacitação por colaborador/ano", "Implementar programa de mentoria cruzada"] },
    ]},
  ],
  kpi: [
    { label: "Vendas", examples: [
      { objective: "Taxa de conversão do funil", keyResults: ["25% de conversão MQL → SQL", "Tempo de resposta a lead < 2h", "Win rate ≥ 30%"] },
    ]},
    { label: "Produto", examples: [
      { objective: "Engajamento do produto", keyResults: ["DAU/MAU ≥ 40%", "Retenção D30 ≥ 60%", "Tempo médio de sessão > 8min"] },
    ]},
    { label: "Operações", examples: [
      { objective: "Eficiência operacional", keyResults: ["SLA de atendimento cumprido em 95%", "Custo por ticket < R$ 15", "First contact resolution ≥ 70%"] },
    ]},
  ],
  meta: [
    { label: "Projeto", examples: [
      { objective: "Lançar módulo de relatórios customizados", keyResults: ["Design e protótipo validado", "Backend da API desenvolvido e testado", "Beta com 10 clientes piloto"] },
    ]},
    { label: "Processo", examples: [
      { objective: "Implementar processo de code review", keyResults: ["Documentar guidelines de review", "100% dos PRs revisados antes do merge", "Tempo médio de review < 4h"] },
    ]},
  ],
};

/**
 * Parse a key result string to extract manualType, goalValue and goalUnit.
 */
export function parseKeyResultGoal(kr: string): { manualType: string; goalValue: string; goalUnit: string } {
  const defaults = { manualType: "reach", goalValue: "", goalUnit: "" };

  let manualType = "reach";
  if (/reduzir|diminuir/i.test(kr)) manualType = "reduce";
  else if (/manter acima|≥|>=|mínimo/i.test(kr)) manualType = "above";
  else if (/manter abaixo|≤|<=|máximo|< \d/i.test(kr)) manualType = "below";
  else if (/zero /i.test(kr)) manualType = "below";

  const paraMatch = kr.match(/para\s*<?[≤≥]?\s*([\d.,]+)/i);
  const gteMatch = kr.match(/(?:≥|>=)\s*([\d.,]+)/);
  const lteMatch = kr.match(/(?:≤|<=|<)\s*([\d.,]+)/);
  const percentMatch = kr.match(/([\d.,]+)\s*%/);
  const plainNumMatch = kr.match(/\b([\d.,]+)\b/);

  let rawValue = "";
  if (paraMatch?.[1]) rawValue = paraMatch[1];
  else if (gteMatch?.[1]) { rawValue = gteMatch[1]; manualType = "above"; }
  else if (lteMatch?.[1]) { rawValue = lteMatch[1]; manualType = "below"; }
  else if (percentMatch?.[1]) rawValue = percentMatch[1];
  else if (plainNumMatch?.[1]) rawValue = plainNumMatch[1];

  if (/^zero\b/i.test(kr)) rawValue = "0";

  const goalValue = rawValue.replace(",", ".");

  let goalUnit = "";
  if (/%/.test(kr)) goalUnit = "%";
  else if (/R\$/.test(kr)) goalUnit = "R$";
  else if (/US\$/.test(kr)) goalUnit = "US$";
  else if (/\bNPS\b/i.test(kr)) goalUnit = "NPS";
  else if (/\bdias?\b/i.test(kr)) goalUnit = "dias";
  else if (/\bhoras?\b/i.test(kr)) goalUnit = "hrs";
  else if (/\bminutos?\b|\bmin\b/i.test(kr)) goalUnit = "min";
  else if (/\bpontos?\b|\bpts\b/i.test(kr)) goalUnit = "pts";
  else if (/\bpessoas?\b|\bcolaborador/i.test(kr)) goalUnit = "pessoas";
  else if (/\bnota\b/i.test(kr)) goalUnit = "nota-10";
  else if (goalValue) goalUnit = "un";

  if (!goalValue) return { ...defaults, manualType };
  return { manualType, goalValue, goalUnit };
}

export function splitFullName(label: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = label.trim().split(" ");
  return { firstName, lastName: rest.join(" ") };
}

export const CREATE_STEPS: BreadcrumbItem[] = [
  { label: "Escolher template" },
  { label: "Construir missão" },
  { label: "Revisão" },
];

export const MORE_MISSION_OPTIONS = [
  { id: "team-support", label: "Time de apoio", icon: Users },
  { id: "organizers", label: "Tags", icon: Tag },
  { id: "visibility", label: "Quem pode ver", icon: Eye },
];

export const ASSISTANT_MISSIONS: DsMissionItem[] = [
  { id: "okr-1", label: "Reduzir churn do produto de Crédito Imobiliário" },
  { id: "okr-2", label: "Aumentar NPS do onboarding para 75+" },
  { id: "okr-3", label: "Lançar feature Y até final do Q1" },
];

/* ——— Measurement mode options ——— */

export const MEASUREMENT_MODES = [
  { id: "mission", label: "Nova missão", description: "Missão com indicadores dentro", icon: Target },
  { id: "task", label: "Tarefa", description: "Pendente, em andamento e concluída", icon: ListChecks },
  { id: "manual", label: "Indicador manual", description: "Defina meta e acompanhe manualmente", icon: Gauge },
  { id: "external", label: "Importar de fonte externa", description: "Google Sheets, Power BI, etc.", icon: UploadSimple },
];

export const MANUAL_INDICATOR_TYPES = [
  { id: "reach", label: "Atingir", icon: Crosshair },
  { id: "above", label: "Manter acima", icon: ChartLineUp },
  { id: "below", label: "Manter abaixo", icon: TrendDown },
  { id: "between", label: "Manter entre", icon: ArrowsInLineHorizontal },
  { id: "reduce", label: "Reduzir", icon: TrendDown },
  { id: "survey", label: "De uma pesquisa", icon: ChartBar },
];

export function isoToCalendarDate(iso: string): CalendarDate {
  const parts = iso.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  if (!year || !month || !day || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`isoToCalendarDate: invalid ISO date string "${iso}"`);
  }
  return { year, month, day };
}

export const UNIT_OPTIONS = [
  { value: "%", label: "% (Percentual)" },
  { value: "R$", label: "R$ (Reais)" },
  { value: "US$", label: "US$ (Dólar)" },
  { value: "un", label: "Unidades" },
  { value: "pessoas", label: "Pessoas" },
  { value: "pts", label: "Pontos" },
  { value: "NPS", label: "NPS" },
  { value: "nota-10", label: "Nota (1-10)" },
  { value: "nota-5", label: "Nota (1-5)" },
  { value: "dias", label: "Dias" },
  { value: "hrs", label: "Horas" },
  { value: "min", label: "Minutos" },
  { value: "bool", label: "Sim/Não" },
];

export const KANBAN_COLUMNS: { id: KanbanStatus; label: string; color: string }[] = [
  { id: "uncategorized", label: "Não categorizado", color: "var(--color-neutral-400)" },
  { id: "todo", label: "Para fazer", color: "var(--color-caramel-400)" },
  { id: "doing", label: "Fazendo", color: "var(--color-orange-500)" },
  { id: "done", label: "Feito", color: "var(--color-green-500)" },
];

export const CONFIDENCE_OPTIONS: { id: ConfidenceLevel; label: string; description: string; color: string }[] = [
  { id: "high", label: "Alta confiança", description: "Se tudo continuar assim, esperamos alcançar o resultado", color: "var(--color-green-500)" },
  { id: "medium", label: "Média confiança", description: "Existe um risco de não alcançarmos o resultado-chave, mas seguimos otimistas", color: "var(--color-yellow-500)" },
  { id: "low", label: "Baixa confiança", description: "Não vamos alcançar o resultado a não ser que a gente mude nossa abordagem", color: "var(--color-red-500)" },
  { id: "barrier", label: "Com barreira", description: "Existe um fator externo impedindo o progresso desse resultado-chave", color: "var(--color-wine-500)" },
  { id: "deprioritized", label: "Despriorizado", description: "Este resultado-chave foi despriorizado e deixado de lado por enquanto", color: "var(--color-neutral-400)" },
];
