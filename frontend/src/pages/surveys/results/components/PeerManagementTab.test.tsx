/**
 * Tests for PeerManagementTab
 *
 * Tab for managing peer nominations: KPIs, overload/reciprocity alerts,
 * people-centric view with approve/reject actions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { PeerManagementTab } from "./PeerManagementTab";
import type { SurveyResultData } from "../types";

function buildData(overrides?: Partial<SurveyResultData>): SurveyResultData {
  return {
    surveyId: "s1",
    surveyName: "Ciclo Q1",
    surveyType: "360",
    surveyCategory: "ciclo",
    status: "active",
    period: "01/01/2026 – 31/03/2026",
    isAnonymous: false,
    kpis: {
      views: 100,
      started: 80,
      responses: 60,
      completionRate: 75,
      avgCompletionTime: "10 min",
    },
    sections: [],
    peerNominationSession: {
      phase: "approval",
      peerAssignmentMode: "employee_nominates",
      nominationDeadline: "2026-02-15",
      approvalDeadline: "2026-02-20",
      totalEvaluatees: 3,
      evaluateesWithNominations: 2,
      evaluateesFullyApproved: 1,
      nominations: [
        {
          id: "n1",
          evaluateeId: "e1",
          evaluateeName: "Ana Ferreira",
          evaluateeInitials: "AF",
          evaluateeDepartment: "Engenharia",
          nominatedPeerId: "p1",
          nominatedPeerName: "Joao Martins",
          nominatedPeerInitials: "JM",
          nominatedPeerDepartment: "Produto",
          nominatedById: "e1",
          nominatedByName: "Ana Ferreira",
          status: "pending",
          submittedAt: "2026-02-10",
          aiSuggested: false,
        },
        {
          id: "n2",
          evaluateeId: "e1",
          evaluateeName: "Ana Ferreira",
          evaluateeInitials: "AF",
          evaluateeDepartment: "Engenharia",
          nominatedPeerId: "p2",
          nominatedPeerName: "Carla Santos",
          nominatedPeerInitials: "CS",
          nominatedPeerDepartment: "People",
          nominatedById: "e1",
          nominatedByName: "Ana Ferreira",
          status: "approved",
          submittedAt: "2026-02-10",
          reviewedAt: "2026-02-12",
          reviewedByName: "Admin (RH)",
          aiSuggested: true,
          aiConfidence: 0.85,
        },
      ],
    },
    ...overrides,
  };
}

function renderTab(data?: SurveyResultData) {
  const user = userEvent.setup();
  const result = renderWithProviders(<PeerManagementTab data={data ?? buildData()} />);
  return { user, ...result };
}

describe("PeerManagementTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // No data state
  // ═══════════════════════════════════════════════════════════════

  it("shows info alert when no peer nomination session", () => {
    renderTab(buildData({ peerNominationSession: undefined }));
    expect(screen.getByText("Sem dados de nomeação")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Rendering with data
  // ═══════════════════════════════════════════════════════════════

  it("renders phase badge", () => {
    renderTab();
    expect(screen.getByText("Aprovação em andamento")).toBeInTheDocument();
  });

  it("renders deadline text", () => {
    renderTab();
    expect(screen.getByText(/Nomeação até 2026-02-15/)).toBeInTheDocument();
  });

  it("renders bulk approve button when pending nominations exist", () => {
    renderTab();
    expect(screen.getByRole("button", { name: /aprovar todas/i })).toBeInTheDocument();
  });

  it("renders KPI for Total", () => {
    renderTab();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("renders KPI for Pendentes", () => {
    renderTab();
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
  });

  it("renders KPI for Aprovadas", () => {
    renderTab();
    expect(screen.getByText("Aprovadas")).toBeInTheDocument();
  });

  it("renders KPI for Rejeitadas", () => {
    renderTab();
    expect(screen.getByText("Rejeitadas")).toBeInTheDocument();
  });

  it("renders the people view section title", () => {
    renderTab();
    expect(screen.getByText("Visão por colaborador")).toBeInTheDocument();
  });

  it("renders search input", () => {
    renderTab();
    expect(screen.getByPlaceholderText("Buscar colaborador...")).toBeInTheDocument();
  });

  it("renders evaluatee name in the list", () => {
    renderTab();
    expect(screen.getByText("Ana Ferreira")).toBeInTheDocument();
  });
});
