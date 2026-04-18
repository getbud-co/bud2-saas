import type {
  SurveyCategory,
  SurveyType,
  SurveyWizardState,
  WizardQuestion,
  WizardSection,
} from "@/types/survey";
import { formatDateBR, todayIso } from "@/lib/date-format";
import type {
  SurveyResultData,
  QuestionResult,
  QuestionResultData,
  IndividualResponse,
  ResultSection,
  ChoiceData,
  LikertData,
  NpsData,
  RankingData,
  TextData,
  YesNoData,
  HrReviewData,
  CalibrationData,
  CalibrationParticipant,
  PeerNomination,
  PeerNominationSession,
  HeatmapEntry,
  AttentionPoint,
  TrendPoint,
  ActionItem,
} from "@/pages/surveys/results/types";
import type { SurveyRendererData } from "@/pages/surveys/components/SurveyRenderer";
import type {
  SurveyListItemData,
  SurveyLocalRecord,
  SurveySubmissionRecord,
  SurveyTemplateRecord,
} from "@/lib/surveys-store";
import { initialWizardState } from "@/pages/surveys/create/wizardReducer";
import { getTemplateByType } from "@/pages/surveys/templates/surveyTemplates";

const SAMPLE_NAMES = [
  { name: "Ana Ferreira", initials: "AF", department: "Engenharia" },
  { name: "Joao Martins", initials: "JM", department: "Produto" },
  { name: "Beatriz Ramos", initials: "BR", department: "Design" },
  { name: "Lucas Oliveira", initials: "LO", department: "Marketing" },
  { name: "Carla Santos", initials: "CS", department: "People" },
];

/** Departments used for HR review heatmaps and calibration */
const HR_DEPARTMENTS = ["Engenharia", "Produto", "Design", "Marketing", "Vendas", "People"];

/** People for calibration mock data - realistic Brazilian names */
const CALIBRATION_PEOPLE = [
  { name: "Ana Carolina Silva", initials: "AC" },
  { name: "Bruno Santos", initials: "BS" },
  { name: "Camila Oliveira", initials: "CO" },
  { name: "Daniel Ferreira", initials: "DF" },
  { name: "Elena Costa", initials: "EC" },
  { name: "Felipe Almeida", initials: "FA" },
  { name: "Gabriela Lima", initials: "GL" },
  { name: "Henrique Souza", initials: "HS" },
  { name: "Isabela Rodrigues", initials: "IR" },
  { name: "Joao Pedro Martins", initials: "JP" },
  { name: "Karla Mendes", initials: "KM" },
  { name: "Lucas Barbosa", initials: "LB" },
  { name: "Mariana Nascimento", initials: "MN" },
  { name: "Natalia Pereira", initials: "NP" },
  { name: "Otavio Ribeiro", initials: "OR" },
  { name: "Patricia Campos", initials: "PC" },
  { name: "Rafael Teixeira", initials: "RT" },
  { name: "Sofia Cardoso", initials: "SC" },
];

/** Bias alerts that may appear during calibration - undefined means no alert */
const BIAS_ALERTS: (string | undefined)[] = [
  undefined,
  undefined,
  undefined,
  "Efeito halo detectado",
  "Vies de leniencia",
  "Vies de recencia",
  undefined,
  "Gap significativo auto vs. gestor",
];

function cloneDeep<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseBrDateToIso(value: string): string | null {
  if (!value) return null;
  const [day, month, year] = value.split("/").map((part) => Number(part));
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return date.toISOString();
}

function questionIdsFromTemplate(
  type: SurveyType,
  templateRecord?: SurveyTemplateRecord | null,
): { sections: WizardSection[]; questions: WizardQuestion[] } {
  if (templateRecord && templateRecord.sections.length > 0 && templateRecord.questions.length > 0) {
    return {
      sections: cloneDeep(templateRecord.sections),
      questions: cloneDeep(templateRecord.questions),
    };
  }

  const template = getTemplateByType(type);
  if (!template) {
    return { sections: [], questions: [] };
  }

  const sections: WizardSection[] = [];
  const questions: WizardQuestion[] = [];

  template.sections.forEach((section, sectionIndex) => {
    const sectionId = `${type}-section-${sectionIndex + 1}`;
    sections.push({
      id: sectionId,
      title: section.title,
      description: section.description,
    });

    section.questions.forEach((question, questionIndex) => {
      const questionId = `${type}-question-${sectionIndex + 1}-${questionIndex + 1}`;
      questions.push({
        id: questionId,
        sectionId,
        type: question.type,
        text: question.text,
        isRequired: question.isRequired,
        options: question.options,
        scaleMin: question.scaleMin,
        scaleMax: question.scaleMax,
        scaleLabels: question.scaleLabels,
        ratingMax: question.ratingMax,
      });
    });
  });

  return {
    sections,
    questions,
  };
}

export function estimateParticipantsFromWizard(state: SurveyWizardState): number {
  let total = 0;
  if (state.scope.scopeType === "company") total = 150;
  else if (state.scope.scopeType === "team") total = state.scope.teamIds.length * 12;
  else total = state.scope.userIds.length;
  return Math.max(0, total - state.excludedUserIds.length);
}

export function wizardStateToSurveyListItem(
  state: SurveyWizardState,
  options: {
    surveyId: string;
    templateId: string | null;
    status: SurveyListItemData["status"];
    createdAt: string;
    totalResponses?: number;
    fallbackType?: SurveyType;
    fallbackCategory?: SurveyCategory;
  },
): SurveyListItemData {
  const totalRecipients = estimateParticipantsFromWizard(state);
  const totalResponses = options.totalResponses ?? 0;
  const completionRate = totalRecipients > 0
    ? Math.min(100, Math.round((totalResponses / totalRecipients) * 100))
    : 0;

  return {
    id: options.surveyId,
    templateId: options.templateId,
    name: state.name.trim() || "Pesquisa sem titulo",
    type: state.type ?? options.fallbackType ?? "custom",
    category: state.category ?? options.fallbackCategory ?? "pesquisa",
    status: options.status,
    startDate: state.startDate ?? "",
    endDate: state.endDate ?? "",
    ownerIds: Array.from(new Set(state.ownerIds)),
    managerIds: Array.from(new Set(state.managerIds)),
    tagIds: Array.from(new Set(state.tagIds)),
    cycleId: state.cycleId,
    totalRecipients,
    totalResponses,
    completionRate,
    createdAt: options.createdAt,
  };
}

