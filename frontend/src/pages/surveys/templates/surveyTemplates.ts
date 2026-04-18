import type { SurveyType, SurveyCategory, QuestionType } from "@/types/survey";
import type { Icon } from "@phosphor-icons/react";
import {
  Lightning,
  ChartBar,
  TrendUp,
  ClipboardText,
  Heartbeat,
  ArrowsClockwise,
  ChatCircle,
  StackSimple,
  GearSix,
} from "@phosphor-icons/react";

export interface TemplateQuestion {
  type: QuestionType;
  text: string;
  isRequired: boolean;
  options?: { id: string; label: string }[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: Record<string, string>;
  ratingMax?: number;
}

export interface TemplateSection {
  title: string;
  description?: string;
  questions: TemplateQuestion[];
}

export interface FlowStep {
  label: string;
  description?: string;
}

export interface SurveyTemplate {
  type: SurveyType;
  category: SurveyCategory;
  name: string;
  subtitle: string;
  icon: Icon;
  defaultQuestionCount: number;
  flowSteps: FlowStep[];
  sections: TemplateSection[];
  defaultConfig: {
    isAnonymous: boolean;
    recurrence?: string;
    aiPrefillOkrs?: boolean;
    aiPrefillFeedback?: boolean;
    aiBiasDetection?: boolean;
  };
}

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    type: "pulse",
    category: "pesquisa",
    name: "Pulse",
    subtitle: "Sentimento semanal da equipe",
    icon: Lightning,
    defaultQuestionCount: 7,
    flowSteps: [
      { label: "Disparo automático", description: "Pesquisa enviada na frequência configurada" },
      { label: "Resposta rápida", description: "Colaboradores respondem em até 5 minutos" },
      { label: "Análise de tendência", description: "Resultados comparados semana a semana" },
      { label: "Alertas ao gestor", description: "Notificação automática em quedas relevantes" },
    ],
    sections: [
      {
        title: "Sentimento geral",
        questions: [
          { type: "rating", text: "Como você se sentiu no trabalho esta semana?", isRequired: true, ratingMax: 5 },
          { type: "likert", text: "Sei o que é esperado de mim no trabalho", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Me sinto apoiado(a) pela minha liderança", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Sinto que meu trabalho foi reconhecido esta semana", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Fiz progresso significativo no que é importante", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "multiple_choice", text: "Minha carga de trabalho esta semana foi:", isRequired: true, options: [{ id: "low", label: "Abaixo do normal" }, { id: "normal", label: "Normal" }, { id: "high", label: "Acima do normal" }, { id: "overload", label: "Sobrecarregado(a)" }] },
          { type: "text_short", text: "Tem algo que está te travando? (opcional)", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: true,
      recurrence: "weekly",
    },
  },
  {
    type: "clima",
    category: "pesquisa",
    name: "Clima Organizacional",
    subtitle: "Cultura e satisfação geral",
    icon: ChartBar,
    defaultQuestionCount: 22,
    flowSteps: [
      { label: "Convite aos participantes", description: "Todos os colaboradores são convidados" },
      { label: "Período de respostas", description: "Janela de 2-3 semanas para responder" },
      { label: "Lembretes automáticos", description: "Notificações para quem não respondeu" },
      { label: "Análise por dimensão", description: "Resultados segmentados por tema e departamento" },
      { label: "Relatório e plano de ação", description: "Insights consolidados para liderança" },
    ],
    sections: [
      {
        title: "Ambiente e cultura",
        questions: [
          { type: "likert", text: "Me sinto valorizado(a) e reconhecido(a) na empresa", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Recebo feedback útil com regularidade", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Sinto que posso ser eu mesmo(a) e expressar minhas ideias sem medo", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "A comunicação interna é clara e transparente", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Confio nas decisões do meu gestor direto", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Me sinto parte de um time colaborativo", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
        ],
      },
      {
        title: "Diversidade, inclusão e equidade",
        questions: [
          { type: "likert", text: "A empresa trata todas as pessoas com justiça, independentemente de quem sejam", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Sinto que tenho as mesmas oportunidades de crescimento que meus colegas", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Diferentes perspectivas e origens são valorizadas no meu time", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
        ],
      },
      {
        title: "Desenvolvimento e crescimento",
        questions: [
          { type: "likert", text: "Tenho oportunidades reais de crescimento aqui", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Meu gestor investe no meu desenvolvimento", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Recebo feedback útil com frequência", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Meu trabalho me desafia de forma positiva", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Sei qual é o próximo passo na minha carreira aqui", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "A empresa oferece recursos adequados de aprendizado", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
        ],
      },
      {
        title: "Bem-estar e equilíbrio",
        questions: [
          { type: "likert", text: "Consigo manter um bom equilíbrio vida-trabalho", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Me sinto saudável física e mentalmente", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Minha carga de trabalho é razoável", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Tenho autonomia para organizar meu trabalho", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "A empresa se preocupa genuinamente com bem-estar", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Me sinto energizado(a) na maioria dos dias", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "nps", text: "De 0 a 10, qual a probabilidade de recomendar a empresa como um bom lugar para trabalhar?", isRequired: true, scaleLabels: { min: "Nada provável", max: "Extremamente provável" } },
          { type: "ranking", text: "Ordene os fatores abaixo do mais importante para o menos importante para sua satisfação", isRequired: true, options: [{ id: "salary", label: "Remuneração" }, { id: "growth", label: "Crescimento profissional" }, { id: "culture", label: "Cultura da empresa" }, { id: "balance", label: "Equilíbrio vida-trabalho" }, { id: "leadership", label: "Qualidade da liderança" }] },
          { type: "text_short", text: "O que a empresa poderia fazer melhor? (opcional)", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: true,
    },
  },
  {
    type: "enps",
    category: "pesquisa",
    name: "eNPS",
    subtitle: "Lealdade e satisfação do colaborador",
    icon: TrendUp,
    defaultQuestionCount: 2,
    flowSteps: [
      { label: "Envio da pesquisa", description: "Pergunta NPS enviada a todos os colaboradores" },
      { label: "Coleta de respostas", description: "Nota de 0-10 + justificativa aberta" },
      { label: "Classificação automática", description: "Promotores, neutros e detratores" },
      { label: "Cálculo do eNPS", description: "Score de -100 a +100 com benchmark" },
    ],
    sections: [
      {
        title: "eNPS",
        questions: [
          { type: "nps", text: "De 0 a 10, qual a probabilidade de você recomendar esta empresa como um ótimo lugar para trabalhar?", isRequired: true, scaleLabels: { min: "Nada provável", max: "Extremamente provável" } },
          { type: "text_short", text: "O que motivou sua nota?", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: true,
    },
  },
  {
    type: "performance",
    category: "ciclo",
    name: "Avaliação de Desempenho",
    subtitle: "Ciclo completo de avaliação",
    icon: ClipboardText,
    defaultQuestionCount: 16,
    flowSteps: [
      { label: "Autoavaliação", description: "Colaborador avalia seu próprio desempenho" },
      { label: "Avaliação do gestor", description: "Gestor avalia o colaborador com dados de IA" },
      { label: "Calibração", description: "Comitê alinha notas entre times e áreas" },
      { label: "Devolutiva (Feedback)", description: "Gestor compartilha resultado com o colaborador" },
      { label: "PDI", description: "Plano de desenvolvimento gerado a partir dos gaps" },
    ],
    sections: [
      {
        title: "Resultados e entregas",
        questions: [
          { type: "likert", text: "Atingiu os objetivos definidos para o período", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Muito abaixo", max: "Superou expectativas" } },
          { type: "likert", text: "A qualidade das entregas está no nível esperado ou acima", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Muito abaixo", max: "Superou expectativas" } },
          { type: "text_long", text: "Descreva as principais realizações do período", isRequired: true },
        ],
      },
      {
        title: "Competências e comportamentos",
        questions: [
          { type: "likert", text: "Demonstra proatividade e iniciativa", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Colabora efetivamente com o time", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Comunica-se de forma clara e assertiva", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
        ],
      },
      {
        title: "Potencial e prontidão",
        questions: [
          { type: "likert", text: "Demonstra capacidade de assumir responsabilidades maiores", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Aprende com rapidez e aplica em situações novas", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "yes_no", text: "Se fosse meu dinheiro, eu daria a esta pessoa o maior aumento possível", isRequired: true },
          { type: "yes_no", text: "Eu sempre quero esta pessoa no meu time", isRequired: true },
          { type: "yes_no", text: "Esta pessoa está pronta para promoção hoje", isRequired: true },
        ],
      },
      {
        title: "Desenvolvimento",
        questions: [
          { type: "checkbox", text: "Áreas de desenvolvimento prioritárias", isRequired: true, options: [{ id: "technical", label: "Competência técnica" }, { id: "leadership", label: "Liderança" }, { id: "communication", label: "Comunicação" }, { id: "time", label: "Gestão de tempo" }, { id: "strategic", label: "Pensamento estratégico" }, { id: "people", label: "Gestão de pessoas" }] },
          { type: "text_long", text: "Quais são os pontos fortes que devem ser potencializados?", isRequired: true },
          { type: "text_long", text: "Quais áreas precisam de desenvolvimento?", isRequired: true },
          { type: "text_short", text: "Sugestão de próximos passos para o PDI", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: false,
      aiPrefillOkrs: true,
      aiPrefillFeedback: true,
      aiBiasDetection: true,
    },
  },
  {
    type: "health_check",
    category: "pesquisa",
    name: "Health Check",
    subtitle: "Saúde do time (modelo Spotify)",
    icon: Heartbeat,
    defaultQuestionCount: 11,
    flowSteps: [
      { label: "Votação individual", description: "Cada membro vota nas dimensões de saúde" },
      { label: "Discussão em grupo", description: "Time debate os resultados em sessão facilitada" },
      { label: "Priorização", description: "Time escolhe as dimensões para melhorar" },
      { label: "Plano de ação", description: "Ações concretas para as dimensões críticas" },
    ],
    sections: [
      {
        title: "Dimensões de saúde do time",
        questions: [
          { type: "multiple_choice", text: "Velocidade de entrega — Conseguimos entregar rápido quando necessário", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
          { type: "multiple_choice", text: "Qualidade técnica — Estamos orgulhosos da qualidade do nosso trabalho", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
          { type: "multiple_choice", text: "Diversão — Gostamos de vir trabalhar e nos divertimos juntos", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
          { type: "multiple_choice", text: "Aprendizado — Estamos aprendendo coisas novas constantemente", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
          { type: "multiple_choice", text: "Missão — Sabemos por que estamos aqui e estamos empolgados", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
          { type: "multiple_choice", text: "Suporte — Temos acesso a tudo que precisamos (ferramentas, pessoas, apoio)", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
          { type: "multiple_choice", text: "Trabalho em equipe — Colaboramos bem e nos ajudamos mutuamente", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
          { type: "multiple_choice", text: "Autonomia — Temos liberdade para decidir como trabalhamos", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
          { type: "multiple_choice", text: "Segurança psicológica — Sentimos que podemos errar e pedir ajuda sem medo", isRequired: true, options: [{ id: "green", label: "Saudável" }, { id: "yellow", label: "Atenção" }, { id: "red", label: "Crítico" }] },
        ],
      },
      {
        title: "Ação e melhoria",
        questions: [
          { type: "checkbox", text: "Qual dimensão o time deveria priorizar para melhorar?", isRequired: true, options: [{ id: "speed", label: "Velocidade" }, { id: "quality", label: "Qualidade" }, { id: "fun", label: "Diversão" }, { id: "learning", label: "Aprendizado" }, { id: "mission", label: "Missão" }, { id: "support", label: "Suporte" }, { id: "teamwork", label: "Trabalho em equipe" }, { id: "autonomy", label: "Autonomia" }, { id: "safety", label: "Segurança psicológica" }] },
          { type: "text_short", text: "Que ação concreta sugere para melhorar essa dimensão?", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: true,
    },
  },
  {
    type: "360_feedback",
    category: "ciclo",
    name: "360° Feedback",
    subtitle: "Avaliação multi-perspectiva",
    icon: ArrowsClockwise,
    defaultQuestionCount: 16,
    flowSteps: [
      { label: "Autoavaliação", description: "Avaliado responde sobre si mesmo" },
      { label: "Avaliação de pares", description: "Colegas selecionados avaliam o colaborador" },
      { label: "Avaliação do gestor", description: "Gestor direto avalia o colaborador" },
      { label: "Calibração", description: "RH e liderança alinham resultados entre áreas" },
      { label: "Devolutiva (Feedback)", description: "Resultado consolidado compartilhado com o avaliado" },
    ],
    sections: [
      {
        title: "Competências-chave",
        questions: [
          { type: "likert", text: "Demonstra liderança e influência positiva", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Comunica-se de forma eficaz", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Entrega resultados consistentes", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Colabora e trabalha bem em equipe", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
        ],
      },
      {
        title: "Potencial e crescimento",
        questions: [
          { type: "likert", text: "Demonstra capacidade de assumir responsabilidades maiores do que as atuais", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Aprende coisas novas com rapidez e aplica em situações diferentes", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Demonstra interesse ativo em crescer e se desenvolver na carreira", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Lida bem com ambiguidade e se adapta a mudanças", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
        ],
      },
      {
        title: "Avaliação geral",
        questions: [
          { type: "rating", text: "No geral, como você avalia a contribuição desta pessoa?", isRequired: true, ratingMax: 5 },
          { type: "yes_no", text: "Se fosse meu dinheiro, eu daria a esta pessoa o maior aumento possível", isRequired: true },
          { type: "yes_no", text: "Eu sempre quero esta pessoa no meu time", isRequired: true },
        ],
      },
      {
        title: "Feedback qualitativo",
        questions: [
          { type: "checkbox", text: "Quais são os maiores pontos fortes desta pessoa?", isRequired: true, options: [{ id: "comm", label: "Comunicação" }, { id: "lead", label: "Liderança" }, { id: "tech", label: "Competência técnica" }, { id: "team", label: "Trabalho em equipe" }, { id: "innov", label: "Inovação" }] },
          { type: "checkbox", text: "O que esta pessoa poderia melhorar?", isRequired: true, options: [{ id: "comm", label: "Comunicação" }, { id: "time", label: "Gestão de tempo" }, { id: "conflict", label: "Gestão de conflitos" }, { id: "delegation", label: "Delegação" }, { id: "feedback", label: "Dar feedback" }] },
          { type: "text_long", text: "Descreva uma situação em que esta pessoa se destacou positivamente", isRequired: false },
          { type: "text_long", text: "Algum feedback adicional?", isRequired: false },
          { type: "text_long", text: "Recomendações de desenvolvimento", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: false,
      aiPrefillFeedback: true,
      aiBiasDetection: true,
    },
  },
  {
    type: "feedback_solicitado",
    category: "ciclo",
    name: "Feedback Solicitado",
    subtitle: "Peça feedback a colegas específicos",
    icon: ChatCircle,
    defaultQuestionCount: 6,
    flowSteps: [
      { label: "Solicitação", description: "Colaborador ou gestor seleciona os avaliadores" },
      { label: "Coleta de respostas", description: "Avaliadores respondem o questionário" },
      { label: "Consolidação", description: "Respostas reunidas em um relatório único" },
      { label: "Devolutiva", description: "Feedback compartilhado com o solicitante" },
    ],
    sections: [
      {
        title: "Avaliação",
        questions: [
          { type: "rating", text: "No geral, como você avalia a colaboração com esta pessoa?", isRequired: true, ratingMax: 5 },
          { type: "likert", text: "Confio nesta pessoa para entregar o que combinou", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
        ],
      },
      {
        title: "Feedback qualitativo",
        questions: [
          { type: "checkbox", text: "Quais são os pontos fortes desta pessoa?", isRequired: true, options: [{ id: "comm", label: "Comunicação" }, { id: "collab", label: "Colaboração" }, { id: "proactive", label: "Proatividade" }, { id: "tech", label: "Competência técnica" }, { id: "reliability", label: "Confiabilidade" }] },
          { type: "checkbox", text: "Em quais áreas esta pessoa poderia melhorar?", isRequired: true, options: [{ id: "comm", label: "Comunicação" }, { id: "time", label: "Gestão de tempo" }, { id: "org", label: "Organização" }, { id: "conflict", label: "Gestão de conflitos" }, { id: "feedback", label: "Dar/receber feedback" }] },
          { type: "text_long", text: "Descreva uma situação específica que exemplifique seu feedback", isRequired: true },
          { type: "text_long", text: "Que conselho você daria para o desenvolvimento desta pessoa?", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: false,
    },
  },
  {
    type: "skip_level",
    category: "pesquisa",
    name: "Skip-Level",
    subtitle: "Feedback anônimo para N+2",
    icon: StackSimple,
    defaultQuestionCount: 8,
    flowSteps: [
      { label: "Convite anônimo", description: "Liderados indiretos (N-2) são convidados" },
      { label: "Respostas anônimas", description: "Feedback sem identificação do respondente" },
      { label: "Análise de padrões", description: "IA identifica temas recorrentes" },
      { label: "Relatório para N+2", description: "Liderança sênior recebe os insights" },
    ],
    sections: [
      {
        title: "Sobre seu gestor direto",
        questions: [
          { type: "likert", text: "Meu gestor direto me apoia no meu desenvolvimento", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Me sinto seguro(a) para dar opiniões e discordar no meu time", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Minha carga de trabalho é razoável e sustentável", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
        ],
      },
      {
        title: "Sobre a organização",
        questions: [
          { type: "likert", text: "Tenho clareza sobre a direção estratégica da empresa", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "likert", text: "Vejo oportunidades reais de crescimento para mim aqui", isRequired: true, scaleMin: 1, scaleMax: 5, scaleLabels: { min: "Discordo totalmente", max: "Concordo totalmente" } },
          { type: "text_long", text: "O que a liderança poderia fazer diferente para melhorar o dia a dia do time?", isRequired: true },
          { type: "text_long", text: "Há algo que você gostaria de comunicar diretamente à liderança sênior?", isRequired: false },
          { type: "text_short", text: "Uma palavra que descreve a cultura do time hoje", isRequired: false },
        ],
      },
    ],
    defaultConfig: {
      isAnonymous: true,
    },
  },
  {
    type: "custom",
    category: "pesquisa",
    name: "Personalizada",
    subtitle: "Crie sua pesquisa do zero",
    icon: GearSix,
    defaultQuestionCount: 0,
    flowSteps: [],
    sections: [],
    defaultConfig: {
      isAnonymous: true,
    },
  },
];

export function getTemplateByType(type: SurveyType): SurveyTemplate | undefined {
  return SURVEY_TEMPLATES.find((t) => t.type === type);
}

export function getCategoryLabel(category: SurveyCategory): string {
  return category === "pesquisa" ? "Pesquisa" : "Ciclo";
}

export function getTypeLabel(type: SurveyType): string {
  const template = getTemplateByType(type);
  return template?.name ?? type;
}
