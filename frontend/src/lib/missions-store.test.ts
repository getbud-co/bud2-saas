import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMissionsSnapshot,
  saveMissionsSnapshot,
  resetMissionsSnapshot,
  snapshotToCheckInHistory,
  type MissionsStoreSnapshot,
  type LocalCheckIn,
} from "./missions-store";

// ─── Store Functions ───

describe("Missions Store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadMissionsSnapshot()", () => {
    it("returns seed data when localStorage is empty", () => {
      const snapshot = loadMissionsSnapshot();

      expect(snapshot.schemaVersion).toBe(8);
      expect(Array.isArray(snapshot.missions)).toBe(true);
      // Schema 8: missions are sourced from the API; the snapshot does not
      // hydrate a `missions` array.
      expect(snapshot.missions).toEqual([]);
    });

    it("persists seed data to localStorage on first load", () => {
      loadMissionsSnapshot();

      const stored = localStorage.getItem("bud.saas.missions-store:org-1");
      expect(stored).not.toBeNull();
    });

    it("ignores any persisted missions field (schema 8 sources from API)", () => {
      // Schema 8: missions live on the API. Anything in localStorage from
      // older schemas is discarded so the runtime list always reflects what
      // the React Query cache holds.
      const legacyData = {
        schemaVersion: 7,
        updatedAt: new Date().toISOString(),
        missions: [
          {
            id: "custom-mission-from-storage",
            orgId: "org-1",
            cycleId: "q1-2026",
            parentId: null,
            depth: 0,
            path: ["custom-mission-from-storage"],
            title: "Custom Mission From Storage",
            description: null,
            ownerId: "user-1",
            teamId: null,
            status: "active",
            visibility: "public",
            progress: 50,
            kanbanStatus: "doing",
            sortOrder: 0,
            dueDate: null,
            completedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-15T00:00:00.000Z",
            deletedAt: null,
          },
        ],
        checkInsById: {},
        checkInIdsByKr: {},
        checkInOutbox: [],
      };

      localStorage.setItem(
        "bud.saas.missions-store:org-1",
        JSON.stringify(legacyData)
      );
      const snapshot = loadMissionsSnapshot();

      expect(snapshot.missions).toEqual([]);
    });

    it("handles corrupted localStorage data", () => {
      localStorage.setItem("bud.saas.missions-store:org-1", "not-valid-json");
      const snapshot = loadMissionsSnapshot();

      // Should return seed data (schema 8: empty missions, hydrated check-ins)
      expect(snapshot.schemaVersion).toBe(8);
      expect(snapshot.missions).toEqual([]);
      expect(Object.keys(snapshot.checkInsById).length).toBeGreaterThan(0);
    });

    it("loads data for different org IDs", () => {
      // Load for org-1
      loadMissionsSnapshot("org-1");
      // Load for org-2
      loadMissionsSnapshot("org-2");

      // Both should be stored separately
      expect(
        localStorage.getItem("bud.saas.missions-store:org-1")
      ).not.toBeNull();
      expect(
        localStorage.getItem("bud.saas.missions-store:org-2")
      ).not.toBeNull();
    });

    it("migrates old schema versions", () => {
      const oldData = {
        schemaVersion: 1,
        missions: [
          {
            id: "old-mission",
            title: "Old Mission",
            orgId: "org-1",
            cycleId: null,
            parentId: null,
            depth: 0,
            path: ["old-mission"],
            description: null,
            ownerId: "user-1",
            teamId: null,
            status: "active",
            visibility: "public",
            progress: 0,
            kanbanStatus: "uncategorized",
            sortOrder: 0,
            dueDate: null,
            completedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            deletedAt: null,
          },
        ],
        checkInHistory: {},
      };

      localStorage.setItem(
        "bud.saas.missions-store:org-1",
        JSON.stringify(oldData)
      );
      const snapshot = loadMissionsSnapshot();

      expect(snapshot.schemaVersion).toBe(8);
      // Schema 8: missions are sourced from the API; the upgrade path drops
      // any persisted missions array.
      expect(snapshot.missions).toEqual([]);
      expect(snapshot.checkInsById).toBeDefined();
      expect(snapshot.checkInIdsByKr).toBeDefined();
    });

    it("migrates legacy checkInHistory to normalized format", () => {
      const legacyData = {
        schemaVersion: 1,
        missions: [],
        checkInHistory: {
          "kr-1": [
            {
              id: "checkin-1",
              keyResultId: "kr-1",
              authorId: "user-1",
              value: "50",
              previousValue: "0",
              confidence: "high",
              note: "Progress update",
              mentions: [],
              createdAt: "2026-01-15T10:00:00.000Z",
            },
          ],
        },
      };

      localStorage.setItem(
        "bud.saas.missions-store:org-1",
        JSON.stringify(legacyData)
      );
      const snapshot = loadMissionsSnapshot();

      expect(snapshot.checkInsById["checkin-1"]).toBeDefined();
      expect(snapshot.checkInIdsByKr["kr-1"]).toContain("checkin-1");
    });
  });

  describe("saveMissionsSnapshot()", () => {
    it("does NOT persist missions to localStorage (phase 3)", () => {
      // Phase 3: only check-in state is durable. Pushing a mission into the
      // in-memory snapshot must not reach localStorage; the API owns those
      // rows now.
      const initial = loadMissionsSnapshot();
      initial.missions.push({
        id: "new-mission",
        orgId: "org-1",
        cycleId: "q1-2026",
        parentId: null,
        depth: 0,
        path: ["new-mission"],
        title: "New Mission",
        description: null,
        ownerId: "user-1",
        teamId: null,
        status: "active",
        visibility: "public",
        progress: 0,
        kanbanStatus: "uncategorized",
        sortOrder: 0,
        dueDate: null,
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-15T00:00:00.000Z",
        deletedAt: null,
      });

      const saved = saveMissionsSnapshot(initial);

      // Runtime: the in-memory snapshot keeps the mission.
      expect(saved.missions.some((m) => m.id === "new-mission")).toBe(true);

      // Persisted: the JSON written to localStorage does not carry it (or
      // any other mission) — only schema/version/check-in fields.
      const stored = localStorage.getItem("bud.saas.missions-store:org-1");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.missions).toBeUndefined();
      expect(parsed.checkInsById).toBeDefined();
      expect(parsed.checkInIdsByKr).toBeDefined();
      expect(parsed.checkInOutbox).toBeDefined();
    });

    it("updates schemaVersion and updatedAt", () => {
      const initial = loadMissionsSnapshot();
      const saved = saveMissionsSnapshot(initial);

      expect(saved.schemaVersion).toBe(8);
      expect(saved.updatedAt).toBeDefined();
    });

    it("saves to specific org storage key", () => {
      const initial = loadMissionsSnapshot("org-2");
      saveMissionsSnapshot(initial, "org-2");

      expect(
        localStorage.getItem("bud.saas.missions-store:org-2")
      ).not.toBeNull();
    });

    it("does not mutate original data", () => {
      const initial = loadMissionsSnapshot();
      const originalCount = initial.missions.length;

      const saved = saveMissionsSnapshot(initial);
      saved.missions.push({
        id: "mutated",
        orgId: "org-1",
        cycleId: null,
        parentId: null,
        depth: 0,
        path: ["mutated"],
        title: "Mutated",
        description: null,
        ownerId: "user-1",
        teamId: null,
        status: "active",
        visibility: "public",
        progress: 0,
        kanbanStatus: "uncategorized",
        sortOrder: 0,
        dueDate: null,
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-15T00:00:00.000Z",
        deletedAt: null,
      });

      expect(initial.missions.length).toBe(originalCount);
    });
  });

  describe("resetMissionsSnapshot()", () => {
    it("resets check-in state to seed (missions stay empty in schema 8)", () => {
      const initial = loadMissionsSnapshot();
      initial.checkInsById["custom-checkin"] = {
        id: "custom-checkin",
        keyResultId: "kr-x",
        authorId: "user-1",
        value: "1",
        previousValue: null,
        confidence: "medium",
        note: null,
        mentions: [],
        createdAt: new Date().toISOString(),
        clientMutationId: "custom",
        syncStatus: "synced",
        syncedAt: new Date().toISOString(),
        error: null,
        deletedAt: null,
      };
      saveMissionsSnapshot(initial);

      const reset = resetMissionsSnapshot();

      expect(reset.checkInsById["custom-checkin"]).toBeUndefined();
      expect(reset.missions).toEqual([]);
    });

    it("persists reset data to localStorage", () => {
      resetMissionsSnapshot();

      const stored = localStorage.getItem("bud.saas.missions-store:org-1");
      const parsed = JSON.parse(stored!);
      expect(parsed.schemaVersion).toBe(8);
      expect(parsed.missions).toBeUndefined();
    });
  });
});