export function createWizardStateFromListItem(
  item: SurveyListItemData,
  templateRecord?: SurveyTemplateRecord | null,
): SurveyWizardState {
  const base = cloneDeep(initialWizardState);
  const template = getTemplateByType(item.type);
  const mapped = questionIdsFromTemplate(item.type, templateRecord);
  const defaultConfig: {
    isAnonymous: boolean;
    recurrence?: string | null;
    aiPrefillOkrs?: boolean;
    aiPrefillFeedback?: boolean;
    aiBiasDetection?: boolean;
  } = templateRecord?.defaultConfig ?? template?.defaultConfig ?? { isAnonymous: true };

  return {
    ...base,
    step: 1,
    type: item.type,
    category: item.category,
    name: item.name,
    description: templateRecord?.subtitle ?? template?.subtitle ?? "",
    ownerIds: Array.from(new Set(item.ownerIds ?? [])),
    managerIds: Array.from(new Set(item.managerIds ?? [])),
    tagIds: Array.from(new Set(item.tagIds ?? [])),
    cycleId: item.cycleId ?? null,
    sections: mapped.sections,
    questions: mapped.questions,
    isAnonymous: defaultConfig.isAnonymous ?? true,
    recurrence: (defaultConfig.recurrence as SurveyWizardState["recurrence"]) ?? null,
    aiPrefillOkrs: defaultConfig.aiPrefillOkrs ?? false,
    aiPrefillFeedback: defaultConfig.aiPrefillFeedback ?? false,
    aiBiasDetection: defaultConfig.aiBiasDetection ?? false,
    perspectives: item.category === "ciclo" ? base.perspectives : [],
    startDate: parseBrDateToIso(item.startDate),
    endDate: parseBrDateToIso(item.endDate),
  };
}

export function wizardStateToRendererData(state: SurveyWizardState): SurveyRendererData {
  const enabledPerspectives = state.category === "ciclo"
    ? state.perspectives.filter((p) => p.enabled).map((p) => p.perspective)
    : [];

  return {
    name: state.name || "Pesquisa sem titulo",
    description: state.description || undefined,
    isAnonymous: state.isAnonymous,
    sections: state.sections,
    questions: state.questions,
    ...(enabledPerspectives.length > 0 && { enabledPerspectives }),
  };
}

function buildIndividualResponses(question: WizardQuestion, totalResponses: number): IndividualResponse[] {
  const total = Math.min(totalResponses, SAMPLE_NAMES.length);
  if (total === 0) return [];

  return Array.from({ length: total }, (_, index) => {
    const person = SAMPLE_NAMES[index % SAMPLE_NAMES.length] ?? SAMPLE_NAMES[0]!;
    const base: IndividualResponse = {
      id: `${question.id}-resp-${index + 1}`,
      name: person.name,
      initials: person.initials,
      department: person.department,
      answeredAt: todayIso(),
    };

    if (question.type === "likert" || question.type === "rating") {
      return { ...base, numericValue: Math.min(question.scaleMax ?? 5, 3 + (index % 3)) };
    }
    if (question.type === "nps") {
      return { ...base, numericValue: 7 + (index % 4) };
    }
    if (question.type === "yes_no") {
      return { ...base, textValue: index % 2 === 0 ? "Sim" : "Nao" };
    }

    if (question.type === "multiple_choice" || question.type === "dropdown") {
      const label = question.options?.[index % (question.options.length || 1)]?.label ?? "Opcao 1";
      return { ...base, textValue: label };
    }

    if (question.type === "checkbox") {
      const options = question.options ?? [];
      const first = options[0]?.label ?? "Opcao 1";
      const second = options[1]?.label ?? "Opcao 2";
      return { ...base, textValue: `${first}, ${second}` };
    }

    if (question.type === "ranking") {
      const ranking = (question.options ?? []).map((option) => option.label).join(" > ");
      return { ...base, textValue: ranking || "Sem ordenacao" };
    }

    return {
      ...base,
      textValue: "Resposta registrada na pesquisa local.",
    };
  });
}

