import { describe, it, expect } from "vitest";
import {
  daysSinceUserCheckin,
  countCheckInsForUser,
  calculateCheckInStreakForUser,
  calculateUserTrend,
} from "./engagement-utils";
import type { CheckIn } from "@/types";
import { today, addDays, toIsoDateTime } from "@/lib/seed-utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCheckIn(userId: string, daysAgo: number, overrides: Partial<CheckIn> = {}): CheckIn {
  const date = addDays(today(), -daysAgo);
  return {
    id: `ci-${userId}-${daysAgo}`,
    keyResultId: "kr-1",
    authorId: userId,
    value: "50",
    previousValue: null,
    confidence: "medium",
    note: null,
    mentions: null,
    createdAt: toIsoDateTime(date),
    ...overrides,
  };
}

// ── daysSinceUserCheckin ──────────────────────────────────────────────────────

describe("daysSinceUserCheckin", () => {
  it("retorna 0 para check-in hoje", () => {
    const history = { "kr-1": [makeCheckIn("u1", 0)] };
    expect(daysSinceUserCheckin("u1", history)).toBe(0);
  });

  it("retorna 3 para check-in há 3 dias", () => {
    const history = { "kr-1": [makeCheckIn("u1", 3)] };
    expect(daysSinceUserCheckin("u1", history)).toBe(3);
  });

  it("retorna 14 se sem check-ins", () => {
    expect(daysSinceUserCheckin("u1", {})).toBe(14);
  });

  it("ignora check-ins de outros usuários", () => {
    const history = { "kr-1": [makeCheckIn("u2", 1)] };
    expect(daysSinceUserCheckin("u1", history)).toBe(14);
  });

  it("usa o mais recente quando há vários check-ins", () => {
    const history = {
      "kr-1": [makeCheckIn("u1", 5), makeCheckIn("u1", 2), makeCheckIn("u1", 10)],
    };
    expect(daysSinceUserCheckin("u1", history)).toBe(2);
  });
});

// ── countCheckInsForUser ──────────────────────────────────────────────────────

describe("countCheckInsForUser", () => {
  it("conta apenas check-ins do usuário nos últimos N dias", () => {
    const history = {
      "kr-1": [
        makeCheckIn("u1", 5),
        makeCheckIn("u1", 10),
        makeCheckIn("u1", 35), // Fora do range de 30 dias
        makeCheckIn("u2", 5),  // Outro usuário
      ],
    };
    expect(countCheckInsForUser("u1", history, 30)).toBe(2);
  });

  it("retorna 0 se sem check-ins", () => {
    expect(countCheckInsForUser("u1", {}, 30)).toBe(0);
  });
});

// ── calculateCheckInStreakForUser ─────────────────────────────────────────────

describe("calculateCheckInStreakForUser", () => {
  it("retorna 0 se sem check-ins", () => {
    expect(calculateCheckInStreakForUser("u1", {})).toBe(0);
  });

  it("conta semanas consecutivas", () => {
    // Check-ins nas últimas 3 semanas
    const history = {
      "kr-1": [
        makeCheckIn("u1", 3),   // Esta semana
        makeCheckIn("u1", 10),  // Semana passada
        makeCheckIn("u1", 17),  // 2 semanas atrás
      ],
    };
    const streak = calculateCheckInStreakForUser("u1", history);
    expect(streak).toBeGreaterThanOrEqual(2);
  });
});

// ── calculateUserTrend ────────────────────────────────────────────────────────

describe("calculateUserTrend", () => {
  it("retorna stable quando sem check-ins", () => {
    expect(calculateUserTrend("u1", {})).toBe("stable");
  });

  it("retorna up quando mais check-ins recentes", () => {
    const now = today();
    const history = {
      "kr-1": [
        { id: "c1", authorId: "u1", createdAt: toIsoDateTime(addDays(now, -3)), keyResultId: "kr-1", value: "1", previousValue: null, confidence: null, note: null, mentions: null },
        { id: "c2", authorId: "u1", createdAt: toIsoDateTime(addDays(now, -6)), keyResultId: "kr-1", value: "1", previousValue: null, confidence: null, note: null, mentions: null },
      ] as CheckIn[],
    };
    // 2 recentes, 0 anteriores → up
    expect(calculateUserTrend("u1", history)).toBe("up");
  });
});
