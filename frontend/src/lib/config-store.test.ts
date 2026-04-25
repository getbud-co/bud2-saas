import { describe, it, expect, beforeEach } from "vitest";
import {
  // ID creation utilities
  createTagIdFromName,
  createCompanyValueIdFromName,
  createCycleIdFromName,
  createRoleSlug,
  createRoleId,
  // Store functions
  loadConfigSnapshot,
  saveConfigSnapshot,
  resetConfigSnapshot,
  type ConfigStoreSnapshot,
} from "./config-store";

// ─── ID Creation Utilities ───

describe("ID Creation Utilities", () => {
  describe("createTagIdFromName()", () => {
    it("creates id with tag- prefix", () => {
      expect(createTagIdFromName("Test Tag")).toBe("tag-test-tag");
    });

    it("removes accents", () => {
      expect(createTagIdFromName("Inovação")).toBe("tag-inovacao");
    });

    it("converts to lowercase", () => {
      expect(createTagIdFromName("UPPERCASE")).toBe("tag-uppercase");
    });

    it("replaces spaces with hyphens", () => {
      expect(createTagIdFromName("Multiple Words Here")).toBe(
        "tag-multiple-words-here"
      );
    });

    it("removes special characters", () => {
      expect(createTagIdFromName("Test@#$%Tag")).toBe("tag-test-tag");
    });

    it("handles empty string with timestamp fallback", () => {
      const result = createTagIdFromName("");
      expect(result).toMatch(/^tag-\d+$/);
    });
  });

  describe("createCompanyValueIdFromName()", () => {
    it("creates id with value- prefix", () => {
      expect(createCompanyValueIdFromName("Collaboration")).toBe(
        "value-collaboration"
      );
    });

    it("removes accents", () => {
      expect(createCompanyValueIdFromName("Transparência")).toBe(
        "value-transparencia"
      );
    });

    it("handles empty string with timestamp fallback", () => {
      const result = createCompanyValueIdFromName("");
      expect(result).toMatch(/^value-\d+$/);
    });
  });

  describe("createCycleIdFromName()", () => {
    it("creates id with cycle- prefix", () => {
      expect(createCycleIdFromName("Q1 2026")).toBe("cycle-q1-2026");
    });

    it("handles empty string with timestamp fallback", () => {
      const result = createCycleIdFromName("");
      expect(result).toMatch(/^cycle-\d+$/);
    });
  });

  describe("createRoleSlug()", () => {
    it("creates slug from name", () => {
      expect(createRoleSlug("Admin RH")).toBe("admin-rh");
    });

    it("removes accents", () => {
      expect(createRoleSlug("Gestão")).toBe("gestao");
    });

    it("handles empty string with timestamp fallback", () => {
      const result = createRoleSlug("");
      expect(result).toMatch(/^role-\d+$/);
    });
  });

  describe("createRoleId()", () => {
    it("creates role id from org and slug", () => {
      expect(createRoleId("org-1", "admin-rh")).toBe("role-org-1-admin-rh");
    });
  });
});

// ─── Store Functions ───