/** Simple deterministic hash from string → number for seeded randomness */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Distribute total into buckets with variation seeded by question id */
function distributeWithVariation(total: number, buckets: number, seed: string): number[] {
  if (buckets <= 0) return [];
  if (total <= 0) return Array.from({ length: buckets }, () => 0);

  const h = hashCode(seed);
  // Generate weights per bucket with variation
  const weights = Array.from({ length: buckets }, (_, i) => {
    const angle = ((h + i * 137) % 360) * (Math.PI / 180);
    return 1 + Math.abs(Math.sin(angle) * 2 + Math.cos(angle * 0.7));
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);

  // Distribute proportionally
  const counts = weights.map((w) => Math.floor((w / weightSum) * total));
  // Fix remainder
  let remainder = total - counts.reduce((a, b) => a + b, 0);
  let idx = h % buckets;
  while (remainder > 0) {
    const bucketIndex = idx % buckets;
    counts[bucketIndex] = (counts[bucketIndex] ?? 0) + 1;
    remainder--;
    idx++;
  }
  return counts;
}

const MOCK_TEXT_RESPONSES: Record<string, string[]> = {
  positive: [
    "Excelente iniciativa que trouxe resultados concretos para o time.",
    "Muito satisfeito com a evolução nos últimos meses.",
    "A comunicação melhorou significativamente após as mudanças implementadas.",
    "Equipe engajada e comprometida com os objetivos.",
    "O suporte da liderança fez toda a diferença neste período.",
  ],
  improvement: [
    "Precisamos melhorar a comunicação entre áreas.",
    "O processo de tomada de decisão poderia ser mais ágil.",
    "Falta clareza em algumas prioridades do trimestre.",
    "Seria bom ter mais momentos de feedback estruturado.",
    "A carga de trabalho está impactando a qualidade das entregas.",
  ],
  neutral: [
    "A equipe entrega resultados consistentes dentro do esperado.",
    "O ambiente de trabalho é adequado, mas há espaço para melhoria.",
    "Temos boas ferramentas, porém a adoção ainda é parcial.",
    "O ritmo de trabalho está estável, sem grandes variações.",
    "A colaboração entre pares é funcional mas não excepcional.",
  ],
};

function pickMockTexts(seed: string, count: number): string[] {
  const h = hashCode(seed);
  const category = h % 3 === 0 ? "positive" : h % 3 === 1 ? "improvement" : "neutral";
  const pool = MOCK_TEXT_RESPONSES[category]!;
  const result: string[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    result.push(pool[(h + i) % pool.length]!);
  }
  return result;
}

function buildQuestionData(question: WizardQuestion, totalResponses: number): QuestionResult["data"] {
  const seed = question.id;

  if (question.type === "likert" || question.type === "rating") {
    const scaleMax = question.type === "rating" ? (question.ratingMax ?? 5) : (question.scaleMax ?? 5);
    const counts = distributeWithVariation(totalResponses, scaleMax, seed);
    const distribution = counts.map((count, index) => ({
      label: question.type === "rating"
        ? `${index + 1} estrela${index > 0 ? "s" : ""}`
        : `${index + 1}`,
      count,
      percent: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
    }));
    const weighted = distribution.reduce((acc, item, index) => acc + item.count * (index + 1), 0);
    const average = totalResponses > 0 ? Number((weighted / totalResponses).toFixed(1)) : 0;
    const data: LikertData = { distribution, average };
    return data;
  }

  if (question.type === "nps") {
    const distribution = distributeWithVariation(totalResponses, 11, seed).map((count, value) => ({ value, count }));
    const detractorsCount = distribution.slice(0, 7).reduce((acc, item) => acc + item.count, 0);
    const passivesCount = distribution.slice(7, 9).reduce((acc, item) => acc + item.count, 0);
    const promotersCount = distribution.slice(9).reduce((acc, item) => acc + item.count, 0);
    const score = totalResponses > 0
      ? Math.round(((promotersCount - detractorsCount) / totalResponses) * 100)
      : 0;
    const data: NpsData = {
      score,
      promoters: totalResponses > 0 ? Math.round((promotersCount / totalResponses) * 100) : 0,
      passives: totalResponses > 0 ? Math.round((passivesCount / totalResponses) * 100) : 0,
      detractors: totalResponses > 0 ? Math.round((detractorsCount / totalResponses) * 100) : 0,
      distribution,
    };
    return data;
  }

  if (question.type === "multiple_choice" || question.type === "dropdown" || question.type === "checkbox") {
    const options = question.options && question.options.length > 0
      ? question.options
      : [{ id: "opt-1", label: "Opcao 1" }, { id: "opt-2", label: "Opcao 2" }];
    const counts = distributeWithVariation(totalResponses, options.length, seed);
    const data: ChoiceData = {
      options: options.map((option, index) => ({
        count: counts[index] ?? 0,
        label: option.label,
        percent: totalResponses > 0 ? Math.round(((counts[index] ?? 0) / totalResponses) * 100) : 0,
      })),
    };
    return data;
  }

  if (question.type === "yes_no") {
    const h = hashCode(seed);
    const yesRatio = 0.4 + ((h % 40) / 100); // 0.40–0.79
    const yes = Math.round(totalResponses * yesRatio);
    const no = Math.max(0, totalResponses - yes);
    const data: YesNoData = {
      yes,
      no,
      yesPercent: totalResponses > 0 ? Math.round((yes / totalResponses) * 100) : 0,
      noPercent: totalResponses > 0 ? Math.round((no / totalResponses) * 100) : 0,
    };
    return data;
  }

  if (question.type === "ranking") {
    const options = question.options && question.options.length > 0
      ? question.options
      : [{ id: "rank-1", label: "Item 1" }, { id: "rank-2", label: "Item 2" }, { id: "rank-3", label: "Item 3" }];
    const h = hashCode(seed);
    const data: RankingData = {
      items: options.map((option, index) => ({
        label: option.label,
        avgPosition: Number((1 + ((h + index * 37) % (options.length * 10)) / 10).toFixed(1)),
        count: totalResponses,
      })).sort((a, b) => a.avgPosition - b.avgPosition),
    };
    return data;
  }

  const texts = pickMockTexts(seed, Math.min(totalResponses, 5));
  const data: TextData = {
    responses: texts,
    totalCount: totalResponses,
  };
  return data;
}

function buildSectionsResult(state: SurveyWizardState, totalResponses: number): SurveyResultData["sections"] {
  const sections = state.sections;
  const questions = state.questions;

  if (questions.length === 0) {
    return [];
  }

  if (sections.length === 0) {
    return [{
      title: "Questionario",
      questions: questions.map((question) => ({
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        responseCount: totalResponses,
        data: buildQuestionData(question, totalResponses),
        individualResponses: buildIndividualResponses(question, totalResponses),
      })),
    }];
  }

  const result: SurveyResultData["sections"] = sections.map((section) => {
    const sectionQuestions = questions.filter((question) => question.sectionId === section.id);
    const mappedQuestions: QuestionResult[] = sectionQuestions.map((question) => ({
      questionId: question.id,
      questionText: question.text,
      questionType: question.type,
      responseCount: totalResponses,
      data: buildQuestionData(question, totalResponses),
      individualResponses: buildIndividualResponses(question, totalResponses),
    }));
    return {
      title: section.title,
      questions: mappedQuestions,
    };
  });

  const noSectionQuestions = questions.filter((question) => question.sectionId === null);
  if (noSectionQuestions.length > 0) {
    result.push({
      title: "Perguntas gerais",
      questions: noSectionQuestions.map((question) => ({
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        responseCount: totalResponses,
        data: buildQuestionData(question, totalResponses),
        individualResponses: buildIndividualResponses(question, totalResponses),
      })),
    });
  }

  return result;
}

function isAnswerFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function formatSubmissionDate(iso: string): string {
  const formatted = formatDateBR(iso);
  return formatted || formatDateBR(todayIso());
}

function resolveOptionLabel(question: WizardQuestion, value: string): string {
  return question.options?.find((option) => option.id === value)?.label ?? value;
}

function toIndividualResponsesFromSubmissions(
  question: WizardQuestion,
  submissions: SurveySubmissionRecord[],
): IndividualResponse[] {
  const answered = submissions.filter((submission) => isAnswerFilled(submission.answers[question.id]));

  return answered.map((submission, index) => {
    const rawValue = submission.answers[question.id];
    const base: IndividualResponse = {
      id: `${question.id}-${submission.id}`,
      name: `Respondente ${index + 1}`,
      initials: `R${String(index + 1).padStart(2, "0")}`,
      department: "Anônimo",
      answeredAt: formatSubmissionDate(submission.submittedAt),
    };

    if (typeof rawValue === "number") {
      return {
        ...base,
        numericValue: rawValue,
        textValue: String(rawValue),
      };
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length > 0 && typeof rawValue[0] === "object") {
        const rankingLabel = (rawValue as Array<{ label?: string; id?: string }>).map((item, idx) => {
          const label = item.label ?? item.id ?? `Item ${idx + 1}`;
          return `${idx + 1}º ${label}`;
        }).join(", ");

        return {
          ...base,
          textValue: rankingLabel,
        };
      }

      const labels = (rawValue as string[]).map((item) => resolveOptionLabel(question, item)).join(", ");
      return {
        ...base,
        textValue: labels,
      };
    }

    if (typeof rawValue === "string") {
      if (question.type === "yes_no") {
        return {
          ...base,
          textValue: rawValue === "yes" ? "Sim" : rawValue === "no" ? "Nao" : rawValue,
        };
      }

      return {
        ...base,
        textValue: resolveOptionLabel(question, rawValue),
      };
    }

    return {
      ...base,
      textValue: "Resposta registrada",
    };
  });
}