// ─── Check-in Functions ───

describe("Check-in Functions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("snapshotToCheckInHistory()", () => {
    it("converts normalized check-ins to history format", () => {
      const snapshot: MissionsStoreSnapshot = {
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        missions: [],
        checkInsById: {
          "checkin-1": {
            id: "checkin-1",
            keyResultId: "kr-1",
            authorId: "user-1",
            value: "50",
            previousValue: "0",
            confidence: "high",
            note: "Update",
            mentions: [],
            createdAt: "2026-01-15T10:00:00.000Z",
            clientMutationId: "test-1",
            syncStatus: "synced",
            syncedAt: "2026-01-15T10:00:00.000Z",
            error: null,
            deletedAt: null,
          },
          "checkin-2": {
            id: "checkin-2",
            keyResultId: "kr-1",
            authorId: "user-1",
            value: "75",
            previousValue: "50",
            confidence: "medium",
            note: "More progress",
            mentions: [],
            createdAt: "2026-01-20T10:00:00.000Z",
            clientMutationId: "test-2",
            syncStatus: "synced",
            syncedAt: "2026-01-20T10:00:00.000Z",
            error: null,
            deletedAt: null,
          },
        },
        checkInIdsByKr: {
          "kr-1": ["checkin-2", "checkin-1"],
        },
        checkInOutbox: [],
      };

      const history = snapshotToCheckInHistory(snapshot);

      expect(history["kr-1"]).toBeDefined();
      expect(history["kr-1"]?.length).toBe(2);
      expect(history["kr-1"]?.[0]?.id).toBe("checkin-2");
      expect(history["kr-1"]?.[1]?.id).toBe("checkin-1");
    });

    it("excludes deleted check-ins", () => {
      const snapshot: MissionsStoreSnapshot = {
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        missions: [],
        checkInsById: {
          "checkin-1": {
            id: "checkin-1",
            keyResultId: "kr-1",
            authorId: "user-1",
            value: "50",
            previousValue: "0",
            confidence: "high",
            note: "Active",
            mentions: [],
            createdAt: "2026-01-15T10:00:00.000Z",
            clientMutationId: "test-1",
            syncStatus: "synced",
            syncedAt: "2026-01-15T10:00:00.000Z",
            error: null,
            deletedAt: null,
          },
          "checkin-2": {
            id: "checkin-2",
            keyResultId: "kr-1",
            authorId: "user-1",
            value: "75",
            previousValue: "50",
            confidence: "medium",
            note: "Deleted",
            mentions: [],
            createdAt: "2026-01-20T10:00:00.000Z",
            clientMutationId: "test-2",
            syncStatus: "synced",
            syncedAt: "2026-01-20T10:00:00.000Z",
            error: null,
            deletedAt: "2026-01-21T10:00:00.000Z", // Deleted
          },
        },
        checkInIdsByKr: {
          "kr-1": ["checkin-2", "checkin-1"],
        },
        checkInOutbox: [],
      };

      const history = snapshotToCheckInHistory(snapshot);

      expect(history["kr-1"]?.length).toBe(1);
      expect(history["kr-1"]?.[0]?.id).toBe("checkin-1");
    });

    it("returns empty object for empty check-ins", () => {
      const snapshot: MissionsStoreSnapshot = {
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        missions: [],
        checkInsById: {},
        checkInIdsByKr: {},
        checkInOutbox: [],
      };

      const history = snapshotToCheckInHistory(snapshot);

      expect(Object.keys(history).length).toBe(0);
    });

    it("strips internal fields from check-ins", () => {
      const snapshot: MissionsStoreSnapshot = {
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        missions: [],
        checkInsById: {
          "checkin-1": {
            id: "checkin-1",
            keyResultId: "kr-1",
            authorId: "user-1",
            value: "50",
            previousValue: "0",
            confidence: "high",
            note: "Test",
            mentions: [],
            createdAt: "2026-01-15T10:00:00.000Z",
            clientMutationId: "test-1",
            syncStatus: "synced",
            syncedAt: "2026-01-15T10:00:00.000Z",
            error: null,
            deletedAt: null,
          },
        },
        checkInIdsByKr: {
          "kr-1": ["checkin-1"],
        },
        checkInOutbox: [],
      };

      const history = snapshotToCheckInHistory(snapshot);
      const checkIn = history["kr-1"]?.[0];

      // Should not have internal fields
      expect((checkIn as LocalCheckIn).clientMutationId).toBeUndefined();
      expect((checkIn as LocalCheckIn).syncStatus).toBeUndefined();
      expect((checkIn as LocalCheckIn).syncedAt).toBeUndefined();
      expect((checkIn as LocalCheckIn).error).toBeUndefined();
      expect((checkIn as LocalCheckIn).deletedAt).toBeUndefined();
    });
  });
});

