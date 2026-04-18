/**
 * Tests for LoginPage
 *
 * Login form with email/password fields, social login buttons, and validation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderMinimal } from "../../../tests/setup/test-utils";
import { LoginPage } from "./LoginPage";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderMinimal(<LoginPage />);
  return { user, ...result };
}

// ─── Tests ───

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
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
});
