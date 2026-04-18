/**
 * Tests for AccountPage
 *
 * User profile page with personal info form, avatar, security section,
 * and change password modal.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/setup/test-utils";
import { AccountPage } from "./AccountPage";

// ─── Test Helpers ───

function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<AccountPage />);
  return { user, ...result };
}

// ─── Tests ───

describe("AccountPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders page title", () => {
      setup();
      expect(screen.getByText("Minha conta")).toBeInTheDocument();
    });

    it("renders user name", () => {
      setup();
      // Current user from seed
      const nameInputs = screen.getAllByLabelText(/nome/i);
      expect(nameInputs.length).toBeGreaterThan(0);
    });

    it("renders email input", () => {
      setup();
      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    });

    it("renders personal info section", () => {
      setup();
      expect(screen.getByText("Informações pessoais")).toBeInTheDocument();
    });

    it("renders security section", () => {
      setup();
      expect(screen.getByText("Segurança")).toBeInTheDocument();
    });
  });

  describe("security section", () => {
    it("renders change password button", () => {
      setup();
      expect(screen.getByRole("button", { name: /alterar senha/i })).toBeInTheDocument();
    });

    it("renders logout button", () => {
      setup();
      expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument();
    });

    it("shows auth provider method", () => {
      setup();
      expect(screen.getByText("Método de autenticação")).toBeInTheDocument();
    });
  });

  describe("change password modal", () => {
    it("opens change password modal", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /alterar senha/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByLabelText(/senha atual/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText("Nova senha")).toBeInTheDocument();
      expect(within(dialog).getByLabelText("Confirmar nova senha")).toBeInTheDocument();
    });

    it("disables submit when fields are empty", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: /alterar senha/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      // The submit button inside the modal also says "Alterar senha"
      const submitBtns = within(dialog).getAllByRole("button", { name: /alterar senha/i });
      const submitBtn = submitBtns[submitBtns.length - 1]!;
      expect(submitBtn).toBeDisabled();
    });
  });

  describe("save changes", () => {
    it("save button is disabled when no changes", () => {
      setup();
      const saveBtn = screen.getByRole("button", { name: /salvar alterações/i });
      expect(saveBtn).toBeDisabled();
    });

    it("save button enables when fields change", async () => {
      const { user } = setup();

      const firstNameInput = screen.getByLabelText("Nome");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "NovoNome");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /salvar alterações/i })).not.toBeDisabled();
      });
    });

    it("shows discard button when changes exist", async () => {
      const { user } = setup();

      const firstNameInput = screen.getByLabelText("Nome");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "NovoNome");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /descartar/i })).toBeInTheDocument();
      });
    });
  });
});