describe("Store Functions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadConfigSnapshot()", () => {
    it("returns seed data when localStorage is empty", () => {
      const snapshot = loadConfigSnapshot();

      expect(snapshot.schemaVersion).toBe(4);
      expect(snapshot.activeOrgId).toBe("org-1");
      expect(Object.keys(snapshot.organizationsById).length).toBeGreaterThan(0);
    });

    it("persists seed data to localStorage on first load", () => {
      loadConfigSnapshot();

      const stored = localStorage.getItem("bud.saas.config-store");
      expect(stored).not.toBeNull();
    });

    it("loads existing data from localStorage", () => {
      const customData: Partial<ConfigStoreSnapshot> = {
        schemaVersion: 2,
        activeOrgId: "custom-org",
        organizationsById: {
          "custom-org": {
            id: "custom-org",
            name: "Custom Org",
            legalName: "Custom Org Ltda",
            slug: "custom-org",
            cnpj: null,
            logoUrl: null,
            plan: "starter",
            timezone: "America/Sao_Paulo",
            language: "pt-BR",
            parentOrgId: null,
            orgType: "company",
            depth: 0,
            path: ["custom-org"],
          },
        },
        companyValuesByOrg: {},
        tagsByOrg: {},
        cyclesByOrg: {},
        rolesByOrg: {},
        permissions: [],
        legacyRoleSlugAliases: {},
        legacyCycleIdAliases: {},
        legacyTagIdAliases: {},
      };

      localStorage.setItem("bud.saas.config-store", JSON.stringify(customData));
      const snapshot = loadConfigSnapshot();

      expect(snapshot.activeOrgId).toBe("custom-org");
      expect(snapshot.organizationsById["custom-org"]).toBeDefined();
    });

    it("handles corrupted localStorage data", () => {
      localStorage.setItem("bud.saas.config-store", "not-valid-json");
      const snapshot = loadConfigSnapshot();

      // Should return seed data
      expect(snapshot.schemaVersion).toBe(4);
      expect(snapshot.activeOrgId).toBe("org-1");
    });

    it("migrates old schema versions", () => {
      const oldData = {
        schemaVersion: 1,
        activeOrgId: "org-1",
        organizationsById: {
          "org-1": {
            id: "org-1",
            name: "Test Org",
            slug: "test-org",
          },
        },
        companyValuesByOrg: {},
        tagsByOrg: {},
        cyclesByOrg: {},
        rolesByOrg: {},
      };

      localStorage.setItem("bud.saas.config-store", JSON.stringify(oldData));
      const snapshot = loadConfigSnapshot();

      expect(snapshot.schemaVersion).toBe(4);
      // Should have migrated org with new fields
      expect(snapshot.organizationsById["org-1"]?.depth).toBeDefined();
      expect(snapshot.organizationsById["org-1"]?.path).toBeDefined();
    });
  });

  describe("saveConfigSnapshot()", () => {
    it("saves data to localStorage", () => {
      const initial = loadConfigSnapshot();
      initial.activeOrgId = "new-org-id";

      // We need to ensure new-org-id exists in organizationsById
      initial.organizationsById["new-org-id"] = {
        id: "new-org-id",
        name: "New Org",
        legalName: "New Org Ltda",
        slug: "new-org",
        cnpj: null,
        logoUrl: null,
        plan: "starter",
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
        parentOrgId: null,
        orgType: "company",
        depth: 0,
        path: ["new-org-id"],
      };

      saveConfigSnapshot(initial);

      const stored = localStorage.getItem("bud.saas.config-store");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.activeOrgId).toBe("new-org-id");
    });

    it("updates schemaVersion and updatedAt", () => {
      const initial = loadConfigSnapshot();
      const saved = saveConfigSnapshot(initial);

      expect(saved.schemaVersion).toBe(4);
      expect(saved.updatedAt).toBeDefined();
    });

    it("preserves legacy aliases with defaults", () => {
      const initial = loadConfigSnapshot();
      initial.legacyRoleSlugAliases = { custom: "custom-role" };

      const saved = saveConfigSnapshot(initial);

      // Should have both default and custom aliases
      expect(saved.legacyRoleSlugAliases.custom).toBe("custom-role");
      expect(saved.legacyRoleSlugAliases.admin).toBe("admin-rh"); // default
    });
  });

  describe("resetConfigSnapshot()", () => {
    it("resets to seed data", () => {
      // First, save some custom data
      const initial = loadConfigSnapshot();
      initial.activeOrgId = "custom-org";
      initial.organizationsById["custom-org"] = {
        id: "custom-org",
        name: "Custom",
        legalName: null,
        slug: "custom",
        cnpj: null,
        logoUrl: null,
        plan: "starter",
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
        parentOrgId: null,
        orgType: "company",
        depth: 0,
        path: ["custom-org"],
      };
      saveConfigSnapshot(initial);

      // Reset
      const reset = resetConfigSnapshot();

      expect(reset.activeOrgId).toBe("org-1");
      expect(reset.organizationsById["custom-org"]).toBeUndefined();
    });

    it("persists reset data to localStorage", () => {
      resetConfigSnapshot();

      const stored = localStorage.getItem("bud.saas.config-store");
      const parsed = JSON.parse(stored!);
      expect(parsed.activeOrgId).toBe("org-1");
    });
  });
});

// ─── Seed Data Validation ───

describe("Seed Data Validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seed includes default organization", () => {
    const snapshot = loadConfigSnapshot();
    expect(snapshot.organizationsById["org-1"]).toBeDefined();
    expect(snapshot.organizationsById["org-1"]?.name).toBe(
      "Bud Tecnologia Ltda."
    );
  });

  it("seed includes company values", () => {
    const snapshot = loadConfigSnapshot();
    const values = snapshot.companyValuesByOrg["org-1"];
    expect(values).toBeDefined();
    expect(values?.length).toBeGreaterThan(0);
    expect(values?.some((v) => v.id === "value-inovacao")).toBe(true);
  });

  it("seed includes tags", () => {
    const snapshot = loadConfigSnapshot();
    const tags = snapshot.tagsByOrg["org-1"];
    expect(tags).toBeDefined();
    expect(tags?.length).toBeGreaterThan(0);
  });

  it("does not seed cycles into local config storage", () => {
    const snapshot = loadConfigSnapshot();
    expect(snapshot.cyclesByOrg).toEqual({});
  });

  it("seed includes roles with permissions", () => {
    const snapshot = loadConfigSnapshot();
    const roles = snapshot.rolesByOrg["org-1"];
    expect(roles).toBeDefined();
    expect(roles?.length).toBeGreaterThan(0);

    const adminRole = roles?.find((r) => r.slug === "super-admin");
    expect(adminRole).toBeDefined();
    expect(adminRole?.permissionIds.length).toBeGreaterThan(0);
  });

  it("seed includes permissions", () => {
    const snapshot = loadConfigSnapshot();
    expect(snapshot.permissions.length).toBeGreaterThan(0);
    expect(snapshot.permissions.some((p) => p.id === "people.view")).toBe(true);
  });

  it("seed includes legacy aliases", () => {
    const snapshot = loadConfigSnapshot();

    expect(snapshot.legacyRoleSlugAliases.admin).toBe("admin-rh");
    expect(snapshot.legacyRoleSlugAliases.manager).toBe("gestor");
    expect(snapshot.legacyCycleIdAliases["annual-2026"]).toBe("ano-2026");
    expect(snapshot.legacyTagIdAliases.strategy).toBe("tag-estrategia");
  });
});

