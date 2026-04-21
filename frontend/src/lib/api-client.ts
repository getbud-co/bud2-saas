const REQUEST_TIMEOUT_MS = 10_000;

function getBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw && raw.trim().length > 0) return raw.trim().replace(/\/$/, "");
  // Fallback to /api prefix so the Vite dev proxy can forward to the backend
  return "/api";
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, title: string, detail: string) {
    super(title);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function requestWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timerId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timerId);
  }
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await requestWithTimeout(
    url,
    {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    let title = `HTTP ${response.status}`;
    let detail = "";
    try {
      const json = await response.json() as { title?: string; detail?: string };
      title = json.title ?? title;
      detail = json.detail ?? "";
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, title, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
