import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/lib/types";

function getBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw && raw.trim().length > 0) return raw.trim().replace(/\/$/, "");
  return "/api";
}

export function createApiClient(getToken: () => string | null) {
  const client = createClient<paths>({ baseUrl: getBaseUrl() });

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const token = getToken();
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      return request;
    },
  };

  client.use(authMiddleware);

  return client;
}
