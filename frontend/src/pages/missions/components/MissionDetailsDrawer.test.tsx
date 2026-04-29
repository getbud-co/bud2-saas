// ─── MissionDetailsDrawer — testes de componente ──────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { MissionDetailsDrawer } from "./MissionDetailsDrawer";
import type { KeyResult, MissionTask } from "@/types";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function makeIndicator(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: "kr-1",
    orgId: "org1",
    missionId: "m1",
    parentKrId: null,
    title: "Aumentar NPS para 80",
    description: null,
    ownerId: "u1",
    teamId: null,
    measurementMode: "manual",
    goalType: "reach",
    targetValue: "80",
    currentValue: "60",
    startValue: "40",
    lowThreshold: null,
    highThreshold: null,
    unit: "count",
    unitLabel: null,
    expectedValue: "70",
    status: "on_track",
    progress: 50,
    periodLabel: "Q1 2025",
    periodStart: null,
    periodEnd: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    deletedAt: null,
    linkedMissionId: null,
    linkedSurveyId: null,
    externalSource: null,
    externalConfig: null,
    owner: { id: "u1", firstName: "João", lastName: "Silva", initials: "JS" },
    ...overrides,
  };
}

function makeDrawerTask(overrides: Partial<MissionTask> = {}): MissionTask {
  return {
    id: "t-1",
    missionId: "m1",
    keyResultId: null,
    title: "Implementar formulário de feedback",
    description: "Criar formulário para coletar NPS",
    ownerId: "u1",
    teamId: null,
    dueDate: "2025-03-01",
    isDone: false,
    status: "todo",
    completedAt: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    owner: { id: "u1", firstName: "Maria", lastName: "Santos", initials: "MS" },
    ...overrides,
  };
}

function makeDefaultProps(overrides: Record<string, unknown> = {}) {
  return {
    drawerOpen: true,
    drawerMode: "indicator" as const,
    drawerIndicator: makeIndicator(),
    drawerTask: null,
    drawerMissionTitle: "Missão de Crescimento",
    drawerEditing: false,
    editingItem: null,
    renderInlineForm: () => null,
    startDrawerEdit: vi.fn(),
    handleCloseDrawer: vi.fn(),
    drawerContributesTo: [],
    setDrawerContributesTo: vi.fn(),
    drawerItemId: "kr-1",
    handleRequestRemoveContribution: vi.fn(),
    drawerContribPickerOpen: false,
    setDrawerContribPickerOpen: vi.fn(),
    drawerContribPickerSearch: "",
    setDrawerContribPickerSearch: vi.fn(),
    addContribRef: createRef<HTMLButtonElement>(),
    allMissions: [
      { id: "m1", title: "Missão de Crescimento" },
      { id: "m2", title: "Missão de Retenção" },
    ],
    drawerSourceMissionId: "m1",
    drawerSourceMissionTitle: "Missão de Crescimento",
    handleAddContribution: vi.fn(),
    supportTeam: ["JS"],
    setSupportTeam: vi.fn(),
    addSupportOpen: false,
    setAddSupportOpen: vi.fn(),
    addSupportRef: createRef<HTMLDivElement>(),
    supportSearch: "",
    setSupportSearch: vi.fn(),
    ownerOptions: [
      { id: "u1", label: "João Silva", initials: "JS" },
      { id: "u2", label: "Maria Santos", initials: "MS" },
    ],
    drawerValue: "",
    setDrawerValue: vi.fn(),
    drawerConfidence: null,
    setDrawerConfidence: vi.fn(),
    confidenceOpen: false,
    setConfidenceOpen: vi.fn(),
    confidenceBtnRef: createRef<HTMLButtonElement>(),
    confidenceOptions: [
      { id: "high" as const, label: "Alta", description: "Vamos atingir", color: "#22c55e" },
      { id: "medium" as const, label: "Média", description: "Precisamos de atenção", color: "#f59e0b" },
      { id: "low" as const, label: "Baixa", description: "Risco alto", color: "#ef4444" },
    ],
    drawerNote: "",
    drawerNoteRef: createRef<HTMLTextAreaElement>(),
    handleNoteChange: vi.fn(),
    handleNoteKeyDown: vi.fn(),
    mentionQuery: null,
    mentionIndex: 0,
    mentionResults: [],
    insertMention: vi.fn(),
    handleConfirmCheckin: vi.fn(),
    checkInHistoryForIndicator: [],
    checkInChartDataForIndicator: [],
    checkInSyncStateById: {},
    onUpdateCheckIn: vi.fn(),
    onDeleteCheckIn: vi.fn(),
    newlyCreatedCheckInId: null,
    drawerTasks: [],
    setDrawerTasks: vi.fn(),
    newTaskLabel: "",
    setNewTaskLabel: vi.fn(),
    setDrawerTask: vi.fn(),
    ...overrides,
  };
}

