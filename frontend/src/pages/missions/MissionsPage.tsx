import { Fragment, useState, useRef, useEffect, useMemo, type ComponentType, type RefObject } from "react";
import { useSearchParams, useNavigate, useLocation, useParams } from "react-router-dom";
import {
  FilterBar,
  FilterChip,
  FilterDropdown,
  Button,
  Card,
  CardBody,
  CardDivider,
  GoalProgressBar,
  GoalGaugeBar,
  Chart,
  Avatar,
  AvatarGroup,
  Tooltip,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Radio,
  Checkbox,
  DatePicker,
  Breadcrumb,
  ChoiceBoxGroup,
  ChoiceBox,
  AiAssistant,
  AssistantButton,
  Select,
  Badge,
  Alert,
  toast,
} from "@getbud-co/buds";
import type { FilterOption, CalendarDate, BreadcrumbItem, MissionItem as DsMissionItem } from "@getbud-co/buds";
import type { IconProps } from "@phosphor-icons/react";
import {
  Users,
  CalendarBlank,
  ListBullets,
  SquaresFour,
  Kanban,
  Plus,
  ArrowsOutSimple,
  CaretDown,
  CaretUp,
  Info,
  Target,
  User,
  FunnelSimple,
  Trash,
  Warning,
  FloppyDisk,
  ArrowRight,
  UserCircle,
  Calendar,
  DotsThree,
  PlusSquare,
  Tag,
  GitBranch,
  Eye,
  EyeSlash,
  CaretRight,
  MagnifyingGlass,
  Ruler,
  ListChecks,
  Gauge,
  UploadSimple,
  ChartLineUp,
  TrendDown,
  ArrowsInLineHorizontal,
  Crosshair,
  ChartBar,
  X,
  PencilSimple,
  UsersThree,
} from "@phosphor-icons/react";
import { PopoverSelect, formatMultiLabel } from "@/components/PopoverSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { MissionDetailsDrawer } from "./components/MissionDetailsDrawer";
import { useMissionMentions } from "./hooks/useMissionMentions";
import { useMissionContributions } from "./hooks/useMissionContributions";
import {
  findParentMission,
  findIndicatorById,
  findTaskById,
  findTaskInMissions,
  flattenMissions,
} from "./utils/missionTree";
import { buildCheckInChartData, sortCheckInsDesc } from "./utils/checkinReadModels";
import { useSavedViews } from "@/contexts/SavedViewsContext";
import { useMissionsData } from "@/contexts/MissionsDataContext";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { useConfigData } from "@/contexts/ConfigDataContext";
import { useSurveysData } from "@/contexts/SurveysDataContext";
import type { SavedView } from "@/contexts/SavedViewsContext";
import type { Mission, KeyResult, MissionTask, MissionMember, KanbanStatus, ConfidenceLevel, ExternalContribution } from "@/types"; // MissionMember used in buildMissionFromForm
import {
  numVal,
  getGoalLabel,
  formatPeriodRange,
  getOwnerName,
  getOwnerInitials,
  getIndicatorIcon,
} from "@/lib/missions";
import styles from "./MissionsPage.module.css";

/* ——— Filter options ——— */

const FILTER_OPTIONS: FilterOption[] = [
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

const STATUS_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "on-track", label: "Dentro do previsto" },
  { id: "attention", label: "Atenção" },
  { id: "off-track", label: "Atrasado" },
  { id: "completed", label: "Concluído" },
];

const ITEM_TYPE_OPTIONS = [
  { id: "all", label: "Todos os itens" },
  { id: "mission", label: "Missão" },
  { id: "indicator", label: "Indicador" },
  { id: "task", label: "Tarefa" },
];

const INDICATOR_TYPE_OPTIONS = [
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

const CONTRIBUTION_OPTIONS = [
  { id: "all", label: "Todas" },
  { id: "contributing", label: "Contribuindo para outras" },
  { id: "receiving", label: "Recebendo contribuição" },
  { id: "none", label: "Sem contribuição" },
];

const TASK_STATE_OPTIONS = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendentes" },
  { id: "done", label: "Concluídas" },
];

const MISSION_STATUS_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "draft", label: "Rascunho" },
  { id: "active", label: "Ativa" },
  { id: "paused", label: "Pausada" },
  { id: "completed", label: "Concluída" },
  { id: "cancelled", label: "Cancelada" },
];

/* ——— Mission templates ——— */

const MISSION_TEMPLATES = [
  { value: "okr", title: "OKR", description: "Objetivo + Key Results" },
  { value: "pdi", title: "PDI", description: "Plano de Desenvolvimento Individual" },
  { value: "bsc", title: "BSC", description: "Balanced Scorecard — 4 perspectivas" },
  { value: "kpi", title: "KPI", description: "Indicador chave com alvo e frequência" },
  { value: "meta", title: "Meta simples", description: "Título, descrição, alvo e prazo" },
  { value: "scratch", title: "Criar do zero", description: "Monte sua estrutura com campos livres" },
];

interface TemplateConfig {
  stepTitle: string;
  namePlaceholder: string;
  descPlaceholder: string;
  addItemLabel: string;
  addItemFormTitle: string;
  editItemFormTitle: string;
  itemTitlePlaceholder: string;
  itemDescPlaceholder: string;
  /** Which measurement modes to show; null = show all */
  allowedModes: string[] | null;
  /** Override label for "Tags" in more options menu */
  tagLabel?: string;
}

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

function getTemplateConfig(template: string | undefined): TemplateConfig {
  const key = template ?? "scratch";
  return TEMPLATE_CONFIGS[key] ?? TEMPLATE_CONFIGS["scratch"] as TemplateConfig;
}

function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Example library organized by department — used as inspiration in the AI Assistant panel.
 * Following the Perdoo model: examples are for reference, not pre-filled templates.
 */
interface ExampleEntry {
  objective: string;
  keyResults: string[];
}

interface ExampleCategory {
  label: string;
  examples: ExampleEntry[];
}