function buildQuestionDataFromSubmissions(
  question: WizardQuestion,
  submissions: SurveySubmissionRecord[],
): QuestionResultData {
  const answers = submissions
    .map((submission) => submission.answers[question.id])
    .filter((value) => isAnswerFilled(value));
  const responseCount = answers.length;

  if (question.type === "likert" || question.type === "rating") {
    const max = question.type === "rating" ? (question.ratingMax ?? 5) : (question.scaleMax ?? 5);
    const counts = Array.from({ length: max }, () => 0);
    answers.forEach((value) => {
      if (typeof value !== "number") return;
      const index = Math.round(value) - 1;
      if (index >= 0 && index < max) {
        const currentCount = counts[index] ?? 0;
        counts[index] = currentCount + 1;
      }
    });

    const distribution = counts.map((count, index) => ({
      label: question.type === "rating"
        ? `${index + 1} estrela${index > 0 ? "s" : ""}`
        : `${index + 1}`,
      count,
      percent: responseCount > 0 ? Math.round((count / responseCount) * 100) : 0,
    }));
    const weighted = counts.reduce((sum, count, index) => sum + count * (index + 1), 0);

    const data: LikertData = {
      distribution,
      average: responseCount > 0 ? Number((weighted / responseCount).toFixed(1)) : 0,
    };
    return data;
  }

  if (question.type === "nps") {
    const distribution = Array.from({ length: 11 }, (_, value) => ({ value, count: 0 }));
    answers.forEach((value) => {
      if (typeof value !== "number") return;
      const rounded = Math.round(value);
      if (rounded >= 0 && rounded <= 10) {
        distribution[rounded]!.count += 1;
      }
    });

    const detractorsCount = distribution.slice(0, 7).reduce((acc, item) => acc + item.count, 0);
    const passivesCount = distribution.slice(7, 9).reduce((acc, item) => acc + item.count, 0);
    const promotersCount = distribution.slice(9).reduce((acc, item) => acc + item.count, 0);

    const data: NpsData = {
      score: responseCount > 0 ? Math.round(((promotersCount - detractorsCount) / responseCount) * 100) : 0,
      promoters: responseCount > 0 ? Math.round((promotersCount / responseCount) * 100) : 0,
      passives: responseCount > 0 ? Math.round((passivesCount / responseCount) * 100) : 0,
      detractors: responseCount > 0 ? Math.round((detractorsCount / responseCount) * 100) : 0,
      distribution,
    };
    return data;
  }

  if (question.type === "multiple_choice" || question.type === "dropdown") {
    const options = question.options ?? [];
    const countsByOption = new Map(options.map((option) => [option.id, 0]));
    answers.forEach((value) => {
      if (typeof value !== "string") return;
      countsByOption.set(value, (countsByOption.get(value) ?? 0) + 1);
    });

    const data: ChoiceData = {
      options: options.map((option) => {
        const count = countsByOption.get(option.id) ?? 0;
        return {
          label: option.label,
          count,
          percent: responseCount > 0 ? Math.round((count / responseCount) * 100) : 0,
        };
      }),
    };
    return data;
  }

  if (question.type === "checkbox") {
    const options = question.options ?? [];
    const countsByOption = new Map(options.map((option) => [option.id, 0]));

    answers.forEach((value) => {
      if (!Array.isArray(value)) return;
      (value as string[]).forEach((optionId) => {
        countsByOption.set(optionId, (countsByOption.get(optionId) ?? 0) + 1);
      });
    });

    const data: ChoiceData = {
      options: options.map((option) => {
        const count = countsByOption.get(option.id) ?? 0;
        return {
          label: option.label,
          count,
          percent: responseCount > 0 ? Math.round((count / responseCount) * 100) : 0,
        };
      }),
    };
    return data;
  }

  if (question.type === "yes_no") {
    let yes = 0;
    let no = 0;
    answers.forEach((value) => {
      if (value === "yes") yes += 1;
      if (value === "no") no += 1;
    });

    const data: YesNoData = {
      yes,
      no,
      yesPercent: responseCount > 0 ? Math.round((yes / responseCount) * 100) : 0,
      noPercent: responseCount > 0 ? Math.round((no / responseCount) * 100) : 0,
    };
    return data;
  }

  if (question.type === "ranking") {
    const options = question.options ?? [];
    const metricsById = new Map(options.map((option, index) => [option.id, { sum: index + 1, count: 0 }]));

    answers.forEach((value) => {
      if (!Array.isArray(value)) return;

      (value as Array<{ id?: string }>).forEach((item, index) => {
        if (!item?.id) return;
        const metrics = metricsById.get(item.id) ?? { sum: 0, count: 0 };
        metrics.sum += (index + 1);
        metrics.count += 1;
        metricsById.set(item.id, metrics);
      });
    });

    const data: RankingData = {
      items: options.map((option, index) => {
        const metrics = metricsById.get(option.id) ?? { sum: index + 1, count: 0 };
        return {
          label: option.label,
          avgPosition: metrics.count > 0 ? Number((metrics.sum / metrics.count).toFixed(1)) : index + 1,
          count: metrics.count,
        };
      }).sort((a, b) => a.avgPosition - b.avgPosition),
    };
    return data;
  }

  const textResponses = answers
    .map((value) => {
      if (typeof value === "string") return value;
      if (typeof value === "number") return String(value);
      if (Array.isArray(value)) return value.map((entry) => String(entry)).join(", ");
      if (value && typeof value === "object") return JSON.stringify(value);
      return "";
    })
    .filter((value) => value.trim().length > 0);

  const data: TextData = {
    responses: textResponses.slice(0, 8),
    totalCount: textResponses.length,
  };
  return data;
}