/* ─── Testes ────────────────────────────────────────────────────────────────── */

describe("MissionDetailsDrawer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("modo indicador", () => {
    it("renderiza sem erros no modo indicador", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByLabelText("Detalhe do indicador")).toBeInTheDocument();
    });

    it("exibe o título do indicador", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("Aumentar NPS para 80")).toBeInTheDocument();
    });

    it("exibe o label do período do indicador", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("Q1 2025")).toBeInTheDocument();
    });

    it("exibe o nome do responsável", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("João Silva")).toBeInTheDocument();
    });

    it("exibe botão Editar", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("Editar")).toBeInTheDocument();
    });

    it("exibe seção de check-in com label e botão Registrar", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      const elements = screen.getAllByText("Registrar check-in");
      // Deve haver pelo menos o label da seção e o botão
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    it("exibe seção Participantes", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("Participantes")).toBeInTheDocument();
    });

    it("exibe seção Tarefas", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("Tarefas")).toBeInTheDocument();
    });

    it("exibe link para a missão pai", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("Missão de Crescimento")).toBeInTheDocument();
    });

    it("exibe botão 'Contribui para...'", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("Contribui para...")).toBeInTheDocument();
    });

    it("exibe seção de confiança", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.getByText("Confiança")).toBeInTheDocument();
    });

    it("não exibe histórico de check-ins quando vazio", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps()} />);
      expect(screen.queryByText("Histórico de check-ins")).not.toBeInTheDocument();
    });

    it("exibe histórico de check-ins quando existem", () => {
      const checkins = [
        {
          id: "ci-1",
          keyResultId: "kr-1",
          authorId: "u1",
          value: "60",
          previousValue: "40",
          confidence: null,
          note: "Progresso bom",
          mentions: null,
          createdAt: "2025-02-15T10:00:00Z",
          author: { id: "u1", firstName: "João", lastName: "Silva", initials: "JS" },
        },
      ];
      render(
        <MissionDetailsDrawer
          {...makeDefaultProps({ checkInHistoryForIndicator: checkins })}
        />,
      );
      expect(screen.getByText("Histórico de check-ins")).toBeInTheDocument();
      expect(screen.getByText("Progresso bom")).toBeInTheDocument();
    });

    it("não renderiza conteúdo quando drawerOpen é false", () => {
      render(<MissionDetailsDrawer {...makeDefaultProps({ drawerOpen: false })} />);
      expect(screen.queryByText("Aumentar NPS para 80")).not.toBeInTheDocument();
    });
  });

  describe("modo tarefa", () => {
    function taskProps(overrides: Record<string, unknown> = {}) {
      return makeDefaultProps({
        drawerMode: "task",
        drawerIndicator: null,
        drawerTask: makeDrawerTask(),
        drawerItemId: "t-1",
        ...overrides,
      });
    }

    it("renderiza sem erros no modo tarefa", () => {
      render(<MissionDetailsDrawer {...taskProps()} />);
      expect(screen.getByLabelText("Detalhe da tarefa")).toBeInTheDocument();
    });

    it("exibe o título da tarefa", () => {
      render(<MissionDetailsDrawer {...taskProps()} />);
      expect(screen.getByText("Implementar formulário de feedback")).toBeInTheDocument();
    });

    it("exibe badge de status 'Pendente' para tarefa não concluída", () => {
      render(<MissionDetailsDrawer {...taskProps()} />);
      expect(screen.getByText("Pendente")).toBeInTheDocument();
    });

    it("exibe badge de status 'Concluída' para tarefa concluída", () => {
      render(
        <MissionDetailsDrawer
          {...taskProps({ drawerTask: makeDrawerTask({ isDone: true }) })}
        />,
      );
      expect(screen.getByText("Concluída")).toBeInTheDocument();
    });

    it("exibe descrição da tarefa", () => {
      render(<MissionDetailsDrawer {...taskProps()} />);
      expect(screen.getByText("Criar formulário para coletar NPS")).toBeInTheDocument();
    });

    it("exibe nome do responsável da tarefa", () => {
      render(<MissionDetailsDrawer {...taskProps()} />);
      expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    });

    it("exibe botão Editar no modo tarefa", () => {
      render(<MissionDetailsDrawer {...taskProps()} />);
      expect(screen.getByText("Editar")).toBeInTheDocument();
    });
  });
});
