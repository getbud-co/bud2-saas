/**
 * Tests for LoginPage
 *
 * Login form with email/password fields, social login buttons, and validation.
 * On valid submit, calls AuthContext.login() and navigates to /home.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderMinimal } from "../../../tests/setup/test-utils";
import type { Mock } from "vitest";
import { LoginPage } from "./LoginPage";
import { MemoryRouter } from "react-router-dom";
import { render as renderRaw } from "@testing-library/react";

const authState = vi.hoisted(() => ({
  login: vi.fn<(email: string, password: string) => Promise<void>>(),
}));

vi.mock("@/contexts/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("@/contexts/AuthContext")>("@/contexts/AuthContext");
  return {
    ...actual,
    AuthContext: actual.AuthContext,
    useAuth: () => ({
      isAuthenticated: false,
      initializing: false,
      user: null,
      activeOrganization: null,
      organizations: [],
      login: authState.login,
      switchOrganization: vi.fn(),
      logout: vi.fn(),
      getToken: () => null,
    }),
  };
});

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderMinimal(<LoginPage />);
  return { user, ...result };
}

function setupWithMockAuth(loginImpl: (email: string, password: string) => Promise<void>) {
  const user = userEvent.setup();
  authState.login.mockImplementation(loginImpl as Mock);
  const result = renderRaw(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
  return { user, ...result };
}

// ─── Tests ───

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    authState.login.mockReset();
  });

  describe("rendering", () => {
    it("renders login title", () => {
      setup();
      expect(screen.getByText("Acesse a sua conta")).toBeInTheDocument();
    });

    it("renders email input", () => {
      setup();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("renders password input", () => {
      setup();
      expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    });

    it("renders submit button", () => {
      setup();
      expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
    });

    it("renders social login buttons", () => {
      setup();
      expect(screen.getByRole("button", { name: /microsoft/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /qr code/i })).toBeInTheDocument();
    });

    it("renders forgot password link", () => {
      setup();
      expect(screen.getByText(/esqueceu sua senha/i)).toBeInTheDocument();
    });

    it("renders bud logo", () => {
      setup();
      expect(screen.getByLabelText("bud")).toBeInTheDocument();
    });
  });

  describe("password visibility toggle", () => {
    it("toggles password visibility", async () => {
      const { user } = setup();

      const toggleBtn = screen.getByRole("button", { name: /mostrar senha/i });
      await user.click(toggleBtn);

      expect(screen.getByRole("button", { name: /ocultar senha/i })).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows email error on empty submit", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText("Email é obrigatório")).toBeInTheDocument();
      });
    });

    it("shows password error on empty submit", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText("Senha é obrigatória")).toBeInTheDocument();
      });
    });
  });

  describe("API integration", () => {
    it("calls login() with email and password on valid submit", async () => {
      const loginMock = vi.fn().mockResolvedValue(undefined);
      const { user } = setupWithMockAuth(loginMock);

      await user.type(screen.getByLabelText(/email/i), "maria@empresa.com");
      await user.type(screen.getByLabelText("Senha"), "senha123");
      await user.click(screen.getByRole("button", { name: /entrar/i }));

      await waitFor(() => {
        expect(loginMock).toHaveBeenCalledWith("maria@empresa.com", "senha123");
      });
    });

    it("disables the submit button while loading", async () => {
      const loginMock = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200)),
      );
      const { user } = setupWithMockAuth(loginMock);

      await user.type(screen.getByLabelText(/email/i), "maria@empresa.com");
      await user.type(screen.getByLabelText("Senha"), "senha123");
      await user.click(screen.getByRole("button", { name: /entrar/i }));

      expect(screen.getByRole("button", { name: /entrando/i })).toBeDisabled();
    });

    it("shows API error message on failed login", async () => {
      const loginMock = vi.fn().mockRejectedValue(new Error("Email ou senha incorretos."));
      const { user } = setupWithMockAuth(loginMock);

      await user.type(screen.getByLabelText(/email/i), "maria@empresa.com");
      await user.type(screen.getByLabelText("Senha"), "senhaerrada");
      await user.click(screen.getByRole("button", { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText("Email ou senha incorretos.")).toBeInTheDocument();
      });
    });

    it("clears API error when user types", async () => {
      const loginMock = vi.fn().mockRejectedValue(new Error("Email ou senha incorretos."));
      const { user } = setupWithMockAuth(loginMock);

      await user.type(screen.getByLabelText(/email/i), "maria@empresa.com");
      await user.type(screen.getByLabelText("Senha"), "senhaerrada");
      await user.click(screen.getByRole("button", { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText("Email ou senha incorretos.")).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), "a");

      expect(screen.queryByText("Email ou senha incorretos.")).not.toBeInTheDocument();
    });
  });
});
