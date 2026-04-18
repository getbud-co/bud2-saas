/**
 * Tests for checkin-sync
 *
 * syncCheckInOutboxOperation handles online/offline, endpoint config,
 * and HTTP methods per operation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { syncCheckInOutboxOperation } from "./checkin-sync";
import type { LocalCheckIn } from "./missions-store";

// ─── Test Helpers ───

function makeCheckIn(overrides: Partial<LocalCheckIn> = {}): LocalCheckIn {
  return {
    id: "ci-1",
    keyResultId: "kr-1",
    authorId: "user-1",
    value: 50,
    previousValue: 30,
    confidence: 0.8,
    note: "Test note",
    mentions: [],
    createdAt: "2026-01-01T00:00:00Z",
    clientMutationId: "mut-1",
    deletedAt: null,
    ...overrides,
  } as LocalCheckIn;
}

// ─── Tests ───

describe("syncCheckInOutboxOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when navigator is offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    await expect(
      syncCheckInOutboxOperation({
        operation: "create",
        checkIn: makeCheckIn(),
      }),
    ).rejects.toThrow("Sem conexão com a internet");
  });

  it("returns syncedAt in dev mode without endpoint", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);

    // In test environment without VITE_CHECKIN_SYNC_URL, should use dev fallback
    const result = await syncCheckInOutboxOperation({
      operation: "create",
      checkIn: makeCheckIn(),
    });

    expect(result.syncedAt).toBeDefined();
    expect(new Date(result.syncedAt).getTime()).toBeGreaterThan(0);
  });
});