function buildSectionsResultFromSubmissions(
  state: SurveyWizardState,
  submissions: SurveySubmissionRecord[],
): SurveyResultData["sections"] {
  const sections = state.sections;
  const questions = state.questions;

  if (questions.length === 0) {
    return [];
  }

  const mapQuestion = (question: WizardQuestion): QuestionResult => {
    const responseCount = submissions.filter((submission) => isAnswerFilled(submission.answers[question.id])).length;
    return {
      questionId: question.id,
      questionText: question.text,
      questionType: question.type,
      responseCount,
      data: buildQuestionDataFromSubmissions(question, submissions),
      individualResponses: toIndividualResponsesFromSubmissions(question, submissions),
    };
  };

  if (sections.length === 0) {
    return [{
      title: "Questionario",
      questions: questions.map(mapQuestion),
    }];
  }

  const result: SurveyResultData["sections"] = sections.map((section) => {
    const sectionQuestions = questions.filter((question) => question.sectionId === section.id);
    return {
      title: section.title,
      questions: sectionQuestions.map(mapQuestion),
    };
  });

  const noSectionQuestions = questions.filter((question) => question.sectionId === null);
  if (noSectionQuestions.length > 0) {
    result.push({
      title: "Perguntas gerais",
      questions: noSectionQuestions.map(mapQuestion),
    });
  }

  return result;
}

/* ——————————————————————————————————————————————————————————————————————————
   Calibration data generator
   Used for ciclo surveys (performance, 360_feedback) to show 9-box grid
   and participant calibration status
   —————————————————————————————————————————————————————————————————————————— */

/**
 * Real 360 evaluation questions from the template.
 * These match the actual "360° Feedback" template in surveyTemplates.ts
 * Only numeric questions are included (calibratable).
 */
/**
 * Real 360 evaluation questions matching the template in surveyTemplates.ts.
 * Each question is tagged with a dimension (performance or potential)
 * to feed the correct axis of the 9-box grid.
 */
const EVALUATION_360_QUESTIONS: {
  id: string;
  text: string;
  type: "likert" | "rating";
  dimension: "performance" | "potential";
  scaleMin: number;
  scaleMax: number;
}[] = [
  // Performance dimension — backward-looking competencies
  { id: "360-comp-1", text: "Demonstra liderança e influência positiva", type: "likert", dimension: "performance", scaleMin: 1, scaleMax: 5 },
  { id: "360-comp-2", text: "Comunica-se de forma eficaz", type: "likert", dimension: "performance", scaleMin: 1, scaleMax: 5 },
  { id: "360-comp-3", text: "Entrega resultados consistentes", type: "likert", dimension: "performance", scaleMin: 1, scaleMax: 5 },
  { id: "360-comp-4", text: "Colabora e trabalha bem em equipe", type: "likert", dimension: "performance", scaleMin: 1, scaleMax: 5 },
  { id: "360-geral-1", text: "No geral, como você avalia a contribuição desta pessoa?", type: "rating", dimension: "performance", scaleMin: 1, scaleMax: 5 },
  // Potential dimension — forward-looking growth indicators
  { id: "360-pot-1", text: "Demonstra capacidade de assumir responsabilidades maiores", type: "likert", dimension: "potential", scaleMin: 1, scaleMax: 5 },
  { id: "360-pot-2", text: "Aprende coisas novas com rapidez e aplica em situações diferentes", type: "likert", dimension: "potential", scaleMin: 1, scaleMax: 5 },
  { id: "360-pot-3", text: "Demonstra interesse ativo em crescer e se desenvolver", type: "likert", dimension: "potential", scaleMin: 1, scaleMax: 5 },
  { id: "360-pot-4", text: "Lida bem com ambiguidade e se adapta a mudanças", type: "likert", dimension: "potential", scaleMin: 1, scaleMax: 5 },
];

/** Helper: clamp + round to 1 decimal */
function clampScore(v: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, v)) * 10) / 10;
}

/** Derive potential level from numeric score */
function derivePotentialLevel(score: number): CalibrationParticipant["potential"] {
  if (score >= 3.7) return "alto";
  if (score >= 2.5) return "médio";
  return "baixo";
}

/**
 * Generate per-question, per-perspective scores for a participant.
 * Performance and potential questions use independent base scores,
 * reflecting that someone can be a strong performer but low potential (or vice-versa).
 */