const EXAMPLE_LIBRARY: Record<string, ExampleCategory[]> = {
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
 * E.g. "Reduzir churn mensal de 5% para 2,5%" → { manualType: "reduce", goalValue: "2.5", goalUnit: "%" }
 *      "NPS ≥ 70"                             → { manualType: "above", goalValue: "70", goalUnit: "NPS" }
 */
function parseKeyResultGoal(kr: string): { manualType: string; goalValue: string; goalUnit: string } {
  const defaults = { manualType: "reach", goalValue: "", goalUnit: "" };
  const lower = kr.toLowerCase();

  // Detect manualType from keywords
  let manualType = "reach";
  if (/reduzir|diminuir/i.test(kr)) manualType = "reduce";
  else if (/manter acima|≥|>=|mínimo/i.test(kr)) manualType = "above";
  else if (/manter abaixo|≤|<=|máximo|< \d/i.test(kr)) manualType = "below";
  else if (/zero /i.test(kr)) manualType = "below";

  // Try to find numeric target — prefer the last number in "para X" or "para < X" patterns
  const paraMatch = kr.match(/para\s*<?[≤≥]?\s*([\d.,]+)/i);
  const gteMatch = kr.match(/[≥>=]\s*([\d.,]+)/);
  const lteMatch = kr.match(/[≤<=<]\s*([\d.,]+)/);
  const percentMatch = kr.match(/([\d.,]+)\s*%/);
  const plainNumMatch = kr.match(/\b([\d.,]+)\b/);

  let rawValue = "";
  if (paraMatch) rawValue = paraMatch[1];
  else if (gteMatch) { rawValue = gteMatch[1]; manualType = "above"; }
  else if (lteMatch) { rawValue = lteMatch[1]; manualType = "below"; }
  else if (percentMatch) rawValue = percentMatch[1];
  else if (plainNumMatch) rawValue = plainNumMatch[1];

  if (/^zero\b/i.test(kr)) rawValue = "0";

  // Normalize comma decimal
  const goalValue = rawValue.replace(",", ".");

  // Detect unit
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

  if (!goalValue) return defaults;
  return { manualType, goalValue, goalUnit };
}

function splitFullName(label: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = label.trim().split(" ");
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

const CREATE_STEPS: BreadcrumbItem[] = [
  { label: "Escolher template" },
  { label: "Construir missão" },
  { label: "Revisão" },
];

const MORE_MISSION_OPTIONS = [
  { id: "team-support", label: "Time de apoio", icon: Users },
  { id: "organizers", label: "Tags", icon: Tag },
  { id: "visibility", label: "Quem pode ver", icon: Eye },
];

// visibilityOptions is now generated dynamically inside MissionsPage using teamOptions

const ASSISTANT_MISSIONS: DsMissionItem[] = [
  { id: "okr-1", label: "Reduzir churn do produto de Crédito Imobiliário" },
  { id: "okr-2", label: "Aumentar NPS do onboarding para 75+" },
  { id: "okr-3", label: "Lançar feature Y até final do Q1" },
];

/* ——— Measurement mode options ——— */

const MEASUREMENT_MODES = [
  { id: "mission", label: "Nova missão", description: "Missão com indicadores dentro", icon: Target },
  { id: "task", label: "Tarefa", description: "Pendente, em andamento e concluída", icon: ListChecks },
  { id: "manual", label: "Indicador manual", description: "Defina meta e acompanhe manualmente", icon: Gauge },
  { id: "external", label: "Importar de fonte externa", description: "Google Sheets, Power BI, etc.", icon: UploadSimple },
];

const MANUAL_INDICATOR_TYPES = [
  { id: "reach", label: "Atingir", icon: Crosshair },
  { id: "above", label: "Manter acima", icon: ChartLineUp },
  { id: "below", label: "Manter abaixo", icon: TrendDown },
  { id: "between", label: "Manter entre", icon: ArrowsInLineHorizontal },
  { id: "reduce", label: "Reduzir", icon: TrendDown },
  { id: "survey", label: "De uma pesquisa", icon: ChartBar },
];

function isoToCalendarDate(iso: string): CalendarDate {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return { year, month, day };
}

const UNIT_OPTIONS = [
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

interface MissionItemData {
  id: string;
  name: string;
  description: string;
  measurementMode: string | null;
  manualType: string | null;
  surveyId: string | null;
  period: [CalendarDate | null, CalendarDate | null];
  goalValue: string;
  goalValueMin: string;
  goalValueMax: string;
  goalUnit: string;
  /** Override owner — null means inherit from parent mission */
  ownerId: string | null;
  /** Override team — null means inherit from parent mission */
  teamId: string | null;
  children?: MissionItemData[];
}

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; color: string }[] = [
  { id: "uncategorized", label: "Não categorizado", color: "var(--color-neutral-400)" },
  { id: "todo", label: "Para fazer", color: "var(--color-caramel-400)" },
  { id: "doing", label: "Fazendo", color: "var(--color-orange-500)" },
  { id: "done", label: "Feito", color: "var(--color-green-500)" },
];

/* (Mock data and types imported from @/types and @/lib/missions) */

const CONFIDENCE_OPTIONS: { id: ConfidenceLevel; label: string; description: string; color: string }[] = [
  { id: "high", label: "Alta confiança", description: "Se tudo continuar assim, esperamos alcançar o resultado", color: "var(--color-green-500)" },
  { id: "medium", label: "Média confiança", description: "Existe um risco de não alcançarmos o resultado-chave, mas seguimos otimistas", color: "var(--color-yellow-500)" },
  { id: "low", label: "Baixa confiança", description: "Não vamos alcançar o resultado a não ser que a gente mude nossa abordagem", color: "var(--color-red-500)" },
  { id: "barrier", label: "Com barreira", description: "Existe um fator externo impedindo o progresso desse resultado-chave", color: "var(--color-wine-500)" },
  { id: "deprioritized", label: "Despriorizado", description: "Este resultado-chave foi despriorizado e deixado de lado por enquanto", color: "var(--color-neutral-400)" },
];

/* ——— Mission item (recursive) ——— */

interface CheckinPayload {
  keyResult: KeyResult;
  currentValue: number;
  newValue: number;
}

interface MissionItemProps {
  mission: Mission;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onExpand: (mission: Mission) => void;
  onEdit: (mission: Mission) => void;
  onDelete?: (mission: Mission) => void;
  onCheckin?: (payload: CheckinPayload) => void;
  onToggleTask?: (taskId: string) => void;
  onOpenTaskDrawer?: (task: MissionTask, parentLabel: string) => void;
  expandedMissions: Set<string>;
  depth?: number;
  isLast?: boolean;
  isChild?: boolean;
  hideExpand?: boolean;
  /* row menu (⋯) for indicators and tasks */
  openRowMenu?: string | null;
  setOpenRowMenu?: (id: string | null) => void;
  openContributeFor?: string | null;
  setOpenContributeFor?: (id: string | null) => void;
  contributePickerSearch?: string;
  setContributePickerSearch?: (s: string) => void;
  rowMenuBtnRefs?: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  allMissions?: { id: string; title: string }[];
  onAddContribution?: (item: KeyResult | MissionTask, itemType: "indicator" | "task", sourceMissionId: string, sourceMissionTitle: string, targetMissionId: string, targetMissionTitle: string) => void;
  onRemoveContribution?: (itemId: string, itemType: "indicator" | "task", targetMissionId: string, targetMissionTitle: string) => void;
  onOpenExternalContrib?: (ec: ExternalContribution) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
}

function MissionItem({
  mission,
  isOpen,
  onToggle,
  onExpand,
  onEdit,
  onDelete,
  onCheckin,
  onToggleTask,
  onOpenTaskDrawer,
  expandedMissions,
  isChild = false,
  isLast = false,
  hideExpand = false,
  openRowMenu = null,
  setOpenRowMenu,
  openContributeFor = null,
  setOpenContributeFor,
  contributePickerSearch = "",
  setContributePickerSearch,
  rowMenuBtnRefs,
  allMissions = [],
  onAddContribution,
  onRemoveContribution,
  onOpenExternalContrib,
  onToggleSubtask,
}: MissionItemProps) {
  const missionItemNavigate = useNavigate();
  const [indicatorValues, setIndicatorValues] = useState<Record<string, number>>({});
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set());
  const dragRef = useRef<{ keyResult: KeyResult; value: number } | null>(null);

  function getIndicatorValue(kr: KeyResult) {
    return indicatorValues[kr.id] ?? kr.progress;
  }

  function handleIndicatorDrag(kr: KeyResult, newValue: number) {
    dragRef.current = { keyResult: kr, value: newValue };
    setIndicatorValues((prev) => ({ ...prev, [kr.id]: newValue }));
  }

  useEffect(() => {
    if (!onCheckin) return;
    function onPointerUp() {
      if (!dragRef.current) return;
      const { keyResult, value } = dragRef.current;
      dragRef.current = null;
      // Reset bar to original value
      setIndicatorValues((prev) => {
        const next = { ...prev };
        delete next[keyResult.id];
        return next;
      });
      requestAnimationFrame(() => {
        onCheckin!({ keyResult, currentValue: keyResult.progress, newValue: value });
      });
    }
    document.addEventListener("pointerup", onPointerUp);
    return () => document.removeEventListener("pointerup", onPointerUp);
  }, [onCheckin]);

  function handleIndicatorClick(kr: KeyResult) {
    if (onCheckin) {
      onCheckin({ keyResult: kr, currentValue: getIndicatorValue(kr), newValue: getIndicatorValue(kr) });
    }
  }

  const keyResults = mission.keyResults ?? [];
  const rs = mission.restrictedSummary;
  const hasRestricted = rs != null && (rs.keyResults > 0 || rs.tasks > 0 || rs.children > 0);
  const extContribs = mission.externalContributions ?? [];
  const hasContent = keyResults.length > 0 || (mission.tasks?.length ?? 0) > 0 || (mission.children?.length ?? 0) > 0 || hasRestricted || extContribs.length > 0;
  const items: { type: "indicator" | "task" | "mission"; data: KeyResult | MissionTask | Mission }[] = [
    ...keyResults.map((kr) => ({ type: "indicator" as const, data: kr })),
    ...(mission.tasks ?? []).map((task) => ({ type: "task" as const, data: task })),
    ...(mission.children ?? []).map((child) => ({ type: "mission" as const, data: child })),
  ];

  const cardClasses = [
    styles.missionCard,
    mission.status === "draft" ? styles.missionCardDraft : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${isChild ? styles.childMissionWrapper : ""} ${isChild && isLast ? styles.childMissionWrapperLast : ""}`}>
      <Card
        padding="sm"
        className={cardClasses}
        onClick={() => hasContent && onToggle(mission.id)}
        role={hasContent ? "button" : undefined}
        tabIndex={hasContent ? 0 : undefined}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (hasContent && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onToggle(mission.id);
          }
        }}
      >
        <CardBody>
          <div className={styles.missionRow}>
            <Chart value={mission.progress} size={40} />
            <span className={styles.missionTitleText}>{mission.title}</span>
            {mission.status === "draft" && <Badge color="caramel">Rascunho</Badge>}
            <div className={styles.missionActions}>
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={PencilSimple}
                aria-label="Editar missão"
                className={styles.missionEditBtn}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onEdit(mission);
                }}
              />
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={Trash}
                aria-label="Excluir missão"
                className={styles.missionEditBtn}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete?.(mission);
                }}
              />
              {!hideExpand && (
                <Button
                  variant="tertiary"
                  size="sm"
                  leftIcon={ArrowsOutSimple}
                  aria-label="Expandir missão"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onExpand(mission);
                  }}
                />
              )}
            </div>
            {hasContent && (
              <span className={styles.missionToggleIcon}>
                {isOpen ? <CaretUp size={20} /> : <CaretDown size={20} />}
              </span>
            )}
          </div>

          <div className={`${styles.indicatorCollapse} ${isOpen ? styles.indicatorCollapseOpen : ""}`}>
            <div className={styles.indicatorTree}>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div className={styles.indicatorList} onClick={(e) => e.stopPropagation()}>
                {items.map((item, idx) => {
                  const itemIsLast = idx === items.length - 1;

                  if (item.type === "indicator") {
                    const kr = item.data as KeyResult;
                    const Icon = getIndicatorIcon(kr);
                    const hasIndChildren = (kr.tasks?.length ?? 0) > 0;
                    const isIndExpanded = expandedIndicators.has(kr.id);
                    return (
                      <div key={kr.id} className={styles.indicatorWrapper}>
                        <div
                          className={`${styles.indicatorRow} ${itemIsLast ? styles.indicatorRowLast : ""} ${onCheckin ? styles.indicatorRowClickable : ""} ${hasIndChildren ? styles.indicatorRowWithBadge : ""}`}
                          onClick={() => handleIndicatorClick(kr)}
                          role={onCheckin ? "button" : undefined}
                          tabIndex={onCheckin ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (onCheckin && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              handleIndicatorClick(kr);
                            }
                          }}
                        >
                          {hasIndChildren && (
                            <div className={styles.indicatorBadgeRow}>
                              <Badge color="neutral">
                                {kr.tasks?.length ?? 0} {(kr.tasks?.length ?? 0) === 1 ? "tarefa" : "tarefas"}
                              </Badge>
                            </div>
                          )}
                          <div className={styles.indicatorTitle}>
                            {hasIndChildren && (
                              <button
                                type="button"
                                className={styles.indicatorExpandBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedIndicators((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(kr.id)) next.delete(kr.id);
                                    else next.add(kr.id);
                                    return next;
                                  });
                                }}
                                aria-label={isIndExpanded ? "Recolher" : "Expandir"}
                              >
                                {isIndExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                              </button>
                            )}
                            <Icon size={24} className={styles.indicatorIcon} />
                            <span className={styles.indicatorName}>{kr.title}</span>
                          </div>
                          <div className={styles.indicatorDetails}>
                            <div className={styles.indicatorPeriod}>
                              <span className={styles.periodBold}>{kr.periodLabel ?? ""}</span>
                              <span className={styles.periodRange}>{formatPeriodRange(kr.periodStart, kr.periodEnd)}</span>
                            </div>
                            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                            <div className={styles.indicatorProgress} onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const val = getIndicatorValue(kr);
                                return kr.goalType === "reach" ? (
                                  <GoalProgressBar
                                    label={getGoalLabel(kr)}
                                    value={val}
                                    target={numVal(kr.targetValue)}
                                    expected={numVal(kr.expectedValue)}
                                    formattedValue={`${val}%`}
                                    onChange={(v: number) => handleIndicatorDrag(kr, v)}
                                  />
                                ) : (
                                  <GoalGaugeBar
                                    label={getGoalLabel(kr)}
                                    value={val}
                                    goalType={kr.goalType as "above" | "below" | "between"}
                                    low={numVal(kr.lowThreshold)}
                                    high={numVal(kr.highThreshold)}
                                    min={0}
                                    max={100}
                                    formattedValue={String(val)}
                                    onChange={(v: number) => handleIndicatorDrag(kr, v)}
                                  />
                                );
                              })()}
                            </div>
                            <div className={styles.indicatorRowActions}>
                              <Avatar initials={getOwnerInitials(kr.owner)} size="sm" />
                              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                              <div className={styles.indicatorRowMenu} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                <Button
                                  ref={(el: HTMLButtonElement | null) => { if (rowMenuBtnRefs) rowMenuBtnRefs.current[kr.id] = el; }}
                                  variant="tertiary"
                                  size="sm"
                                  leftIcon={DotsThree}
                                  aria-label="Mais ações"
                                  onClick={() => {
                                    setOpenRowMenu?.(openRowMenu === kr.id ? null : kr.id);
                                    setOpenContributeFor?.(null);
                                  }}
                                />
                                <FilterDropdown
                                  open={openRowMenu === kr.id && openContributeFor !== kr.id}
                                  onClose={() => setOpenRowMenu?.(null)}
                                  anchorRef={{ current: rowMenuBtnRefs?.current[kr.id] ?? null }}
                                  noOverlay
                                >
                                  <div className={styles.filterDropdownBody}>
                                    <button
                                      type="button"
                                      className={styles.filterDropdownItem}
                                      onClick={() => { setOpenContributeFor?.(kr.id); setContributePickerSearch?.(""); }}
                                    >
                                      <GitBranch size={14} />
                                      <span>Contribui para...</span>
                                    </button>
                                    {(kr.contributesTo?.length ?? 0) > 0 && (
                                      <>
                                        <div className={styles.filterDropdownSeparator} />
                                        {kr.contributesTo!.map((ct) => (
                                          <button
                                            key={ct.missionId}
                                            type="button"
                                            className={`${styles.filterDropdownItem} ${styles.filterDropdownItemDanger}`}
                                            onClick={() => onRemoveContribution?.(kr.id, "indicator", ct.missionId, ct.missionTitle)}
                                          >
                                            <X size={14} />
                                            <span className={styles.contributeMissionLabel} title={`Desconectar de ${ct.missionTitle}`}>Desconectar de {ct.missionTitle}</span>
                                          </button>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                </FilterDropdown>
                                <FilterDropdown
                                  open={openContributeFor === kr.id}
                                  onClose={() => { setOpenContributeFor?.(null); setOpenRowMenu?.(null); }}
                                  anchorRef={{ current: rowMenuBtnRefs?.current[kr.id] ?? null }}
                                  noOverlay
                                >
                                  <div className={styles.filterDropdownBody}>
                                    <div className={styles.searchRow}>
                                      <MagnifyingGlass size={14} className={styles.searchIcon} />
                                      <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder="Buscar missão..."
                                        value={contributePickerSearch}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContributePickerSearch?.(e.target.value)}
                                      />
                                    </div>
                                    {allMissions
                                      .filter((m) => m.id !== mission.id)
                                      .filter((m) => !kr.contributesTo?.some((c) => c.missionId === m.id))
                                      .filter((m) => m.title.toLowerCase().includes(contributePickerSearch.toLowerCase()))
                                      .map((m) => (
                                        <button
                                          key={m.id}
                                          type="button"
                                          className={styles.filterDropdownItem}
                                          onClick={() => onAddContribution?.(kr, "indicator", mission.id, mission.title, m.id, m.title)}
                                        >
                                          <Target size={14} />
                                          <span className={styles.contributeMissionLabel} title={m.title}>{m.title}</span>
                                        </button>
                                      ))}
                                  </div>
                                </FilterDropdown>
                              </div>
                            </div>
                          </div>
                        </div>
                        {hasIndChildren && isIndExpanded && (
                          <div className={styles.indicatorChildren}>
                            {kr.tasks?.map((task) => {
                              return (
                              <Fragment key={task.id}>
                              <div className={`${styles.indicatorRow} ${styles.indicatorRowNested}`} style={{ cursor: "pointer" }} onClick={() => onOpenTaskDrawer?.(task, `${mission.title} › ${kr.title}`)}>
                                <div className={styles.indicatorTitle}>
                                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                                  <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={task.isDone}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { e.stopPropagation(); onToggleTask?.(task.id); }}
                                    />
                                  </div>
                                  <span className={`${styles.indicatorName} ${task.isDone ? styles.taskNameDone : ""}`}>{task.title}</span>
                                </div>
                                <div className={styles.indicatorDetails}>
                                  <Badge color={task.isDone ? "success" : "neutral"}>
                                    {task.isDone ? "Concluída" : "Pendente"}
                                  </Badge>
                                  <div className={styles.taskRowActions}>
                                    <Avatar initials={getOwnerInitials(task.owner)} size="sm" />
                                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                                    <div className={styles.taskRowMenu} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                      <Button
                                        ref={(el: HTMLButtonElement | null) => { if (rowMenuBtnRefs) rowMenuBtnRefs.current[task.id] = el; }}
                                        variant="tertiary"
                                        size="sm"
                                        leftIcon={DotsThree}
                                        aria-label="Mais ações"
                                        onClick={() => {
                                          setOpenRowMenu?.(openRowMenu === task.id ? null : task.id);
                                          setOpenContributeFor?.(null);
                                        }}
                                      />
                                      <FilterDropdown
                                        open={openRowMenu === task.id && openContributeFor !== task.id}
                                        onClose={() => setOpenRowMenu?.(null)}
                                        anchorRef={{ current: rowMenuBtnRefs?.current[task.id] ?? null }}
                                        noOverlay
                                      >
                                        <div className={styles.filterDropdownBody}>
                                          <button
                                            type="button"
                                            className={styles.filterDropdownItem}
                                            onClick={() => { setOpenContributeFor?.(task.id); setContributePickerSearch?.(""); }}
                                          >
                                            <GitBranch size={14} />
                                            <span>Contribui para...</span>
                                          </button>
                                          {(task.contributesTo?.length ?? 0) > 0 && (
                                            <>
                                              <div className={styles.filterDropdownSeparator} />
                                              {task.contributesTo!.map((ct) => (
                                                <button
                                                  key={ct.missionId}
                                                  type="button"
                                                  className={`${styles.filterDropdownItem} ${styles.filterDropdownItemDanger}`}
                                                  onClick={() => onRemoveContribution?.(task.id, "task", ct.missionId, ct.missionTitle)}
                                                >
                                                  <X size={14} />
                                                  <span className={styles.contributeMissionLabel} title={`Desconectar de ${ct.missionTitle}`}>Desconectar de {ct.missionTitle}</span>
                                                </button>
                                              ))}
                                            </>
                                          )}
                                        </div>
                                      </FilterDropdown>
                                      <FilterDropdown
                                        open={openContributeFor === task.id}
                                        onClose={() => { setOpenContributeFor?.(null); setOpenRowMenu?.(null); }}
                                        anchorRef={{ current: rowMenuBtnRefs?.current[task.id] ?? null }}
                                        noOverlay
                                      >
                                        <div className={styles.filterDropdownBody}>
                                          <div className={styles.searchRow}>
                                            <MagnifyingGlass size={14} className={styles.searchIcon} />
                                            <input
                                              type="text"
                                              className={styles.searchInput}
                                              placeholder="Buscar missão..."
                                              value={contributePickerSearch}
                                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContributePickerSearch?.(e.target.value)}
                                            />
                                          </div>
                                          {allMissions
                                            .filter((m) => m.id !== mission.id)
                                            .filter((m) => !task.contributesTo?.some((c) => c.missionId === m.id))
                                            .filter((m) => m.title.toLowerCase().includes(contributePickerSearch.toLowerCase()))
                                            .map((m) => (
                                              <button
                                                key={m.id}
                                                type="button"
                                                className={styles.filterDropdownItem}
                                                onClick={() => onAddContribution?.(task, "task", mission.id, mission.title, m.id, m.title)}
                                              >
                                                <Target size={14} />
                                                <span>{m.title}</span>
                                              </button>
                                            ))}
                                        </div>
                                      </FilterDropdown>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              </Fragment>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (item.type === "task") {
                    const task = item.data as MissionTask;
                    return (
                      <Fragment key={task.id}>
                      <div
                        className={`${styles.indicatorRow} ${itemIsLast ? styles.indicatorRowLast : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => onOpenTaskDrawer?.(task, mission.title)}
                      >
                        <div className={styles.indicatorTitle}>
                          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={task.isDone}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { e.stopPropagation(); onToggleTask?.(task.id); }}
                            />
                          </div>
                          <span className={`${styles.indicatorName} ${task.isDone ? styles.taskNameDone : ""}`}>{task.title}</span>
                        </div>
                        <div className={styles.indicatorDetails}>
                          <Badge color={task.isDone ? "success" : "neutral"}>
                            {task.isDone ? "Concluída" : "Pendente"}
                          </Badge>
                          <div className={styles.taskRowActions}>
                            <Avatar initials={getOwnerInitials(task.owner)} size="sm" />
                            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                            <div className={styles.taskRowMenu} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                              <Button
                                ref={(el: HTMLButtonElement | null) => { if (rowMenuBtnRefs) rowMenuBtnRefs.current[task.id] = el; }}
                                variant="tertiary"
                                size="sm"
                                leftIcon={DotsThree}
                                aria-label="Mais ações"
                                onClick={() => {
                                  setOpenRowMenu?.(openRowMenu === task.id ? null : task.id);
                                  setOpenContributeFor?.(null);
                                }}
                              />
                              <FilterDropdown
                                open={openRowMenu === task.id && openContributeFor !== task.id}
                                onClose={() => setOpenRowMenu?.(null)}
                                anchorRef={{ current: rowMenuBtnRefs?.current[task.id] ?? null }}
                                noOverlay
                              >
                                <div className={styles.filterDropdownBody}>
                                  <button
                                    type="button"
                                    className={styles.filterDropdownItem}
                                    onClick={() => { setOpenContributeFor?.(task.id); setContributePickerSearch?.(""); }}
                                  >
                                    <GitBranch size={14} />
                                    <span>Contribui para...</span>
                                  </button>
                                  {(task.contributesTo?.length ?? 0) > 0 && (
                                    <>
                                      <div className={styles.filterDropdownSeparator} />
                                      {task.contributesTo!.map((ct) => (
                                        <button
                                          key={ct.missionId}
                                          type="button"
                                          className={`${styles.filterDropdownItem} ${styles.filterDropdownItemDanger}`}
                                          onClick={() => onRemoveContribution?.(task.id, "task", ct.missionId, ct.missionTitle)}
                                        >
                                          <X size={14} />
                                          <span className={styles.contributeMissionLabel} title={`Desconectar de ${ct.missionTitle}`}>Desconectar de {ct.missionTitle}</span>
                                        </button>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </FilterDropdown>
                              <FilterDropdown
                                open={openContributeFor === task.id}
                                onClose={() => { setOpenContributeFor?.(null); setOpenRowMenu?.(null); }}
                                anchorRef={{ current: rowMenuBtnRefs?.current[task.id] ?? null }}
                                noOverlay
                              >
                                <div className={styles.filterDropdownBody}>
                                  <div className={styles.searchRow}>
                                    <MagnifyingGlass size={14} className={styles.searchIcon} />
                                    <input
                                      type="text"
                                      className={styles.searchInput}
                                      placeholder="Buscar missão..."
                                      value={contributePickerSearch}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContributePickerSearch?.(e.target.value)}
                                    />
                                  </div>
                                  {allMissions
                                    .filter((m) => m.id !== mission.id)
                                    .filter((m) => !task.contributesTo?.some((c) => c.missionId === m.id))
                                    .filter((m) => m.title.toLowerCase().includes(contributePickerSearch.toLowerCase()))
                                    .map((m) => (
                                      <button
                                        key={m.id}
                                        type="button"
                                        className={styles.filterDropdownItem}
                                        onClick={() => onAddContribution?.(task, "task", mission.id, mission.title, m.id, m.title)}
                                      >
                                        <Target size={14} />
                                        <span>{m.title}</span>
                                      </button>
                                    ))}
                                </div>
                              </FilterDropdown>
                            </div>
                          </div>
                        </div>
                      </div>
                      </Fragment>
                    );
                  }

                  const child = item.data as Mission;
                  return (
                    <MissionItem
                      key={child.id}
                      mission={child}
                      isOpen={expandedMissions.has(child.id)}
                      onToggle={onToggle}
                      onExpand={onExpand}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onCheckin={onCheckin}
                      onToggleTask={onToggleTask}
                      onOpenTaskDrawer={onOpenTaskDrawer}
                      expandedMissions={expandedMissions}
                      isChild
                      isLast={itemIsLast}
                      openRowMenu={openRowMenu}
                      setOpenRowMenu={setOpenRowMenu}
                      openContributeFor={openContributeFor}
                      setOpenContributeFor={setOpenContributeFor}
                      contributePickerSearch={contributePickerSearch}
                      setContributePickerSearch={setContributePickerSearch}
                      rowMenuBtnRefs={rowMenuBtnRefs}
                      allMissions={allMissions}
                      onAddContribution={onAddContribution}
                      onRemoveContribution={onRemoveContribution}
                      onOpenExternalContrib={onOpenExternalContrib}
                      onToggleSubtask={onToggleSubtask}
                    />
                  );
                })}
                {extContribs.length > 0 && (
                  <>
                    <div className={styles.externalSectionHeader}>
                      <GitBranch size={14} />
                      <span>Contribuições externas</span>
                      <Badge color="neutral" size="sm">{extContribs.length}</Badge>
                    </div>
                    {extContribs.map((ec: ExternalContribution) => (
                      <div
                        key={ec.id}
                        className={`${styles.externalRow} ${styles.indicatorRowClickable}`}
                        onClick={() => onOpenExternalContrib?.(ec)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") onOpenExternalContrib?.(ec); }}
                      >
                        <div className={styles.externalRowContent}>
                          <div className={styles.externalRowMain}>
                            {ec.type === "indicator" ? <Gauge size={16} /> : <ListChecks size={16} />}
                            <span className={styles.externalRowTitle}>{ec.title}</span>
                            {ec.type === "indicator" && ec.status && (
                              <Badge
                                color={ec.status === "on_track" ? "success" : ec.status === "attention" ? "warning" : ec.status === "off_track" ? "error" : "neutral"}
                                size="sm"
                              >
                                {ec.status === "on_track" ? "No ritmo" : ec.status === "attention" ? "Atenção" : ec.status === "off_track" ? "Atrasado" : "Concluído"}
                              </Badge>
                            )}
                            {ec.type === "task" && (
                              <Badge color={ec.isDone ? "success" : "neutral"} size="sm">
                                {ec.isDone ? "Concluída" : "Pendente"}
                              </Badge>
                            )}
                            {ec.type === "indicator" && ec.progress != null && (
                              <span className={styles.externalRowProgress}>{ec.progress}%</span>
                            )}
                          </div>
                          <div className={styles.externalRowSource}>
                            <Target size={12} />
                            <span
                              className={styles.externalSourceLink}
                              onClick={(e) => { e.stopPropagation(); missionItemNavigate(`/missions/${ec.sourceMission.id}`); }}
                              role="link"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); missionItemNavigate(`/missions/${ec.sourceMission.id}`); } }}
                            >
                              de {ec.sourceMission.title}
                            </span>
                          </div>
                        </div>
                        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="tertiary"
                            size="sm"
                            leftIcon={X}
                            aria-label="Remover contribuição"
                            onClick={() => onRemoveContribution?.(ec.id, ec.type, mission.id, mission.title)}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {hasRestricted && (() => {
                  const parts: string[] = [];
                  if (rs!.keyResults > 0) parts.push(`${rs!.keyResults} indicador${rs!.keyResults > 1 ? "es" : ""}`);
                  if (rs!.tasks > 0) parts.push(`${rs!.tasks} tarefa${rs!.tasks > 1 ? "s" : ""}`);
                  if (rs!.children > 0) parts.push(`${rs!.children} sub-miss${rs!.children > 1 ? "ões" : "ão"}`);
                  const joined = parts.length > 1
                    ? parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1]
                    : parts[0];
                  return (
                    <div className={styles.restrictedBanner}>
                      <EyeSlash size={16} weight="regular" />
                      <span>{joined} oculto{(rs!.keyResults + rs!.tasks + rs!.children) > 1 ? "s" : ""} contribuem para o progresso desta missão</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ——— Modal mission content (reuses MissionItem with own state) ——— */

function collectMissionIds(mission: Mission): string[] {
  const ids = [mission.id];
  for (const child of mission.children ?? []) {
    ids.push(...collectMissionIds(child));
  }
  return ids;
}

function ModalMissionContent({
  mission,
  onExpand,
  onEdit,
  onDelete,
  onCheckin,
  onToggleTask,
  onOpenTaskDrawer,
  onAddContribution,
  onRemoveContribution,
  onOpenExternalContrib,
  onToggleSubtask,
  allMissions = [],
}: {
  mission: Mission;
  onExpand: (mission: Mission) => void;
  onEdit: (mission: Mission) => void;
  onDelete?: (mission: Mission) => void;
  onCheckin?: (payload: CheckinPayload) => void;
  onToggleTask?: (taskId: string) => void;
  onOpenTaskDrawer?: (task: MissionTask, parentLabel: string) => void;
  onAddContribution?: MissionItemProps["onAddContribution"];
  onRemoveContribution?: MissionItemProps["onRemoveContribution"];
  onOpenExternalContrib?: MissionItemProps["onOpenExternalContrib"];
  onToggleSubtask?: MissionItemProps["onToggleSubtask"];
  allMissions?: { id: string; title: string }[];
}) {
  const [modalExpanded, setModalExpanded] = useState<Set<string>>(
    () => new Set(collectMissionIds(mission)),
  );
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [openContributeFor, setOpenContributeFor] = useState<string | null>(null);
  const [contributePickerSearch, setContributePickerSearch] = useState("");
  const rowMenuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function toggleModal(id: string) {
    setModalExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <MissionItem
      mission={mission}
      isOpen={modalExpanded.has(mission.id)}
      onToggle={toggleModal}
      onExpand={onExpand}
      onEdit={onEdit}
      onDelete={onDelete}
      onCheckin={onCheckin}
      onToggleTask={onToggleTask}
      onOpenTaskDrawer={onOpenTaskDrawer}
      expandedMissions={modalExpanded}
      hideExpand
      openRowMenu={openRowMenu}
      setOpenRowMenu={setOpenRowMenu}
      openContributeFor={openContributeFor}
      setOpenContributeFor={setOpenContributeFor}
      contributePickerSearch={contributePickerSearch}
      setContributePickerSearch={setContributePickerSearch}
      rowMenuBtnRefs={rowMenuBtnRefs}
      allMissions={allMissions}
      onAddContribution={onAddContribution}
      onRemoveContribution={onRemoveContribution}
      onOpenExternalContrib={onOpenExternalContrib}
      onToggleSubtask={onToggleSubtask}
    />
  );
}

const DRAWER_TASKS_BY_INDICATOR: Record<string, { id: string; title: string; isDone: boolean }[]> = {
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

/* ——— Component ——— */

export function MyMissionsPage() {
  return <MissionsPage mine />;
}

export function AnnualMissionsPage() {
  const year = new Date().getFullYear();
  return (
    <MissionsPage
      customTitle={`Ano ${year}`}
      initialPeriod={[
        { year, month: 1, day: 1 },
        { year, month: 12, day: 31 },
      ]}
    />
  );
}

export function QuarterlyMissionsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = q * 3;
  const endDay = new Date(year, endMonth, 0).getDate();
  return (
    <MissionsPage
      customTitle={`Q${q} ${year}`}
      initialPeriod={[
        { year, month: startMonth, day: 1 },
        { year, month: endMonth, day: endDay },
      ]}
    />
  );
}

export function MissionDetailPage() {
  const { missionId } = useParams<{ missionId: string }>();
  return <MissionsPage focusMissionId={missionId} />;
}

export function MissionsPage({ mine = false, customTitle, initialPeriod, focusMissionId }: {
  mine?: boolean;
  customTitle?: string;
  initialPeriod?: [CalendarDate, CalendarDate];
  focusMissionId?: string;
}) {
  const {
    missions,
    setMissions,
    getCheckInsByKeyResult,
    getCheckInSyncMeta,
    createCheckIn,
    updateCheckIn,
    deleteCheckIn,
    retryCheckInSync,
  } = useMissionsData();
  const {
    teamOptions,
    ownerOptions,
    mentionPeople,
    currentUser,
    users,
    resolveUserId,
    resolveTeamId,
  } = usePeopleData();
  const { surveys } = useSurveysData();
  const { activeOrgId, tagOptions, cyclePresetOptions, createTag, getTagById, resolveTagId } = useConfigData();

  const teamFilterOptions = useMemo(
    () => [{ id: "all", label: "Todos os times" }, ...teamOptions],
    [teamOptions],
  );
  const ownerFilterOptions = useMemo(
    () => [{ id: "all", label: "Todos", initials: "" }, ...ownerOptions],
    [ownerOptions],
  );
  const missionOwnerOptions = useMemo(
    () => ownerFilterOptions.filter((option) => option.id !== "all"),
    [ownerFilterOptions],
  );

  const visibilityOptions = [
    { id: "public", label: "Público", description: "Visível para toda a organização" },
    { id: "private", label: "Privado", description: "Visível apenas para o responsável e time de apoio" },
  ];
  const currentUserOption = useMemo(
    () => currentUser ?? ownerOptions[0] ?? null,
    [currentUser, ownerOptions],
  );
  const currentUserDefaultId = currentUserOption?.id ?? "all";
  const surveyOptions = useMemo(
    () => surveys.map((survey) => ({ id: survey.id, label: survey.name })),
    [surveys],
  );
  const missionTagOptions = useMemo(
    () => tagOptions.map((tag) => ({ id: tag.id, label: tag.label })),
    [tagOptions],
  );
  const presetPeriods = useMemo(
    () => cyclePresetOptions.map((cycle) => ({
      id: cycle.id,
      label: cycle.label,
      start: isoToCalendarDate(cycle.startDate),
      end: isoToCalendarDate(cycle.endDate),
    })),
    [cyclePresetOptions],
  );

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const viewId = searchParams.get("view");

  /* ——— "New view" mode from sidebar ——— */
  const isNewViewMode = !!(location.state as { newView?: boolean })?.newView;
  const [filterBarDefaultOpen, setFilterBarDefaultOpen] = useState(isNewViewMode);

  const [activeFilters, setActiveFilters] = useState<string[]>(mine ? ["owner", "period"] : ["team", "period"]);
  const [expandedMissions, setExpandedMissions] = useState<Set<string>>(new Set());
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const overlayOpenOrderRef = useRef(0);
  const [expandedMissionOverlayKey, setExpandedMissionOverlayKey] = useState(0);
  const [drawerOverlayKey, setDrawerOverlayKey] = useState(0);

  function findMissionById(id: string, list: Mission[]): Mission | null {
    for (const m of list) {
      if (m.id === id) return m;
      if (m.children) {
        const found = findMissionById(id, m.children);
        if (found) return found;
      }
    }
    return null;
  }
  const expandedMission = expandedMissionId ? findMissionById(expandedMissionId, missions) : null;

  function claimNextOverlayKey() {
    overlayOpenOrderRef.current += 1;
    return overlayOpenOrderRef.current;
  }

  const setExpandedMission = (m: Mission | null) => {
    if (m) {
      navigate(`/missions/${m.id}`);
    }
  };

  /* ——— View mode ——— */
  const [viewMode, setViewMode] = useState<"list" | "cards" | "kanban">("list");
  const [viewModeOpen, setViewModeOpen] = useState(false);
  const viewModeBtnRef = useRef<HTMLButtonElement>(null);

  /* ——— Kanban statuses (per indicator/sub-mission) ——— */
  const [kanbanStatuses, setKanbanStatuses] = useState<Record<string, KanbanStatus>>({});
  const [kanbanMoveOpen, setKanbanMoveOpen] = useState<string | null>(null);
  const [kanbanExpanded, setKanbanExpanded] = useState<Set<string>>(new Set());
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);
  const kanbanMoveBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* ——— Drawer edit mode ——— */
  const [drawerEditing, setDrawerEditing] = useState(false);

  function startDrawerEdit() {
    if (drawerMode === "indicator" && drawerIndicator) {
      const goalType = drawerIndicator.goalType;
      setEditingItem({
        id: drawerIndicator.id,
        name: drawerIndicator.title,
        description: getGoalLabel(drawerIndicator),
        measurementMode: "manual",
        manualType: goalType === "reach" ? "reach" : goalType === "above" ? "above" : goalType === "below" ? "below" : goalType === "between" ? "between" : null,
        surveyId: null,
        period: [null, null],
        goalValue: goalType === "reach" ? String(numVal(drawerIndicator.targetValue)) : "",
        goalValueMin: (goalType === "above" || goalType === "between") ? String(numVal(drawerIndicator.lowThreshold)) : "",
        goalValueMax: (goalType === "below" || goalType === "between") ? String(numVal(drawerIndicator.highThreshold)) : "",
        goalUnit: "%",
        ownerId: drawerIndicator.ownerId,
        teamId: drawerIndicator.teamId ?? null,
      });
      setIsEditingExisting(true);
    } else if (drawerMode === "task" && drawerTask) {
      setEditingItem({
        id: drawerTask.id,
        name: drawerTask.title,
        description: drawerTask.description ?? "",
        measurementMode: "task",
        manualType: null,
        surveyId: null,
        period: [null, null],
        goalValue: "",
        goalValueMin: "",
        goalValueMax: "",
        goalUnit: "",
        ownerId: drawerTask.ownerId,
        teamId: drawerTask.teamId ?? null,
      });
      setIsEditingExisting(true);
    }
    setDrawerEditing(true);
  }

  function saveDrawerEdit() {
    if (!editingItem) return;
    if (drawerMode === "indicator" && drawerIndicator) {
      const updated = {
        ...drawerIndicator,
        title: editingItem.name,
        targetValue: String(Number(editingItem.goalValue) || numVal(drawerIndicator.targetValue)),
        lowThreshold: String(Number(editingItem.goalValueMin) || numVal(drawerIndicator.lowThreshold)),
        highThreshold: String(Number(editingItem.goalValueMax) || numVal(drawerIndicator.highThreshold)),
      };
      setDrawerIndicator(updated);
      setMissions((prev) => {
        function updateInList(list: Mission[]): Mission[] {
          return list.map((m) => ({
            ...m,
            keyResults: (m.keyResults ?? []).map((kr) =>
              kr.id === updated.id ? updated : {
                ...kr,
                children: kr.children?.map((s) => s.id === updated.id ? updated : s),
              }
            ),
            children: m.children ? updateInList(m.children) : undefined,
          }));
        }
        return updateInList(prev);
      });
      toast.success("Indicador atualizado");
    } else if (drawerMode === "task" && drawerTask) {
      const updated = { ...drawerTask, title: editingItem.name, description: editingItem.description };
      setDrawerTask(updated);
      setMissions((prev) => {
        function updateTasks(list: Mission[]): Mission[] {
          return list.map((m) => ({
            ...m,
            tasks: m.tasks?.map((t) => t.id === updated.id ? { ...t, title: updated.title, description: updated.description } : t),
            keyResults: (m.keyResults ?? []).map((kr) => ({
              ...kr,
              tasks: kr.tasks?.map((t) => t.id === updated.id ? { ...t, title: updated.title, description: updated.description } : t),
              children: kr.children?.map((s) => ({
                ...s,
                tasks: s.tasks?.map((t) => t.id === updated.id ? { ...t, title: updated.title, description: updated.description } : t),
              })),
            })),
            children: m.children ? updateTasks(m.children) : undefined,
          }));
        }
        return updateTasks(prev);
      });
      toast.success("Tarefa atualizada");
    }
    setDrawerEditing(false);
    setEditingItem(null);
    setIsEditingExisting(false);
  }

  function cancelDrawerEdit() {
    setDrawerEditing(false);
    setEditingItem(null);
    setIsEditingExisting(false);
  }

  /* ——— Drawer (indicator or task) ——— */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"indicator" | "task">("indicator");
  const [drawerIndicator, setDrawerIndicator] = useState<KeyResult | null>(null);
  const [drawerTask, setDrawerTaskRaw] = useState<MissionTask | null>(null);

  // Sync drawer task subtasks with the missions tree
  const setDrawerTask: typeof setDrawerTaskRaw = (updater) => {
    setDrawerTaskRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next && next.id) {
        syncTaskToMissions(next);
      }
      return next;
    });
  };

  function syncTaskToMissions(task: MissionTask) {
    setMissions((prev) => {
      function updateTask(t: MissionTask): MissionTask {
        if (t.id !== task.id) return t;
        return { ...t, subtasks: task.subtasks, isDone: task.isDone, title: task.title, description: task.description };
      }
      function updateKR(kr: KeyResult): KeyResult {
        return {
          ...kr,
          tasks: kr.tasks?.map(updateTask),
          children: kr.children?.map(updateKR),
        };
      }
      function updateMission(m: Mission): Mission {
        return {
          ...m,
          tasks: m.tasks?.map(updateTask),
          keyResults: m.keyResults?.map(updateKR),
          children: m.children?.map(updateMission),
        };
      }
      return prev.map(updateMission);
    });
  }
  const [drawerMissionTitle, setDrawerMissionTitle] = useState("");
  const [drawerValue, setDrawerValue] = useState("");
  const [drawerNote, setDrawerNote] = useState("");
  const [drawerConfidence, setDrawerConfidence] = useState<ConfidenceLevel | null>(null);
  const drawerNoteRef = useRef<HTMLTextAreaElement>(null);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const confidenceBtnRef = useRef<HTMLButtonElement>(null);
  const [supportTeam, setSupportTeam] = useState<string[]>([]);
  const [addSupportOpen, setAddSupportOpen] = useState(false);
  const addSupportRef = useRef<HTMLDivElement>(null);
  const [supportSearch, setSupportSearch] = useState("");
  const [drawerContributesTo, setDrawerContributesTo] = useState<{ missionId: string; missionTitle: string }[]>([]);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerSourceMissionId, setDrawerSourceMissionId] = useState<string | null>(null);
  const [drawerSourceMissionTitle, setDrawerSourceMissionTitle] = useState("");
  const [newlyCreatedCheckInId, setNewlyCreatedCheckInId] = useState<string | null>(null);
  const [drawerContribPickerOpen, setDrawerContribPickerOpen] = useState(false);
  const [drawerContribPickerSearch, setDrawerContribPickerSearch] = useState("");
  const addContribRef = useRef<HTMLButtonElement>(null);

  /* ——— Row menu (⋯) for indicators and tasks ——— */
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [openContributeFor, setOpenContributeFor] = useState<string | null>(null);
  const [contributePickerSearch, setContributePickerSearch] = useState("");
  const rowMenuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* ——— Drawer tasks ——— */
  interface DrawerTask {
    id: string;
    title: string;
    isDone: boolean;
  }
  const [drawerTasks, setDrawerTasksRaw] = useState<DrawerTask[]>([]);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const drawerIndicatorRef = useRef<KeyResult | null>(null);
  drawerIndicatorRef.current = drawerIndicator;

  // Sync drawer tasks with the missions tree
  const setDrawerTasks: typeof setDrawerTasksRaw = (updater) => {
    setDrawerTasksRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const krId = drawerIndicatorRef.current?.id;
      if (krId) {
        syncDrawerTasksToMissions(krId, next);
      }
      return next;
    });
  };

  function syncDrawerTasksToMissions(krId: string, tasks: DrawerTask[]) {
    setMissions((prev) => {
      function updateKR(kr: KeyResult): KeyResult {
        if (kr.id !== krId) {
          return kr.children
            ? { ...kr, children: kr.children.map(updateKR) }
            : kr;
        }
        // Merge drawer tasks into KR tasks
        const existingTasks = kr.tasks ?? [];
        const merged: MissionTask[] = tasks.map((dt) => {
          const existing = existingTasks.find((t) => t.id === dt.id);
          if (existing) {
            return { ...existing, isDone: dt.isDone, title: dt.title };
          }
          // New task from drawer
          return {
            id: dt.id,
            missionId: null,
            keyResultId: krId,
            title: dt.title,
            description: null,
            ownerId: null,
            teamId: kr.teamId ?? null,
            dueDate: null,
            isDone: dt.isDone,
            sortOrder: 0,
            completedAt: dt.isDone ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        return { ...kr, tasks: merged };
      }
      function updateMission(m: Mission): Mission {
        return {
          ...m,
          keyResults: m.keyResults?.map(updateKR),
          children: m.children?.map(updateMission),
        };
      }
      return prev.map(updateMission);
    });
  }
  const kanbanDragRef = useRef<{ itemId: string; value: number } | null>(null);

  useEffect(() => {
    function onPointerUp() {
      if (!kanbanDragRef.current) return;
      const { itemId, value } = kanbanDragRef.current;
      kanbanDragRef.current = null;
      const kr = findIndicatorById(itemId, missions);
      if (!kr) return;
      requestAnimationFrame(() => {
        handleOpenCheckin({ keyResult: kr, currentValue: kr.progress, newValue: value });
      });
    }
    document.addEventListener("pointerup", onPointerUp);
    return () => document.removeEventListener("pointerup", onPointerUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions]);

  function findMissionOfItem(itemId: string, missionList: Mission[]): Mission | null {
    for (const m of missionList) {
      if (m.tasks?.some((t) => t.id === itemId)) return m;
      if (m.keyResults?.some((kr) =>
        kr.id === itemId ||
        kr.children?.some((s) => s.id === itemId) ||
        kr.tasks?.some((t) => t.id === itemId)
      )) return m;
      if (m.children) {
        const found = findMissionOfItem(itemId, m.children);
        if (found) return found;
      }
    }
    return null;
  }

  const {
    removeContribConfirm,
    setRemoveContribConfirm,
    handleRequestRemoveContribution,
    handleRemoveContribution,
    handleAddContribution,
  } = useMissionContributions({
    setMissions,
    setDrawerContributesTo,
    setOpenRowMenu,
    setOpenContributeFor,
    setContributePickerSearch,
  });

  const flatMissions = useMemo(() => flattenMissions(missions), [missions]);

  // ── Focus mode: single mission detail view ──
  const focusMission = useMemo(() => {
    if (!focusMissionId) return null;
    function findById(list: Mission[]): Mission | null {
      for (const m of list) {
        if (m.id === focusMissionId) return m;
        if (m.children) {
          const found = findById(m.children);
          if (found) return found;
        }
      }
      return null;
    }
    return findById(missions);
  }, [focusMissionId, missions]);

  const focusBreadcrumb = useMemo(() => {
    if (!focusMission) return [];
    const allFlat: Mission[] = [];
    function collect(list: Mission[]) {
      for (const m of list) {
        allFlat.push(m);
        if (m.children?.length) collect(m.children);
      }
    }
    collect(missions);
    return focusMission.path.map((id, i) => {
      const m = allFlat.find((x) => x.id === id);
      return {
        label: m?.title ?? id,
        onClick: id !== focusMission.id ? () => navigate(`/missions/${id}`) : undefined,
      };
    });
  }, [focusMission, missions, navigate]);

  // Auto-expand all items in focus mode (only on initial mount / ID change)
  useEffect(() => {
    if (!focusMissionId) return;
    // Find the mission fresh from current missions state
    function findById(list: Mission[]): Mission | null {
      for (const m of list) {
        if (m.id === focusMissionId) return m;
        if (m.children) { const f = findById(m.children); if (f) return f; }
      }
      return null;
    }
    const m = findById(missions);
    if (m) setExpandedMissions(new Set(collectMissionIds(m)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMissionId]);

  const drawerCheckIns = useMemo(() => {
    if (!drawerIndicator) return [];
    return sortCheckInsDesc(getCheckInsByKeyResult(drawerIndicator.id));
  }, [drawerIndicator, getCheckInsByKeyResult]);

  const drawerCheckInChartData = useMemo(
    () => buildCheckInChartData(drawerCheckIns),
    [drawerCheckIns],
  );

  const drawerCheckInSyncStateById = useMemo(() => {
    const stateById: Record<string, { syncStatus: "pending" | "synced" | "failed"; error: string | null; nextRetryAt: string | null }> = {};
    for (const checkIn of drawerCheckIns) {
      const meta = getCheckInSyncMeta(checkIn.id);
      if (!meta) continue;
      stateById[checkIn.id] = meta;
    }
    return stateById;
  }, [drawerCheckIns, getCheckInSyncMeta]);

  function handleOpenCheckin(payload: CheckinPayload) {
    setDrawerOverlayKey(claimNextOverlayKey());
    const parentTitle = findParentMission(payload.keyResult.id, missions);
    setDrawerMode("indicator");
    setDrawerTask(null);
    setDrawerIndicator(payload.keyResult);
    setDrawerMissionTitle(parentTitle);
    setDrawerValue(String(payload.newValue));
    setDrawerNote("");
    setDrawerConfidence(null);
    setNewlyCreatedCheckInId(null);
    // Pre-populate support team from check-in history participants
    const history = getCheckInsByKeyResult(payload.keyResult.id);
    const team: string[] = [];
    const ownerInitials = getOwnerInitials(payload.keyResult.owner);
    const seen = new Set([ownerInitials]);
    for (const entry of history) {
      const entryInitials = getOwnerInitials(entry.author);
      if (!seen.has(entryInitials)) {
        seen.add(entryInitials);
        team.push(entryInitials);
      }
    }
    setSupportTeam(team);
    setDrawerContributesTo(payload.keyResult.contributesTo ?? []);
    setDrawerItemId(payload.keyResult.id);
    const srcM = findMissionOfItem(payload.keyResult.id, missions);
    setDrawerSourceMissionId(srcM?.id ?? null);
    setDrawerSourceMissionTitle(srcM?.title ?? "");
    // Load tasks from the KR in the missions tree, fallback to hardcoded
    const krTasks = payload.keyResult.tasks?.map((t) => ({ id: t.id, title: t.title, isDone: t.isDone }))
      ?? DRAWER_TASKS_BY_INDICATOR[payload.keyResult.id]
      ?? [];
    setDrawerTasksRaw(krTasks);
    setNewTaskLabel("");
    setDrawerOpen(true);
  }

  function handleOpenTaskDrawer(task: MissionTask, parentLabel: string) {
    setDrawerOverlayKey(claimNextOverlayKey());
    setDrawerMode("task");
    setDrawerIndicator(null);
    setNewlyCreatedCheckInId(null);
    setDrawerTask(task);
    setDrawerMissionTitle(parentLabel);
    setSupportTeam([]);
    setAddSupportOpen(false);
    setDrawerContributesTo(task.contributesTo ?? []);
    setDrawerItemId(task.id);
    const srcM = findMissionOfItem(task.id, missions);
    setDrawerSourceMissionId(srcM?.id ?? null);
    setDrawerSourceMissionTitle(srcM?.title ?? "");
    setNewTaskLabel("");
    setDrawerOpen(true);
  }

  function handleOpenExternalContrib(ec: ExternalContribution) {
    if (ec.type === "indicator") {
      const kr = findIndicatorById(ec.id, missions);
      if (kr) handleOpenCheckin({ keyResult: kr, currentValue: kr.progress, newValue: kr.progress });
    } else {
      const result = findTaskById(ec.id, missions);
      if (result) handleOpenTaskDrawer(result.task, result.parentLabel);
    }
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setDrawerIndicator(null);
    setDrawerTask(null);
    setNewlyCreatedCheckInId(null);
    setDrawerItemId(null);
    setDrawerContribPickerOpen(false);
    setMentionQuery(null);
    if (drawerEditing) {
      setDrawerEditing(false);
      setEditingItem(null);
      setIsEditingExisting(false);
    }
  }

  function handleToggleTask(taskId: string) {
    setMissions((prev) => {
      function toggleKRTasks(krs: KeyResult[]): KeyResult[] {
        return krs.map((kr) => ({
          ...kr,
          tasks: kr.tasks?.map((t) => (t.id === taskId ? { ...t, isDone: !t.isDone } : t)),
          children: kr.children ? toggleKRTasks(kr.children) : undefined,
        }));
      }
      function toggleInList(list: Mission[]): Mission[] {
        return list.map((m) => ({
          ...m,
          tasks: m.tasks?.map((t) => (t.id === taskId ? { ...t, isDone: !t.isDone } : t)),
          keyResults: toggleKRTasks(m.keyResults ?? []),
          children: m.children ? toggleInList(m.children) : undefined,
        }));
      }
      return toggleInList(prev);
    });
    // Move task to appropriate kanban column
    setKanbanStatuses((prev) => {
      const next = { ...prev };
      const task = findTaskInMissions(taskId, missions);
      if (task) {
        next[taskId] = task.isDone ? "todo" : "done";
      }
      return next;
    });
  }

  function handleToggleSubtask(taskId: string, subtaskId: string) {
    setMissions((prev) => {
      function toggleSub(t: MissionTask): MissionTask {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks?.map((s) =>
            s.id === subtaskId ? { ...s, isDone: !s.isDone } : s
          ),
        };
      }
      function updateKRs(krs: KeyResult[]): KeyResult[] {
        return krs.map((kr) => ({
          ...kr,
          tasks: kr.tasks?.map(toggleSub),
          children: kr.children ? updateKRs(kr.children) : undefined,
        }));
      }
      function updateMissions(list: Mission[]): Mission[] {
        return list.map((m) => ({
          ...m,
          tasks: m.tasks?.map(toggleSub),
          keyResults: updateKRs(m.keyResults ?? []),
          children: m.children ? updateMissions(m.children) : undefined,
        }));
      }
      return updateMissions(prev);
    });
  }

  const {
    mentionQuery,
    setMentionQuery,
    mentionIndex,
    mentionResults,
    insertMention,
    handleNoteChange,
    handleNoteKeyDown,
  } = useMissionMentions({
    people: mentionPeople,
    drawerNote,
    setDrawerNote,
    drawerNoteRef,
  });

  function handleConfirmCheckin() {
    if (!drawerIndicator) return;
    const currentIndicator = drawerIndicator;
    const checkInAuthor = currentUserOption ?? { id: "local-user", label: "Usuário local", initials: "UL" };
    const checkInAuthorName = splitFullName(checkInAuthor.label);
    const numValue = Number(drawerValue) || 0;
    const previousValue = String(currentIndicator.currentValue);
    const nowIso = new Date().toISOString();

    function deriveKrStatus(progress: number): KeyResult["status"] {
      if (progress >= 100) return "completed";
      if (progress >= 75) return "on_track";
      if (progress >= 40) return "attention";
      return "off_track";
    }

    setMissions((prev) => {
      function updateKeyResults(krs: KeyResult[]): KeyResult[] {
        return krs.map((kr) => {
          const nextChildren = kr.children ? updateKeyResults(kr.children) : undefined;
          if (kr.id !== currentIndicator.id) {
            return nextChildren ? { ...kr, children: nextChildren } : kr;
          }

          return {
            ...kr,
            progress: numValue,
            currentValue: String(numValue),
            status: deriveKrStatus(numValue),
            updatedAt: nowIso,
            children: nextChildren,
          };
        });
      }

      function recalcMission(mission: Mission): Mission {
        const nextChildren = mission.children?.map(recalcMission);
        const nextKeyResults = updateKeyResults(mission.keyResults ?? []);
        const progressSources = [
          ...nextKeyResults.map((kr) => kr.progress),
          ...(nextChildren ?? []).map((child) => child.progress),
        ];
        const nextProgress = progressSources.length > 0
          ? Math.round(progressSources.reduce((acc, value) => acc + value, 0) / progressSources.length)
          : mission.progress;

        return {
          ...mission,
          keyResults: nextKeyResults,
          children: nextChildren,
          progress: nextProgress,
          updatedAt: nowIso,
        };
      }

      return prev.map(recalcMission);
    });

    const createdCheckIn = createCheckIn({
      keyResultId: currentIndicator.id,
      authorId: checkInAuthor.id,
      value: String(numValue),
      previousValue,
      confidence: drawerConfidence,
      note: drawerNote.trim() || null,
      mentions: supportTeam.length > 0 ? supportTeam : null,
      createdAt: nowIso,
      author: {
        id: checkInAuthor.id,
        firstName: checkInAuthorName.firstName,
        lastName: checkInAuthorName.lastName,
        initials: checkInAuthor.initials,
      },
    });

    setDrawerIndicator((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        progress: numValue,
        currentValue: String(numValue),
        status: deriveKrStatus(numValue),
        updatedAt: nowIso,
      };
    });
    setDrawerValue(String(numValue));
    setDrawerConfidence(null);
    setDrawerNote("");
    setMentionQuery(null);
    setNewlyCreatedCheckInId(createdCheckIn.id);

    toast.success("Check-in registrado com sucesso!");
  }

  function handleUpdateDrawerCheckIn(checkInId: string, patch: { note?: string | null; confidence?: ConfidenceLevel | null }) {
    const updated = updateCheckIn(checkInId, patch);
    if (!updated) {
      toast.error("Nao foi possivel atualizar o check-in.");
      return;
    }
    toast.success("Check-in atualizado.");
  }

  function handleDeleteDrawerCheckIn(checkInId: string) {
    deleteCheckIn(checkInId);
    setNewlyCreatedCheckInId((current) => (current === checkInId ? null : current));
    toast.success("Check-in excluido.");
  }


  function getKanbanStatus(itemId: string): KanbanStatus {
    if (kanbanStatuses[itemId]) return kanbanStatuses[itemId];
    // Auto-assign tasks based on done status
    const taskItem = kanbanItems.find((ki) => ki.id === itemId && ki.type === "task");
    if (taskItem) return taskItem.done ? "done" : "todo";
    return "uncategorized";
  }

  function moveToKanban(itemId: string, status: KanbanStatus) {
    setKanbanStatuses((prev) => ({ ...prev, [itemId]: status }));
    setKanbanMoveOpen(null);
  }

  function toggleKanbanExpand(itemId: string) {
    setKanbanExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  /* ——— Filter values ——— */
  const [selectedTeams, setSelectedTeams] = useState<string[]>(["all"]);
  const [selectedPeriod, setSelectedPeriod] = useState<[CalendarDate | null, CalendarDate | null]>(
    initialPeriod ?? [null, null],
  );
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedOwners, setSelectedOwners] = useState<string[]>(
    mine && currentUserDefaultId !== "all" ? [currentUserDefaultId] : ["all"],
  );
  const [selectedItemTypes, setSelectedItemTypes] = useState<string[]>(["all"]);
  const [selectedIndicatorTypes, setSelectedIndicatorTypes] = useState<string[]>(["all"]);
  const [selectedContributions, setSelectedContributions] = useState<string[]>(["all"]);
  const [selectedTaskState, setSelectedTaskState] = useState("all");
  const [selectedMissionStatuses, setSelectedMissionStatuses] = useState<string[]>(["all"]);
  const [selectedSupporters, setSelectedSupporters] = useState<string[]>(["all"]);

  useEffect(() => {
    if (!mine || currentUserDefaultId === "all") return;
    setSelectedOwners((prev) => (prev.length === 0 || prev.includes("all") ? [currentUserDefaultId] : prev));
  }, [mine, currentUserDefaultId]);

  /* ——— Pre-filter by owner when navigating from team health view ——— */
  // CollaboratorProfileModal passes { filterOwnerUserId } via location.state
  // when the manager clicks "Ver missões" on a collaborator card.
  // This activates the "owner" filter pre-populated with that user's ID,
  // showing missions where they are the responsável.
  // Note: "time de apoio" filter will be supported once MissionMember
  // (role: "supporter") is implemented in the data layer.
  const navState = (location.state as {
    filterOwnerUserId?: string;
    filterSupporterUserId?: string;
    openCheckinKrId?: string;
    filterPeriod?: { startDate: string; endDate: string };
  } | null) ?? null;
  const filterOwnerUserId = navState?.filterOwnerUserId ?? null;
  const filterSupporterUserId = navState?.filterSupporterUserId ?? null;
  const openCheckinKrId = navState?.openCheckinKrId ?? null;
  const filterPeriod = navState?.filterPeriod ?? null;

  useEffect(() => {
    const hasOwner = !!filterOwnerUserId;
    const hasSupporter = !!filterSupporterUserId;
    const hasPeriod = !!filterPeriod;
    if (!hasOwner && !hasSupporter && !hasPeriod) return;
    setActiveFilters((prev) => {
      let next = prev.filter((f) => f !== "team");
      if (hasOwner && !next.includes("owner")) next = ["owner", ...next];
      if (hasSupporter && !next.includes("supporter")) next = ["supporter", ...next];
      if (hasPeriod && !next.includes("period")) next = [...next, "period"];
      return next;
    });
    if (hasOwner) setSelectedOwners([filterOwnerUserId]);
    if (hasSupporter) setSelectedSupporters([filterSupporterUserId]);
    if (filterPeriod) {
      const [sy, sm, sd] = filterPeriod.startDate.split("-").map(Number);
      const [ey, em, ed] = filterPeriod.endDate.split("-").map(Number);
      setSelectedPeriod([
        { year: sy!, month: sm!, day: sd! },
        { year: ey!, month: em!, day: ed! },
      ]);
    }
    // Clear navigation state so a page refresh doesn't re-apply
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }, [filterOwnerUserId, filterSupporterUserId, filterPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open drawer for a specific KR when navigating from Home activities
  useEffect(() => {
    if (!openCheckinKrId || missions.length === 0) return;
    const kr = findIndicatorById(openCheckinKrId, missions);
    if (kr) {
      handleOpenCheckin({ keyResult: kr, currentValue: kr.progress, newValue: kr.progress });
    }
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }, [openCheckinKrId, missions]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ——— Save view ——— */
  const { views, addView, updateView, deleteView } = useSavedViews();
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  /* ——— Create / Edit mission ——— */
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined);
  const [showCreateAssistant, setShowCreateAssistant] = useState(false);
  const [createAssistantMissions, setCreateAssistantMissions] = useState<string[]>([]);
  const [newMissionName, setNewMissionName] = useState("");
  const [newMissionDesc, setNewMissionDesc] = useState("");
  const [newMissionItems, setNewMissionItems] = useState<MissionItemData[]>([]);
  const [editingItem, setEditingItem] = useState<MissionItemData | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editingParentMode, setEditingParentMode] = useState<string | null>(null);
  const [expandedSubMissions, setExpandedSubMissions] = useState<Set<string>>(new Set());
  const [itemMeasureOpen, setItemMeasureOpen] = useState(false);
  const [itemManualOpen, setItemManualOpen] = useState(false);
  const [itemSurveyOpen, setItemSurveyOpen] = useState(false);
  const [itemMoreOpen, setItemMoreOpen] = useState(false);
  const [itemMoreSubPanel, setItemMoreSubPanel] = useState<string | null>(null);
  const [itemSupportTeam, setItemSupportTeam] = useState<string[]>([]);
  const [itemSupportSearch, setItemSupportSearch] = useState("");
  const [itemTags, setItemTags] = useState<string[]>([]);
  const [itemTagsSearch, setItemTagsSearch] = useState("");
  const [itemNewTagName, setItemNewTagName] = useState("");
  const [itemCustomTags, setItemCustomTags] = useState<{ id: string; label: string }[]>([]);

  const [itemVisibility, setItemVisibility] = useState("org");
  const [itemPeriodOpen, setItemPeriodOpen] = useState(false);
  const [itemPeriodCustom, setItemPeriodCustom] = useState(false);
  const itemMeasureBtnRef = useRef<HTMLButtonElement>(null);
  const itemOwnerBtnRef = useRef<HTMLButtonElement>(null);
  const [itemOwnerPopoverOpen, setItemOwnerPopoverOpen] = useState(false);
  const itemPeriodBtnRef = useRef<HTMLButtonElement>(null);
  const itemPeriodCustomBtnRef = useRef<HTMLButtonElement>(null);
  const itemMoreBtnRef = useRef<HTMLButtonElement>(null);
  const itemManualBtnRef = useRef<HTMLButtonElement>(null);
  const itemSurveyBtnRef = useRef<HTMLButtonElement>(null);
  const itemMoreItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* ——— Create mission popovers ——— */
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [morePopoverOpen, setMorePopoverOpen] = useState(false);
  const [moreSubPanel, setMoreSubPanel] = useState<string | null>(null);
  const [selectedMissionOwners, setSelectedMissionOwners] = useState<string[]>([]);
  const [missionPeriod, setMissionPeriod] = useState<[CalendarDate | null, CalendarDate | null]>([null, null]);
  const [selectedMissionTeam, setSelectedMissionTeam] = useState<string | null>(null);
  const [selectedSupportTeam, setSelectedSupportTeam] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<{ id: string; label: string }[]>([]);

  const [selectedVisibility, setSelectedVisibility] = useState("public");
  const [missionPeriodOpen, setMissionPeriodOpen] = useState(false);
  const [missionPeriodCustom, setMissionPeriodCustom] = useState(false);
  const ownerBtnRef = useRef<HTMLButtonElement>(null);
  const missionPeriodBtnRef = useRef<HTMLButtonElement>(null);
  const missionPeriodCustomBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* ——— Current saved view ——— */
  const currentView: SavedView | undefined = viewId
    ? views.find((v) => v.id === viewId)
    : undefined;

  /* ——— Load saved view filters when URL changes ——— */
  useEffect(() => {
    if (currentView) {
      const f = currentView.filters;
      setActiveFilters(f.activeFilters);
      setSelectedTeams(f.selectedTeams);
      setSelectedPeriod(f.selectedPeriod);
      setSelectedStatus(f.selectedStatus);
      setSelectedOwners(f.selectedOwners);
      setSelectedItemTypes(f.selectedItemTypes ?? ["all"]);
      setSelectedIndicatorTypes(f.selectedIndicatorTypes ?? ["all"]);
      setSelectedContributions(f.selectedContributions ?? ["all"]);
      setSelectedTaskState(f.selectedTaskState ?? "all");
      setSelectedMissionStatuses(f.selectedMissionStatuses ?? ["all"]);
      setSelectedSupporters(f.selectedSupporters ?? ["all"]);
    }
  }, [viewId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ——— New view mode: clear filters and open popover ——— */
  useEffect(() => {
    if (isNewViewMode) {
      setActiveFilters([]);
      setSelectedTeams(["all"]);
      setSelectedPeriod([null, null]);
      setSelectedStatus("all");
      setSelectedOwners(mine && currentUserDefaultId !== "all" ? [currentUserDefaultId] : ["all"]);
      setSelectedItemTypes(["all"]);
      setSelectedIndicatorTypes(["all"]);
      setSelectedContributions(["all"]);
      setSelectedTaskState("all");
      setSelectedMissionStatuses(["all"]);
      setSelectedSupporters(["all"]);
      setFilterBarDefaultOpen(true);
      // Clear navigation state so refresh doesn't re-trigger
      window.history.replaceState({}, "");
    }
  }, [isNewViewMode, mine, currentUserDefaultId]);

  /* ——— Filter dropdown open state ——— */
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const teamChipRef = useRef<HTMLDivElement>(null);
  const periodChipRef = useRef<HTMLDivElement>(null);
  const statusChipRef = useRef<HTMLDivElement>(null);
  const ownerChipRef = useRef<HTMLDivElement>(null);
  const itemTypeChipRef = useRef<HTMLDivElement>(null);
  const indicatorTypeChipRef = useRef<HTMLDivElement>(null);
  const contributionChipRef = useRef<HTMLDivElement>(null);
  const supporterChipRef = useRef<HTMLDivElement>(null);
  const taskStateChipRef = useRef<HTMLDivElement>(null);
  const missionStatusChipRef = useRef<HTMLDivElement>(null);
  const [filterPeriodCustom, setFilterPeriodCustom] = useState(false);
  const filterPeriodCustomBtnRef = useRef<HTMLButtonElement>(null);

  const chipRefs: Record<string, RefObject<HTMLDivElement | null>> = {
    team: teamChipRef,
    period: periodChipRef,
    status: statusChipRef,
    owner: ownerChipRef,
    itemType: itemTypeChipRef,
    indicatorType: indicatorTypeChipRef,
    contribution: contributionChipRef,
    supporter: supporterChipRef,
    taskState: taskStateChipRef,
    missionStatus: missionStatusChipRef,
  };

  /** All chip wrapper refs — passed as ignoreRefs to FilterDropdowns so that
   *  clicking a sibling chip never triggers the outside-click onClose. */
  const ignoreChipRefs = useMemo(() => Object.values(chipRefs), []);

  /* ——— Filtered missions ——— */
  const ownerFilterActive = activeFilters.includes("owner") && !selectedOwners.includes("all") && selectedOwners.length > 0;
  const teamFilterActive = activeFilters.includes("team") && !selectedTeams.includes("all") && selectedTeams.length > 0;
  const periodFilterActive = activeFilters.includes("period") && (!!selectedPeriod[0] || !!selectedPeriod[1]);
  const statusFilterActive = activeFilters.includes("status") && selectedStatus !== "all";
  const itemTypeFilterActive = activeFilters.includes("itemType") && !selectedItemTypes.includes("all") && selectedItemTypes.length > 0;
  const indicatorTypeFilterActive = activeFilters.includes("indicatorType") && !selectedIndicatorTypes.includes("all") && selectedIndicatorTypes.length > 0;
  const contributionFilterActive = activeFilters.includes("contribution") && !selectedContributions.includes("all") && selectedContributions.length > 0;
  const taskStateFilterActive = activeFilters.includes("taskState") && selectedTaskState !== "all";
  const missionStatusFilterActive = activeFilters.includes("missionStatus") && !selectedMissionStatuses.includes("all") && selectedMissionStatuses.length > 0;
  const supporterFilterActive = activeFilters.includes("supporter") && !selectedSupporters.includes("all") && selectedSupporters.length > 0;

  const userTeamsMap = useMemo(() => {
    // user.teams contains team names, not IDs — resolve to IDs
    const nameToId = new Map(teamOptions.map((t) => [t.label, t.id]));
    const map = new Map<string, Set<string>>();
    for (const user of users) {
      const resolvedTeams = new Set(
        user.teams
          .map((name) => nameToId.get(name))
          .filter((id): id is string => !!id),
      );
      map.set(user.id, resolvedTeams);
    }
    return map;
  }, [users, teamOptions]);

  const displayedMissions = useMemo(() => {
    const selectedTeamSet = new Set(selectedTeams.filter((id) => id !== "all").map((id) => resolveTeamId(id)));
    const selectedItemTypeSet = new Set(selectedItemTypes.filter((id) => id !== "all"));
    const selectedIndicatorTypeSet = new Set(selectedIndicatorTypes.filter((id) => id !== "all"));
    const selectedContributionSet = new Set(selectedContributions.filter((id) => id !== "all"));
    const selectedMissionStatusSet = new Set(selectedMissionStatuses.filter((id) => id !== "all"));
    const selectedOwnerIds = new Set(
      selectedOwners
        .filter((id) => id !== "all")
        .map((id) => resolveUserId(id).toLowerCase()),
    );
    const selectedOwnerInitials = new Set(
      selectedOwners
        .filter((id) => id !== "all")
        .map((id) => ownerFilterOptions.find((option) => option.id === id)?.initials?.toLowerCase() ?? id.toLowerCase())
        .filter((value) => value.length > 0),
    );
    const statusValue = selectedStatus.replace("-", "_");

    function ownerBelongsToSelectedTeam(ownerId: string | undefined | null): boolean {
      if (!ownerId) return false;
      const ownerTeams = userTeamsMap.get(resolveUserId(ownerId));
      if (!ownerTeams) return false;
      for (const tid of selectedTeamSet) {
        if (ownerTeams.has(tid)) return true;
      }
      return false;
    }

    function toTimestampFromCalendar(value: CalendarDate | null): number | null {
      if (!value) return null;
      return new Date(value.year, value.month - 1, value.day).getTime();
    }

    function toTimestampFromIso(value: string | null | undefined): number | null {
      if (!value) return null;
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    }

    function dateRangeMatches(startIso: string | null | undefined, endIso: string | null | undefined): boolean {
      if (!periodFilterActive) return true;

      const filterStart = toTimestampFromCalendar(selectedPeriod[0]);
      const filterEnd = toTimestampFromCalendar(selectedPeriod[1]);
      const normalizedFilterStart = filterStart ?? filterEnd;
      const normalizedFilterEnd = filterEnd ?? filterStart;

      if (normalizedFilterStart === null || normalizedFilterEnd === null) {
        return true;
      }

      const start = toTimestampFromIso(startIso);
      const end = toTimestampFromIso(endIso);
      const normalizedStart = start ?? end;
      const normalizedEnd = end ?? start;

      if (normalizedStart === null || normalizedEnd === null) {
        return false;
      }

      return normalizedStart <= normalizedFilterEnd && normalizedEnd >= normalizedFilterStart;
    }

    function ownerMatches(owner?: { id: string; firstName: string; lastName: string; initials: string | null }): boolean {
      if (!ownerFilterActive) return true;
      if (!owner) return false;

      const initials = getOwnerInitials(owner).toLowerCase();
      return selectedOwnerInitials.has(initials) || selectedOwnerIds.has(resolveUserId(owner.id).toLowerCase());
    }

    // Matches missions where the selected users are in the support team (role="supporter")
    const selectedSupporterIds = new Set(
      selectedSupporters.filter((id) => id !== "all").map((id) => resolveUserId(id).toLowerCase()),
    );

    function missionSupporterMatches(mission: Mission): boolean {
      if (!supporterFilterActive) return true;
      return (mission.members ?? []).some(
        (m) => m.role === "supporter" && selectedSupporterIds.has(resolveUserId(m.userId).toLowerCase()),
      );
    }

    function keyResultHasContribution(kr: KeyResult): boolean {
      if ((kr.contributesTo?.length ?? 0) > 0) return true;
      if ((kr.tasks ?? []).some((task) => (task.contributesTo?.length ?? 0) > 0)) return true;
      if ((kr.children ?? []).some((child) => keyResultHasContribution(child))) return true;
      return false;
    }

    function missionHasContribution(mission: Mission): boolean {
      if ((mission.tasks ?? []).some((task) => (task.contributesTo?.length ?? 0) > 0)) return true;
      if ((mission.keyResults ?? []).some((kr) => keyResultHasContribution(kr))) return true;
      return false;
    }

    function missionContributionMatches(mission: Mission): boolean {
      if (!contributionFilterActive) return true;

      const hasContributing = missionHasContribution(mission);
      const hasReceiving = (mission.externalContributions?.length ?? 0) > 0;
      const hasNone = !hasContributing && !hasReceiving;

      if (selectedContributionSet.has("contributing") && hasContributing) return true;
      if (selectedContributionSet.has("receiving") && hasReceiving) return true;
      if (selectedContributionSet.has("none") && hasNone) return true;
      return false;
    }

    function keyResultContributionMatches(kr: KeyResult): boolean {
      if (!contributionFilterActive) return true;

      const hasContributing = (kr.contributesTo?.length ?? 0) > 0;
      if (selectedContributionSet.has("contributing") && hasContributing) return true;
      if (selectedContributionSet.has("none") && !hasContributing) return true;
      return false;
    }

    function taskContributionMatches(task: MissionTask): boolean {
      if (!contributionFilterActive) return true;

      const hasContributing = (task.contributesTo?.length ?? 0) > 0;
      if (selectedContributionSet.has("contributing") && hasContributing) return true;
      if (selectedContributionSet.has("none") && !hasContributing) return true;
      return false;
    }

    function indicatorTypeMatches(kr: KeyResult): boolean {
      if (!indicatorTypeFilterActive) return true;
      if (selectedIndicatorTypeSet.has(kr.goalType)) return true;
      if (selectedIndicatorTypeSet.has("external") && kr.measurementMode === "external") return true;
      if (selectedIndicatorTypeSet.has("linked_mission") && kr.measurementMode === "mission") return true;
      return false;
    }

    function taskStateMatches(task: MissionTask): boolean {
      if (!taskStateFilterActive) return true;
      if (selectedTaskState === "done") return task.isDone;
      if (selectedTaskState === "pending") return !task.isDone;
      return true;
    }

    function missionStatusMatches(mission: Mission): boolean {
      if (!missionStatusFilterActive) return true;
      return selectedMissionStatusSet.has(mission.status);
    }

    function filterTaskNode(task: MissionTask, missionScopeMatches: boolean): MissionTask | null {
      const directMatch =
        missionScopeMatches
        && (!itemTypeFilterActive || selectedItemTypeSet.has("task"))
        && !indicatorTypeFilterActive
        && !statusFilterActive
        && dateRangeMatches(task.dueDate, task.dueDate)
        && ownerMatches(task.owner)
        && taskContributionMatches(task)
        && taskStateMatches(task);

      return directMatch ? task : null;
    }

    function filterKeyResultNode(kr: KeyResult, missionScopeMatches: boolean): KeyResult | null {
      const nextChildren = (kr.children ?? [])
        .map((child) => filterKeyResultNode(child, missionScopeMatches))
        .filter((child): child is KeyResult => !!child);
      const nextTasks = (kr.tasks ?? [])
        .map((task) => filterTaskNode(task, missionScopeMatches))
        .filter((task): task is MissionTask => !!task);

      const directMatch =
        missionScopeMatches
        && (!itemTypeFilterActive || selectedItemTypeSet.has("indicator"))
        && !taskStateFilterActive
        && dateRangeMatches(kr.periodStart, kr.periodEnd)
        && ownerMatches(kr.owner)
        && (!statusFilterActive || kr.status === statusValue)
        && indicatorTypeMatches(kr)
        && keyResultContributionMatches(kr);

      if (!directMatch && nextChildren.length === 0 && nextTasks.length === 0) {
        return null;
      }

      return {
        ...kr,
        children: nextChildren.length > 0 ? nextChildren : kr.children ? [] : undefined,
        tasks: nextTasks.length > 0 ? nextTasks : kr.tasks ? [] : undefined,
      };
    }

    function filterMissionNode(mission: Mission): Mission | null {
      const missionTeamMatches = !teamFilterActive || ownerBelongsToSelectedTeam(mission.ownerId);
      const missionScopeMatches = missionTeamMatches && missionStatusMatches(mission);

      const nextChildren = (mission.children ?? [])
        .map((child) => filterMissionNode(child))
        .filter((child): child is Mission => !!child);
      const nextKeyResults = (mission.keyResults ?? [])
        .map((kr) => filterKeyResultNode(kr, missionScopeMatches))
        .filter((kr): kr is KeyResult => !!kr);
      const nextTasks = (mission.tasks ?? [])
        .map((task) => filterTaskNode(task, missionScopeMatches))
        .filter((task): task is MissionTask => !!task);

      const directMatch =
        missionScopeMatches
        && (!itemTypeFilterActive || selectedItemTypeSet.has("mission"))
        && !indicatorTypeFilterActive
        && !statusFilterActive
        && !taskStateFilterActive
        && dateRangeMatches(mission.dueDate, mission.dueDate)
        && ownerMatches(mission.owner)
        && missionContributionMatches(mission)
        && missionSupporterMatches(mission);

      if (!directMatch && nextChildren.length === 0 && nextKeyResults.length === 0 && nextTasks.length === 0) {
        return null;
      }

      return {
        ...mission,
        children: nextChildren.length > 0 ? nextChildren : mission.children ? [] : undefined,
        keyResults: nextKeyResults.length > 0 ? nextKeyResults : mission.keyResults ? [] : undefined,
        tasks: nextTasks.length > 0 ? nextTasks : mission.tasks ? [] : undefined,
      };
    }

    return missions
      .map((mission) => filterMissionNode(mission))
      .filter((mission): mission is Mission => !!mission);
  }, [
    missions,
    ownerFilterActive,
    teamFilterActive,
    periodFilterActive,
    statusFilterActive,
    itemTypeFilterActive,
    indicatorTypeFilterActive,
    contributionFilterActive,
    supporterFilterActive,
    taskStateFilterActive,
    missionStatusFilterActive,
    selectedOwners,
    selectedTeams,
    selectedPeriod,
    selectedStatus,
    selectedItemTypes,
    selectedIndicatorTypes,
    selectedContributions,
    selectedSupporters,
    selectedTaskState,
    selectedMissionStatuses,
    ownerFilterOptions,
    resolveTeamId,
    resolveUserId,
    userTeamsMap,
  ]);

  /* ——— Team context for filtered view ——— */
  const activeTeamIds = selectedTeams.filter((id) => id !== "all").map(resolveTeamId);
  const isSingleTeam = teamFilterActive && activeTeamIds.length === 1;
  const isMultiTeam = teamFilterActive && activeTeamIds.length > 1;

  const singleTeamName = isSingleTeam
    ? teamFilterOptions.find((t) => t.id === activeTeamIds[0])?.label ?? null
    : null;

  const groupedMissions = useMemo(() => {
    if (!isMultiTeam) return null;

    const activeTeamSet = new Set(activeTeamIds);
    const groups = new Map<string, { teamName: string; teamColor: string; missions: Mission[] }>();

    for (const m of displayedMissions) {
      // Find the owner's team that matches one of the active filter teams
      const ownerTeams = userTeamsMap.get(resolveUserId(m.ownerId));
      let matchedTeamId: string | null = null;
      if (ownerTeams) {
        for (const tid of ownerTeams) {
          if (activeTeamSet.has(tid)) { matchedTeamId = tid; break; }
        }
      }
      const key = matchedTeamId ?? "__no_team__";
      if (!groups.has(key)) {
        const teamOpt = matchedTeamId ? teamFilterOptions.find((t) => t.id === matchedTeamId) : null;
        groups.set(key, {
          teamName: teamOpt?.label ?? "Sem time",
          teamColor: m.team?.color ?? "neutral",
          missions: [],
        });
      }
      groups.get(key)!.missions.push(m);
    }

    return [...groups.values()].sort((a, b) => {
      if (a.teamName === "Sem time") return 1;
      if (b.teamName === "Sem time") return -1;
      return a.teamName.localeCompare(b.teamName, "pt-BR");
    });
  }, [displayedMissions, isMultiTeam, activeTeamIds, userTeamsMap, resolveUserId, teamFilterOptions]);

  /* Flatten all indicators and sub-missions into kanban items */
  interface KanbanChildItem {
    id: string;
    label: string;
    value: number;
    target: number;
    goalLabel: string;
    ownerInitials: string;
    period: string;
    icon?: ComponentType<IconProps>;
  }

  interface KanbanItem {
    id: string;
    label: string;
    missionTitle: string;
    missionId: string;
    value: number;
    target: number;
    goalLabel: string;
    ownerInitials: string;
    ownerName: string;
    period: string;
    type: "indicator" | "mission" | "task";
    icon?: ComponentType<IconProps>;
    children?: KanbanChildItem[];
    done?: boolean;
    teamName?: string;
    teamColor?: string;
  }

  const kanbanItems: KanbanItem[] = [];
  function collectKanbanItems(missionList: Mission[]) {
    for (const m of missionList) {
      for (const kr of (m.keyResults ?? [])) {
        kanbanItems.push({
          id: kr.id,
          label: kr.title,
          missionTitle: m.title,
          missionId: m.id,
          value: kr.progress,
          target: numVal(kr.targetValue),
          goalLabel: getGoalLabel(kr),
          ownerInitials: getOwnerInitials(kr.owner),
          ownerName: getOwnerName(kr.owner),
          period: kr.periodLabel ?? "",
          type: "indicator",
          icon: getIndicatorIcon(kr),
          teamName: m.team?.name,
          teamColor: m.team?.color,
        });
        // Collect sub-KRs
        if (kr.children) {
          for (const sub of kr.children) {
            kanbanItems.push({
              id: sub.id,
              label: sub.title,
              missionTitle: `${m.title} › ${kr.title}`,
              missionId: m.id,
              value: sub.progress,
              target: numVal(sub.targetValue),
              goalLabel: getGoalLabel(sub),
              ownerInitials: getOwnerInitials(sub.owner),
              ownerName: getOwnerName(sub.owner),
              period: sub.periodLabel ?? "",
              type: "indicator",
              icon: getIndicatorIcon(sub),
              teamName: m.team?.name,
              teamColor: m.team?.color,
            });
          }
        }
        // Collect KR tasks
        if (kr.tasks) {
          for (const task of kr.tasks) {
            kanbanItems.push({
              id: task.id,
              label: task.title,
              missionTitle: `${m.title} › ${kr.title}`,
              missionId: m.id,
              value: task.isDone ? 100 : 0,
              target: 100,
              goalLabel: task.isDone ? "Concluída" : "Pendente",
              ownerInitials: getOwnerInitials(task.owner),
              ownerName: getOwnerName(task.owner),
              period: "",
              type: "task",
              done: task.isDone,
              teamName: m.team?.name,
              teamColor: m.team?.color,
            });
          }
        }
      }
      if (m.tasks) {
        for (const task of m.tasks) {
          kanbanItems.push({
            id: task.id,
            label: task.title,
            missionTitle: m.title,
            missionId: m.id,
            value: task.isDone ? 100 : 0,
            target: 100,
            goalLabel: task.isDone ? "Concluída" : "Pendente",
            ownerInitials: getOwnerInitials(task.owner),
            ownerName: getOwnerName(task.owner),
            period: "",
            type: "task",
            done: task.isDone,
            teamName: m.team?.name,
            teamColor: m.team?.color,
          });
        }
      }
      if (m.children) {
        const childKRs = (child: Mission) => child.keyResults ?? [];
        for (const child of m.children) {
          const cKRs = childKRs(child);
          kanbanItems.push({
            id: child.id,
            label: child.title,
            missionTitle: m.title,
            missionId: m.id,
            value: child.progress,
            target: 100,
            goalLabel: `${cKRs.length} indicador${cKRs.length !== 1 ? "es" : ""}`,
            ownerInitials: cKRs[0] ? getOwnerInitials(cKRs[0].owner) : "",
            ownerName: cKRs[0] ? getOwnerName(cKRs[0].owner) : "",
            period: cKRs[0]?.periodLabel ?? "",
            type: "mission",
            teamName: m.team?.name,
            teamColor: m.team?.color,
            children: cKRs.map((ci) => ({
              id: ci.id,
              label: ci.title,
              value: ci.progress,
              target: numVal(ci.targetValue),
              goalLabel: getGoalLabel(ci),
              ownerInitials: getOwnerInitials(ci.owner),
              period: ci.periodLabel ?? "",
              icon: getIndicatorIcon(ci),
            })),
          });
        }
      }
    }
  }
  collectKanbanItems(displayedMissions);

  const totalValue = displayedMissions.length > 0
    ? Math.round(displayedMissions.reduce((acc, m) => acc + m.progress, 0) / displayedMissions.length)
    : 0;
  const totalExpected = 40;
  const activeMissions = displayedMissions.length;
  const outdatedIndicators = displayedMissions.reduce(
    (acc, m) => acc + (m.keyResults ?? []).filter((kr) => kr.status === "off_track").length,
    0,
  );

  function handleAddFilter(filterId: string) {
    if (!activeFilters.includes(filterId)) {
      setActiveFilters((prev) => [...prev, filterId]);
      setTimeout(() => setOpenFilter(filterId), 0);
    }
  }

  function resetFilterSelection(filterId: string) {
    switch (filterId) {
      case "team":
        setSelectedTeams(["all"]);
        break;
      case "period":
        setSelectedPeriod([null, null]);
        setFilterPeriodCustom(false);
        break;
      case "status":
        setSelectedStatus("all");
        break;
      case "owner":
        setSelectedOwners(mine && currentUserDefaultId !== "all" ? [currentUserDefaultId] : ["all"]);
        break;
      case "itemType":
        setSelectedItemTypes(["all"]);
        break;
      case "indicatorType":
        setSelectedIndicatorTypes(["all"]);
        break;
      case "contribution":
        setSelectedContributions(["all"]);
        break;
      case "supporter":
        setSelectedSupporters(["all"]);
        break;
      case "taskState":
        setSelectedTaskState("all");
        break;
      case "missionStatus":
        setSelectedMissionStatuses(["all"]);
        break;
      default:
        break;
    }
  }

  function handleRemoveFilter(filterId: string) {
    setActiveFilters((prev) => prev.filter((f) => f !== filterId));
    resetFilterSelection(filterId);
    setOpenFilter(null);
  }

  function handleClearAll() {
    activeFilters.forEach((filterId) => resetFilterSelection(filterId));
    setActiveFilters([]);
    setOpenFilter(null);
  }

  function toggleMission(id: string) {
    setExpandedMissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatPeriodLabel(): string {
    const [start, end] = selectedPeriod;
    if (!start && !end) return "Selecionar período";
    const fmt = (d: CalendarDate) =>
      `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}`;
    if (start && end) {
      return `${fmt(start)} - ${fmt(end)}/${end.year}`;
    }
    if (start) return fmt(start);
    return "";
  }

  function getFilterLabel(filterId: string): string {
    const prefixed = (prefix: string, ids: string[], options: { id: string; label: string }[]) => {
      if (ids.length === 0) return prefix;
      return `${prefix}: ${formatMultiLabel(ids, options, prefix)}`;
    };

    switch (filterId) {
      case "team":
        return prefixed("Time", selectedTeams, teamFilterOptions);
      case "period": {
        const periodLabel = formatPeriodLabel();
        return periodLabel === "Selecionar período" ? "Período" : `Período: ${periodLabel}`;
      }
      case "status":
        return selectedStatus === "all"
          ? "Status"
          : `Status: ${STATUS_OPTIONS.find((s) => s.id === selectedStatus)?.label ?? "Todos"}`;
      case "owner":
        return prefixed("Responsável", selectedOwners, ownerFilterOptions);
      case "itemType":
        return prefixed("Tipo", selectedItemTypes, ITEM_TYPE_OPTIONS);
      case "indicatorType":
        return prefixed("Indicador", selectedIndicatorTypes, INDICATOR_TYPE_OPTIONS);
      case "contribution":
        return prefixed("Contribuição", selectedContributions, CONTRIBUTION_OPTIONS);
      case "supporter":
        return prefixed("Apoio", selectedSupporters, ownerFilterOptions);
      case "taskState":
        return selectedTaskState === "all"
          ? "Tarefa"
          : `Tarefa: ${TASK_STATE_OPTIONS.find((s) => s.id === selectedTaskState)?.label ?? ""}`;
      case "missionStatus":
        return selectedMissionStatuses.includes("all")
          ? "Missão"
          : `Missão: ${formatMultiLabel(selectedMissionStatuses, MISSION_STATUS_OPTIONS, "Todos")}`;
      default:
        return filterId;
    }
  }

  function handleOpenSaveModal() {
    setOpenFilter(null);
    setViewName(currentView?.name ?? "");
    setSaveModalOpen(true);
  }

  function getCurrentFilters() {
    return {
      activeFilters,
      selectedTeams,
      selectedPeriod,
      selectedStatus,
      selectedOwners,
      selectedItemTypes,
      selectedIndicatorTypes,
      selectedContributions,
      selectedSupporters,
      selectedTaskState,
      selectedMissionStatuses,
    };
  }

  function handleSaveView() {
    if (!viewName.trim()) return;
    if (currentView) {
      updateView(currentView.id, {
        name: viewName.trim(),
        filters: getCurrentFilters(),
      });
      setSaveModalOpen(false);
      toast.success(`Visualização "${viewName.trim()}" atualizada com sucesso.`);
    } else {
      const newId = addView({
        name: viewName.trim(),
        module: "missions",
        filters: getCurrentFilters(),
      });
      setSaveModalOpen(false);
      toast.success(`Visualização "${viewName.trim()}" salva com sucesso.`);
      navigate(`/missions?view=${newId}`);
    }
    setViewName("");
  }

  function handleDeleteView() {
    setDeleteModalOpen(true);
  }

  function handleConfirmDelete() {
    if (!currentView) return;
    const name = currentView.name;
    deleteView(currentView.id);
    setDeleteModalOpen(false);
    navigate("/missions");
    toast.success(`Visualização "${name}" excluída.`);
  }

  function resetCreateForm() {
    setCreateOpen(false);
    setCreateStep(0);
    setEditingMissionId(null);
    setSelectedTemplate(undefined);
    setNewMissionName("");
    setNewMissionDesc("");
    setNewMissionItems([]);
    setEditingItem(null);
    setIsEditingExisting(false);
    setEditingParentId(null);
    setEditingParentMode(null);
    setSelectedMissionOwners([]);
    setSelectedMissionTeam(null);
    setMissionPeriod([null, null]);
    setSelectedSupportTeam([]);
    setSelectedTags([]);
    setSelectedVisibility("public");
  }

  function toIsoDate(date: CalendarDate | null): string | null {
    if (!date) return null;
    return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  }

  function ownerFromSelection() {
    const selected = missionOwnerOptions.find((option) => option.id === selectedMissionOwners[0]);
    const fallback = currentUserOption ?? missionOwnerOptions[0] ?? { id: "local-user", label: "Usuário local", initials: "UL" };
    const owner = selected ?? fallback;
    const name = splitFullName(owner.label);

    return {
      id: owner.id,
      firstName: name.firstName,
      lastName: name.lastName,
      initials: owner.initials,
    };
  }

  function unitFromValue(unit: string): KeyResult["unit"] {
    if (unit === "%") return "percent";
    if (unit === "R$" || unit === "US$") return "currency";
    if (!unit || unit === "un") return "count";
    return "custom";
  }

  function materializeMissionItems(rootMissionId: string, items: MissionItemData[], ownerId: string): { keyResults: KeyResult[]; children: Mission[] } {
    const keyResults: KeyResult[] = [];
    const children: Mission[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      if (item.measurementMode === "mission") {
        const childMissionId = item.id || `mission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const itemOwnerId = item.ownerId ?? ownerId;
        const itemTeamId = item.teamId ?? selectedMissionTeam;
        const childTree = materializeMissionItems(childMissionId, item.children ?? [], itemOwnerId);
        const childProgress = childTree.keyResults.length > 0
          ? Math.round(childTree.keyResults.reduce((acc, kr) => acc + kr.progress, 0) / childTree.keyResults.length)
          : 0;

        children.push({
          id: childMissionId,
          orgId: activeOrgId,
          cycleId: null,
          parentId: rootMissionId,
          depth: 1,
          path: [rootMissionId, childMissionId],
          title: item.name || "Submissão sem título",
          description: item.description || null,
          ownerId: itemOwnerId,
          teamId: itemTeamId,
          status: "active",
          visibility: "public",
          progress: childProgress,
          kanbanStatus: "doing",
          sortOrder: children.length,
          dueDate: toIsoDate(item.period[1]) ?? toIsoDate(missionPeriod[1]),
          completedAt: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          keyResults: childTree.keyResults,
          children: childTree.children,
        });
        continue;
      }

      const goalType = (item.manualType as KeyResult["goalType"] | null) ?? (item.measurementMode === "survey" ? "survey" : "reach");
      const targetValue = item.goalValue || (goalType === "between" ? item.goalValueMax || null : null);
      const currentValue = "0";

      // Materialize task children of this KR
      const krId = item.id || `kr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const krTasks: MissionTask[] = (item.children ?? [])
        .filter((child) => child.measurementMode === "task")
        .map((child, idx) => ({
          id: child.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          missionId: null,
          keyResultId: krId,
          title: child.name || "Tarefa sem título",
          description: child.description || null,
          ownerId: child.ownerId ?? item.ownerId ?? ownerId,
          teamId: child.teamId ?? item.teamId ?? selectedMissionTeam,
          dueDate: toIsoDate(child.period[1]) ?? toIsoDate(item.period[1]) ?? toIsoDate(missionPeriod[1]),
          isDone: false,
          sortOrder: idx,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        }));

      keyResults.push({
        id: krId,
        orgId: activeOrgId,
        missionId: rootMissionId,
        parentKrId: null,
        title: item.name || "Indicador sem título",
        description: item.description || null,
        ownerId: item.ownerId ?? ownerId,
        teamId: item.teamId ?? selectedMissionTeam,
        measurementMode: (item.measurementMode as KeyResult["measurementMode"] | null) ?? "manual",
        linkedMissionId: null,
        linkedSurveyId: item.measurementMode === "survey" ? item.surveyId : null,
        externalSource: null,
        externalConfig: null,
        goalType,
        targetValue,
        currentValue,
        startValue: "0",
        lowThreshold: item.goalValueMin || null,
        highThreshold: item.goalValueMax || null,
        unit: unitFromValue(item.goalUnit),
        unitLabel: item.goalUnit || null,
        expectedValue: null,
        status: "attention",
        progress: 0,
        periodLabel: null,
        periodStart: toIsoDate(item.period[0]) ?? toIsoDate(missionPeriod[0]),
        periodEnd: toIsoDate(item.period[1]) ?? toIsoDate(missionPeriod[1]),
        sortOrder: keyResults.length,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        ...(krTasks.length > 0 ? { tasks: krTasks } : {}),
      });
    }

    return { keyResults, children };
  }

  function buildMissionFromForm(existing?: Mission): Mission {
    const now = new Date().toISOString();
    const missionId = existing?.id ?? `mission-${Date.now()}`;
    const owner = ownerFromSelection();
    const tree = materializeMissionItems(missionId, newMissionItems, owner.id);
    const selectedMissionTags = selectedTags.map((tagId) => {
      const resolvedTagId = resolveTagId(tagId);
      const canonical = getTagById(resolvedTagId);
      if (canonical) return canonical;

      return {
        id: resolvedTagId,
        orgId: existing?.orgId ?? activeOrgId,
        name: missionTagOptions.find((option) => option.id === tagId)?.label ?? resolvedTagId,
        color: "neutral",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
    });
    const progress = tree.keyResults.length > 0
      ? Math.round(tree.keyResults.reduce((acc, kr) => acc + kr.progress, 0) / tree.keyResults.length)
      : 0;

    return {
      id: missionId,
      orgId: existing?.orgId ?? activeOrgId,
      cycleId: existing?.cycleId ?? null,
      parentId: existing?.parentId ?? null,
      depth: existing?.depth ?? 0,
      path: existing?.path ?? [missionId],
      title: newMissionName || existing?.title || "Missão sem título",
      description: newMissionDesc || null,
      ownerId: owner.id,
      teamId: selectedMissionTeam,
      status: existing?.status ?? "active",
      visibility: selectedVisibility === "private" ? "private" : "public",
      progress,
      kanbanStatus: existing?.kanbanStatus ?? "doing",
      sortOrder: existing?.sortOrder ?? missions.length,
      dueDate: toIsoDate(missionPeriod[1]),
      completedAt: existing?.completedAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: existing?.deletedAt ?? null,
      owner,
      team: selectedMissionTeam
        ? { id: selectedMissionTeam, name: teamOptions.find((t) => t.id === selectedMissionTeam)?.label ?? "", color: "neutral" as const }
        : undefined,
      keyResults: tree.keyResults,
      children: tree.children,
      tasks: existing?.tasks ?? [],
      tags: selectedMissionTags,
      members: selectedSupportTeam.map((userId): MissionMember => {
        const opt = missionOwnerOptions.find((o) => o.id === userId);
        const nameParts = opt ? splitFullName(opt.label) : { firstName: userId, lastName: "" };
        return {
          missionId,
          userId,
          role: "supporter",
          addedAt: now,
          addedBy: owner.id,
          user: {
            id: userId,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            initials: opt?.initials ?? null,
            jobTitle: null,
            avatarUrl: null,
          },
        };
      }),
    };
  }

  /* ——— Convert Mission → MissionItemData[] for editing ——— */
  function missionToItems(m: Mission): MissionItemData[] {
    const items: MissionItemData[] = (m.keyResults ?? []).map((kr) => {
      const goalValue = kr.goalType === "reach" || kr.goalType === "between" ? String(numVal(kr.targetValue)) : "";
      const goalValueMin = kr.lowThreshold != null ? String(numVal(kr.lowThreshold)) : "";
      const goalValueMax = kr.highThreshold != null ? String(numVal(kr.highThreshold)) : "";
      return {
        id: kr.id,
        name: kr.title,
        description: getGoalLabel(kr),
        measurementMode: "manual",
        manualType: kr.goalType,
        surveyId: null,
        period: [null, null] as [CalendarDate | null, CalendarDate | null],
        goalValue,
        goalValueMin,
        goalValueMax,
        goalUnit: "",
        ownerId: kr.ownerId,
        teamId: kr.teamId ?? null,
      };
    });

    (m.children ?? []).forEach((child) => {
      items.push({
        id: child.id,
        name: child.title,
        description: "",
        measurementMode: "mission",
        manualType: null,
        surveyId: null,
        period: [null, null],
        goalValue: "",
        goalValueMin: "",
        goalValueMax: "",
        goalUnit: "",
        ownerId: child.ownerId,
        teamId: child.teamId ?? null,
        children: missionToItems(child),
      });
    });

    return items;
  }

  function handleEditMission(mission: Mission) {
    setEditingMissionId(mission.id);
    setCreateStep(1);
    setSelectedTemplate("scratch");
    setNewMissionName(mission.title);
    setNewMissionDesc(mission.description ?? "");
    setNewMissionItems(missionToItems(mission));
    setSelectedMissionOwners([]);
    setSelectedMissionTeam(mission.teamId ?? null);
    setMissionPeriod([null, null]);
    setSelectedSupportTeam(
      (mission.members ?? [])
        .filter((m) => m.role === "supporter")
        .map((m) => m.userId),
    );
    setSelectedTags((mission.tags ?? []).map((tag) => tag.id));
    setSelectedVisibility("public");
    setExpandedSubMissions(new Set(
      missionToItems(mission)
        .filter((i) => i.measurementMode === "mission")
        .map((i) => i.id)
    ));
    setExpandedMission(null);
    setCreateOpen(true);
  }

  const [deleteMissionTarget, setDeleteMissionTarget] = useState<Mission | null>(null);

  function handleDeleteMission(mission: Mission) {
    setDeleteMissionTarget(mission);
  }

  function confirmDeleteMission() {
    if (!deleteMissionTarget) return;
    const mission = deleteMissionTarget;

    setMissions((prev) => {
      function removeFromTree(list: Mission[]): Mission[] {
        return list
          .filter((item) => item.id !== mission.id)
          .map((item) => ({
            ...item,
            children: item.children ? removeFromTree(item.children) : undefined,
          }));
      }
      return removeFromTree(prev);
    });

    setExpandedMissions((prev) => {
      const next = new Set(prev);
      next.delete(mission.id);
      return next;
    });

    if (expandedMissionId === mission.id) {
      setExpandedMission(null);
    }

    if (focusMissionId === mission.id) {
      navigate("/missions");
    }

    setDeleteMissionTarget(null);
    toast.success("Missão excluída com sucesso!");
  }

  function getFilterValueSummary(filterId: string): string {
    switch (filterId) {
      case "team":
        return formatMultiLabel(selectedTeams, teamFilterOptions, "Todos os times");
      case "period":
        return formatPeriodLabel();
      case "status":
        return STATUS_OPTIONS.find((s) => s.id === selectedStatus)?.label ?? "Todos";
      case "owner":
        return formatMultiLabel(selectedOwners, ownerFilterOptions, "Todos");
      case "itemType":
        return formatMultiLabel(selectedItemTypes, ITEM_TYPE_OPTIONS, "Todos os itens");
      case "indicatorType":
        return formatMultiLabel(selectedIndicatorTypes, INDICATOR_TYPE_OPTIONS, "Todos os tipos");
      case "contribution":
        return formatMultiLabel(selectedContributions, CONTRIBUTION_OPTIONS, "Todas");
      case "supporter":
        return formatMultiLabel(selectedSupporters, ownerFilterOptions, "Todos");
      case "taskState":
        return TASK_STATE_OPTIONS.find((s) => s.id === selectedTaskState)?.label ?? "Todas";
      case "missionStatus":
        return formatMultiLabel(selectedMissionStatuses, MISSION_STATUS_OPTIONS, "Todos");
      default:
        return "";
    }
  }

  const filterChipIcons: Record<string, typeof Users | undefined> = {
    team: Users,
    period: CalendarBlank,
    status: FunnelSimple,
    owner: User,
    itemType: ListBullets,
    indicatorType: Crosshair,
    contribution: GitBranch,
    supporter: UsersThree,
    taskState: ListChecks,
    missionStatus: Target,
  };

  /* ——— Helper: goal summary text ——— */
  function getGoalSummary(item: MissionItemData): string {
    if (item.measurementMode !== "manual" || !item.manualType) return "";
    const unit = UNIT_OPTIONS.find((u) => u.value === item.goalUnit)?.label ?? item.goalUnit;
    if (item.manualType === "between") return item.goalValueMin && item.goalValueMax ? `${item.goalValueMin} – ${item.goalValueMax} ${unit}` : "";
    if (item.manualType === "above") return item.goalValueMin ? `≥ ${item.goalValueMin} ${unit}` : "";
    if (item.manualType === "below") return item.goalValueMax ? `≤ ${item.goalValueMax} ${unit}` : "";
    if (item.goalValue) return `${item.goalValue} ${unit}`;
    return "";
  }

  /* ——— Helper: recursively add child to a parent anywhere in the tree ——— */
  function addChildToParent(items: MissionItemData[], parentId: string, child: MissionItemData): MissionItemData[] {
    return items.map((item) => {
      if (item.id === parentId) {
        return { ...item, children: [...(item.children ?? []), child] };
      }
      if (item.children?.length) {
        return { ...item, children: addChildToParent(item.children, parentId, child) };
      }
      return item;
    });
  }

  /* ——— Helper: recursively remove a child from anywhere in the tree ——— */
  function removeChildFromTree(items: MissionItemData[], childId: string): MissionItemData[] {
    return items
      .filter((item) => item.id !== childId)
      .map((item) =>
        item.children?.length
          ? { ...item, children: removeChildFromTree(item.children, childId) }
          : item
      );
  }

  /* ——— Helper: save current editing item ——— */
  /* ——— Helper: recursively replace an item in the tree ——— */
  function replaceItemInTree(items: MissionItemData[], itemId: string, newItem: MissionItemData): MissionItemData[] {
    return items.map((item) => {
      if (item.id === itemId) return newItem;
      if (item.children?.length) {
        return { ...item, children: replaceItemInTree(item.children, itemId, newItem) };
      }
      return item;
    });
  }

  function handleSaveItem() {
    if (!editingItem || !editingItem.name.trim()) return;
    if (isEditingExisting) {
      // Replace the item in-place in the tree
      setNewMissionItems((prev) => replaceItemInTree(prev, editingItem.id, editingItem));
    } else if (editingParentId) {
      setNewMissionItems((prev) => addChildToParent(prev, editingParentId, editingItem));
      setExpandedSubMissions((prev) => new Set(prev).add(editingParentId));
    } else {
      setNewMissionItems((prev) => [...prev, editingItem]);
    }
    if (editingItem.measurementMode === "mission" || editingItem.measurementMode === "manual" || editingItem.measurementMode === "external") {
      setExpandedSubMissions((prev) => new Set(prev).add(editingItem.id));
    }
    setEditingItem(null);
    setIsEditingExisting(false);
    setEditingParentId(null);
    setEditingParentMode(null);
  }

  /* ——— Helper: render inline add/edit form ——— */
  function renderInlineForm() {
    if (!editingItem) return null;
    const tplCfg = getTemplateConfig(selectedTemplate);
    return (
      <div className={styles.addItemCard}>
        <div className={styles.addItemCardHeader}>
          <span className={styles.addItemCardTitle}>{isEditingExisting ? tplCfg.editItemFormTitle : tplCfg.addItemFormTitle}</span>
          <PlusSquare size={16} className={styles.addItemCardIcon} />
        </div>

        <div className={styles.addItemCardContent}>
          <div className={styles.addItemCardFields}>
            <input
              type="text"
              className={styles.addItemTitleInput}
              placeholder={tplCfg.itemTitlePlaceholder}
              value={editingItem.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingItem((prev) => prev ? { ...prev, name: e.target.value } : prev)
              }
            />
            <input
              type="text"
              className={styles.addItemDescInput}
              placeholder={tplCfg.itemDescPlaceholder}
              value={editingItem.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEditingItem((prev) => prev ? { ...prev, description: e.target.value } : prev)
              }
            />
          </div>

          <div className={styles.addItemCardActions}>
            {/* Owner — shows inherited or own */}
            <Button
              ref={itemOwnerBtnRef}
              variant="secondary"
              size="sm"
              leftIcon={UserCircle}
              onClick={() => setItemOwnerPopoverOpen((v) => !v)}
            >
              {(() => {
                const effectiveId = editingItem.ownerId ?? selectedMissionOwners[0] ?? null;
                const label = effectiveId ? missionOwnerOptions.find((o) => o.id === effectiveId)?.label : null;
                return label ?? "Responsável";
              })()}
            </Button>

            {/* Period — shows inherited or own */}
            <Button
              ref={itemPeriodBtnRef}
              variant="secondary"
              size="sm"
              leftIcon={Calendar}
              onClick={() => { setItemPeriodOpen((v) => !v); setItemPeriodCustom(false); }}
            >
              {(() => {
                const p0 = editingItem.period[0] ?? missionPeriod[0];
                const p1 = editingItem.period[1] ?? missionPeriod[1];
                if (p0 && p1) return `${String(p0.day).padStart(2, "0")}/${String(p0.month).padStart(2, "0")} – ${String(p1.day).padStart(2, "0")}/${String(p1.month).padStart(2, "0")}/${p1.year}`;
                return "Período";
              })()}
            </Button>

            <Button
              ref={itemMeasureBtnRef}
              variant="secondary"
              size="sm"
              leftIcon={Ruler}
              onClick={() => setItemMeasureOpen((v) => !v)}
            >
              {editingItem.measurementMode
                ? MEASUREMENT_MODES.find((m) => m.id === editingItem.measurementMode)?.label
                : "Modo de mensuração"}
            </Button>

            <Button
              ref={itemMoreBtnRef}
              variant="secondary"
              size="sm"
              leftIcon={DotsThree}
              aria-label="Mais opções"
              onClick={() => { setItemMoreSubPanel(null); setItemMoreOpen((v) => !v); }}
            />
          </div>

          {/* Item owner popover */}
          <PopoverSelect
            mode="single"
            open={itemOwnerPopoverOpen}
            onClose={() => setItemOwnerPopoverOpen(false)}
            anchorRef={itemOwnerBtnRef}
            options={missionOwnerOptions}
            value={editingItem.ownerId ?? selectedMissionOwners[0] ?? ""}
            onChange={(val) => { setEditingItem((prev) => prev ? { ...prev, ownerId: val || null } : prev); setItemOwnerPopoverOpen(false); }}
            searchable
            searchPlaceholder="Buscar responsável..."
          />

          {/* ——— Goal inputs based on measurement mode ——— */}
          {editingItem.measurementMode === "manual" && editingItem.manualType && (
            <div className={styles.goalSection}>
              <span className={styles.goalSectionLabel}>
                {MANUAL_INDICATOR_TYPES.find((t) => t.id === editingItem.manualType)?.label}
              </span>

              {(editingItem.manualType === "reach" || editingItem.manualType === "reduce") && (
                <div className={styles.goalRow}>
                  <Input
                    label="Valor alvo"
                    placeholder="Ex: 1000"
                    value={editingItem.goalValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingItem((prev) => prev ? { ...prev, goalValue: e.target.value } : prev)
                    }
                  />
                  <Select
                    label="Unidade"
                    placeholder="Selecionar"
                    options={UNIT_OPTIONS}
                    value={editingItem.goalUnit}
                    onChange={(v: string) =>
                      setEditingItem((prev) => prev ? { ...prev, goalUnit: v } : prev)
                    }
                  />
                </div>
              )}

              {editingItem.manualType === "above" && (
                <div className={styles.goalRow}>
                  <Input
                    label="Mínimo"
                    placeholder="Ex: 70"
                    value={editingItem.goalValueMin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingItem((prev) => prev ? { ...prev, goalValueMin: e.target.value } : prev)
                    }
                  />
                  <Select
                    label="Unidade"
                    placeholder="Selecionar"
                    options={UNIT_OPTIONS}
                    value={editingItem.goalUnit}
                    onChange={(v: string) =>
                      setEditingItem((prev) => prev ? { ...prev, goalUnit: v } : prev)
                    }
                  />
                </div>
              )}

              {editingItem.manualType === "below" && (
                <div className={styles.goalRow}>
                  <Input
                    label="Máximo"
                    placeholder="Ex: 5"
                    value={editingItem.goalValueMax}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingItem((prev) => prev ? { ...prev, goalValueMax: e.target.value } : prev)
                    }
                  />
                  <Select
                    label="Unidade"
                    placeholder="Selecionar"
                    options={UNIT_OPTIONS}
                    value={editingItem.goalUnit}
                    onChange={(v: string) =>
                      setEditingItem((prev) => prev ? { ...prev, goalUnit: v } : prev)
                    }
                  />
                </div>
              )}

              {editingItem.manualType === "between" && (
                <div className={styles.goalRow}>
                  <Input
                    label="Mínimo"
                    placeholder="Ex: 50"
                    value={editingItem.goalValueMin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingItem((prev) => prev ? { ...prev, goalValueMin: e.target.value } : prev)
                    }
                  />
                  <Input
                    label="Máximo"
                    placeholder="Ex: 90"
                    value={editingItem.goalValueMax}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingItem((prev) => prev ? { ...prev, goalValueMax: e.target.value } : prev)
                    }
                  />
                  <Select
                    label="Unidade"
                    placeholder="Selecionar"
                    options={UNIT_OPTIONS}
                    value={editingItem.goalUnit}
                    onChange={(v: string) =>
                      setEditingItem((prev) => prev ? { ...prev, goalUnit: v } : prev)
                    }
                  />
                </div>
              )}

              {editingItem.manualType === "survey" && editingItem.surveyId && (
                <div className={styles.goalRow}>
                  <div className={styles.goalSurveyTag}>
                    <ChartBar size={14} />
                    <span>{surveyOptions.find((survey) => survey.id === editingItem.surveyId)?.label}</span>
                  </div>
                  <Input
                    label="Valor alvo"
                    placeholder="Ex: 80"
                    value={editingItem.goalValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingItem((prev) => prev ? { ...prev, goalValue: e.target.value } : prev)
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modo de mensuração dropdown */}
        <FilterDropdown
          open={itemMeasureOpen}
          onClose={() => setItemMeasureOpen(false)}
          anchorRef={itemMeasureBtnRef}
        >
          <div className={styles.filterDropdownBody}>
            {MEASUREMENT_MODES.filter((mode) => {
              if (drawerEditing) return true;
              // Inside a KR (non-mission parent), only tasks are allowed
              if (editingParentMode && editingParentMode !== "mission") {
                return mode.id === "task";
              }
              const cfg = getTemplateConfig(selectedTemplate);
              return !cfg.allowedModes || cfg.allowedModes.includes(mode.id);
            }).map((mode) => {
              const Icon = mode.icon;
              const isActive = editingItem?.measurementMode === mode.id;
              return (
                <button
                  key={mode.id}
                  ref={mode.id === "manual" ? (el) => { itemManualBtnRef.current = el; } : undefined}
                  type="button"
                  className={`${styles.measureMenuItem} ${isActive ? styles.measureMenuItemActive : ""}`}
                  onClick={() => {
                    if (mode.id === "manual") {
                      setItemManualOpen(true);
                    } else {
                      setEditingItem((prev) => prev ? {
                        ...prev,
                        measurementMode: mode.id,
                        manualType: null,
                        surveyId: null,
                        goalValue: "",
                        goalValueMin: "",
                        goalValueMax: "",
                        goalUnit: "",
                        ownerId: null,
                        teamId: null,
                        children: (mode.id === "mission" || mode.id === "manual" || mode.id === "external") ? [] : undefined,
                      } : prev);
                      setItemMeasureOpen(false);
                    }
                  }}
                >
                  <Icon size={16} className={styles.measureMenuIcon} />
                  <div className={styles.measureMenuText}>
                    <span className={styles.measureMenuLabel}>{mode.label}</span>
                    <span className={styles.measureMenuDesc}>{mode.description}</span>
                  </div>
                  {mode.id === "manual" && <CaretRight size={12} className={styles.moreMenuArrow} />}
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        {/* Sub-panel: Indicador manual — tipo */}
        <FilterDropdown
          open={itemMeasureOpen && itemManualOpen}
          onClose={() => setItemManualOpen(false)}
          anchorRef={itemManualBtnRef}
          placement="right-start"
          noOverlay
        >
          <div className={styles.filterDropdownBody}>
            {MANUAL_INDICATOR_TYPES.map((t) => {
              const Icon = t.icon;
              const isActive = editingItem?.manualType === t.id;
              return (
                <button
                  key={t.id}
                  ref={t.id === "survey" ? (el) => { itemSurveyBtnRef.current = el; } : undefined}
                  type="button"
                  className={`${styles.moreMenuItem} ${isActive ? styles.moreMenuItemActive : ""}`}
                  onClick={() => {
                    if (t.id === "survey") {
                      setItemSurveyOpen(true);
                    } else {
                      setEditingItem((prev) => prev ? { ...prev, measurementMode: "manual", manualType: t.id, surveyId: null, goalValue: "", goalValueMin: "", goalValueMax: "", goalUnit: "" } : prev);
                      setItemManualOpen(false);
                      setItemMeasureOpen(false);
                    }
                  }}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                  {t.id === "survey" && <CaretRight size={12} className={styles.moreMenuArrow} />}
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        {/* Sub-panel: Selecionar pesquisa */}
        <FilterDropdown
          open={itemMeasureOpen && itemManualOpen && itemSurveyOpen}
          onClose={() => setItemSurveyOpen(false)}
          anchorRef={itemSurveyBtnRef}
          placement="right-start"
          noOverlay
        >
          <div className={styles.filterDropdownBody}>
            {surveyOptions.map((s) => {
              const isActive = editingItem?.surveyId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.filterDropdownItem} ${isActive ? styles.filterDropdownItemActive : ""}`}
                  onClick={() => {
                    setEditingItem((prev) => prev ? { ...prev, measurementMode: "manual", manualType: "survey", surveyId: s.id } : prev);
                    setItemSurveyOpen(false);
                    setItemManualOpen(false);
                    setItemMeasureOpen(false);
                  }}
                >
                  <Radio checked={isActive} readOnly />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        {/* Período dropdown — presets */}
        <FilterDropdown
          open={itemPeriodOpen}
          onClose={() => { setItemPeriodOpen(false); setItemPeriodCustom(false); }}
          anchorRef={itemPeriodBtnRef}
        >
          <div className={styles.filterDropdownBody}>
            {presetPeriods.map((p) => {
              const isActive = editingItem?.period[0]?.year === p.start.year
                && editingItem?.period[0]?.month === p.start.month
                && editingItem?.period[0]?.day === p.start.day
                && editingItem?.period[1]?.year === p.end.year
                && editingItem?.period[1]?.month === p.end.month
                && editingItem?.period[1]?.day === p.end.day;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.filterDropdownItem} ${isActive ? styles.filterDropdownItemActive : ""}`}
                  onClick={() => {
                    setEditingItem((prev) => prev ? { ...prev, period: [p.start, p.end] } : prev);
                    setItemPeriodOpen(false);
                  }}
                >
                  <Radio checked={isActive} readOnly />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.periodDropdownFooter}>
            <button
              ref={itemPeriodCustomBtnRef}
              type="button"
              className={`${styles.filterDropdownItem} ${itemPeriodCustom ? styles.filterDropdownItemActive : ""}`}
              onClick={() => setItemPeriodCustom((v) => !v)}
            >
              <Plus size={14} />
              <span>Período personalizado</span>
              <CaretRight size={12} className={styles.moreMenuArrow} />
            </button>
          </div>
        </FilterDropdown>

        {/* Período — sub-panel: calendário personalizado */}
        <FilterDropdown
          open={itemPeriodOpen && itemPeriodCustom}
          onClose={() => setItemPeriodCustom(false)}
          anchorRef={itemPeriodCustomBtnRef}
          placement="right-start"
          noOverlay
        >
          <div className={styles.periodCustomPopover}>
            <DatePicker
              mode="range"
              value={editingItem?.period ?? [null, null]}
              onChange={(range: [CalendarDate | null, CalendarDate | null]) => {
                setEditingItem((prev) => prev ? { ...prev, period: range } : prev);
                if (range[0] && range[1]) {
                  setItemPeriodOpen(false);
                  setItemPeriodCustom(false);
                }
              }}
            />
          </div>
        </FilterDropdown>

        {/* Item "..." — main menu */}
        <FilterDropdown
          open={itemMoreOpen}
          onClose={() => { setItemMoreOpen(false); setItemMoreSubPanel(null); }}
          anchorRef={itemMoreBtnRef}
        >
          <div className={styles.filterDropdownBody}>
            {MORE_MISSION_OPTIONS.map((opt) => {
              const isActive = itemMoreSubPanel === opt.id;
              const count = opt.id === "team-support"
                ? itemSupportTeam.length
                : opt.id === "organizers"
                  ? itemTags.length
                  : 0;
              const displayLabel = opt.id === "visibility"
                ? (itemVisibility === "private" ? "Privado" : "Público")
                : opt.label;
              const Icon = opt.id === "visibility"
                ? (itemVisibility === "private" ? EyeSlash : Eye)
                : opt.icon;
              return (
                <button
                  key={opt.id}
                  ref={(el) => { itemMoreItemRefs.current[opt.id] = el; }}
                  type="button"
                  className={`${styles.moreMenuItem} ${isActive ? styles.moreMenuItemActive : ""}`}
                  onClick={() => setItemMoreSubPanel(isActive ? null : opt.id)}
                >
                  <Icon size={14} />
                  <span>{displayLabel}</span>
                  {count > 0 && <Badge color="neutral" size="sm">{count}</Badge>}
                  <CaretRight size={12} className={styles.moreMenuArrow} />
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        {/* Item "..." sub-panel: Time de apoio */}
        <FilterDropdown
          open={itemMoreOpen && itemMoreSubPanel === "team-support"}
          onClose={() => setItemMoreSubPanel(null)}
          anchorRef={{ current: itemMoreItemRefs.current["team-support"] ?? null }}
          placement="right-start"
          noOverlay
        >
          <div className={styles.filterDropdownBody}>
            <div className={styles.searchRow}>
              <MagnifyingGlass size={14} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar pessoa..."
                value={itemSupportSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemSupportSearch(e.target.value)}
              />
            </div>
            {missionOwnerOptions
              .filter((opt) => opt.label.toLowerCase().includes(itemSupportSearch.toLowerCase()))
              .map((opt) => {
              const checked = itemSupportTeam.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                  onClick={() =>
                    setItemSupportTeam((prev) =>
                      prev.includes(opt.id)
                        ? prev.filter((id) => id !== opt.id)
                        : [...prev, opt.id],
                    )
                  }
                >
                  <Checkbox checked={checked} readOnly />
                  {opt.initials && <Avatar initials={opt.initials} size="xs" />}
                  <span>{opt.label}</span>
                </button>
              );
              })}
          </div>
        </FilterDropdown>

        {/* Item "..." sub-panel: Tags */}
        <FilterDropdown
          open={itemMoreOpen && itemMoreSubPanel === "organizers"}
          onClose={() => setItemMoreSubPanel(null)}
          anchorRef={{ current: itemMoreItemRefs.current["organizers"] ?? null }}
          placement="right-start"
          noOverlay
        >
          <div className={styles.filterDropdownBody}>
            <div className={styles.searchRow}>
              <MagnifyingGlass size={14} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar tag..."
                value={itemTagsSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemTagsSearch(e.target.value)}
              />
            </div>
            {[...missionTagOptions, ...itemCustomTags]
              .filter((tag) => tag.label.toLowerCase().includes(itemTagsSearch.toLowerCase()))
              .map((tag) => {
              const checked = itemTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                  onClick={() =>
                    setItemTags((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id],
                    )
                  }
                >
                  <Checkbox checked={checked} readOnly />
                  <Tag size={14} />
                  <span>{tag.label}</span>
                </button>
              );
              })}
            <div className={styles.newTagRow}>
              <input
                type="text"
                className={styles.newTagInput}
                placeholder="Criar nova tag..."
                value={itemNewTagName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemNewTagName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" && itemNewTagName.trim()) {
                    const created = createTag({ name: itemNewTagName.trim() });
                    setItemCustomTags((prev) => [...prev, { id: created.id, label: created.name }]);
                    setItemTags((prev) => [...prev, created.id]);
                    setItemNewTagName("");
                  }
                }}
              />
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={Plus}
                aria-label="Criar tag"
                disabled={!itemNewTagName.trim()}
                onClick={() => {
                  if (itemNewTagName.trim()) {
                    const created = createTag({ name: itemNewTagName.trim() });
                    setItemCustomTags((prev) => [...prev, { id: created.id, label: created.name }]);
                    setItemTags((prev) => [...prev, created.id]);
                    setItemNewTagName("");
                  }
                }}
              />
            </div>
          </div>
        </FilterDropdown>

        {/* Item "..." sub-panel: Conectar com outra missão */}
        {/* Item "..." sub-panel: Quem pode ver */}
        <FilterDropdown
          open={itemMoreOpen && itemMoreSubPanel === "visibility"}
          onClose={() => setItemMoreSubPanel(null)}
          anchorRef={{ current: itemMoreItemRefs.current["visibility"] ?? null }}
          placement="right-start"
          noOverlay
        >
          <div className={styles.visibilityPanel}>
            {visibilityOptions.map((opt) => {
              const isSelected = itemVisibility === opt.id;
              const Icon = opt.id === "public" ? Eye : EyeSlash;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.visibilityOption} ${isSelected ? styles.visibilityOptionActive : ""}`}
                  onClick={() => { setItemVisibility(opt.id); setItemMoreSubPanel(null); }}
                >
                  <Icon size={16} className={styles.visibilityIcon} />
                  <div className={styles.visibilityText}>
                    <span className={styles.visibilityLabel}>{opt.label}</span>
                    <span className={styles.visibilityDesc}>{opt.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        <div className={styles.addItemCardFooter}>
          <Button
            variant="tertiary"
            size="sm"
            onClick={drawerEditing ? cancelDrawerEdit : () => { setEditingItem(null); setEditingParentId(null); setEditingParentMode(null); setIsEditingExisting(false); }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!editingItem.name.trim()}
            onClick={drawerEditing ? saveDrawerEdit : handleSaveItem}
          >
            {isEditingExisting ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </div>
    );
  }

  /* ——— Helper: count all items recursively ——— */
  function countAllItems(items: MissionItemData[]): number {
    return items.reduce((sum, item) => sum + 1 + countAllItems(item.children ?? []), 0);
  }

  /* ——— Helper: render review items tree ——— */
  function renderReviewItems(items: MissionItemData[], depth: number) {
    return items.map((item) => {
      const goalSummary = getGoalSummary(item);
      const isSubMission = item.measurementMode === "mission";
      const modeLabel = MEASUREMENT_MODES.find((m) => m.id === item.measurementMode)?.label;
      const typeLabel = item.manualType
        ? MANUAL_INDICATOR_TYPES.find((t) => t.id === item.manualType)?.label
        : null;
      const badgeText = modeLabel
        ? `${modeLabel}${typeLabel ? ` · ${typeLabel}` : ""}`
        : null;

      return (
        <div key={item.id} className={styles.reviewItemGroup} style={depth > 0 ? { marginLeft: `calc(${depth} * var(--sp-lg))` } : undefined}>
          <div className={styles.reviewItem}>
            <div className={styles.reviewItemHeader}>
              <span className={styles.reviewItemName}>{item.name}</span>
              {badgeText && <Badge color="neutral">{badgeText}</Badge>}
            </div>
            {item.description && (
              <span className={styles.reviewItemDesc}>{item.description}</span>
            )}
            <div className={styles.reviewItemFooter}>
              {goalSummary && (
                <Badge color="orange">{goalSummary}</Badge>
              )}
              {item.period[0] && item.period[1] && (
                <span className={styles.reviewItemMeta}>
                  <Calendar size={12} />
                  {`${String(item.period[0].day).padStart(2, "0")}/${String(item.period[0].month).padStart(2, "0")}/${item.period[0].year} — ${String(item.period[1].day).padStart(2, "0")}/${String(item.period[1].month).padStart(2, "0")}/${item.period[1].year}`}
                </span>
              )}
            </div>
          </div>
          {isSubMission && item.children && item.children.length > 0 && (
            renderReviewItems(item.children, depth + 1)
          )}
        </div>
      );
    });
  }

  /* ——— Helper: recursively render mission items at any depth ——— */
  function renderMissionItems(items: MissionItemData[], parentId: string | null, parentMeasurementMode?: string | null) {
    const isNested = parentId !== null;
    return (
      <>
        {items.map((item) => {
          const isBeingEdited = isEditingExisting && editingItem?.id === item.id && editingParentId === parentId;

          // Render inline form in-place when editing this item
          if (isBeingEdited) {
            return (
              <div key={item.id} className={isNested ? undefined : styles.addedItemWrapper}>
                {isNested ? (
                  <div className={styles.subMissionFormRow}>{renderInlineForm()}</div>
                ) : (
                  renderInlineForm()
                )}
              </div>
            );
          }

          const goalSummary = getGoalSummary(item);
          // Tasks: nothing can be added inside
          // KRs (manual/external): only tasks can be added inside
          // Missions: any type can be added inside
          const canHaveChildren = item.measurementMode !== "task" &&
            (item.measurementMode === "mission" || item.measurementMode === "manual" || item.measurementMode === "external");
          const isExpanded = expandedSubMissions.has(item.id);
          const childCount = item.children?.length ?? 0;

          const handleEdit = () => {
            setEditingItem({ ...item });
            setIsEditingExisting(true);
            setEditingParentId(parentId);
            setEditingParentMode(parentMeasurementMode ?? null);
          };

          const handleRemove = () => {
            if (parentId) {
              setNewMissionItems((prev) => removeChildFromTree(prev, item.id));
            } else {
              setNewMissionItems((prev) => prev.filter((i) => i.id !== item.id));
            }
          };

          const rowClass = isNested ? styles.subMissionChildRow : styles.addedItem;

          return (
            <div key={item.id} className={isNested ? styles.subMissionItemWrapper : styles.addedItemWrapper}>
              <div className={rowClass}>
                {canHaveChildren && (
                  <button
                    type="button"
                    className={styles.subMissionToggle}
                    onClick={() => setExpandedSubMissions((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })}
                    aria-label={isExpanded ? "Recolher sub-itens" : "Expandir sub-itens"}
                  >
                    {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                  </button>
                )}
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                <div className={styles.addedItemClickable} onClick={handleEdit}>
                  <div className={styles.addedItemInfo}>
                    <span className={styles.addedItemName}>{item.name}</span>
                    {item.measurementMode && (
                      <span className={styles.addedItemBadge}>
                        {MEASUREMENT_MODES.find((m) => m.id === item.measurementMode)?.label}
                        {item.manualType && ` · ${MANUAL_INDICATOR_TYPES.find((t) => t.id === item.manualType)?.label}`}
                      </span>
                    )}
                    {canHaveChildren && childCount > 0 && (
                      <span className={styles.addedItemCount}>{childCount} {childCount === 1 ? "item" : "itens"}</span>
                    )}
                  </div>
                  <div className={styles.addedItemMeta}>
                    {(() => {
                      // Owner: item override or inherited from mission
                      const ownerLabel = item.ownerId
                        ? missionOwnerOptions.find((o) => o.id === item.ownerId)?.label
                        : selectedMissionOwners.length > 0
                          ? missionOwnerOptions.find((o) => o.id === selectedMissionOwners[0])?.label
                          : null;
                      const ownerInherited = !item.ownerId && selectedMissionOwners.length > 0;

                      // Period: item override or inherited from mission
                      const hasPeriod = item.period[0] && item.period[1];
                      const periodLabel = hasPeriod
                        ? `${String(item.period[0]!.day).padStart(2, "0")}/${String(item.period[0]!.month).padStart(2, "0")} – ${String(item.period[1]!.day).padStart(2, "0")}/${String(item.period[1]!.month).padStart(2, "0")}`
                        : missionPeriod[0] && missionPeriod[1]
                          ? `${String(missionPeriod[0].day).padStart(2, "0")}/${String(missionPeriod[0].month).padStart(2, "0")} – ${String(missionPeriod[1].day).padStart(2, "0")}/${String(missionPeriod[1].month).padStart(2, "0")}`
                          : null;
                      const periodInherited = !hasPeriod && !!(missionPeriod[0] && missionPeriod[1]);

                      return (
                        <>
                          {ownerLabel && (
                            <Badge color={ownerInherited ? "neutral" : "orange"} size="sm" leftIcon={UserCircle}>
                              {ownerLabel}
                            </Badge>
                          )}
                          {periodLabel && (
                            <Badge color={periodInherited ? "neutral" : "orange"} size="sm" leftIcon={Calendar}>
                              {periodLabel}
                            </Badge>
                          )}
                        </>
                      );
                    })()}
                    {goalSummary && <span className={styles.addedItemGoal}>{goalSummary}</span>}
                  </div>
                </div>
                <div className={styles.addedItemActions}>
                  <Button variant="tertiary" size="sm" leftIcon={PencilSimple} aria-label="Editar item" onClick={handleEdit} />
                  <Button variant="tertiary" size="sm" leftIcon={X} aria-label="Remover item" onClick={handleRemove} />
                </div>
              </div>

              {canHaveChildren && isExpanded && (
                <div className={styles.subMissionChildren}>
                  {renderMissionItems(item.children ?? [], item.id, item.measurementMode)}
                </div>
              )}
            </div>
          );
        })}

        {/* Add new item form / button (only when NOT editing an existing item at this level) */}
        {(() => {
          // Inside a task: nothing can be added
          if (parentMeasurementMode === "task") return null;
          const tplCfg = getTemplateConfig(selectedTemplate);
          const isInsideKR = parentMeasurementMode && parentMeasurementMode !== "mission";
          const addLabel = isInsideKR ? "Adicionar tarefa" : isNested ? "Adicionar item" : tplCfg.addItemLabel;
          if (editingItem && !isEditingExisting && editingParentId === parentId) {
            return isNested ? (
              <div className={styles.subMissionFormRow}>{renderInlineForm()}</div>
            ) : (
              renderInlineForm()
            );
          }
          if (!editingItem || editingParentId !== parentId) {
            const handleAdd = () => {
              setIsEditingExisting(false);
              setEditingParentId(parentId);
              setEditingParentMode(parentMeasurementMode ?? null);
              setEditingItem({
                id: `item-${Date.now()}`,
                name: "",
                description: "",
                measurementMode: isInsideKR ? "task" : null,
                manualType: null,
                surveyId: null,
                period: [null, null],
                goalValue: "",
                goalValueMin: "",
                goalValueMax: "",
                goalUnit: "",
                ownerId: null,
                teamId: null,
              });
            };
            return isNested ? (
              <div className={styles.subMissionFormRow}>
                <button type="button" className={styles.addItemBtn} onClick={handleAdd}>
                  <span>{addLabel}</span>
                  <PlusSquare size={16} />
                </button>
              </div>
            ) : (
              <button type="button" className={styles.addItemBtn} onClick={handleAdd}>
                <span>{addLabel}</span>
                <PlusSquare size={16} />
              </button>
            );
          }
          return null;
        })()}
      </>
    );
  }

  function renderMissionCard(mission: Mission) {
    const mKRs = mission.keyResults ?? [];
    const totalIndicators = mKRs.length + (mission.children ?? []).reduce((acc, c) => acc + (c.keyResults ?? []).length, 0);
    return (
      <Card
        key={mission.id}
        padding="sm"
        className={`${styles.missionCardGrid} ${mission.status === "draft" ? styles.missionCardDraft : ""} ${styles.indicatorRowClickable}`}
        onClick={() => setExpandedMission(mission)}
      >
        <CardBody>
          <div className={styles.cardGridHeader}>
            <Chart value={mission.progress} size={48} />
            <div className={styles.cardGridMeta}>
              <span className={styles.cardGridTitle}>{mission.title}</span>
              <span className={styles.cardGridSub}>
                {totalIndicators} {totalIndicators === 1 ? "indicador" : "indicadores"}
                {(mission.children?.length ?? 0) > 0 && ` · ${mission.children!.length} sub-${mission.children!.length === 1 ? "missão" : "missões"}`}
              </span>
            </div>
            {mission.status === "draft" && <Badge color="caramel">Rascunho</Badge>}
          </div>
          <div className={styles.cardGridFooter}>
            <AvatarGroup
              size="xs"
              avatars={[...new Set(mKRs.map((kr) => getOwnerInitials(kr.owner)))].map((initials) => ({
                initials,
                alt: ownerFilterOptions.find((o) => o.initials === initials)?.label ?? initials,
              }))}
              maxVisible={4}
            />
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div className={styles.cardGridActions} onClick={(e) => e.stopPropagation()}>
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={PencilSimple}
                aria-label="Editar missão"
                onClick={() => handleEditMission(mission)}
              />
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={Trash}
                aria-label="Excluir missão"
                onClick={() => handleDeleteMission(mission)}
              />
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={ArrowsOutSimple}
                aria-label="Expandir missão"
                onClick={() => setExpandedMission(mission)}
              />
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  function TeamSectionHeader({ teamName, teamColor, missions: groupMissions }: {
    teamName: string;
    teamColor: string;
    missions: Mission[];
  }) {
    const avgProgress = groupMissions.length > 0
      ? Math.round(groupMissions.reduce((a, m) => a + m.progress, 0) / groupMissions.length)
      : 0;
    return (
      <div className={styles.teamSectionHeader}>
        <span
          className={styles.teamDot}
          style={{ backgroundColor: `var(--color-${teamColor}-500)` }}
        />
        <span className={styles.teamSectionName}>{teamName}</span>
        <span className={styles.teamSectionMeta}>
          {groupMissions.length} {groupMissions.length === 1 ? "missão" : "missões"} · {avgProgress}%
        </span>
        <div className={styles.teamSectionLine} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={focusMission ? focusMission.title : currentView ? currentView.name : customTitle ? customTitle : mine ? "Minhas missões" : isSingleTeam && singleTeamName ? `Missões — ${singleTeamName}` : "Todas as missões"} />

      {/* ── Focus mode: single mission detail ── */}
      {focusMission ? (
        <Card padding="sm">
          {focusBreadcrumb.length > 0 && (
            <Breadcrumb items={[{ label: "Todas as missões", onClick: () => navigate("/missions") }, ...focusBreadcrumb]} current={focusBreadcrumb.length} />
          )}
          <CardBody>
            <div className={styles.missionList}>
              <MissionItem
                mission={focusMission}
                isOpen
                hideExpand
                onToggle={toggleMission}
                onExpand={setExpandedMission}
                onEdit={handleEditMission}
                onDelete={handleDeleteMission}
                onCheckin={handleOpenCheckin}
                onToggleTask={handleToggleTask}
                onOpenTaskDrawer={handleOpenTaskDrawer}
                expandedMissions={expandedMissions}
                openRowMenu={openRowMenu}
                setOpenRowMenu={setOpenRowMenu}
                openContributeFor={openContributeFor}
                setOpenContributeFor={setOpenContributeFor}
                contributePickerSearch={contributePickerSearch}
                setContributePickerSearch={setContributePickerSearch}
                rowMenuBtnRefs={rowMenuBtnRefs}
                allMissions={flatMissions}
                onAddContribution={handleAddContribution}
                onRemoveContribution={handleRequestRemoveContribution}
                onOpenExternalContrib={handleOpenExternalContrib}
                onToggleSubtask={handleToggleSubtask}
              />
            </div>
          </CardBody>
        </Card>
      ) : (
        <>

      <Card padding="sm">
        <CardBody>
          <FilterBar
            key={filterBarDefaultOpen ? "open" : "default"}
            filters={FILTER_OPTIONS.filter((f) => !activeFilters.includes(f.id))}
            onAddFilter={(id: string) => {
              setFilterBarDefaultOpen(false);
              handleAddFilter(id);
            }}
            onClearAll={activeFilters.length > 0 ? handleClearAll : undefined}
            onSaveView={activeFilters.length > 0 ? handleOpenSaveModal : undefined}
            saveViewLabel={currentView ? "Atualizar visualização" : "Salvar visualização"}
            defaultOpen={filterBarDefaultOpen}
            primaryAction={
              currentView ? (
                <button
                  type="button"
                  className={styles.deleteViewBtn}
                  onClick={handleDeleteView}
                  aria-label="Excluir visualização"
                >
                  <Trash size={14} />
                  <span>Excluir</span>
                </button>
              ) : undefined
            }
          >
            {activeFilters.map((filterId) =>
              (
                <div key={filterId} ref={chipRefs[filterId]} style={{ display: "inline-flex" }}>
                    <FilterChip
                      label={getFilterLabel(filterId)}
                      icon={filterChipIcons[filterId]}
                      active={openFilter === filterId}
                      onClick={() => setOpenFilter(openFilter === filterId ? null : filterId)}
                      onRemove={() => handleRemoveFilter(filterId)}
                    />
                </div>
              ),
            )}
          </FilterBar>

          {/* ——— Filter dropdowns ——— */}

          <FilterDropdown
            open={openFilter === "team"}
            onClose={() => setOpenFilter(null)}
            anchorRef={teamChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {teamFilterOptions.map((opt) => {
                const isAll = opt.id === "all";
                const checked = isAll
                  ? selectedTeams.length === 0 || selectedTeams.includes("all")
                  : selectedTeams.some((teamId) => resolveTeamId(teamId) === opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      if (isAll) {
                        setSelectedTeams(["all"]);
                      } else {
                        setSelectedTeams((prev) => {
                          const withoutAll = prev.filter((id) => id !== "all").map((id) => resolveTeamId(id));
                          const without = Array.from(new Set(withoutAll));
                          return without.includes(opt.id)
                            ? without.filter((id) => id !== opt.id)
                            : [...without, opt.id];
                        });
                      }
                    }}
                  >
                    <Checkbox checked={checked} readOnly />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </FilterDropdown>



          <FilterDropdown
            open={openFilter === "status"}
            onClose={() => setOpenFilter(null)}
            anchorRef={statusChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.filterDropdownItem} ${selectedStatus === opt.id ? styles.filterDropdownItemActive : ""}`}
                  onClick={() => {
                    setSelectedStatus(opt.id);
                    setOpenFilter(null);
                  }}
                >
                  <Radio checked={selectedStatus === opt.id} readOnly />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </FilterDropdown>

          <FilterDropdown
            open={openFilter === "owner"}
            onClose={() => setOpenFilter(null)}
            anchorRef={ownerChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {ownerFilterOptions.map((opt) => {
                const isAll = opt.id === "all";
                const checked = isAll
                  ? selectedOwners.length === 0 || selectedOwners.includes("all")
                  : selectedOwners.some((ownerId) => resolveUserId(ownerId) === opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      if (isAll) {
                        setSelectedOwners(["all"]);
                      } else {
                        setSelectedOwners((prev) => {
                          const withoutAll = prev.filter((id) => id !== "all").map((id) => resolveUserId(id));
                          const without = Array.from(new Set(withoutAll));
                          return without.includes(opt.id)
                            ? without.filter((id) => id !== opt.id)
                            : [...without, opt.id];
                        });
                      }
                    }}
                  >
                    <Checkbox checked={checked} readOnly />
                    {opt.initials && <Avatar initials={opt.initials} size="xs" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </FilterDropdown>

          <FilterDropdown
            open={openFilter === "itemType"}
            onClose={() => setOpenFilter(null)}
            anchorRef={itemTypeChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {ITEM_TYPE_OPTIONS.map((opt) => {
                const isAll = opt.id === "all";
                const checked = isAll
                  ? selectedItemTypes.length === 0 || selectedItemTypes.includes("all")
                  : selectedItemTypes.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      if (isAll) {
                        setSelectedItemTypes(["all"]);
                      } else {
                        setSelectedItemTypes((prev) => {
                          const without = prev.filter((id) => id !== "all");
                          const next = without.includes(opt.id)
                            ? without.filter((id) => id !== opt.id)
                            : [...without, opt.id];
                          return next.length > 0 ? next : ["all"];
                        });
                      }
                    }}
                  >
                    <Checkbox checked={checked} readOnly />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </FilterDropdown>

          <FilterDropdown
            open={openFilter === "indicatorType"}
            onClose={() => setOpenFilter(null)}
            anchorRef={indicatorTypeChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {INDICATOR_TYPE_OPTIONS.map((opt) => {
                const isAll = opt.id === "all";
                const checked = isAll
                  ? selectedIndicatorTypes.length === 0 || selectedIndicatorTypes.includes("all")
                  : selectedIndicatorTypes.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      if (isAll) {
                        setSelectedIndicatorTypes(["all"]);
                      } else {
                        setSelectedIndicatorTypes((prev) => {
                          const without = prev.filter((id) => id !== "all");
                          const next = without.includes(opt.id)
                            ? without.filter((id) => id !== opt.id)
                            : [...without, opt.id];
                          return next.length > 0 ? next : ["all"];
                        });
                      }
                    }}
                  >
                    <Checkbox checked={checked} readOnly />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </FilterDropdown>

          <FilterDropdown
            open={openFilter === "contribution"}
            onClose={() => setOpenFilter(null)}
            anchorRef={contributionChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {CONTRIBUTION_OPTIONS.map((opt) => {
                const isAll = opt.id === "all";
                const checked = isAll
                  ? selectedContributions.length === 0 || selectedContributions.includes("all")
                  : selectedContributions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      if (isAll) {
                        setSelectedContributions(["all"]);
                      } else {
                        setSelectedContributions((prev) => {
                          const without = prev.filter((id) => id !== "all");
                          const next = without.includes(opt.id)
                            ? without.filter((id) => id !== opt.id)
                            : [...without, opt.id];
                          return next.length > 0 ? next : ["all"];
                        });
                      }
                    }}
                  >
                    <Checkbox checked={checked} readOnly />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </FilterDropdown>

          {/* ——— Filtro: Time de apoio ——— */}
          <FilterDropdown
            open={openFilter === "supporter"}
            onClose={() => setOpenFilter(null)}
            anchorRef={supporterChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {ownerFilterOptions.map((opt) => {
                const isAll = opt.id === "all";
                const checked = isAll
                  ? selectedSupporters.length === 0 || selectedSupporters.includes("all")
                  : selectedSupporters.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      if (isAll) {
                        setSelectedSupporters(["all"]);
                      } else {
                        setSelectedSupporters((prev) => {
                          const without = prev.filter((id) => id !== "all");
                          return without.includes(opt.id)
                            ? without.filter((id) => id !== opt.id)
                            : [...without, opt.id];
                        });
                      }
                    }}
                  >
                    <Checkbox checked={checked} readOnly />
                    {opt.initials && <Avatar initials={opt.initials} size="xs" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </FilterDropdown>

          <FilterDropdown
            open={openFilter === "taskState"}
            onClose={() => setOpenFilter(null)}
            anchorRef={taskStateChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {TASK_STATE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.filterDropdownItem} ${selectedTaskState === opt.id ? styles.filterDropdownItemActive : ""}`}
                  onClick={() => {
                    setSelectedTaskState(opt.id);
                    setOpenFilter(null);
                  }}
                >
                  <Radio checked={selectedTaskState === opt.id} readOnly />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </FilterDropdown>

          <FilterDropdown
            open={openFilter === "missionStatus"}
            onClose={() => setOpenFilter(null)}
            anchorRef={missionStatusChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {MISSION_STATUS_OPTIONS.map((opt) => {
                const isAll = opt.id === "all";
                const checked = isAll
                  ? selectedMissionStatuses.length === 0 || selectedMissionStatuses.includes("all")
                  : selectedMissionStatuses.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      if (isAll) {
                        setSelectedMissionStatuses(["all"]);
                      } else {
                        setSelectedMissionStatuses((prev) => {
                          const without = prev.filter((id) => id !== "all");
                          const next = without.includes(opt.id)
                            ? without.filter((id) => id !== opt.id)
                            : [...without, opt.id];
                          return next.length > 0 ? next : ["all"];
                        });
                      }
                    }}
                  >
                    <Checkbox checked={checked} readOnly />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </FilterDropdown>

          {/* Period filter dropdown — presets */}
          <FilterDropdown
            open={openFilter === "period"}
            onClose={() => { setOpenFilter(null); setFilterPeriodCustom(false); }}
            anchorRef={periodChipRef}
            ignoreRefs={ignoreChipRefs}
          >
            <div className={styles.filterDropdownBody}>
              {presetPeriods.map((p) => {
                const isActive = selectedPeriod[0]?.year === p.start.year
                  && selectedPeriod[0]?.month === p.start.month
                  && selectedPeriod[0]?.day === p.start.day
                  && selectedPeriod[1]?.year === p.end.year
                  && selectedPeriod[1]?.month === p.end.month
                  && selectedPeriod[1]?.day === p.end.day;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${isActive ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      setSelectedPeriod([p.start, p.end]);
                      setOpenFilter(null);
                      setFilterPeriodCustom(false);
                    }}
                  >
                    <Radio checked={isActive} readOnly />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.periodDropdownFooter}>
              <button
                ref={filterPeriodCustomBtnRef}
                type="button"
                className={`${styles.filterDropdownItem} ${filterPeriodCustom ? styles.filterDropdownItemActive : ""}`}
                onClick={() => setFilterPeriodCustom((v) => !v)}
              >
                <Plus size={14} />
                <span>Período personalizado</span>
                <CaretRight size={12} className={styles.moreMenuArrow} />
              </button>
            </div>
          </FilterDropdown>

          {/* Period filter — sub-panel: custom calendar */}
          <FilterDropdown
            open={openFilter === "period" && filterPeriodCustom}
            onClose={() => setFilterPeriodCustom(false)}
            anchorRef={filterPeriodCustomBtnRef}
            placement="right-start"
            noOverlay
          >
            <div className={styles.periodCustomPopover}>
              <DatePicker
                mode="range"
                value={selectedPeriod}
                onChange={(range: [CalendarDate | null, CalendarDate | null]) => {
                  setSelectedPeriod(range);
                  if (range[0] && range[1]) {
                    setOpenFilter(null);
                    setFilterPeriodCustom(false);
                  }
                }}
              />
            </div>
          </FilterDropdown>

          <div className={styles.actionBar}>
            <Button
              ref={viewModeBtnRef}
              variant="secondary"
              size="md"
              leftIcon={viewMode === "list" ? ListBullets : viewMode === "cards" ? SquaresFour : Kanban}
              rightIcon={CaretDown}
              onClick={() => setViewModeOpen((v) => !v)}
            >
              {viewMode === "list" ? "Vendo em lista" : viewMode === "cards" ? "Vendo em cartões" : "Vendo em kanban"}
            </Button>
            <FilterDropdown
              open={viewModeOpen}
              onClose={() => setViewModeOpen(false)}
              anchorRef={viewModeBtnRef}
              noOverlay
            >
              <div className={styles.filterDropdownBody}>
                {([
                  { id: "list", label: "Lista", icon: ListBullets },
                  { id: "cards", label: "Cartões", icon: SquaresFour },
                  { id: "kanban", label: "Kanban", icon: Kanban },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.filterDropdownItem} ${viewMode === opt.id ? styles.filterDropdownItemActive : ""}`}
                    onClick={() => {
                      setViewMode(opt.id);
                      setViewModeOpen(false);
                    }}
                  >
                    <opt.icon size={14} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </FilterDropdown>
            <Button
              variant="primary"
              size="md"
              leftIcon={Plus}
              onClick={() => {
                setCreateStep(0);
                setSelectedTemplate(undefined);
                setShowCreateAssistant(false);
                setNewMissionName("");
                setNewMissionDesc("");
                setNewMissionItems([]);
                setCreateOpen(true);
              }}
            >
              Criar missão
            </Button>
          </div>
        </CardBody>

        <CardDivider />

        <CardBody>
          <div className={styles.summaryRow}>
            <Card padding="sm">
              <CardBody>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>Progresso geral</span>
                  <GoalProgressBar
                    label=""
                    value={totalValue}
                    target={100}
                    expected={totalExpected}
                    formattedValue={`${totalValue}%`}
                  />
                  <span className={styles.summaryExpected}>Esperado {totalExpected}%</span>
                </div>
              </CardBody>
            </Card>

            <Card padding="sm">
              <CardBody>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryMetric}>
                    <span className={styles.summaryValue}>{activeMissions}</span>
                    <span className={styles.summaryLabel}>Missões ativas</span>
                  </div>
                  <Tooltip content="Total de missões em andamento no período selecionado">
                    <Info size={16} className={styles.infoIcon} />
                  </Tooltip>
                </div>
              </CardBody>
            </Card>

            <Card padding="sm">
              <CardBody>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryMetric}>
                    <span className={styles.summaryValueWarning}>{outdatedIndicators}</span>
                    <span className={styles.summaryLabel}>Indicadores desatualizados</span>
                  </div>
                  <Tooltip content="Indicadores com status 'Atrasado' que precisam de atenção">
                    <Info size={16} className={styles.infoIcon} />
                  </Tooltip>
                </div>
              </CardBody>
            </Card>
          </div>
        </CardBody>

        <CardDivider />

        {viewMode === "list" && (
          <CardBody>
            <div className={styles.missionList}>
              {groupedMissions
                ? groupedMissions.map((group) => (
                    <Fragment key={group.teamName}>
                      <TeamSectionHeader teamName={group.teamName} teamColor={group.teamColor} missions={group.missions} />
                      {group.missions.map((mission) => (
                        <MissionItem
                          key={mission.id}
                          mission={mission}
                          isOpen={expandedMissions.has(mission.id)}
                          onToggle={toggleMission}
                          onExpand={setExpandedMission}
                          onEdit={handleEditMission}
                          onDelete={handleDeleteMission}
                          onCheckin={handleOpenCheckin}
                          onToggleTask={handleToggleTask}
                          onOpenTaskDrawer={handleOpenTaskDrawer}
                          expandedMissions={expandedMissions}
                          openRowMenu={openRowMenu}
                          setOpenRowMenu={setOpenRowMenu}
                          openContributeFor={openContributeFor}
                          setOpenContributeFor={setOpenContributeFor}
                          contributePickerSearch={contributePickerSearch}
                          setContributePickerSearch={setContributePickerSearch}
                          rowMenuBtnRefs={rowMenuBtnRefs}
                          allMissions={flatMissions}
                          onAddContribution={handleAddContribution}
                          onRemoveContribution={handleRequestRemoveContribution}
                onOpenExternalContrib={handleOpenExternalContrib}
                onToggleSubtask={handleToggleSubtask}
                        />
                      ))}
                    </Fragment>
                  ))
                : displayedMissions.map((mission) => (
                    <MissionItem
                      key={mission.id}
                      mission={mission}
                      isOpen={expandedMissions.has(mission.id)}
                      onToggle={toggleMission}
                      onExpand={setExpandedMission}
                      onEdit={handleEditMission}
                      onDelete={handleDeleteMission}
                      onCheckin={handleOpenCheckin}
                      onToggleTask={handleToggleTask}
                      onOpenTaskDrawer={handleOpenTaskDrawer}
                      expandedMissions={expandedMissions}
                      openRowMenu={openRowMenu}
                      setOpenRowMenu={setOpenRowMenu}
                      openContributeFor={openContributeFor}
                      setOpenContributeFor={setOpenContributeFor}
                      contributePickerSearch={contributePickerSearch}
                      setContributePickerSearch={setContributePickerSearch}
                      rowMenuBtnRefs={rowMenuBtnRefs}
                      allMissions={flatMissions}
                      onAddContribution={handleAddContribution}
                      onRemoveContribution={handleRequestRemoveContribution}
                onOpenExternalContrib={handleOpenExternalContrib}
                onToggleSubtask={handleToggleSubtask}
                    />
                  ))
              }
            </div>
          </CardBody>
        )}

        {viewMode === "cards" && (
          <CardBody>
            <div className={styles.cardsGrid}>
              {groupedMissions
                ? groupedMissions.map((group) => (
                    <Fragment key={group.teamName}>
                      <div className={styles.teamSectionHeaderCards}>
                        <TeamSectionHeader teamName={group.teamName} teamColor={group.teamColor} missions={group.missions} />
                      </div>
                      {group.missions.map((mission) => renderMissionCard(mission))}
                    </Fragment>
                  ))
                : displayedMissions.map((mission) => renderMissionCard(mission))
              }
            </div>
          </CardBody>
        )}

        {viewMode === "kanban" && (
          <CardBody>
            <div className={styles.kanbanBoard}>
              {KANBAN_COLUMNS.map((col) => {
                const colItems = kanbanItems.filter((item) => getKanbanStatus(item.id) === col.id);
                const isDropTarget = dragOverColumn === col.id && draggedItemId !== null;

                return (
                  <div
                    key={col.id}
                    className={`${styles.kanbanColumn} ${isDropTarget ? styles.kanbanColumnDropTarget : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverColumn(col.id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverColumn(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const itemId = e.dataTransfer.getData("text/plain");
                      if (itemId) moveToKanban(itemId, col.id);
                      setDragOverColumn(null);
                      setDraggedItemId(null);
                    }}
                  >
                    <div className={styles.kanbanColumnHeader}>
                      <span className={styles.kanbanColumnDot} style={{ backgroundColor: col.color }} />
                      <span className={styles.kanbanColumnTitle}>{col.label}</span>
                      <span className={styles.kanbanColumnCount}>{colItems.length}</span>
                    </div>
                    <div className={styles.kanbanColumnBody}>
                      {colItems.map((item) => {
                        const Icon = item.icon;
                        const hasChildren = item.type === "mission" && (item.children?.length ?? 0) > 0;
                        const isExpanded = kanbanExpanded.has(item.id);
                        const isDragging = draggedItemId === item.id;

                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", item.id);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggedItemId(item.id);
                            }}
                            onDragEnd={() => {
                              setDraggedItemId(null);
                              setDragOverColumn(null);
                            }}
                            className={`${styles.kanbanCardWrapper} ${isDragging ? styles.kanbanCardDragging : ""}`}
                          >
                            <Card
                              padding="sm"
                              className={`${styles.kanbanCard} ${styles.indicatorRowClickable}`}
                              onClick={() => {
                                if (item.type === "task") {
                                  const task = findTaskById(item.id, missions);
                                  if (task) handleOpenTaskDrawer(task.task, task.parentLabel);
                                } else {
                                  const ind = findIndicatorById(item.id, missions);
                                  if (ind) handleOpenCheckin({ keyResult: ind, currentValue: ind.progress, newValue: ind.progress });
                                }
                              }}
                            >
                              <CardBody>
                                <div className={styles.kanbanCardRow}>
                                  {item.type === "task" && (
                                    <span className={styles.kanbanTaskCheck} onClick={(e) => e.stopPropagation()}>
                                      <Checkbox checked={item.done ?? false} onChange={() => handleToggleTask(item.id)} />
                                    </span>
                                  )}
                                  {item.type !== "task" && Icon && <Icon size={20} className={styles.kanbanCardIcon} />}
                                  {item.type === "mission" && !Icon && <Target size={20} className={styles.kanbanCardIcon} />}
                                  <div className={styles.kanbanCardInfo}>
                                    <span className={`${styles.kanbanCardTitle} ${item.type === "task" && item.done ? styles.taskNameDone : ""}`}>{item.label}</span>
                                    <span className={styles.kanbanCardMission}>{item.missionTitle}</span>
                                    {isMultiTeam && item.teamName && (
                                      <span className={styles.kanbanTeamTag}>
                                        <span className={styles.teamDot} style={{ backgroundColor: `var(--color-${item.teamColor ?? "neutral"}-500)` }} />
                                        {item.teamName}
                                      </span>
                                    )}
                                  </div>
                                  {hasChildren && (
                                    <button
                                      type="button"
                                      className={styles.kanbanExpandBtn}
                                      onClick={() => toggleKanbanExpand(item.id)}
                                      aria-label={isExpanded ? "Recolher" : "Expandir"}
                                    >
                                      {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                                    </button>
                                  )}
                                </div>
                                {item.type === "task" ? (
                                  <div className={styles.kanbanTaskStatus}>
                                    <Badge color={item.done ? "success" : "neutral"}>
                                      {item.done ? "Concluída" : "Pendente"}
                                    </Badge>
                                  </div>
                                ) : (
                                  <>
                                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                                    <div className={styles.kanbanCardProgress} onClick={(e) => e.stopPropagation()}>
                                      <GoalProgressBar
                                        label=""
                                        value={item.value}
                                        target={item.target}
                                        formattedValue={`${item.value}%`}
                                        onChange={(v: number) => { kanbanDragRef.current = { itemId: item.id, value: v }; }}
                                      />
                                    </div>
                                  </>
                                )}
                                <div className={styles.kanbanCardFooter}>
                                  <div className={styles.kanbanCardMeta}>
                                    <AvatarGroup
                                      size="xs"
                                      avatars={[
                                        { initials: item.ownerInitials, alt: item.ownerName },
                                      ]}
                                      maxVisible={3}
                                    />
                                    {item.period && <span className={styles.kanbanCardPeriod}>{item.period}</span>}
                                  </div>
                                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                                  <div className={styles.cardGridActions} onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      ref={(el: HTMLButtonElement | null) => { kanbanMoveBtnRefs.current[item.id] = el; }}
                                      variant="tertiary"
                                      size="sm"
                                      leftIcon={ArrowRight}
                                      aria-label="Mover"
                                      onClick={() => setKanbanMoveOpen((prev) => prev === item.id ? null : item.id)}
                                    />
                                    <FilterDropdown
                                      open={kanbanMoveOpen === item.id}
                                      onClose={() => setKanbanMoveOpen(null)}
                                      anchorRef={{ current: kanbanMoveBtnRefs.current[item.id] ?? null }}
                                      noOverlay
                                    >
                                      <div className={styles.filterDropdownBody}>
                                        <span className={styles.kanbanMoveLabel}>Mover para</span>
                                        {KANBAN_COLUMNS.filter((c) => c.id !== col.id).map((target) => (
                                          <button
                                            key={target.id}
                                            type="button"
                                            className={styles.filterDropdownItem}
                                            onClick={() => moveToKanban(item.id, target.id)}
                                          >
                                            <span className={styles.kanbanColumnDot} style={{ backgroundColor: target.color }} />
                                            <span>{target.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </FilterDropdown>
                                    {item.type !== "task" && (
                                      <Button
                                        variant="tertiary"
                                        size="sm"
                                        leftIcon={PencilSimple}
                                        aria-label="Editar indicador"
                                        onClick={() => {
                                          const ind = findIndicatorById(item.id, missions);
                                          if (ind) handleOpenCheckin({ keyResult: ind, currentValue: ind.progress, newValue: ind.progress });
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                                {/* Expandable children */}
                                {hasChildren && isExpanded && (
                                  <div className={styles.kanbanChildren}>
                                    {item.children!.map((child) => {
                                      const ChildIcon = child.icon;
                                      return (
                                        <div key={child.id} className={styles.kanbanChildItem}>
                                          {ChildIcon && <ChildIcon size={14} className={styles.kanbanChildIcon} />}
                                          <div className={styles.kanbanChildInfo}>
                                            <span className={styles.kanbanChildLabel}>{child.label}</span>
                                            <div className={styles.kanbanChildProgress}>
                                              <GoalProgressBar
                                                label=""
                                                value={child.value}
                                                target={child.target}
                                                formattedValue={`${child.value}%`}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </CardBody>
                            </Card>
                          </div>
                        );
                      })}
                      {colItems.length === 0 && (
                        <span className={styles.kanbanEmpty}>Nenhum item</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        )}
      </Card>
      </>
      )}

      <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} size="sm">
        <ModalHeader
          title={currentView ? "Atualizar visualização" : "Salvar visualização"}
          description={
            currentView
              ? "Atualize o nome ou os filtros desta visualização salva."
              : "Defina um nome para esta combinação de filtros. Você poderá aplicá-la rapidamente no futuro."
          }
          onClose={() => setSaveModalOpen(false)}
        />
        <ModalBody>
          <div className={styles.saveModalContent}>
            <Input
              label="Nome da visualização"
              placeholder="Ex: Recrutamento setembro"
              value={viewName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setViewName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") handleSaveView();
              }}
            />
            <div className={styles.saveFiltersSummary}>
              <span className={styles.saveFiltersTitle}>Filtros incluídos</span>
              <ul className={styles.saveFiltersList}>
                {activeFilters.map((filterId) => {
                  const Icon = filterChipIcons[filterId];
                  const filterMeta = FILTER_OPTIONS.find((f) => f.id === filterId);
                  return (
                    <li key={filterId} className={styles.saveFilterItem}>
                      {Icon && <Icon size={14} className={styles.saveFilterIcon} />}
                      <span className={styles.saveFilterName}>{filterMeta?.label ?? filterId}</span>
                      <span className={styles.saveFilterValue}>{getFilterValueSummary(filterId)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setSaveModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSaveView} disabled={!viewName.trim()}>
            {currentView ? "Atualizar" : "Salvar"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        key={`expanded-mission-${expandedMissionOverlayKey}`}
        open={expandedMission !== null}
        onClose={() => setExpandedMission(null)}
        size="lg"
      >
        {expandedMission && (
          <>
            <ModalHeader title={expandedMission.title} onClose={() => setExpandedMission(null)} />
            <ModalBody>
              <ModalMissionContent
                mission={expandedMission}
                onExpand={setExpandedMission}
                onEdit={handleEditMission}
                onDelete={handleDeleteMission}
                onCheckin={handleOpenCheckin}
                onToggleTask={handleToggleTask}
                onOpenTaskDrawer={handleOpenTaskDrawer}
                onAddContribution={handleAddContribution}
                onRemoveContribution={handleRequestRemoveContribution}
                onOpenExternalContrib={handleOpenExternalContrib}
                onToggleSubtask={handleToggleSubtask}
                allMissions={flatMissions}
              />
            </ModalBody>
          </>
        )}
      </Modal>

      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="sm">
        <ModalHeader
          title={
            <span className={styles.dangerTitle}>
              <Warning size={20} className={styles.dangerIcon} />
              Excluir visualização
            </span>
          }
          description="Esta ação não pode ser desfeita."
          onClose={() => setDeleteModalOpen(false)}
        />
        <ModalBody>
          <p className={styles.deleteText}>
            A visualização <strong>&quot;{currentView?.name}&quot;</strong> será
            excluída permanentemente. Os filtros salvos serão perdidos.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeleteModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" size="md" onClick={handleConfirmDelete}>
            Excluir visualização
          </Button>
        </ModalFooter>
      </Modal>

      {/* ——— Remove contribution confirmation modal ——— */}
      <Modal open={!!removeContribConfirm} onClose={() => setRemoveContribConfirm(null)} size="sm">
        <ModalHeader
          title="Remover contribuição"
          description="Esta ação não pode ser desfeita."
          onClose={() => setRemoveContribConfirm(null)}
        />
        <ModalBody>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--color-neutral-700)", margin: 0, lineHeight: 1.5 }}>
            Tem certeza que deseja remover a contribuição para <strong>{removeContribConfirm?.targetMissionTitle}</strong>?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="md" onClick={() => setRemoveContribConfirm(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="md"
            leftIcon={Trash}
            onClick={() => {
              if (!removeContribConfirm) return;
              handleRemoveContribution(removeContribConfirm.itemId, removeContribConfirm.itemType, removeContribConfirm.targetMissionId);
              setRemoveContribConfirm(null);
            }}
          >
            Remover
          </Button>
        </ModalFooter>
      </Modal>

      {/* ——— Edit single indicator modal ——— */}
      {/* ——— Indicator / Task detail drawer ——— */}
      <MissionDetailsDrawer
        key={`mission-details-drawer-${drawerOverlayKey}`}
        drawerOpen={drawerOpen}
        drawerMode={drawerMode}
        drawerIndicator={drawerIndicator}
        drawerTask={drawerTask}
        drawerMissionTitle={drawerMissionTitle}
        drawerEditing={drawerEditing}
        editingItem={editingItem}
        renderInlineForm={renderInlineForm}
        startDrawerEdit={startDrawerEdit}
        handleCloseDrawer={handleCloseDrawer}
        drawerContributesTo={drawerContributesTo}
        setDrawerContributesTo={setDrawerContributesTo}
        drawerItemId={drawerItemId}
        handleRequestRemoveContribution={handleRequestRemoveContribution}
        drawerContribPickerOpen={drawerContribPickerOpen}
        setDrawerContribPickerOpen={setDrawerContribPickerOpen}
        drawerContribPickerSearch={drawerContribPickerSearch}
        setDrawerContribPickerSearch={setDrawerContribPickerSearch}
        addContribRef={addContribRef}
        allMissions={flatMissions}
        drawerSourceMissionId={drawerSourceMissionId}
        drawerSourceMissionTitle={drawerSourceMissionTitle}
        handleAddContribution={handleAddContribution}
        supportTeam={supportTeam}
        setSupportTeam={setSupportTeam}
        addSupportOpen={addSupportOpen}
        setAddSupportOpen={setAddSupportOpen}
        addSupportRef={addSupportRef}
        supportSearch={supportSearch}
        setSupportSearch={setSupportSearch}
        ownerOptions={missionOwnerOptions}
        drawerValue={drawerValue}
        setDrawerValue={setDrawerValue}
        drawerConfidence={drawerConfidence}
        setDrawerConfidence={setDrawerConfidence}
        confidenceOpen={confidenceOpen}
        setConfidenceOpen={setConfidenceOpen}
        confidenceBtnRef={confidenceBtnRef}
        confidenceOptions={CONFIDENCE_OPTIONS}
        drawerNote={drawerNote}
        drawerNoteRef={drawerNoteRef}
        handleNoteChange={handleNoteChange}
        handleNoteKeyDown={handleNoteKeyDown}
        mentionQuery={mentionQuery}
        mentionIndex={mentionIndex}
        mentionResults={mentionResults}
        insertMention={insertMention}
        handleConfirmCheckin={handleConfirmCheckin}
        checkInHistoryForIndicator={drawerCheckIns}
        checkInChartDataForIndicator={drawerCheckInChartData}
        checkInSyncStateById={drawerCheckInSyncStateById}
        retryCheckInSync={retryCheckInSync}
        onUpdateCheckIn={handleUpdateDrawerCheckIn}
        onDeleteCheckIn={handleDeleteDrawerCheckIn}
        newlyCreatedCheckInId={newlyCreatedCheckInId}
        drawerTasks={drawerTasks}
        setDrawerTasks={setDrawerTasks}
        newTaskLabel={newTaskLabel}
        setNewTaskLabel={setNewTaskLabel}
        setDrawerTask={setDrawerTask}
      />

      {/* ——— Delete mission confirmation modal ——— */}
      <Modal open={!!deleteMissionTarget} onClose={() => setDeleteMissionTarget(null)} size="sm">
        <ModalHeader
          title={
            <span className={styles.dangerTitle}>
              <Warning size={20} className={styles.dangerIcon} />
              Excluir missão
            </span>
          }
          description="Esta ação não pode ser desfeita."
          onClose={() => setDeleteMissionTarget(null)}
        />
        <ModalBody>
          {deleteMissionTarget && (() => {
            const krs = deleteMissionTarget.keyResults ?? [];
            const tasks = deleteMissionTarget.tasks ?? [];
            const children = deleteMissionTarget.children ?? [];
            const totalItems = krs.length + tasks.length + children.length;
            return (
              <div className={styles.deleteText}>
                <p>
                  Tem certeza que deseja excluir a missão <strong>{deleteMissionTarget.title}</strong>?
                </p>
                {totalItems > 0 && (
                  <Alert variant="warning" title="Todos os itens serão removidos">
                    {krs.length > 0 && <span>{krs.length} {krs.length === 1 ? "indicador" : "indicadores"}</span>}
                    {krs.length > 0 && (tasks.length > 0 || children.length > 0) && <span>, </span>}
                    {tasks.length > 0 && <span>{tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}</span>}
                    {tasks.length > 0 && children.length > 0 && <span>, </span>}
                    {children.length > 0 && <span>{children.length} {children.length === 1 ? "sub-missão" : "sub-missões"}</span>}
                    {" "}serão excluídos permanentemente.
                  </Alert>
                )}
              </div>
            );
          })()}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="md" onClick={() => setDeleteMissionTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={confirmDeleteMission}>
            Excluir missão
          </Button>
        </ModalFooter>
      </Modal>

      {/* ——— Create mission modal ——— */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="lg"
        sidePanel={
          showCreateAssistant ? (
            <AiAssistant
              title="Exemplos e inspiração"
              heading={selectedTemplate ? `Exemplos de ${MISSION_TEMPLATES.find((t) => t.value === selectedTemplate)?.title ?? "missão"}` : "Selecione um template para ver exemplos"}
              onClose={() => setShowCreateAssistant(false)}
              allowUpload
              missions={ASSISTANT_MISSIONS}
              selectedMissions={createAssistantMissions}
              onMissionsChange={setCreateAssistantMissions}
              suggestions={(() => {
                const lib = selectedTemplate ? EXAMPLE_LIBRARY[selectedTemplate] : null;
                if (!lib) return ["Ver exemplos por departamento"];
                return lib.flatMap((cat) =>
                  cat.examples.map((ex) => ex.objective)
                ).slice(0, 6);
              })()}
              onMessage={async (msg: string) => {
                const lib = selectedTemplate ? EXAMPLE_LIBRARY[selectedTemplate] : null;
                if (!lib) return "Selecione um template primeiro para ver exemplos.";
                for (const cat of lib) {
                  for (const ex of cat.examples) {
                    if (msg.includes(ex.objective)) {
                      return `**${ex.objective}**\n\n${ex.keyResults.map((kr, i) => `${i + 1}. ${kr}`).join("\n")}\n\nClique em "Usar como base" para preencher o formulário com este exemplo.`;
                    }
                  }
                }
                return "Desculpe, ainda estou em desenvolvimento. Em breve poderei ajudá-lo a criar OKRs com IA!";
              }}
              onUseAsBase={(content: string) => {
                // Parse the message content to extract objective and KRs
                const lib = selectedTemplate ? EXAMPLE_LIBRARY[selectedTemplate] : null;
                if (!lib) return;

                // Find the example that matches this message
                for (const cat of lib) {
                  for (const ex of cat.examples) {
                    if (content.includes(ex.objective)) {
                      // Fill in the form
                      setNewMissionName(ex.objective);
                      setNewMissionItems(
                        ex.keyResults.map((kr) => {
                          const parsed = parseKeyResultGoal(kr);
                          return {
                            id: generateItemId(),
                            name: kr,
                            description: "",
                            measurementMode: "manual",
                            manualType: parsed.manualType,
                            surveyId: null,
                            period: [null, null] as [CalendarDate | null, CalendarDate | null],
                            goalValue: parsed.goalValue,
                            goalValueMin: parsed.manualType === "above" ? parsed.goalValue : "",
                            goalValueMax: parsed.manualType === "below" ? parsed.goalValue : "",
                            goalUnit: parsed.goalUnit,
                            ownerId: null,
                            teamId: null,
                          };
                        }),
                      );
                      // Move to step 1 if still on step 0
                      if (createStep === 0) setCreateStep(1);
                      toast.success("Exemplo aplicado ao formulário — edite como quiser");
                      return;
                    }
                  }
                }
              }}
            />
          ) : null
        }
      >
        <ModalHeader
          title={editingMissionId ? "Editar missão" : "Criar missão"}
          onClose={() => { setCreateOpen(false); setEditingMissionId(null); }}
        >
          <AssistantButton
            active={showCreateAssistant}
            onClick={() => setShowCreateAssistant((v) => !v)}
          />
        </ModalHeader>

        <Breadcrumb
          items={CREATE_STEPS.map((step, i) => ({
            ...step,
            onClick: i < createStep ? () => setCreateStep(i) : undefined,
          }))}
          current={createStep}
        />

        <ModalBody>
          {createStep === 0 && (
            <div className={styles.createBody}>
              <p className={styles.createTitle}>Escolha o seu template de missão</p>
              <ChoiceBoxGroup
                value={selectedTemplate}
                onChange={(v: string | undefined) => setSelectedTemplate(v)}
              >
                {MISSION_TEMPLATES.map((t) => (
                  <ChoiceBox
                    key={t.value}
                    value={t.value}
                    title={t.title}
                    description={t.description}
                  />
                ))}
              </ChoiceBoxGroup>
            </div>
          )}

          {createStep === 1 && (() => {
            const tplCfg = getTemplateConfig(selectedTemplate);
            return (
            <div className={styles.createBody}>
              <p className={styles.createStepTitle}>{editingMissionId ? "Editar missão" : tplCfg.stepTitle}</p>

              <div className={styles.missionFields}>
                <input
                  type="text"
                  className={styles.missionNameInput}
                  placeholder={tplCfg.namePlaceholder}
                  value={newMissionName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMissionName(e.target.value)}
                />
                <input
                  type="text"
                  className={styles.missionDescInput}
                  placeholder={tplCfg.descPlaceholder}
                  value={newMissionDesc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMissionDesc(e.target.value)}
                />
              </div>

              <div className={styles.missionActions}>
                <Button
                  ref={ownerBtnRef}
                  variant="secondary"
                  size="sm"
                  leftIcon={UserCircle}
                  onClick={() => setOwnerPopoverOpen((v) => !v)}
                >
                  {selectedMissionOwners.length > 0
                    ? missionOwnerOptions.find((o) => o.id === selectedMissionOwners[0])?.label ?? "Responsável"
                    : "Responsável"}
                </Button>

                <Button
                  ref={missionPeriodBtnRef}
                  variant="secondary"
                  size="sm"
                  leftIcon={Calendar}
                  onClick={() => { setMissionPeriodOpen((v) => !v); setMissionPeriodCustom(false); }}
                >
                  {missionPeriod[0] && missionPeriod[1]
                    ? `${String(missionPeriod[0].day).padStart(2, "0")}/${String(missionPeriod[0].month).padStart(2, "0")} - ${String(missionPeriod[1].day).padStart(2, "0")}/${String(missionPeriod[1].month).padStart(2, "0")}/${missionPeriod[1].year}`
                    : "Período"}
                </Button>
                <FilterDropdown
                  open={missionPeriodOpen}
                  onClose={() => { setMissionPeriodOpen(false); setMissionPeriodCustom(false); }}
                  anchorRef={missionPeriodBtnRef}
                >
                  <div className={styles.filterDropdownBody}>
                    {presetPeriods.map((p) => {
                      const isActive = missionPeriod[0]?.year === p.start.year
                        && missionPeriod[0]?.month === p.start.month
                        && missionPeriod[0]?.day === p.start.day
                        && missionPeriod[1]?.year === p.end.year
                        && missionPeriod[1]?.month === p.end.month
                        && missionPeriod[1]?.day === p.end.day;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`${styles.filterDropdownItem} ${isActive ? styles.filterDropdownItemActive : ""}`}
                          onClick={() => {
                            setMissionPeriod([p.start, p.end]);
                            setMissionPeriodOpen(false);
                          }}
                        >
                          <Radio checked={isActive} readOnly />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.periodDropdownFooter}>
                    <button
                      ref={missionPeriodCustomBtnRef}
                      type="button"
                      className={`${styles.filterDropdownItem} ${missionPeriodCustom ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => setMissionPeriodCustom((v) => !v)}
                    >
                      <Plus size={14} />
                      <span>Período personalizado</span>
                      <CaretRight size={12} className={styles.moreMenuArrow} />
                    </button>
                  </div>
                </FilterDropdown>
                <FilterDropdown
                  open={missionPeriodOpen && missionPeriodCustom}
                  onClose={() => setMissionPeriodCustom(false)}
                  anchorRef={missionPeriodCustomBtnRef}
                  placement="right-start"
                  noOverlay
                >
                  <div className={styles.periodCustomPopover}>
                    <DatePicker
                      mode="range"
                      value={missionPeriod}
                      onChange={(range: [CalendarDate | null, CalendarDate | null]) => {
                        setMissionPeriod(range);
                        if (range[0] && range[1]) {
                          setMissionPeriodOpen(false);
                          setMissionPeriodCustom(false);
                        }
                      }}
                    />
                  </div>
                </FilterDropdown>

                <Button
                  ref={moreBtnRef}
                  variant="secondary"
                  size="sm"
                  leftIcon={DotsThree}
                  aria-label="Mais opções"
                  onClick={() => { setMoreSubPanel(null); setMorePopoverOpen((v) => !v); }}
                />
              </div>

              {/* Responsável dropdown */}
              <PopoverSelect
                mode="single"
                open={ownerPopoverOpen}
                onClose={() => setOwnerPopoverOpen(false)}
                anchorRef={ownerBtnRef}
                options={missionOwnerOptions}
                value={selectedMissionOwners[0] ?? ""}
                onChange={(val) => { setSelectedMissionOwners(val ? [val] : []); setOwnerPopoverOpen(false); }}
                searchable
                searchPlaceholder="Buscar responsável..."
              />

              {/* More options — main menu */}
              <FilterDropdown
                open={morePopoverOpen}
                onClose={() => { setMorePopoverOpen(false); setMoreSubPanel(null); }}
                anchorRef={moreBtnRef}
              >
                <div className={styles.filterDropdownBody}>
                  {MORE_MISSION_OPTIONS.map((opt) => {
                    const isActive = moreSubPanel === opt.id;
                    const count = opt.id === "team-support"
                      ? selectedSupportTeam.length
                      : opt.id === "organizers"
                        ? selectedTags.length
                        : 0;
                    const displayLabel = opt.id === "organizers" && tplCfg.tagLabel ? tplCfg.tagLabel
                      : opt.id === "visibility" ? (selectedVisibility === "private" ? "Privado" : "Público")
                      : opt.label;
                    const Icon = opt.id === "visibility"
                      ? (selectedVisibility === "private" ? EyeSlash : Eye)
                      : opt.icon;
                    return (
                      <button
                        key={opt.id}
                        ref={(el) => { moreItemRefs.current[opt.id] = el; }}
                        type="button"
                        className={`${styles.moreMenuItem} ${isActive ? styles.moreMenuItemActive : ""}`}
                        onClick={() => setMoreSubPanel(isActive ? null : opt.id)}
                      >
                        <Icon size={14} />
                        <span>{displayLabel}</span>
                        {count > 0 && <Badge color="neutral" size="sm">{count}</Badge>}
                        <CaretRight size={12} className={styles.moreMenuArrow} />
                      </button>
                    );
                  })}
                </div>
              </FilterDropdown>


              {/* Sub-panel: Time de apoio */}
              <PopoverSelect
                mode="multiple"
                open={morePopoverOpen && moreSubPanel === "team-support"}
                onClose={() => setMoreSubPanel(null)}
                anchorRef={{ current: moreItemRefs.current["team-support"] ?? null }}
                placement="right-start"
                noOverlay
                options={missionOwnerOptions}
                value={selectedSupportTeam}
                onChange={setSelectedSupportTeam}
                searchable
                searchPlaceholder="Buscar pessoa..."
              />

              {/* Sub-panel: Tags */}
              <PopoverSelect
                mode="multiple"
                open={morePopoverOpen && moreSubPanel === "organizers"}
                onClose={() => setMoreSubPanel(null)}
                anchorRef={{ current: moreItemRefs.current["organizers"] ?? null }}
                placement="right-start"
                noOverlay
                options={[...missionTagOptions, ...customTags]}
                value={selectedTags}
                onChange={setSelectedTags}
                renderOptionPrefix={() => <Tag size={14} />}
                searchable
                searchPlaceholder="Buscar tag..."
                creatable
                createPlaceholder="Criar nova tag..."
                onCreateOption={(label) => {
                  const created = createTag({ name: label });
                  const newTag = { id: created.id, label: created.name };
                  setCustomTags((prev) => [...prev, newTag]);
                  return newTag;
                }}
              />

              {/* Sub-panel: Quem pode ver */}
              <FilterDropdown
                open={morePopoverOpen && moreSubPanel === "visibility"}
                onClose={() => setMoreSubPanel(null)}
                anchorRef={{ current: moreItemRefs.current["visibility"] ?? null }}
                placement="right-start"
                noOverlay
              >
                <div className={styles.visibilityPanel}>
                  {visibilityOptions.map((opt) => {
                    const isSelected = selectedVisibility === opt.id;
                    const Icon = opt.id === "public" ? Eye : EyeSlash;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`${styles.visibilityOption} ${isSelected ? styles.visibilityOptionActive : ""}`}
                        onClick={() => { setSelectedVisibility(opt.id); setMoreSubPanel(null); }}
                      >
                        <Icon size={16} className={styles.visibilityIcon} />
                        <div className={styles.visibilityText}>
                          <span className={styles.visibilityLabel}>{opt.label}</span>
                          <span className={styles.visibilityDesc}>{opt.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </FilterDropdown>

              <CardDivider />

              <div className={styles.addItemList}>
                {renderMissionItems(newMissionItems, null)}
              </div>
            </div>
            );
          })()}
          {createStep === 2 && (
            <div className={styles.createBody}>
              <p className={styles.createStepTitle}>Revisão da missão</p>

              {/* Mission header info */}
              <Card padding="sm">
                <CardBody>
                  <div className={styles.reviewFields}>
                    <div className={styles.reviewRow}>
                      <span className={styles.reviewLabel}>Template</span>
                      <span className={styles.reviewValue}>
                        {MISSION_TEMPLATES.find((t) => t.value === selectedTemplate)?.title ?? "—"}
                      </span>
                    </div>
                    <div className={styles.reviewRow}>
                      <span className={styles.reviewLabel}>Nome</span>
                      <span className={styles.reviewValue}>{newMissionName || "—"}</span>
                    </div>
                    {newMissionDesc && (
                      <div className={styles.reviewRow}>
                        <span className={styles.reviewLabel}>Descrição</span>
                        <span className={styles.reviewValue}>{newMissionDesc}</span>
                      </div>
                    )}
                    <div className={styles.reviewRow}>
                      <span className={styles.reviewLabel}>Responsável</span>
                      <span className={styles.reviewValue}>
                        {selectedMissionOwners.length > 0
                          ? selectedMissionOwners.map((id) => missionOwnerOptions.find((o) => o.id === id)?.label ?? id).join(", ")
                          : "Nenhum definido"}
                      </span>
                    </div>
                    <div className={styles.reviewRow}>
                      <span className={styles.reviewLabel}>Período</span>
                      <span className={styles.reviewValue}>
                        {missionPeriod[0] && missionPeriod[1]
                          ? `${String(missionPeriod[0].day).padStart(2, "0")}/${String(missionPeriod[0].month).padStart(2, "0")}/${missionPeriod[0].year} — ${String(missionPeriod[1].day).padStart(2, "0")}/${String(missionPeriod[1].month).padStart(2, "0")}/${missionPeriod[1].year}`
                          : "Não definido"}
                      </span>
                    </div>
                    {selectedSupportTeam.length > 0 && (
                      <div className={styles.reviewRow}>
                        <span className={styles.reviewLabel}>Time de apoio</span>
                        <span className={styles.reviewValue}>
                          {selectedSupportTeam.map((id) => missionOwnerOptions.find((o) => o.id === id)?.label ?? id).join(", ")}
                        </span>
                      </div>
                    )}
                    {selectedTags.length > 0 && (
                      <div className={styles.reviewRow}>
                        <span className={styles.reviewLabel}>Tags</span>
                        <div className={styles.reviewTags}>
                          {selectedTags.map((id) => {
                            const label = missionTagOptions.find((t) => t.id === id)?.label
                              ?? customTags.find((t) => t.id === id)?.label
                              ?? id;
                            return <Badge key={id} color="neutral">{label}</Badge>;
                          })}
                        </div>
                      </div>
                    )}
                    <div className={styles.reviewRow}>
                      <span className={styles.reviewLabel}>Visibilidade</span>
                      <span className={styles.reviewValue}>
                        {visibilityOptions.find((o) => o.id === selectedVisibility)?.label ?? selectedVisibility}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Mission items tree */}
              {newMissionItems.length > 0 && (
                <Card padding="sm">
                  <CardBody>
                    <span className={styles.reviewSectionTitle}>
                      Itens da missão ({countAllItems(newMissionItems)})
                    </span>
                  </CardBody>
                  <CardDivider />
                  <CardBody>
                    <div className={styles.reviewItemTree}>
                      {renderReviewItems(newMissionItems, 0)}
                    </div>
                  </CardBody>
                </Card>
              )}

              {newMissionItems.length === 0 && (
                <Alert variant="warning" title="Nenhum item adicionado">
                  Nenhum item adicionado à missão.
                </Alert>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter align="between">
          <Button
            variant="tertiary"
            size="md"
            onClick={() => {
              if (createStep > (editingMissionId ? 1 : 0)) {
                setCreateStep((s) => s - 1);
              } else {
                setCreateOpen(false);
                setEditingMissionId(null);
              }
            }}
          >
            {createStep > (editingMissionId ? 1 : 0) ? "Voltar" : "Cancelar"}
          </Button>
          <div className={styles.createFooterActions}>
            {!editingMissionId && (
              <Button
                variant="secondary"
                size="md"
                leftIcon={FloppyDisk}
                onClick={() => {
                  const draftMission = {
                    ...buildMissionFromForm(),
                    id: `draft-${Date.now()}`,
                    status: "draft" as const,
                  };
                  setMissions((prev) => [...prev, draftMission]);
                  toast.success("Rascunho salvo com sucesso!");
                  resetCreateForm();
                }}
              >
                Salvar rascunho
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              rightIcon={createStep === 2 ? undefined : ArrowRight}
              disabled={createStep === 0 ? !selectedTemplate : false}
              onClick={() => {
                if (createStep < 2) {
                  setCreateStep((s) => s + 1);
                } else if (editingMissionId) {
                  setMissions((prev) => prev.map((m) => (
                    m.id === editingMissionId
                      ? { ...buildMissionFromForm(m), status: "active" as const }
                      : m
                  )));
                  toast.success("Missão atualizada com sucesso!");
                  resetCreateForm();
                } else {
                  const newMission = { ...buildMissionFromForm(), status: "active" as const };
                  setMissions((prev) => [...prev, newMission]);
                  toast.success("Missão criada com sucesso!");
                  resetCreateForm();
                }
              }}
            >
              {createStep === 2
                ? (editingMissionId ? "Salvar alterações" : "Criar missão")
                : "Próximo"}
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
}
