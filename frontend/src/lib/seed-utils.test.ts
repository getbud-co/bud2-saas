import { describe, it, expect } from "vitest";
import {
  // Date Utilities
  today,
  addDays,
  addWeeks,
  addMonths,
  startOfQuarter,
  endOfQuarter,
  startOfWeek,
  toIsoDate,
  toIsoDateTime,
  getQuarter,
  // Cycle Generation
  generateRelativeCycles,
  generateCheckInsForKR,
  // ID Utilities
  hashString,
  // Deterministic Generation
  deterministicCreatedAt,
  deterministicUpdatedAt,
  getCurrentCycleInfo,
} from "./seed-utils";

// ─── Date Utilities ───

describe("Date Utilities", () => {
  describe("today()", () => {
    it("returns current date at midnight", () => {
      const result = today();
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("returns today's date", () => {
      const result = today();
      const now = new Date();
      expect(result.getFullYear()).toBe(now.getFullYear());
      expect(result.getMonth()).toBe(now.getMonth());
      expect(result.getDate()).toBe(now.getDate());
    });
  });

  describe("addDays()", () => {
    it("adds positive days correctly", () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      const result = addDays(date, 10);
      expect(result.getDate()).toBe(25);
    });

    it("subtracts days with negative value", () => {
      const date = new Date(2026, 0, 15);
      const result = addDays(date, -10);
      expect(result.getDate()).toBe(5);
    });

    it("handles month rollover", () => {
      const date = new Date(2026, 0, 25); // Jan 25
      const result = addDays(date, 10);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });

    it("does not mutate original date", () => {
      const date = new Date(2026, 0, 15);
      const originalTime = date.getTime();
      addDays(date, 10);
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe("addWeeks()", () => {
    it("adds weeks correctly", () => {
      const date = new Date(2026, 0, 1);
      const result = addWeeks(date, 2);
      expect(result.getDate()).toBe(15);
    });

    it("subtracts weeks with negative value", () => {
      const date = new Date(2026, 0, 15);
      const result = addWeeks(date, -2);
      expect(result.getDate()).toBe(1);
    });
  });

  describe("addMonths()", () => {
    it("adds months correctly", () => {
      const date = new Date(2026, 0, 15); // Jan 15
      const result = addMonths(date, 3);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(15);
    });

    it("handles year rollover", () => {
      const date = new Date(2026, 10, 15); // Nov 15
      const result = addMonths(date, 3);
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(1); // February
    });

    it("does not mutate original date", () => {
      const date = new Date(2026, 0, 15);
      const originalTime = date.getTime();
      addMonths(date, 3);
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe("startOfQuarter()", () => {
    it("returns Jan 1 for Q1 dates", () => {
      const result = startOfQuarter(new Date(2026, 1, 15)); // Feb 15
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });

    it("returns Apr 1 for Q2 dates", () => {
      const result = startOfQuarter(new Date(2026, 4, 20)); // May 20
      expect(result.getMonth()).toBe(3);
      expect(result.getDate()).toBe(1);
    });

    it("returns Jul 1 for Q3 dates", () => {
      const result = startOfQuarter(new Date(2026, 7, 10)); // Aug 10
      expect(result.getMonth()).toBe(6);
      expect(result.getDate()).toBe(1);
    });

    it("returns Oct 1 for Q4 dates", () => {
      const result = startOfQuarter(new Date(2026, 11, 25)); // Dec 25
      expect(result.getMonth()).toBe(9);
      expect(result.getDate()).toBe(1);
    });
  });

  describe("endOfQuarter()", () => {
    it("returns Mar 31 for Q1 dates", () => {
      const result = endOfQuarter(new Date(2026, 1, 15)); // Feb 15
      expect(result.getMonth()).toBe(2);
      expect(result.getDate()).toBe(31);
    });

    it("returns Jun 30 for Q2 dates", () => {
      const result = endOfQuarter(new Date(2026, 4, 20)); // May 20
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(30);
    });

    it("returns Sep 30 for Q3 dates", () => {
      const result = endOfQuarter(new Date(2026, 7, 10)); // Aug 10
      expect(result.getMonth()).toBe(8);
      expect(result.getDate()).toBe(30);
    });

    it("returns Dec 31 for Q4 dates", () => {
      const result = endOfQuarter(new Date(2026, 11, 25)); // Dec 25
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(31);
    });
  });

  describe("startOfWeek()", () => {
    it("returns Monday for a Wednesday", () => {
      const wednesday = new Date(2026, 2, 18); // Wed Mar 18, 2026
      const result = startOfWeek(wednesday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(16);
    });

    it("returns same Monday for a Monday", () => {
      const monday = new Date(2026, 2, 16); // Mon Mar 16, 2026
      const result = startOfWeek(monday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(16);
    });

    it("returns previous Monday for a Sunday", () => {
      const sunday = new Date(2026, 2, 22); // Sun Mar 22, 2026
      const result = startOfWeek(sunday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(16);
    });

    it("sets time to midnight", () => {
      const date = new Date(2026, 2, 18, 15, 30, 45);
      const result = startOfWeek(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe("toIsoDate()", () => {
    it("formats date as YYYY-MM-DD", () => {
      const date = new Date(2026, 2, 15);
      expect(toIsoDate(date)).toBe("2026-03-15");
    });

    it("pads single digit months and days", () => {
      const date = new Date(2026, 0, 5); // Jan 5
      expect(toIsoDate(date)).toBe("2026-01-05");
    });
  });

  describe("toIsoDateTime()", () => {
    it("returns ISO datetime string", () => {
      const date = new Date(2026, 2, 15, 10, 30, 0);
      const result = toIsoDateTime(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("getQuarter()", () => {
    it("returns 1 for Jan-Mar", () => {
      expect(getQuarter(new Date(2026, 0, 15))).toBe(1);
      expect(getQuarter(new Date(2026, 1, 15))).toBe(1);
      expect(getQuarter(new Date(2026, 2, 15))).toBe(1);
    });

    it("returns 2 for Apr-Jun", () => {
      expect(getQuarter(new Date(2026, 3, 15))).toBe(2);
      expect(getQuarter(new Date(2026, 4, 15))).toBe(2);
      expect(getQuarter(new Date(2026, 5, 15))).toBe(2);
    });

    it("returns 3 for Jul-Sep", () => {
      expect(getQuarter(new Date(2026, 6, 15))).toBe(3);
      expect(getQuarter(new Date(2026, 7, 15))).toBe(3);
      expect(getQuarter(new Date(2026, 8, 15))).toBe(3);
    });

    it("returns 4 for Oct-Dec", () => {
      expect(getQuarter(new Date(2026, 9, 15))).toBe(4);
      expect(getQuarter(new Date(2026, 10, 15))).toBe(4);
      expect(getQuarter(new Date(2026, 11, 15))).toBe(4);
    });
  });

});

// ─── Cycle Generation ───

describe("Cycle Generation", () => {
  describe("generateRelativeCycles()", () => {
    it("generates multiple cycles", () => {
      const cycles = generateRelativeCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it("includes current quarter as active", () => {
      const cycles = generateRelativeCycles();
      const activeCycles = cycles.filter((c) => c.status === "active");
      expect(activeCycles.length).toBeGreaterThan(0);

      const quarterCycles = activeCycles.filter((c) => c.type === "quarterly");
      expect(quarterCycles.length).toBe(1);
    });

    it("includes previous quarter as ended", () => {
      const cycles = generateRelativeCycles();
      const endedQuarters = cycles.filter(
        (c) => c.type === "quarterly" && c.status === "ended"
      );
      expect(endedQuarters.length).toBeGreaterThanOrEqual(1);
    });

    it("includes at least one planning quarter", () => {
      const cycles = generateRelativeCycles();
      const planningQuarters = cycles.filter(
        (c) => c.type === "quarterly" && c.status === "planning"
      );
      expect(planningQuarters.length).toBeGreaterThanOrEqual(1);
    });

    it("includes annual cycle", () => {
      const cycles = generateRelativeCycles();
      const annual = cycles.find((c) => c.type === "annual");
      expect(annual).toBeDefined();
      expect(annual?.status).toBe("active");
    });

    it("includes semester cycles", () => {
      const cycles = generateRelativeCycles();
      const semesters = cycles.filter((c) => c.type === "semi_annual");
      expect(semesters.length).toBeGreaterThanOrEqual(1);
    });

    it("has valid date format for all cycles", () => {
      const cycles = generateRelativeCycles();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      for (const cycle of cycles) {
        expect(cycle.startDate).toMatch(dateRegex);
        expect(cycle.endDate).toMatch(dateRegex);
      }
    });
  });

});
// ─── Check-in Generation ───

describe("Check-in Generation", () => {
  describe("generateCheckInsForKR()", () => {
    it("generates requested number of check-ins", () => {
      const checkIns = generateCheckInsForKR("kr-test-1", 4);
      expect(checkIns.length).toBeLessThanOrEqual(4);
    });

    it("returns deterministic results for same ID", () => {
      const checkIns1 = generateCheckInsForKR("kr-test-123");
      const checkIns2 = generateCheckInsForKR("kr-test-123");

      expect(checkIns1.length).toBe(checkIns2.length);
      for (let i = 0; i < checkIns1.length; i++) {
        expect(checkIns1[i]?.dateIso).toBe(checkIns2[i]?.dateIso);
      }
    });

    it("returns different results for different IDs", () => {
      const checkIns1 = generateCheckInsForKR("kr-alpha");
      const checkIns2 = generateCheckInsForKR("kr-beta");

      // At least one date should differ
      const dates1 = checkIns1.map((c) => c.dateIso).sort();
      const dates2 = checkIns2.map((c) => c.dateIso).sort();
      expect(dates1).not.toEqual(dates2);
    });

    it("all check-ins are in the past", () => {
      const now = new Date();
      const checkIns = generateCheckInsForKR("kr-test");

      for (const checkIn of checkIns) {
        expect(checkIn.date.getTime()).toBeLessThanOrEqual(now.getTime());
      }
    });

    it("check-ins are sorted by date descending", () => {
      const checkIns = generateCheckInsForKR("kr-test", 4);

      for (let i = 0; i < checkIns.length - 1; i++) {
        const current = checkIns[i]!;
        const next = checkIns[i + 1]!;
        expect(current.date.getTime()).toBeGreaterThanOrEqual(
          next.date.getTime()
        );
      }
    });
  });
});

// ─── ID Utilities ───

describe("ID Utilities", () => {
  describe("hashString()", () => {
    it("returns positive number", () => {
      expect(hashString("test")).toBeGreaterThanOrEqual(0);
    });

    it("returns same hash for same input", () => {
      const hash1 = hashString("consistent-test");
      const hash2 = hashString("consistent-test");
      expect(hash1).toBe(hash2);
    });

    it("returns different hash for different input", () => {
      const hash1 = hashString("input-a");
      const hash2 = hashString("input-b");
      expect(hash1).not.toBe(hash2);
    });

    it("handles empty string", () => {
      expect(hashString("")).toBe(0);
    });

    it("handles long strings", () => {
      const longString = "a".repeat(1000);
      const result = hashString(longString);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

});

// ─── Deterministic Generation ───

describe("Deterministic Generation", () => {
  describe("deterministicCreatedAt()", () => {
    it("returns ISO datetime string", () => {
      const cycleStart = new Date(2026, 0, 1);
      const result = deterministicCreatedAt("entity-1", cycleStart);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("returns date within 2 weeks of cycle start", () => {
      const cycleStart = new Date(2026, 0, 1);
      const result = deterministicCreatedAt("entity-1", cycleStart);
      const resultDate = new Date(result);
      const maxDate = new Date(cycleStart);
      maxDate.setDate(maxDate.getDate() + 14);

      expect(resultDate.getTime()).toBeGreaterThanOrEqual(cycleStart.getTime());
      expect(resultDate.getTime()).toBeLessThanOrEqual(maxDate.getTime());
    });

    it("returns same value for same entity ID", () => {
      const cycleStart = new Date(2026, 0, 1);
      const result1 = deterministicCreatedAt("entity-x", cycleStart);
      const result2 = deterministicCreatedAt("entity-x", cycleStart);
      expect(result1).toBe(result2);
    });
  });

  describe("deterministicUpdatedAt()", () => {
    it("returns ISO datetime string", () => {
      const result = deterministicUpdatedAt("entity-1");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("returns date within last 2 weeks", () => {
      const now = new Date();
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const result = deterministicUpdatedAt("entity-1");
      const resultDate = new Date(result);

      expect(resultDate.getTime()).toBeGreaterThanOrEqual(
        twoWeeksAgo.getTime()
      );
      expect(resultDate.getTime()).toBeLessThanOrEqual(now.getTime());
    });

    it("returns same value for same entity ID", () => {
      const result1 = deterministicUpdatedAt("entity-y");
      const result2 = deterministicUpdatedAt("entity-y");
      expect(result1).toBe(result2);
    });
  });

  describe("getCurrentCycleInfo()", () => {
    it("returns all required properties", () => {
      const info = getCurrentCycleInfo();

      expect(info.quarterId).toBeDefined();
      expect(info.yearId).toBeDefined();
      expect(info.quarterStart).toBeInstanceOf(Date);
      expect(info.quarterEnd).toBeInstanceOf(Date);
      expect(info.yearStart).toBeInstanceOf(Date);
      expect(info.yearEnd).toBeInstanceOf(Date);
    });

    it("quarterId matches current quarter format", () => {
      const info = getCurrentCycleInfo();
      const now = new Date();
      const expectedQuarter = Math.floor(now.getMonth() / 3) + 1;
      expect(info.quarterId).toBe(`q${expectedQuarter}-${now.getFullYear()}`);
    });

    it("yearId matches current year format", () => {
      const info = getCurrentCycleInfo();
      expect(info.yearId).toBe(`ano-${new Date().getFullYear()}`);
    });

    it("quarter dates are within year dates", () => {
      const info = getCurrentCycleInfo();

      expect(info.quarterStart.getTime()).toBeGreaterThanOrEqual(
        info.yearStart.getTime()
      );
      expect(info.quarterEnd.getTime()).toBeLessThanOrEqual(
        info.yearEnd.getTime()
      );
    });
  });
});