function generateQuestionScores(
  perfBaseSelf: number,
  perfBaseManager: number,
  perfBase360: number,
  potBaseSelf: number,
  potBaseManager: number,
  potBase360: number,
  isCalibrated: boolean,
): NonNullable<CalibrationParticipant["calibrationScores"]> {
  return EVALUATION_360_QUESTIONS.map((q) => {
    const isPotential = q.dimension === "potential";
    const bSelf = isPotential ? potBaseSelf : perfBaseSelf;
    const bManager = isPotential ? potBaseManager : perfBaseManager;
    const b360 = isPotential ? potBase360 : perfBase360;

    // Self-evaluation: tends to be slightly generous
    const qSelf = clampScore(bSelf + (Math.random() - 0.4) * 1.2, q.scaleMin, q.scaleMax);
    // Manager: more calibrated, moderate variance
    const qManager = clampScore(bManager + (Math.random() - 0.5) * 1.0, q.scaleMin, q.scaleMax);
    // 360 (peers): independent perspective, wider variance
    const q360 = clampScore(b360 + (Math.random() - 0.5) * 1.4, q.scaleMin, q.scaleMax);

    // Calibrated score: only for already-calibrated participants
    const calibratedScore = isCalibrated
      ? clampScore(
          qManager * 0.5 + q360 * 0.3 + qSelf * 0.2 + (Math.random() - 0.5) * 0.3,
          q.scaleMin,
          q.scaleMax,
        )
      : null;

    return {
      questionId: q.id,
      questionText: q.text,
      questionType: q.type,
      dimension: q.dimension,
      selfScore: qSelf,
      managerScore: qManager,
      score360: q360,
      calibratedScore,
      scaleMin: q.scaleMin,
      scaleMax: q.scaleMax,
    };
  });
}

