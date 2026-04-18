/**
 * Tests for seed-version
 *
 * clearStaleLocalStorage removes all bud.saas.* keys when seed version changes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clearStaleLocalStorage } from "./seed-version";

describe("clearStaleLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clears bud.saas.* keys when version is stale", () => {
    localStorage.setItem("bud.saas.config-store", "data");
    localStorage.setItem("bud.saas.people-store", "data");
    // Set an old version
    localStorage.setItem("bud.saas.seed-version", "1");

    clearStaleLocalStorage();

    expect(localStorage.getItem("bud.saas.config-store")).toBeNull();
    expect(localStorage.getItem("bud.saas.people-store")).toBeNull();
  });

  it("preserves non-app keys", () => {
    localStorage.setItem("other-app-key", "value");
    localStorage.setItem("bud.saas.seed-version", "1");

    clearStaleLocalStorage();

    expect(localStorage.getItem("other-app-key")).toBe("value");
  });

  it("sets seed version after clearing", () => {
    localStorage.setItem("bud.saas.seed-version", "1");

    clearStaleLocalStorage();

    const version = localStorage.getItem("bud.saas.seed-version");
    expect(version).not.toBeNull();
    expect(parseInt(version!, 10)).toBeGreaterThan(1);
  });

  it("does not clear when version is current", () => {
    // Get current seed version by running clearStaleLocalStorage first
    clearStaleLocalStorage();
    const currentVersion = localStorage.getItem("bud.saas.seed-version")!;

    // Set some data
    localStorage.setItem("bud.saas.config-store", "preserved-data");

    clearStaleLocalStorage();

    expect(localStorage.getItem("bud.saas.config-store")).toBe("preserved-data");
    expect(localStorage.getItem("bud.saas.seed-version")).toBe(currentVersion);
  });

  it("handles empty localStorage gracefully", () => {
    expect(() => clearStaleLocalStorage()).not.toThrow();
  });
});
