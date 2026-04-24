/**
 * Seed Version — clears all localStorage when seed data changes.
 *
 * Bump SEED_VERSION whenever seed data is modified to ensure all users
 * get fresh data on next page load. This avoids stale localStorage
 * from previous sessions overriding updated seeds.
 */

const SEED_VERSION = 6;
const SEED_VERSION_KEY = "bud.saas.seed-version";

export function clearStaleLocalStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const stored = window.localStorage.getItem(SEED_VERSION_KEY);
    const currentVersion = stored ? parseInt(stored, 10) : 0;

    if (currentVersion < SEED_VERSION) {
      // Remove all bud.saas keys (preserving non-app data)
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("bud.saas.")) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        window.localStorage.removeItem(key);
      }

      window.localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
    }
  } catch {
    // Ignore storage errors
  }
}