// ─── Data Sanitization (via migration) ───

describe("Data Sanitization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sanitizes invalid organization data", () => {
    const invalidData = {
      schemaVersion: 2,
      activeOrgId: "test-org",
      organizationsById: {
        "test-org": {
          id: "test-org",
          name: "Test",
          slug: "test",
          // Missing many fields
        },
      },
      companyValuesByOrg: {},
      tagsByOrg: {},
      cyclesByOrg: {},
      rolesByOrg: {},
    };

    localStorage.setItem("bud.saas.config-store", JSON.stringify(invalidData));
    const snapshot = loadConfigSnapshot();

    // Should fill in defaults
    const org = snapshot.organizationsById["test-org"];
    expect(org?.plan).toBe("professional");
    expect(org?.timezone).toBe("America/Sao_Paulo");
    expect(org?.depth).toBe(0);
    expect(org?.path).toEqual(["test-org"]);
  });

  it("sanitizes invalid tag data", () => {
    const invalidData = {
      schemaVersion: 2,
      activeOrgId: "org-1",
      organizationsById: {
        "org-1": { id: "org-1", name: "Test", slug: "test" },
      },
      tagsByOrg: {
        "org-1": [
          { id: "tag-1", name: "Tag 1" }, // Missing color
          { name: "Invalid" }, // Missing id
        ],
      },
      companyValuesByOrg: {},
      cyclesByOrg: {},
      rolesByOrg: {},
    };

    localStorage.setItem("bud.saas.config-store", JSON.stringify(invalidData));
    const snapshot = loadConfigSnapshot();

    const tags = snapshot.tagsByOrg["org-1"];
    // Should have sanitized the valid tag
    const tag1 = tags?.find((t) => t.id === "tag-1");
    expect(tag1?.color).toBe("neutral"); // default
    // Invalid tag (missing id) should be filtered out
    expect(tags?.some((t) => t.name === "Invalid" && !t.id)).toBe(false);
  });

  it("drops legacy cycle data during migration", () => {
    const invalidData = {
      schemaVersion: 2,
      activeOrgId: "org-1",
      organizationsById: {
        "org-1": { id: "org-1", name: "Test", slug: "test" },
      },
      cyclesByOrg: {
        "org-1": [
          {
            id: "cycle-1",
            name: "Q1",
            startDate: "2026-01-01",
            endDate: "2026-03-31",
            // Missing type and status
          },
        ],
      },
      companyValuesByOrg: {},
      tagsByOrg: {},
      rolesByOrg: {},
    };

    localStorage.setItem("bud.saas.config-store", JSON.stringify(invalidData));
    const snapshot = loadConfigSnapshot();

    expect(snapshot.cyclesByOrg).toEqual({});
  });

  it("falls back to seed data when arrays are empty", () => {
    const emptyData = {
      schemaVersion: 2,
      activeOrgId: "org-1",
      organizationsById: {
        "org-1": { id: "org-1", name: "Test", slug: "test" },
      },
      companyValuesByOrg: { "org-1": [] },
      tagsByOrg: { "org-1": [] },
      cyclesByOrg: { "org-1": [] },
      rolesByOrg: { "org-1": [] },
    };

    localStorage.setItem("bud.saas.config-store", JSON.stringify(emptyData));
    const snapshot = loadConfigSnapshot();

    // Should fall back to seed data since arrays are empty
    expect(snapshot.companyValuesByOrg["org-1"]?.length).toBeGreaterThan(0);
    expect(snapshot.tagsByOrg["org-1"]?.length).toBeGreaterThan(0);
    expect(snapshot.cyclesByOrg).toEqual({});
    expect(snapshot.rolesByOrg["org-1"]?.length).toBeGreaterThan(0);
  });
});
