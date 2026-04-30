// Shared parsers for the API adapter boundary. The UI carries numeric KR
// values as strings (matches the form input shape) while the backend
// expects numbers. This helper centralises the "string to number, drop on
// empty/invalid" rule so use-indicators, MissionsPage, and any future
// caller behave the same way.

export function parseNumberOrUndefined(value: string | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
