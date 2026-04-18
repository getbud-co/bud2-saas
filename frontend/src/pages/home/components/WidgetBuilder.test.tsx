/**
 * Tests for WidgetBuilder
 *
 * Multi-step modal for creating dashboard widgets.
 * Controlled component: props are open, onClose, onAdd.
 * Uses PeopleDataContext for user/team data.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { WidgetBuilder } from "./WidgetBuilder";

// ─── Test Helpers ───

interface SetupProps {
  open?: boolean;
  onClose?: () => void;
  onAdd?: (config: unknown) => void;
}

function setup(props: SetupProps = {}) {
  const user = userEvent.setup();
  const onClose = props.onClose ?? vi.fn();
  const onAdd = props.onAdd ?? vi.fn();
  const result = renderWithProviders(
    <WidgetBuilder
      open={props.open ?? true}
      onClose={onClose}
      onAdd={onAdd}
    />,
  );
  return { user, onClose, onAdd, ...result };
}

// ─── Tests ───

describe("WidgetBuilder", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders without crashing when open", () => {
      setup({ open: true });
      expect(screen.getByText("Adicionar widget")).toBeInTheDocument();
    });

    it("displays the modal title and description", () => {
      setup({ open: true });
      expect(screen.getByText("Adicionar widget")).toBeInTheDocument();
      expect(
        screen.getByText("Configure um novo widget para sua home"),
      ).toBeInTheDocument();
    });

    it("displays popular widgets section on step 1", () => {
      setup({ open: true });
      expect(screen.getByText("Populares para você")).toBeInTheDocument();
    });

    it("displays subject selection options on step 1", () => {
      setup({ open: true });
      expect(screen.getByText("Eu mesmo")).toBeInTheDocument();
      expect(screen.getByText("Empresa toda")).toBeInTheDocument();
    });

    it("renders Voltar button disabled on step 1", () => {
      setup({ open: true });
      const backBtn = screen.getByRole("button", { name: "Voltar" });
      expect(backBtn).toBeDisabled();
    });

    it("renders Proximo button disabled when no subject is selected", () => {
      setup({ open: true });
      const nextBtn = screen.getByRole("button", { name: /próximo/i });
      expect(nextBtn).toBeDisabled();
    });
  });

  describe("step navigation", () => {
    it("enables Proximo button after selecting a subject", async () => {
      const { user } = setup({ open: true });
      // Select "Eu mesmo"
      await user.click(screen.getByText("Eu mesmo"));
      const nextBtn = screen.getByRole("button", { name: /próximo/i });
      expect(nextBtn).not.toBeDisabled();
    });

    it("advances to step 2 after selecting subject and clicking Proximo", async () => {
      const { user } = setup({ open: true });
      await user.click(screen.getByText("Eu mesmo"));
      await user.click(screen.getByRole("button", { name: /próximo/i }));
      // Step 2 shows metric selection
      expect(
        screen.getByText("Escolha a métrica que deseja acompanhar."),
      ).toBeInTheDocument();
    });
  });

  describe("popular widgets shortcut", () => {
    it("renders popular widget buttons", () => {
      setup({ open: true });
      expect(screen.getByRole("button", { name: "Progresso OKRs do time" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Meu engajamento semanal" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Missões em risco" })).toBeInTheDocument();
    });
  });
});
