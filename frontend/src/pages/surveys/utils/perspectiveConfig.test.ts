import { describe, it, expect } from "vitest";
import {
  PERSPECTIVE_CONFIG,
  PERSPECTIVE_INSTRUCTION,
  PERSPECTIVE_RELATION_LABEL,
  type PerspectiveInfo,
} from "./perspectiveConfig";
import type { EvaluationPerspective } from "@/types/survey";

const ALL_PERSPECTIVES: EvaluationPerspective[] = ["self", "manager", "peers", "reports"];

describe("perspectiveConfig", () => {
  describe("PERSPECTIVE_CONFIG", () => {
    it("has entries for all 4 perspectives", () => {
      for (const p of ALL_PERSPECTIVES) {
        expect(PERSPECTIVE_CONFIG[p]).toBeDefined();
      }
    });

    it.each(ALL_PERSPECTIVES)("'%s' has all required PerspectiveInfo fields", (perspective) => {
      const info: PerspectiveInfo = PERSPECTIVE_CONFIG[perspective];
      expect(typeof info.label).toBe("string");
      expect(info.label.length).toBeGreaterThan(0);
      expect(typeof info.viewAsLabel).toBe("string");
      expect(info.viewAsLabel.length).toBeGreaterThan(0);
      expect(typeof info.instruction).toBe("string");
      expect(info.instruction.length).toBeGreaterThan(0);
      expect(typeof info.relationLabel).toBe("string");
      expect(info.relationLabel.length).toBeGreaterThan(0);
      expect(Array.isArray(info.previewEvaluatees)).toBe(true);
      expect(info.previewEvaluatees.length).toBeGreaterThan(0);
    });

    it("self perspective has exactly 1 preview evaluatee", () => {
      expect(PERSPECTIVE_CONFIG.self.previewEvaluatees).toHaveLength(1);
    });

    it("manager perspective has 3 preview evaluatees", () => {
      expect(PERSPECTIVE_CONFIG.manager.previewEvaluatees).toHaveLength(3);
    });

    it("peers perspective has 3 preview evaluatees", () => {
      expect(PERSPECTIVE_CONFIG.peers.previewEvaluatees).toHaveLength(3);
    });

    it("reports perspective has 2 preview evaluatees", () => {
      expect(PERSPECTIVE_CONFIG.reports.previewEvaluatees).toHaveLength(2);
    });

    it("each preview evaluatee has name, initials, and role", () => {
      for (const p of ALL_PERSPECTIVES) {
        for (const person of PERSPECTIVE_CONFIG[p].previewEvaluatees) {
          expect(typeof person.name).toBe("string");
          expect(person.name.length).toBeGreaterThan(0);
          expect(typeof person.initials).toBe("string");
          expect(person.initials.length).toBeGreaterThan(0);
          expect(typeof person.role).toBe("string");
          expect(person.role.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("PERSPECTIVE_INSTRUCTION", () => {
    it("has an instruction for every perspective", () => {
      for (const p of ALL_PERSPECTIVES) {
        expect(typeof PERSPECTIVE_INSTRUCTION[p]).toBe("string");
        expect(PERSPECTIVE_INSTRUCTION[p].length).toBeGreaterThan(0);
      }
    });

    it("matches the instruction from PERSPECTIVE_CONFIG", () => {
      for (const p of ALL_PERSPECTIVES) {
        expect(PERSPECTIVE_INSTRUCTION[p]).toBe(PERSPECTIVE_CONFIG[p].instruction);
      }
    });
  });

  describe("PERSPECTIVE_RELATION_LABEL", () => {
    it("has a relation label for every perspective", () => {
      for (const p of ALL_PERSPECTIVES) {
        expect(typeof PERSPECTIVE_RELATION_LABEL[p]).toBe("string");
        expect(PERSPECTIVE_RELATION_LABEL[p].length).toBeGreaterThan(0);
      }
    });

    it("matches the relationLabel from PERSPECTIVE_CONFIG", () => {
      for (const p of ALL_PERSPECTIVES) {
        expect(PERSPECTIVE_RELATION_LABEL[p]).toBe(PERSPECTIVE_CONFIG[p].relationLabel);
      }
    });
  });
});
