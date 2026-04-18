import { describe, it, expect } from "vitest";
import {
  wizardReducer,
  initialWizardState,
  needsPeerAssignment,
  type WizardAction,
} from "./wizardReducer";
import type { SurveyWizardState } from "@/types/survey";

/* ——— Helpers ——— */

function dispatch(action: WizardAction, state?: SurveyWizardState): SurveyWizardState {
  return wizardReducer(state ?? initialWizardState, action);
}

function dispatchMany(actions: WizardAction[], state?: SurveyWizardState): SurveyWizardState {
  return actions.reduce((s, a) => wizardReducer(s, a), state ?? initialWizardState);
}

/* ——— Tests ——— */

describe("wizardReducer", () => {
  describe("initialWizardState", () => {
    it("starts at step 0 with no template selected", () => {
      expect(initialWizardState.step).toBe(0);
      expect(initialWizardState.type).toBeNull();
      expect(initialWizardState.category).toBeNull();
    });

    it("has empty name and description", () => {
      expect(initialWizardState.name).toBe("");
      expect(initialWizardState.description).toBe("");
    });

    it("defaults to company scope", () => {
      expect(initialWizardState.scope.scopeType).toBe("company");
    });

    it("defaults to anonymous surveys", () => {
      expect(initialWizardState.isAnonymous).toBe(true);
    });

    it("has default delivery channels enabled", () => {
      expect(initialWizardState.deliveryInApp).toBe(true);
      expect(initialWizardState.deliveryEmail).toBe(true);
      expect(initialWizardState.deliverySlack).toBe(false);
    });
  });

  describe("SELECT_TEMPLATE", () => {
    it("sets type, category, and advances to step 1", () => {
      const state = dispatch({
        type: "SELECT_TEMPLATE",
        payload: { surveyType: "pulse", category: "pesquisa" },
      });
      expect(state.step).toBe(1);
      expect(state.type).toBe("pulse");
      expect(state.category).toBe("pesquisa");
    });

    it("clears perspectives for non-ciclo category", () => {
      const state = dispatch({
        type: "SELECT_TEMPLATE",
        payload: { surveyType: "pulse", category: "pesquisa" },
      });
      expect(state.perspectives).toEqual([]);
    });

    it("sets perspectives for ciclo category", () => {
      const state = dispatch({
        type: "SELECT_TEMPLATE",
        payload: { surveyType: "360_feedback", category: "ciclo" },
      });
      expect(state.perspectives.length).toBeGreaterThan(0);
      expect(state.perspectives.some((p) => p.perspective === "self")).toBe(true);
    });

    it("uses custom template data when provided", () => {
      const state = dispatch({
        type: "SELECT_TEMPLATE",
        payload: {
          surveyType: "custom",
          category: "pesquisa",
          template: {
            name: "Custom Template",
            sections: [{ id: "s1", title: "Custom Section" }],
            questions: [{ id: "q1", sectionId: "s1", type: "text_short", text: "Q?", isRequired: true }],
            defaultConfig: {
              isAnonymous: false,
              recurrence: "weekly",
            },
          },
        },
      });
      expect(state.name).toBe("Custom Template");
      expect(state.sections).toHaveLength(1);
      expect(state.questions).toHaveLength(1);
      expect(state.isAnonymous).toBe(false);
      expect(state.recurrence).toBe("weekly");
    });
  });

  describe("SET_STEP / NEXT_STEP / PREV_STEP", () => {
    it("SET_STEP sets the step directly", () => {
      const state = dispatch({ type: "SET_STEP", payload: 3 });
      expect(state.step).toBe(3);
    });

    it("NEXT_STEP increments by 1", () => {
      const state = dispatch({ type: "NEXT_STEP" }, { ...initialWizardState, step: 1 });
      // For non-ciclo, step 2 (peer assignment) is skipped
      expect(state.step).toBe(3);
    });

    it("NEXT_STEP does not exceed step 5", () => {
      const state = dispatch({ type: "NEXT_STEP" }, { ...initialWizardState, step: 5 });
      expect(state.step).toBe(5);
    });

    it("PREV_STEP decrements by 1", () => {
      const state = dispatch({ type: "PREV_STEP" }, { ...initialWizardState, step: 3 });
      // For non-ciclo, step 2 (peer assignment) is skipped
      expect(state.step).toBe(1);
    });

    it("PREV_STEP does not go below 0", () => {
      const state = dispatch({ type: "PREV_STEP" }, { ...initialWizardState, step: 0 });
      expect(state.step).toBe(0);
    });

    it("NEXT_STEP goes to step 2 for ciclo with peers enabled", () => {
      const cicloState: SurveyWizardState = {
        ...initialWizardState,
        step: 1,
        category: "ciclo",
        perspectives: [
          { perspective: "peers", enabled: true, isAnonymous: true, peerSelectionMethod: "manager_assigns", minEvaluators: 3, maxEvaluators: 5 },
        ],
      };
      const state = dispatch({ type: "NEXT_STEP" }, cicloState);
      expect(state.step).toBe(2);
    });
  });

  describe("SET_NAME / SET_DESCRIPTION", () => {
    it("SET_NAME updates the name", () => {
      const state = dispatch({ type: "SET_NAME", payload: "New Name" });
      expect(state.name).toBe("New Name");
    });

    it("SET_DESCRIPTION updates the description", () => {
      const state = dispatch({ type: "SET_DESCRIPTION", payload: "Desc" });
      expect(state.description).toBe("Desc");
    });
  });

  describe("SET_METADATA", () => {
    it("updates ownerIds", () => {
      const state = dispatch({ type: "SET_METADATA", payload: { ownerIds: ["o1", "o2"] } });
      expect(state.ownerIds).toEqual(["o1", "o2"]);
    });

    it("updates cycleId to null explicitly", () => {
      const initial = { ...initialWizardState, cycleId: "c-1" };
      const state = dispatch({ type: "SET_METADATA", payload: { cycleId: null } }, initial);
      expect(state.cycleId).toBeNull();
    });

    it("preserves existing values when not provided", () => {
      const initial = { ...initialWizardState, ownerIds: ["o1"], tagIds: ["t1"] };
      const state = dispatch({ type: "SET_METADATA", payload: { managerIds: ["m1"] } }, initial);
      expect(state.ownerIds).toEqual(["o1"]);
      expect(state.tagIds).toEqual(["t1"]);
      expect(state.managerIds).toEqual(["m1"]);
    });
  });

  describe("Scope actions", () => {
    it("SET_SCOPE_TYPE changes scope type", () => {
      const state = dispatch({ type: "SET_SCOPE_TYPE", payload: "team" });
      expect(state.scope.scopeType).toBe("team");
    });

    it("SET_SCOPE_TYPE to company clears teamIds", () => {
      const initial = {
        ...initialWizardState,
        scope: { scopeType: "team" as const, teamIds: ["t1"], userIds: [] },
      };
      const state = dispatch({ type: "SET_SCOPE_TYPE", payload: "company" }, initial);
      expect(state.scope.teamIds).toEqual([]);
    });

    it("ADD_TEAM adds a team id", () => {
      const state = dispatch({ type: "ADD_TEAM", payload: "team-1" });
      expect(state.scope.teamIds).toContain("team-1");
    });

    it("REMOVE_TEAM removes a team id", () => {
      const initial = {
        ...initialWizardState,
        scope: { scopeType: "team" as const, teamIds: ["t1", "t2"], userIds: [] },
      };
      const state = dispatch({ type: "REMOVE_TEAM", payload: "t1" }, initial);
      expect(state.scope.teamIds).toEqual(["t2"]);
    });
  });

  describe("Exclusion actions", () => {
    it("TOGGLE_USER_EXCLUSION adds a user when not excluded", () => {
      const state = dispatch({ type: "TOGGLE_USER_EXCLUSION", payload: "u1" });
      expect(state.excludedUserIds).toContain("u1");
    });

    it("TOGGLE_USER_EXCLUSION removes a user when already excluded", () => {
      const initial = { ...initialWizardState, excludedUserIds: ["u1"] };
      const state = dispatch({ type: "TOGGLE_USER_EXCLUSION", payload: "u1" }, initial);
      expect(state.excludedUserIds).not.toContain("u1");
    });

    it("SET_EXCLUDED_USERS replaces the entire list", () => {
      const state = dispatch({ type: "SET_EXCLUDED_USERS", payload: ["a", "b"] });
      expect(state.excludedUserIds).toEqual(["a", "b"]);
    });

    it("TOGGLE_EXCLUSION toggles trialPeriod", () => {
      expect(initialWizardState.excludeTrialPeriod).toBe(false);
      const state = dispatch({ type: "TOGGLE_EXCLUSION", payload: "trialPeriod" });
      expect(state.excludeTrialPeriod).toBe(true);
    });

    it("TOGGLE_EXCLUSION toggles leave", () => {
      const state = dispatch({ type: "TOGGLE_EXCLUSION", payload: "leave" });
      expect(state.excludeLeave).toBe(true);
    });

    it("TOGGLE_EXCLUSION toggles vacation", () => {
      const state = dispatch({ type: "TOGGLE_EXCLUSION", payload: "vacation" });
      expect(state.excludeVacation).toBe(true);
    });
  });

  describe("Question actions", () => {
    const baseQuestion = {
      id: "q1",
      sectionId: null,
      type: "text_short" as const,
      text: "Question?",
      isRequired: true,
    };

    it("ADD_QUESTION appends a question", () => {
      const state = dispatch({ type: "ADD_QUESTION", payload: baseQuestion });
      expect(state.questions).toHaveLength(1);
      expect(state.questions[0]!.id).toBe("q1");
    });

    it("REMOVE_QUESTION removes by id", () => {
      const initial = { ...initialWizardState, questions: [baseQuestion] };
      const state = dispatch({ type: "REMOVE_QUESTION", payload: "q1" }, initial);
      expect(state.questions).toHaveLength(0);
    });

    it("UPDATE_QUESTION updates specific fields", () => {
      const initial = { ...initialWizardState, questions: [baseQuestion] };
      const state = dispatch({
        type: "UPDATE_QUESTION",
        payload: { id: "q1", changes: { text: "Updated?" } },
      }, initial);
      expect(state.questions[0]!.text).toBe("Updated?");
      expect(state.questions[0]!.isRequired).toBe(true); // unchanged
    });

    it("REORDER_QUESTIONS replaces question order", () => {
      const q1 = { ...baseQuestion, id: "q1" };
      const q2 = { ...baseQuestion, id: "q2" };
      const initial = { ...initialWizardState, questions: [q1, q2] };
      const state = dispatch({ type: "REORDER_QUESTIONS", payload: [q2, q1] }, initial);
      expect(state.questions[0]!.id).toBe("q2");
      expect(state.questions[1]!.id).toBe("q1");
    });
  });

  describe("Section actions", () => {
    const baseSection = { id: "s1", title: "Section 1" };

    it("ADD_SECTION appends a section", () => {
      const state = dispatch({ type: "ADD_SECTION", payload: baseSection });
      expect(state.sections).toHaveLength(1);
    });

    it("UPDATE_SECTION updates specific fields", () => {
      const initial = { ...initialWizardState, sections: [baseSection] };
      const state = dispatch({
        type: "UPDATE_SECTION",
        payload: { id: "s1", changes: { title: "Updated" } },
      }, initial);
      expect(state.sections[0]!.title).toBe("Updated");
    });

    it("REMOVE_SECTION removes the section and unlinks questions", () => {
      const q = { id: "q1", sectionId: "s1", type: "text_short" as const, text: "Q?", isRequired: true };
      const initial = {
        ...initialWizardState,
        sections: [baseSection],
        questions: [q],
      };
      const state = dispatch({ type: "REMOVE_SECTION", payload: "s1" }, initial);
      expect(state.sections).toHaveLength(0);
      expect(state.questions[0]!.sectionId).toBeNull();
    });
  });

  describe("Settings actions", () => {
    it("SET_ANONYMOUS updates isAnonymous", () => {
      const state = dispatch({ type: "SET_ANONYMOUS", payload: false });
      expect(state.isAnonymous).toBe(false);
    });

    it("SET_LGPD_MIN_GROUP updates lgpdMinGroupSize", () => {
      const state = dispatch({ type: "SET_LGPD_MIN_GROUP", payload: 10 });
      expect(state.lgpdMinGroupSize).toBe(10);
    });

    it("SET_AI_ANALYSIS updates aiAnalysisEnabled", () => {
      const state = dispatch({ type: "SET_AI_ANALYSIS", payload: false });
      expect(state.aiAnalysisEnabled).toBe(false);
    });

    it("SET_AI_PREFILL_OKRS updates aiPrefillOkrs", () => {
      const state = dispatch({ type: "SET_AI_PREFILL_OKRS", payload: true });
      expect(state.aiPrefillOkrs).toBe(true);
    });

    it("SET_AI_PREFILL_FEEDBACK updates aiPrefillFeedback", () => {
      const state = dispatch({ type: "SET_AI_PREFILL_FEEDBACK", payload: true });
      expect(state.aiPrefillFeedback).toBe(true);
    });

    it("SET_AI_BIAS_DETECTION updates aiBiasDetection", () => {
      const state = dispatch({ type: "SET_AI_BIAS_DETECTION", payload: true });
      expect(state.aiBiasDetection).toBe(true);
    });
  });

  describe("Application mode and recurrence", () => {
    it("SET_APPLICATION_MODE to single clears recurrence", () => {
      const initial = {
        ...initialWizardState,
        applicationMode: "recurring" as const,
        recurrence: "weekly" as const,
        recurrenceDay: "monday" as const,
      };
      const state = dispatch({ type: "SET_APPLICATION_MODE", payload: "single" }, initial);
      expect(state.applicationMode).toBe("single");
      expect(state.recurrence).toBeNull();
      expect(state.recurrenceDay).toBeNull();
    });

    it("SET_APPLICATION_MODE to recurring preserves existing recurrence", () => {
      const initial = { ...initialWizardState, recurrence: "monthly" as const };
      const state = dispatch({ type: "SET_APPLICATION_MODE", payload: "recurring" }, initial);
      expect(state.applicationMode).toBe("recurring");
      expect(state.recurrence).toBe("monthly");
    });

    it("SET_RECURRENCE updates recurrence", () => {
      const state = dispatch({ type: "SET_RECURRENCE", payload: "quarterly" });
      expect(state.recurrence).toBe("quarterly");
    });

    it("SET_RECURRENCE_DAY updates recurrenceDay", () => {
      const state = dispatch({ type: "SET_RECURRENCE_DAY", payload: "friday" });
      expect(state.recurrenceDay).toBe("friday");
    });
  });

  describe("Reminder and notification actions", () => {
    it("SET_REMINDER_ENABLED toggles reminders", () => {
      const state = dispatch({ type: "SET_REMINDER_ENABLED", payload: false });
      expect(state.reminderEnabled).toBe(false);
    });

    it("SET_REMINDER_FREQUENCY sets frequency", () => {
      const state = dispatch({ type: "SET_REMINDER_FREQUENCY", payload: "daily" });
      expect(state.reminderFrequency).toBe("daily");
    });

    it("SET_NOTIFY_MANAGERS toggles manager notification", () => {
      const state = dispatch({ type: "SET_NOTIFY_MANAGERS", payload: false });
      expect(state.notifyManagers).toBe(false);
    });

    it("SET_MANAGER_NOTIFICATION_TEMPLATE updates template", () => {
      const state = dispatch({ type: "SET_MANAGER_NOTIFICATION_TEMPLATE", payload: "New template" });
      expect(state.managerNotificationTemplate).toBe("New template");
    });

    it("SET_NON_RESPONDENT_NOTIFICATION_TEMPLATE updates template", () => {
      const state = dispatch({ type: "SET_NON_RESPONDENT_NOTIFICATION_TEMPLATE", payload: "Reminder!" });
      expect(state.nonRespondentNotificationTemplate).toBe("Reminder!");
    });
  });

  describe("Delivery channel actions", () => {
    it("SET_DELIVERY_CHANNEL enables slack", () => {
      const state = dispatch({ type: "SET_DELIVERY_CHANNEL", payload: { channel: "slack", enabled: true } });
      expect(state.deliverySlack).toBe(true);
    });

    it("SET_DELIVERY_CHANNEL disables email", () => {
      const state = dispatch({ type: "SET_DELIVERY_CHANNEL", payload: { channel: "email", enabled: false } });
      expect(state.deliveryEmail).toBe(false);
    });

    it("SET_DELIVERY_CHANNEL disables inApp", () => {
      const state = dispatch({ type: "SET_DELIVERY_CHANNEL", payload: { channel: "inApp", enabled: false } });
      expect(state.deliveryInApp).toBe(false);
    });
  });

  describe("Date and launch actions", () => {
    it("SET_START_DATE sets the start date", () => {
      const state = dispatch({ type: "SET_START_DATE", payload: "2026-01-01" });
      expect(state.startDate).toBe("2026-01-01");
    });

    it("SET_END_DATE sets the end date", () => {
      const state = dispatch({ type: "SET_END_DATE", payload: "2026-12-31" });
      expect(state.endDate).toBe("2026-12-31");
    });

    it("SET_LAUNCH_OPTION changes launch option", () => {
      const state = dispatch({ type: "SET_LAUNCH_OPTION", payload: "scheduled" });
      expect(state.launchOption).toBe("scheduled");
    });

    it("SET_SCHEDULED_LAUNCH sets scheduled launch datetime", () => {
      const state = dispatch({ type: "SET_SCHEDULED_LAUNCH", payload: "2026-02-01T09:00:00Z" });
      expect(state.scheduledLaunchAt).toBe("2026-02-01T09:00:00Z");
    });
  });

  describe("Peer assignment actions", () => {
    it("SET_PEER_ASSIGNMENT_MODE updates mode", () => {
      const state = dispatch({ type: "SET_PEER_ASSIGNMENT_MODE", payload: "centralized" });
      expect(state.peerAssignmentMode).toBe("centralized");
    });

    it("SET_PEER_NOMINATION_CONFIG merges partial config", () => {
      const state = dispatch({
        type: "SET_PEER_NOMINATION_CONFIG",
        payload: { nominationDays: 10, aiSuggestionsEnabled: false },
      });
      expect(state.peerNominationConfig.nominationDays).toBe(10);
      expect(state.peerNominationConfig.aiSuggestionsEnabled).toBe(false);
      // Other fields preserved from initial
      expect(state.peerNominationConfig.approvalDays).toBe(3);
    });

    it("SET_PEER_ASSIGNMENTS replaces assignments", () => {
      const assignments = [
        { evaluateeId: "e1", suggestions: [], assignedPeerIds: ["p1", "p2"] },
      ];
      const state = dispatch({ type: "SET_PEER_ASSIGNMENTS", payload: assignments });
      expect(state.peerAssignments).toHaveLength(1);
      expect(state.peerAssignments[0]!.evaluateeId).toBe("e1");
    });

    it("UPDATE_PEER_ASSIGNMENT updates a specific evaluatee", () => {
      const initial = {
        ...initialWizardState,
        peerAssignments: [
          { evaluateeId: "e1", suggestions: [], assignedPeerIds: ["p1"] },
          { evaluateeId: "e2", suggestions: [], assignedPeerIds: ["p3"] },
        ],
      };
      const state = dispatch({
        type: "UPDATE_PEER_ASSIGNMENT",
        payload: { evaluateeId: "e1", assignedPeerIds: ["p1", "p2", "p4"] },
      }, initial);
      expect(state.peerAssignments[0]!.assignedPeerIds).toEqual(["p1", "p2", "p4"]);
      expect(state.peerAssignments[1]!.assignedPeerIds).toEqual(["p3"]); // unchanged
    });
  });

  describe("Perspective config", () => {
    it("SET_PERSPECTIVE_CONFIG updates a specific perspective", () => {
      const state = dispatch({
        type: "SET_PERSPECTIVE_CONFIG",
        payload: { perspective: "peers", config: { enabled: false, minEvaluators: 5 } },
      });
      const peers = state.perspectives.find((p) => p.perspective === "peers");
      expect(peers?.enabled).toBe(false);
      expect(peers?.minEvaluators).toBe(5);
    });
  });

  describe("LOAD_DRAFT / RESET", () => {
    it("LOAD_DRAFT merges draft state onto initial", () => {
      const draft: SurveyWizardState = {
        ...initialWizardState,
        step: 3,
        name: "Loaded Draft",
        type: "clima",
      };
      const state = dispatch({ type: "LOAD_DRAFT", payload: draft });
      expect(state.step).toBe(3);
      expect(state.name).toBe("Loaded Draft");
      expect(state.type).toBe("clima");
    });

    it("RESET restores initial state", () => {
      const modified = dispatchMany([
        { type: "SET_NAME", payload: "Modified" },
        { type: "SET_STEP", payload: 4 },
        { type: "SET_ANONYMOUS", payload: false },
      ]);
      const state = dispatch({ type: "RESET" }, modified);
      expect(state).toEqual(initialWizardState);
    });
  });

  describe("default case", () => {
    it("returns state unchanged for unknown action", () => {
      const state = dispatch({ type: "UNKNOWN_ACTION" } as never);
      expect(state).toEqual(initialWizardState);
    });
  });
});

describe("needsPeerAssignment", () => {
  it("returns false for non-ciclo category", () => {
    const state = { ...initialWizardState, category: "pesquisa" as const };
    expect(needsPeerAssignment(state)).toBe(false);
  });

  it("returns false for ciclo without peers enabled", () => {
    const state: SurveyWizardState = {
      ...initialWizardState,
      category: "ciclo",
      perspectives: [
        { perspective: "self", enabled: true, isAnonymous: false, peerSelectionMethod: "manager_assigns", minEvaluators: 1, maxEvaluators: 1 },
        { perspective: "peers", enabled: false, isAnonymous: true, peerSelectionMethod: "manager_assigns", minEvaluators: 3, maxEvaluators: 5 },
      ],
    };
    expect(needsPeerAssignment(state)).toBe(false);
  });

  it("returns true for ciclo with peers enabled", () => {
    const state: SurveyWizardState = {
      ...initialWizardState,
      category: "ciclo",
      perspectives: [
        { perspective: "peers", enabled: true, isAnonymous: true, peerSelectionMethod: "manager_assigns", minEvaluators: 3, maxEvaluators: 5 },
      ],
    };
    expect(needsPeerAssignment(state)).toBe(true);
  });
});