// ─── Outbox Handling ───

describe("Outbox Handling", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("preserves outbox items on save", () => {
    const snapshot = loadMissionsSnapshot();
    snapshot.checkInOutbox.push({
      id: "outbox-1",
      checkInId: "checkin-new",
      keyResultId: "kr-1",
      operation: "create",
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: "pending",
      lastError: null,
      nextRetryAt: null,
    });

    saveMissionsSnapshot(snapshot);
    const loaded = loadMissionsSnapshot();

    expect(loaded.checkInOutbox.length).toBe(1);
    expect(loaded.checkInOutbox[0]?.id).toBe("outbox-1");
  });

  it("resets processing status to pending on load", () => {
    const snapshot: MissionsStoreSnapshot = {
      schemaVersion: 2,
      updatedAt: new Date().toISOString(),
      missions: [],
      checkInsById: {},
      checkInIdsByKr: {},
      checkInOutbox: [
        {
          id: "outbox-1",
          checkInId: "checkin-1",
          keyResultId: "kr-1",
          operation: "create",
          createdAt: new Date().toISOString(),
          attempts: 2,
          status: "processing", // Should be reset to pending
          lastError: null,
          nextRetryAt: null,
        },
      ],
    };

    localStorage.setItem(
      "bud.saas.missions-store:org-1",
      JSON.stringify(snapshot)
    );
    const loaded = loadMissionsSnapshot();

    // Processing status should be reset to pending
    expect(loaded.checkInOutbox[0]?.status).toBe("pending");
  });
});

// ─── Seed Data Validation ───

describe("Seed Data Validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seed has no missions (schema 8: API is the source)", () => {
    const snapshot = loadMissionsSnapshot();
    expect(snapshot.missions).toEqual([]);
  });

  it("seed has check-in history", () => {
    const snapshot = loadMissionsSnapshot();

    expect(Object.keys(snapshot.checkInsById).length).toBeGreaterThan(0);
    expect(Object.keys(snapshot.checkInIdsByKr).length).toBeGreaterThan(0);
  });

  it("seed check-ins have proper structure", () => {
    const snapshot = loadMissionsSnapshot();
    const checkInId = Object.keys(snapshot.checkInsById)[0];
    const checkIn = snapshot.checkInsById[checkInId!];

    expect(checkIn?.id).toBeDefined();
    expect(checkIn?.keyResultId).toBeDefined();
    expect(checkIn?.value).toBeDefined();
    expect(checkIn?.createdAt).toBeDefined();
    expect(checkIn?.syncStatus).toBe("synced");
  });

  it("seed outbox is empty", () => {
    const snapshot = loadMissionsSnapshot();
    expect(snapshot.checkInOutbox).toEqual([]);
  });
});