/** Average calibrated scores for a given dimension */
function avgDimensionScore(
  scores: NonNullable<CalibrationParticipant["calibrationScores"]>,
  dimension: "performance" | "potential",
  field: "selfScore" | "managerScore" | "score360" | "calibratedScore",
): number | undefined {
  const items = scores.filter(q => q.dimension === dimension);
  const values = items.map(q => q[field]).filter((v): v is number => v != null);
  if (values.length === 0) return undefined;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

function generateCalibration(): CalibrationData {
  const participants: CalibrationParticipant[] = CALIBRATION_PEOPLE.map((person, index) => {
    // Independent base scores for performance and potential dimensions
    const perfBaseSelf = clampScore(2.8 + Math.random() * 2.2, 1, 5);
    const perfBaseManager = clampScore(perfBaseSelf + (Math.random() - 0.6) * 1.5, 1, 5);
    const perfBase360 = clampScore(perfBaseSelf + (Math.random() - 0.5) * 1.2, 1, 5);

    // Potential can differ significantly from performance
    const potBaseSelf = clampScore(2.5 + Math.random() * 2.5, 1, 5);
    const potBaseManager = clampScore(potBaseSelf + (Math.random() - 0.5) * 1.3, 1, 5);
    const potBase360 = clampScore(potBaseSelf + (Math.random() - 0.5) * 1.0, 1, 5);

    const isCalibrated = Math.random() > 0.4;

    const responseDay = Math.min(28, 5 + Math.floor(Math.random() * 24));
    const responseMonth = Math.random() > 0.5 ? 2 : 3;
    const respondedAt = `2026-${String(responseMonth).padStart(2, "0")}-${String(responseDay).padStart(2, "0")}`;

    // Generate per-question scores for ALL participants
    const calibrationScores = generateQuestionScores(
      perfBaseSelf, perfBaseManager, perfBase360,
      potBaseSelf, potBaseManager, potBase360,
      isCalibrated,
    );

    // Aggregate scores by dimension
    const avgSelf = clampScore(
      (calibrationScores.reduce((s, q) => s + (q.selfScore ?? 0), 0) / calibrationScores.length),
      1, 5,
    );
    const avgManager = clampScore(
      (calibrationScores.reduce((s, q) => s + (q.managerScore ?? 0), 0) / calibrationScores.length),
      1, 5,
    );
    const avg360 = clampScore(
      (calibrationScores.reduce((s, q) => s + (q.score360 ?? 0), 0) / calibrationScores.length),
      1, 5,
    );

    // Performance final score (from performance-dimension calibrated scores)
    const calibratedPerfScore = avgDimensionScore(calibrationScores, "performance", "calibratedScore");
    // Potential derived from potential-dimension scores
    const calibratedPotScore = avgDimensionScore(calibrationScores, "potential", "calibratedScore");
    const rawPotScore = avgDimensionScore(calibrationScores, "potential", "managerScore")
      ?? avgDimensionScore(calibrationScores, "potential", "selfScore")
      ?? 3;

    const potential = derivePotentialLevel(calibratedPotScore ?? rawPotScore);
    const calibratedFinalScore = calibratedPerfScore;

    return {
      id: `p-${index + 1}`,
      name: person.name,
      initials: person.initials,
      department: HR_DEPARTMENTS[index % HR_DEPARTMENTS.length] ?? "Geral",
      selfScore: avgSelf,
      managerScore: avgManager,
      score360: avg360,
      finalScore: calibratedFinalScore ?? null,
      potential,
      status: isCalibrated ? "calibrado" : "pendente",
      respondedAt,
      biasAlert: BIAS_ALERTS[index % BIAS_ALERTS.length],
      okrCompletion: Math.round(50 + Math.random() * 50),
      feedbackCount: Math.floor(Math.random() * 12) + 1,
      pulseMean: Math.round((3 + Math.random() * 2) * 10) / 10,
      calibrationScores,
      calibratedFinalScore,
    };
  });

  const calibratedCount = participants.filter((p) => p.status === "calibrado").length;

  return {
    sessionStatus: "em_andamento",
    totalParticipants: participants.length,
    calibratedCount,
    participants,
  };
}

/* ——————————————————————————————————————————————————————————————————————————
   HR Review data generator
   Provides heatmap, attention points, trends, and action items
   for the "Visao Geral" (Overview) tab
   —————————————————————————————————————————————————————————————————————————— */

function generateHrReview(sections: ResultSection[]): HrReviewData {
  // Get likert/rating/nps questions for heatmap analysis
  const numericQuestions = sections
    .flatMap((section) => section.questions)
    .filter((question) => ["likert", "rating", "nps"].includes(question.questionType));

  // Create short labels (P1, P2, ...) for heatmap
  const shortLabels = numericQuestions.map((_, index) => `P${index + 1}`);
  const questionLabels: Record<string, string> = {};
  shortLabels.forEach((label, index) => {
    const question = numericQuestions[index];
    if (question) {
      questionLabels[label] = question.questionText;
    }
  });

  // Generate heatmap entries: question x department with scores 1-5
  const heatmapEntries: HeatmapEntry[] = [];
  shortLabels.forEach((label) => {
    HR_DEPARTMENTS.forEach((department) => {
      heatmapEntries.push({
        question: label,
        department,
        score: Math.round((2.5 + Math.random() * 2.5) * 10) / 10,
      });
    });
  });

  // Generate attention points for questions with low scores
  const attentionPoints: AttentionPoint[] = numericQuestions
    .map((question, index) => {
      // Calculate average score based on question type
      let avgScore: number;
      if (question.questionType === "nps") {
        const npsData = question.data as NpsData;
        // Normalize NPS (-100 to +100) to 1-5 scale
        avgScore = ((npsData.score + 100) / 200) * 4 + 1;
      } else {
        const likertData = question.data as LikertData;
        avgScore = likertData.average;
      }

      const benchmark = 3.8;
      if (avgScore < benchmark) {
        const worstDepartment = HR_DEPARTMENTS[Math.floor(Math.random() * HR_DEPARTMENTS.length)] ?? "Geral";
        const severity: AttentionPoint["severity"] = avgScore < 3 ? "critical" : "warning";

        return {
          id: `ap-${index}`,
          questionText: question.questionText,
          score: Math.round(avgScore * 10) / 10,
          benchmark,
          department: worstDepartment,
          severity,
          insight: severity === "critical"
            ? `Score ${avgScore.toFixed(1)} esta significativamente abaixo do benchmark de ${benchmark}. O departamento de ${worstDepartment} apresenta o menor indice.`
            : `Score ${avgScore.toFixed(1)} esta abaixo do benchmark de ${benchmark}. Requer atencao no departamento de ${worstDepartment}.`,
        };
      }
      return null;
    })
    .filter((point): point is AttentionPoint => point !== null);

  // Generate trends: current vs previous period with history
  const trends: TrendPoint[] = numericQuestions.slice(0, 6).map((question) => {
    let current: number;
    if (question.questionType === "nps") {
      const npsData = question.data as NpsData;
      current = ((npsData.score + 100) / 200) * 4 + 1;
    } else {
      const likertData = question.data as LikertData;
      current = likertData.average;
    }

    const previous = Math.round((current + (Math.random() - 0.5) * 1.2) * 10) / 10;
    const delta = Math.round((current - previous) * 10) / 10;

    // Generate 4-period history
    const history = [
      Math.round((current - 0.3 + Math.random() * 0.6) * 10) / 10,
      Math.round((current - 0.2 + Math.random() * 0.4) * 10) / 10,
      Math.max(1, Math.min(5, previous)),
      Math.max(1, Math.min(5, current)),
    ].map((value) => Math.max(1, Math.min(5, value)));

    return {
      questionText: question.questionText,
      current: Math.round(current * 10) / 10,
      previous: Math.max(1, Math.min(5, previous)),
      delta,
      history,
    };
  });

  // Generate action items based on survey insights
  const actionItems: ActionItem[] = [
    {
      id: "ai-1",
      title: "Workshop de comunicacao interna",
      description: "Organizar sessao com times que pontuaram abaixo de 3.5 em comunicacao",
      priority: "alta",
      department: "Geral",
      status: "pendente",
    },
    {
      id: "ai-2",
      title: "Revisao do programa de desenvolvimento",
      description: "Atualizar trilhas de carreira com base no feedback de crescimento profissional",
      priority: "alta",
      department: "People",
      status: "em_andamento",
      assignee: "Gabriela Lima",
    },
    {
      id: "ai-3",
      title: "Pesquisa de follow-up com Engenharia",
      description: "Aprofundar investigacao sobre carga de trabalho e bem-estar no time de engenharia",
      priority: "média",
      department: "Engenharia",
      status: "pendente",
    },
    {
      id: "ai-4",
      title: "Sessao de feedback com lideranca",
      description: "Apresentar resultados consolidados e alinhar proximos passos",
      priority: "média",
      department: "Geral",
      status: "pendente",
    },
    {
      id: "ai-5",
      title: "Melhoria nas ferramentas de trabalho",
      description: "Avaliar NPS de ferramentas internas e priorizar substituicoes",
      priority: "baixa",
      department: "Operacoes",
      status: "concluída",
      assignee: "Otavio Ribeiro",
    },
  ];

  return {
    heatmap: {
      entries: heatmapEntries,
      questions: shortLabels,
      questionLabels,
      departments: HR_DEPARTMENTS,
    },
    attentionPoints,
    trends,
    actionItems,
  };
}

/* ——————————————————————————————————————————————————————————————————————————
   Peer nomination session generator
   Tracks nominations, approvals, rejections for the peer management tab
   —————————————————————————————————————————————————————————————————————————— */

const NOMINATION_EVALUATEES = [
  { id: "ne-1", name: "Ana Ferreira", initials: "AF", dept: "Engenharia" },
  { id: "ne-2", name: "Carlos Souza", initials: "CS", dept: "Produto" },
  { id: "ne-3", name: "Beatriz Lima", initials: "BL", dept: "Design" },
  { id: "ne-4", name: "Pedro Oliveira", initials: "PO", dept: "Marketing" },
  { id: "ne-5", name: "Mariana Costa", initials: "MC", dept: "Vendas" },
  { id: "ne-6", name: "Thiago Santos", initials: "TS", dept: "Engenharia" },
  { id: "ne-7", name: "Luana Ribeiro", initials: "LR", dept: "People" },
  { id: "ne-8", name: "João Martins", initials: "JM", dept: "Produto" },
];

const NOMINATION_PEERS = [
  { id: "np-1", name: "Rafael Almeida", initials: "RA", dept: "Engenharia" },
  { id: "np-2", name: "Camila Rodrigues", initials: "CR", dept: "Produto" },
  { id: "np-3", name: "Lucas Pereira", initials: "LP", dept: "Design" },
  { id: "np-4", name: "Fernanda Gomes", initials: "FG", dept: "Marketing" },
  { id: "np-5", name: "Diego Nascimento", initials: "DN", dept: "Vendas" },
  { id: "np-6", name: "Juliana Barros", initials: "JB", dept: "Engenharia" },
  { id: "np-7", name: "Bruno Cardoso", initials: "BC", dept: "People" },
  { id: "np-8", name: "Patrícia Mendes", initials: "PM", dept: "Produto" },
  { id: "np-9", name: "André Lopes", initials: "AL", dept: "Engenharia" },
  { id: "np-10", name: "Isabela Ferreira", initials: "IF", dept: "Design" },
];

function generatePeerNominationSession(): PeerNominationSession {
  const nominations: PeerNomination[] = [];
  let nominationId = 1;

  for (const evaluatee of NOMINATION_EVALUATEES) {
    // Each evaluatee gets 3-5 nominations
    const peerCount = 3 + Math.floor(Math.random() * 3);
    const shuffledPeers = [...NOMINATION_PEERS]
      .filter((p) => p.id !== evaluatee.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, peerCount);

    for (const peer of shuffledPeers) {
      const rand = Math.random();
      const status: PeerNomination["status"] = rand > 0.7
        ? "pending"
        : rand > 0.15
          ? "approved"
          : rand > 0.05
            ? "rejected"
            : "overridden";

      const aiSuggested = Math.random() > 0.4;
      const submittedDay = 5 + Math.floor(Math.random() * 10);
      const reviewedDay = submittedDay + Math.floor(Math.random() * 3) + 1;

      nominations.push({
        id: `nom-${nominationId++}`,
        evaluateeId: evaluatee.id,
        evaluateeName: evaluatee.name,
        evaluateeInitials: evaluatee.initials,
        evaluateeDepartment: evaluatee.dept,
        nominatedPeerId: peer.id,
        nominatedPeerName: peer.name,
        nominatedPeerInitials: peer.initials,
        nominatedPeerDepartment: peer.dept,
        nominatedById: evaluatee.id,
        nominatedByName: evaluatee.name,
        status,
        submittedAt: `2026-03-${String(submittedDay).padStart(2, "0")}`,
        reviewedAt: status !== "pending" ? `2026-03-${String(Math.min(28, reviewedDay)).padStart(2, "0")}` : undefined,
        reviewedByName: status !== "pending" ? "Renata Dias (Gestora)" : undefined,
        rejectionReason: status === "rejected" ? "Não tem interação profissional suficiente com o avaliado" : undefined,
        overrideNote: status === "overridden" ? "Substituído por par com mais contexto cross-funcional" : undefined,
        aiSuggested,
        aiConfidence: aiSuggested ? Math.round((0.6 + Math.random() * 0.35) * 100) / 100 : undefined,
      });
    }
  }

  const approved = nominations.filter((n) => n.status === "approved" || n.status === "overridden");
  const evaluateesWithApprovals = new Set(approved.map((n) => n.evaluateeId));

  return {
    phase: "approval",
    peerAssignmentMode: "employee_nominates",
    nominationDeadline: "2026-03-15",
    approvalDeadline: "2026-03-20",
    totalEvaluatees: NOMINATION_EVALUATEES.length,
    evaluateesWithNominations: new Set(nominations.map((n) => n.evaluateeId)).size,
    evaluateesFullyApproved: evaluateesWithApprovals.size,
    nominations,
  };
}

export function buildSurveyResultsFromRecord(
  record: SurveyLocalRecord,
  options?: { submissions?: SurveySubmissionRecord[] },
): SurveyResultData {
  const state = record.wizardState ?? createWizardStateFromListItem(record.listItem);
  const submissions = options?.submissions ?? [];
  const hasRealSubmissions = submissions.length > 0;
  const totalResponses = hasRealSubmissions ? submissions.length : record.listItem.totalResponses;
  const totalRecipients = Math.max(record.listItem.totalRecipients, totalResponses);
  const completionRate = totalRecipients > 0
    ? Math.min(100, Math.round((totalResponses / totalRecipients) * 100))
    : 0;
  const period = record.listItem.startDate && record.listItem.endDate
    ? `${record.listItem.startDate} – ${record.listItem.endDate}`
    : "";

  // Build sections from real submissions or generate mock data
  const sections = hasRealSubmissions
    ? buildSectionsResultFromSubmissions(state, submissions)
    : buildSectionsResult(state, totalResponses);

  // Build the base result
  const result: SurveyResultData = {
    surveyId: record.id,
    surveyName: record.listItem.name,
    surveyType: record.listItem.type,
    surveyCategory: record.listItem.category,
    status: record.listItem.status,
    period,
    isAnonymous: state.isAnonymous,
    kpis: {
      views: totalRecipients + Math.round(totalRecipients * 0.1),
      started: Math.max(totalResponses, Math.round(totalRecipients * 0.6)),
      responses: totalResponses,
      completionRate,
      avgCompletionTime: "5min 20s",
    },
    sections,
  };

  // Add calibration data for ciclo surveys (performance reviews, 360 feedback)
  if (record.listItem.category === "ciclo") {
    result.calibration = generateCalibration();
    result.peerNominationSession = generatePeerNominationSession();
  }

  // Add HR review data for surveys with responses (provides heatmap, attention points, trends)
  if (totalResponses > 0 && sections.length > 0) {
    result.hrReview = generateHrReview(sections);
  }

  return result;
}
