import { describe, it, expect } from "vitest";
import {
  CYCLE_PHASE_LABELS,
  ALL_CYCLE_PHASES,
  NOMINATION_PHASES,
} from "./cyclePhaseConfig";

describe("cyclePhaseConfig", () => {
  describe("ALL_CYCLE_PHASES", () => {
    it("contains exactly 7 phases", () => {
      expect(ALL_CYCLE_PHASES).toHaveLength(7);
    });

    it("lists phases in the expected order", () => {
      expect(ALL_CYCLE_PHASES).toEqual([
        "self_evaluation",
        "peer_nomination",
        "peer_approval",
        "peer_evaluation",
        "manager_evaluation",
        "calibration",
        "feedback",
      ]);
    });
  });

  describe("CYCLE_PHASE_LABELS", () => {
    it("has a label for every phase in ALL_CYCLE_PHASES", () => {
      for (const phase of ALL_CYCLE_PHASES) {
        expect(CYCLE_PHASE_LABELS[phase]).toBeDefined();
        expect(typeof CYCLE_PHASE_LABELS[phase]).toBe("string");
        expect(CYCLE_PHASE_LABELS[phase].length).toBeGreaterThan(0);
      }
    });

    it("maps specific phases to their expected Portuguese labels", () => {
      expect(CYCLE_PHASE_LABELS.self_evaluation).toBe("Autoavaliação");
      expect(CYCLE_PHASE_LABELS.calibration).toBe("Calibração");
      expect(CYCLE_PHASE_LABELS.feedback).toBe("Feedback");
    });
  });

  describe("NOMINATION_PHASES", () => {
    it("is a Set containing exactly peer_nomination and peer_approval", () => {
      expect(NOMINATION_PHASES).toBeInstanceOf(Set);
      expect(NOMINATION_PHASES.size).toBe(2);
      expect(NOMINATION_PHASES.has("peer_nomination")).toBe(true);
      expect(NOMINATION_PHASES.has("peer_approval")).toBe(true);
    });

    it("does not contain non-nomination phases", () => {
      expect(NOMINATION_PHASES.has("self_evaluation")).toBe(false);
      expect(NOMINATION_PHASES.has("peer_evaluation")).toBe(false);
      expect(NOMINATION_PHASES.has("calibration")).toBe(false);
    });
  });
});
