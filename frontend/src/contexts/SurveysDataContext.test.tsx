/**
 * Tests for SurveysDataContext
 *
 * This context manages surveys, templates, submissions, and wizard state.
 * Depends on ConfigDataContext and ActivityDataContext.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConfigDataProvider } from "./ConfigDataContext";
import { ActivityDataProvider } from "./ActivityDataContext";
import { SurveysDataProvider, useSurveysData } from "./SurveysDataContext";

// ─── Test Helpers ───

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ConfigDataProvider>
      <ActivityDataProvider>
        <SurveysDataProvider>{children}</SurveysDataProvider>
      </ActivityDataProvider>
    </ConfigDataProvider>
  );
}

// ─── Tests ───

describe("SurveysDataContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("context setup", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useSurveysData());
      }).toThrow("useSurveysData must be used within SurveysDataProvider");
    });

    it("provides context when used with provider", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });
      expect(result.current).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("has surveys array", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });
      expect(Array.isArray(result.current.surveys)).toBe(true);
      expect(result.current.surveys.length).toBeGreaterThan(0);
    });

    it("has templates array", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });
      expect(Array.isArray(result.current.templates)).toBe(true);
      expect(result.current.templates.length).toBeGreaterThan(0);
    });

    it("has updatedAt timestamp", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });
      expect(result.current.updatedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Template Operations
  // ═══════════════════════════════════════════════════════════════════════════

  describe("template operations", () => {
    it("getSurveyTemplateById returns template", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const firstTemplate = result.current.templates[0]!;
      const found = result.current.getSurveyTemplateById(firstTemplate.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(firstTemplate.id);
    });

    it("getSurveyTemplateById returns null for non-existent", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });
      const found = result.current.getSurveyTemplateById("non-existent");
      expect(found).toBeNull();
    });

    it("getSurveyTemplateByType returns template", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const firstTemplate = result.current.templates[0]!;
      const found = result.current.getSurveyTemplateByType(firstTemplate.type);
      expect(found).not.toBeNull();
      expect(found?.type).toBe(firstTemplate.type);
    });

    it("upsertSurveyTemplate returns a template id", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      let templateId: string;
      act(() => {
        templateId = result.current.upsertSurveyTemplate({
          type: "custom",
          name: "New Template",
          subtitle: "Test subtitle",
          category: "pesquisa",
          isAnonymous: true,
          sections: [],
          questions: [],
        });
      });

      expect(templateId!).toBeDefined();
      expect(typeof templateId!).toBe("string");
    });

    it("duplicateSurveyTemplate creates a copy in templates list", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const source = result.current.templates[0]!;
      const initialCount = result.current.templates.length;

      act(() => {
        result.current.duplicateSurveyTemplate(source.id);
      });

      expect(result.current.templates.length).toBe(initialCount + 1);
      const copy = result.current.templates.find((t) => t.name === `${source.name} (copia)`);
      expect(copy).toBeDefined();
      expect(copy?.isSystem).toBe(false);
    });

    it("duplicateSurveyTemplate does not change list for non-existent", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const countBefore = result.current.templates.length;

      act(() => {
        result.current.duplicateSurveyTemplate("non-existent");
      });

      expect(result.current.templates.length).toBe(countBefore);
    });

    it("deleteSurveyTemplate does not remove system templates", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const systemTemplate = result.current.templates.find((t) => t.isSystem);
      if (!systemTemplate) return;

      const countBefore = result.current.templates.length;

      act(() => {
        result.current.deleteSurveyTemplate(systemTemplate.id);
      });

      expect(result.current.templates.length).toBe(countBefore);
    });

    it("deleteSurveyTemplate cannot delete system templates", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const systemTemplate = result.current.templates.find((t) => t.isSystem);
      if (!systemTemplate) return;

      const countBefore = result.current.templates.length;

      let deleted: boolean;
      act(() => {
        deleted = result.current.deleteSurveyTemplate(systemTemplate.id);
      });

      expect(deleted!).toBe(false);
      expect(result.current.templates.length).toBe(countBefore);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Survey Record Operations
  // ═══════════════════════════════════════════════════════════════════════════

  describe("survey record operations", () => {
    it("getSurveyRecordById returns record for existing survey", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const firstSurvey = result.current.surveys[0]!;
      const record = result.current.getSurveyRecordById(firstSurvey.id);
      expect(record).not.toBeNull();
      expect(record?.id).toBe(firstSurvey.id);
    });

    it("getSurveyRecordById returns null for non-existent", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });
      const record = result.current.getSurveyRecordById("non-existent");
      expect(record).toBeNull();
    });

    it("getWizardStateBySurveyId returns wizard state", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const firstSurvey = result.current.surveys[0]!;
      const wizardState = result.current.getWizardStateBySurveyId(firstSurvey.id);
      expect(wizardState).not.toBeNull();
    });

    it("getRendererDataBySurveyId returns renderer data", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const firstSurvey = result.current.surveys[0]!;
      const rendererData = result.current.getRendererDataBySurveyId(firstSurvey.id);
      expect(rendererData).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Duplicate Survey
  // ═══════════════════════════════════════════════════════════════════════════

  describe("duplicateSurvey", () => {
    it("creates a copy with draft status", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const source = result.current.surveys[0]!;
      const initialCount = result.current.surveys.length;

      act(() => {
        result.current.duplicateSurvey(source.id);
      });

      expect(result.current.surveys.length).toBe(initialCount + 1);
      const copy = result.current.surveys.find((s) => s.name === `${source.name} (copia)`);
      expect(copy).toBeDefined();
      expect(copy?.status).toBe("draft");
      expect(copy?.totalResponses).toBe(0);
    });

    it("does not change list for non-existent survey", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const countBefore = result.current.surveys.length;

      act(() => {
        result.current.duplicateSurvey("non-existent");
      });

      expect(result.current.surveys.length).toBe(countBefore);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Submit Survey Response
  // ═══════════════════════════════════════════════════════════════════════════

  describe("submitSurveyResponse", () => {
    it("submits a response and updates totalResponses", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const survey = result.current.surveys[0]!;

      act(() => {
        result.current.submitSurveyResponse({
          surveyId: survey.id,
          answers: { q1: "answer" },
          respondentKey: "test-respondent-1",
        });
      });

      const updated = result.current.surveys.find((s) => s.id === survey.id);
      // totalResponses is recalculated from actual submissions
      expect(updated?.totalResponses).toBeGreaterThanOrEqual(1);
    });

    it("deduplicates by respondent key", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const survey = result.current.surveys[0]!;

      act(() => {
        result.current.submitSurveyResponse({
          surveyId: survey.id,
          answers: { q1: "first" },
          respondentKey: "same-key",
        });
      });

      const afterFirst = result.current.surveys.find((s) => s.id === survey.id)!.totalResponses;

      act(() => {
        result.current.submitSurveyResponse({
          surveyId: survey.id,
          answers: { q1: "updated" },
          respondentKey: "same-key",
        });
      });

      const afterSecond = result.current.surveys.find((s) => s.id === survey.id)!.totalResponses;
      expect(afterSecond).toBe(afterFirst); // Should not increment
    });

    it("returns null for non-existent survey", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      let submissionId: string | null;
      act(() => {
        submissionId = result.current.submitSurveyResponse({
          surveyId: "non-existent",
          answers: {},
        });
      });

      expect(submissionId!).toBeNull();
    });

    it("retrieves submissions by survey id", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      const survey = result.current.surveys[0]!;

      act(() => {
        result.current.submitSurveyResponse({
          surveyId: survey.id,
          answers: { q1: "answer" },
          respondentKey: "test-sub-1",
        });
      });

      const submissions = result.current.getSurveySubmissionsBySurveyId(survey.id);
      expect(submissions.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Reset to Seed
  // ═══════════════════════════════════════════════════════════════════════════

  describe("resetToSeed", () => {
    it("resets surveys and templates to seed data", () => {
      const { result } = renderHook(() => useSurveysData(), { wrapper });

      // Duplicate a survey
      act(() => {
        result.current.duplicateSurvey(result.current.surveys[0]!.id);
      });

      const countBefore = result.current.surveys.length;

      act(() => {
        result.current.resetToSeed();
      });

      // Should have fewer surveys now (the duplicate is gone)
      expect(result.current.surveys.length).toBeLessThan(countBefore);
    });
  });
});
