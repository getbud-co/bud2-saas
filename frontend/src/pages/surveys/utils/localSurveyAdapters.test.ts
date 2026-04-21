import { describe, it, expect } from "vitest";
import {
  wizardStateToSurveyListItem,
  createWizardStateFromListItem,
  wizardStateToRendererData,
  buildSurveyResultsFromRecord,
} from "./localSurveyAdapters";
import { initialWizardState } from "@/pages/surveys/create/wizardReducer";
import type { SurveyWizardState } from "@/types/survey";
import type { SurveyListItemData, SurveyLocalRecord } from "@/lib/surveys-store";

/* ——— Helpers ——— */

function makeState(overrides: Partial<SurveyWizardState> = {}): SurveyWizardState {
  return { ...initialWizardState, ...overrides };
}

function makeListItem(overrides: Partial<SurveyListItemData> = {}): SurveyListItemData {
  return {
    id: "survey-1",
    templateId: null,
    name: "Test Survey",
    type: "pulse",
    category: "pesquisa",
    status: "draft",
    startDate: "",
    endDate: "",
    ownerIds: [],
    managerIds: [],
    tagIds: [],
    cycleId: null,
    totalRecipients: 50,
    totalResponses: 10,
    completionRate: 20,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeRecord(overrides: Partial<SurveyLocalRecord> = {}): SurveyLocalRecord {
  return {
    id: "record-1",
    listItem: makeListItem(),
    wizardState: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/* ——— Tests ——— */

describe("localSurveyAdapters", () => {
  describe("wizardStateToSurveyListItem", () => {
    it("returns a valid SurveyListItemData object", () => {
      const state = makeState({
        name: "My Survey",
        type: "pulse",
        category: "pesquisa",
        scope: { scopeType: "company", teamIds: [], userIds: [] },
      });
      const result = wizardStateToSurveyListItem(state, {
        surveyId: "s-1",
        templateId: "t-1",
        status: "draft",
        createdAt: "2026-01-01T00:00:00Z",
      });

      expect(result.id).toBe("s-1");
      expect(result.templateId).toBe("t-1");
      expect(result.name).toBe("My Survey");
      expect(result.type).toBe("pulse");
      expect(result.category).toBe("pesquisa");
      expect(result.status).toBe("draft");
      expect(result.totalRecipients).toBe(150);
      expect(result.createdAt).toBe("2026-01-01T00:00:00Z");
    });

    it("uses fallback name when name is empty", () => {
      const state = makeState({ name: "  " });
      const result = wizardStateToSurveyListItem(state, {
        surveyId: "s-1",
        templateId: null,
        status: "draft",
        createdAt: "2026-01-01T00:00:00Z",
      });
      expect(result.name).toBe("Pesquisa sem titulo");
    });

    it("uses fallback type/category from options when state values are null", () => {
      const state = makeState({ type: null, category: null });
      const result = wizardStateToSurveyListItem(state, {
        surveyId: "s-1",
        templateId: null,
        status: "draft",
        createdAt: "2026-01-01T00:00:00Z",
        fallbackType: "clima",
        fallbackCategory: "pesquisa",
      });
      expect(result.type).toBe("clima");
      expect(result.category).toBe("pesquisa");
    });

    it("calculates completionRate correctly", () => {
      const state = makeState({
        scope: { scopeType: "individual", teamIds: [], userIds: ["u1", "u2", "u3", "u4"] },
      });
      const result = wizardStateToSurveyListItem(state, {
        surveyId: "s-1",
        templateId: null,
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
        totalResponses: 2,
      });
      expect(result.totalRecipients).toBe(4);
      expect(result.totalResponses).toBe(2);
      expect(result.completionRate).toBe(50);
    });

    it("caps completionRate at 100", () => {
      const state = makeState({
        scope: { scopeType: "individual", teamIds: [], userIds: ["u1"] },
      });
      const result = wizardStateToSurveyListItem(state, {
        surveyId: "s-1",
        templateId: null,
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
        totalResponses: 5,
      });
      expect(result.completionRate).toBe(100);
    });

    it("deduplicates ownerIds, managerIds, tagIds", () => {
      const state = makeState({
        ownerIds: ["a", "b", "a"],
        managerIds: ["c", "c"],
        tagIds: ["t", "t", "t"],
      });
      const result = wizardStateToSurveyListItem(state, {
        surveyId: "s-1",
        templateId: null,
        status: "draft",
        createdAt: "2026-01-01T00:00:00Z",
      });
      expect(result.ownerIds).toEqual(["a", "b"]);
      expect(result.managerIds).toEqual(["c"]);
      expect(result.tagIds).toEqual(["t"]);
    });
  });

  describe("createWizardStateFromListItem", () => {
    it("returns a SurveyWizardState with values from the list item", () => {
      const item = makeListItem({
        name: "Existing Survey",
        type: "pulse",
        category: "pesquisa",
        ownerIds: ["o1"],
        managerIds: ["m1"],
        tagIds: ["tag1"],
        cycleId: "cycle-1",
      });
      const state = createWizardStateFromListItem(item);

      expect(state.step).toBe(1);
      expect(state.name).toBe("Existing Survey");
      expect(state.type).toBe("pulse");
      expect(state.category).toBe("pesquisa");
      expect(state.ownerIds).toEqual(["o1"]);
      expect(state.managerIds).toEqual(["m1"]);
      expect(state.tagIds).toEqual(["tag1"]);
      expect(state.cycleId).toBe("cycle-1");
    });

    it("loads empty perspectives for non-ciclo category", () => {
      const item = makeListItem({ category: "pesquisa" });
      const state = createWizardStateFromListItem(item);
      expect(state.perspectives).toEqual([]);
    });

    it("loads default perspectives for ciclo category", () => {
      const item = makeListItem({ category: "ciclo", type: "360_feedback" });
      const state = createWizardStateFromListItem(item);
      expect(state.perspectives.length).toBeGreaterThan(0);
      expect(state.perspectives.some((p) => p.perspective === "self")).toBe(true);
    });

    it("deduplicates ownerIds from list item", () => {
      const item = makeListItem({ ownerIds: ["a", "a", "b"] });
      const state = createWizardStateFromListItem(item);
      expect(state.ownerIds).toEqual(["a", "b"]);
    });
  });

  describe("wizardStateToRendererData", () => {
    it("returns renderer data with correct name and description", () => {
      const state = makeState({
        name: "Survey Name",
        description: "Survey Description",
        isAnonymous: true,
        sections: [{ id: "s1", title: "Section 1" }],
        questions: [{ id: "q1", sectionId: "s1", type: "text_short", text: "How?", isRequired: true }],
      });
      const data = wizardStateToRendererData(state);

      expect(data.name).toBe("Survey Name");
      expect(data.description).toBe("Survey Description");
      expect(data.isAnonymous).toBe(true);
      expect(data.sections).toHaveLength(1);
      expect(data.questions).toHaveLength(1);
    });

    it("uses fallback name when name is empty", () => {
      const state = makeState({ name: "" });
      const data = wizardStateToRendererData(state);
      expect(data.name).toBe("Pesquisa sem titulo");
    });

    it("sets description to undefined when empty", () => {
      const state = makeState({ description: "" });
      const data = wizardStateToRendererData(state);
      expect(data.description).toBeUndefined();
    });

    it("includes enabledPerspectives for ciclo surveys with enabled perspectives", () => {
      const state = makeState({
        category: "ciclo",
        perspectives: [
          { perspective: "self", enabled: true, isAnonymous: false, peerSelectionMethod: "manager_assigns", minEvaluators: 1, maxEvaluators: 1 },
          { perspective: "manager", enabled: false, isAnonymous: false, peerSelectionMethod: "manager_assigns", minEvaluators: 1, maxEvaluators: 1 },
          { perspective: "peers", enabled: true, isAnonymous: true, peerSelectionMethod: "manager_assigns", minEvaluators: 3, maxEvaluators: 5 },
        ],
      });
      const data = wizardStateToRendererData(state);
      expect(data.enabledPerspectives).toEqual(["self", "peers"]);
    });

    it("does not include enabledPerspectives for non-ciclo surveys", () => {
      const state = makeState({ category: "pesquisa" });
      const data = wizardStateToRendererData(state);
      expect(data.enabledPerspectives).toBeUndefined();
    });
  });

  describe("buildSurveyResultsFromRecord", () => {
    it("returns a SurveyResultData with correct survey metadata", () => {
      const record = makeRecord({
        id: "r-1",
        listItem: makeListItem({
          name: "Results Survey",
          type: "pulse",
          category: "pesquisa",
          status: "active",
          totalRecipients: 50,
          totalResponses: 25,
        }),
      });
      const result = buildSurveyResultsFromRecord(record);

      expect(result.surveyId).toBe("r-1");
      expect(result.surveyName).toBe("Results Survey");
      expect(result.surveyType).toBe("pulse");
      expect(result.surveyCategory).toBe("pesquisa");
      expect(result.status).toBe("active");
    });

    it("includes KPI data", () => {
      const record = makeRecord({
        listItem: makeListItem({
          totalRecipients: 100,
          totalResponses: 50,
        }),
      });
      const result = buildSurveyResultsFromRecord(record);

      expect(result.kpis).toBeDefined();
      expect(result.kpis.responses).toBe(50);
      expect(result.kpis.completionRate).toBe(50);
      expect(typeof result.kpis.avgCompletionTime).toBe("string");
    });

    it("includes calibration data for ciclo category", () => {
      const record = makeRecord({
        listItem: makeListItem({
          category: "ciclo",
          type: "360_feedback",
          totalResponses: 10,
        }),
      });
      const result = buildSurveyResultsFromRecord(record);
      expect(result.calibration).toBeDefined();
      expect(result.calibration!.participants.length).toBeGreaterThan(0);
      expect(result.peerNominationSession).toBeDefined();
    });

    it("does not include calibration data for pesquisa category", () => {
      const record = makeRecord({
        listItem: makeListItem({ category: "pesquisa" }),
      });
      const result = buildSurveyResultsFromRecord(record);
      expect(result.calibration).toBeUndefined();
      expect(result.peerNominationSession).toBeUndefined();
    });

    it("includes hrReview data when there are responses", () => {
      const record = makeRecord({
        listItem: makeListItem({ totalResponses: 10, type: "pulse" }),
        wizardState: makeState({
          type: "pulse",
          category: "pesquisa",
          sections: [{ id: "s1", title: "Section 1" }],
          questions: [
            { id: "q1", sectionId: "s1", type: "likert", text: "Rate this", isRequired: true, scaleMin: 1, scaleMax: 5 },
          ],
        }),
      });
      const result = buildSurveyResultsFromRecord(record);
      expect(result.hrReview).toBeDefined();
    });

    it("generates sections from wizard state questions", () => {
      const record = makeRecord({
        listItem: makeListItem({ totalResponses: 5 }),
        wizardState: makeState({
          sections: [{ id: "s1", title: "Section 1" }],
          questions: [
            { id: "q1", sectionId: "s1", type: "text_short", text: "Name?", isRequired: true },
            { id: "q2", sectionId: "s1", type: "likert", text: "Rate", isRequired: true, scaleMin: 1, scaleMax: 5 },
          ],
        }),
      });
      const result = buildSurveyResultsFromRecord(record);
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.sections[0]!.title).toBe("Section 1");
      expect(result.sections[0]!.questions).toHaveLength(2);
    });

    it("returns empty sections when wizard has no questions", () => {
      const record = makeRecord({
        listItem: makeListItem({ totalResponses: 5 }),
        wizardState: makeState({ sections: [], questions: [] }),
      });
      const result = buildSurveyResultsFromRecord(record);
      expect(result.sections).toEqual([]);
    });

    it("handles real submission data when provided", () => {
      const record = makeRecord({
        listItem: makeListItem({ totalResponses: 0 }),
        wizardState: makeState({
          sections: [],
          questions: [
            { id: "q1", sectionId: null, type: "yes_no", text: "Agree?", isRequired: true },
          ],
        }),
      });
      const submissions = [
        {
          id: "sub-1",
          surveyId: "record-1",
          respondentKey: "r1",
          answers: { q1: "yes" },
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          submittedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "sub-2",
          surveyId: "record-1",
          respondentKey: "r2",
          answers: { q1: "no" },
          createdAt: "2026-01-02T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
          submittedAt: "2026-01-02T00:00:00Z",
        },
      ];
      const result = buildSurveyResultsFromRecord(record, { submissions });

      expect(result.kpis.responses).toBe(2);
      expect(result.sections.length).toBeGreaterThan(0);
      const questionResult = result.sections[0]!.questions[0]!;
      expect(questionResult.responseCount).toBe(2);
    });
  });
});
