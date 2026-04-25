import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  is_system_admin: boolean;
}

interface AuthOrganization {
  id: string;
  name: string;
  domain: string;
  workspace: string;
  status: string;
  membership_role: string;
  membership_status: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
  active_organization: AuthOrganization | null;
  organizations: AuthOrganization[];
}

interface AuthContextValue {
  isAuthenticated: boolean;
  initializing: boolean;
  user: AuthUser | null;
  activeOrganization: AuthOrganization | null;
  organizations: AuthOrganization[];
  login: (email: string, password: string) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "bud.auth.tokens";

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).accessToken === "string" &&
      typeof (parsed as Record<string, unknown>).refreshToken === "string"
    ) {
      return parsed as StoredTokens;
    }
    clearTokens();
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

function saveTokens(tokens: StoredTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Error messages ───────────────────────────────────────────────────────────

function toUserMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return "Erro inesperado. Tente novamente.";
  if (err.status === 401) return "Email ou senha incorretos.";
  if (err.status === 403) {
    if (err.detail.includes("inactive")) return "Conta desativada.";
    if (err.detail.includes("no accessible organizations") || err.detail.includes("no organizations")) return "Sem organizações acessíveis.";
    return "Acesso negado.";
  }
  if (err.status === 422) return `Dados inválidos: ${err.detail}`;
  return "Erro inesperado. Tente novamente.";
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [initializing, setInitializing] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganization, setActiveOrganization] = useState<AuthOrganization | null>(null);
  const [organizations, setOrganizations] = useState<AuthOrganization[]>([]);

  const applySession = useCallback((session: LoginResponse) => {
	queryClient.clear();
	setAccessToken(session.access_token);
	setUser(session.user);
	setActiveOrganization(session.active_organization ?? null);
	setOrganizations(session.organizations);
	saveTokens({ accessToken: session.access_token, refreshToken: session.refresh_token });
  }, []);

  // On mount, restore session from localStorage and validate via GET /auth/session
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const stored = loadTokens();
      if (!stored) {
        if (!cancelled) setInitializing(false);
        return;
      }

      try {
        const session = await apiRequest<LoginResponse>("/auth/session", {
          token: stored.accessToken,
        });
        if (!cancelled) {
          setAccessToken(stored.accessToken);
          setUser(session.user);
          setActiveOrganization(session.active_organization ?? null);
          setOrganizations(session.organizations);
        }
      } catch {
        // Token is invalid/expired — clear and force re-login
        if (!cancelled) clearTokens();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    restore();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      applySession(result);
    } catch (err) {
      if (err instanceof ApiError) {
        err.message = toUserMessage(err);
        throw err;
      }
      throw new Error(toUserMessage(err));
    }
  }, [applySession]);

  const switchOrganization = useCallback(async (organizationId: string) => {
	if (!accessToken) throw new Error("authentication required");
	try {
	  const result = await apiRequest<LoginResponse>("/auth/session", {
		method: "PUT",
		body: { organization_id: organizationId },
		token: accessToken,
	  });
	  applySession(result);
	} catch (err) {
	  if (err instanceof ApiError) {
		err.message = toUserMessage(err);
		throw err;
	  }
	  throw new Error(toUserMessage(err));
	}
  }, [accessToken, applySession]);

  const logout = useCallback(() => {
    clearTokens();
    setAccessToken(null);
    setUser(null);
    setActiveOrganization(null);
    setOrganizations([]);
    queryClient.clear();
    navigate("/login");
  }, [navigate]);

  const getToken = useCallback(() => accessToken, [accessToken]);

  const isAuthenticated = accessToken !== null;

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      initializing,
      user,
      activeOrganization,
      organizations,
      login,
      switchOrganization,
      logout,
      getToken,
    }),
    [isAuthenticated, initializing, user, activeOrganization, organizations, login, switchOrganization, logout, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
