import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanSelectionModal } from "./PlanSelectionModal";

describe("PlanSelectionModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("nao renderiza conteudo quando fechado", () => {
    const onClose = vi.fn();
    render(<PlanSelectionModal open={false} onClose={onClose} />);

    expect(screen.queryByText("Adicionar nova empresa")).not.toBeInTheDocument();
  });

  it("renderiza titulo e descricao quando aberto", () => {
    const onClose = vi.fn();
    render(<PlanSelectionModal open={true} onClose={onClose} />);

    expect(screen.getByText("Adicionar nova empresa")).toBeInTheDocument();
    expect(
      screen.getByText("Para adicionar uma nova empresa, escolha um plano.")
    ).toBeInTheDocument();
  });

  it("renderiza os quatro planos", () => {
    const onClose = vi.fn();
    render(<PlanSelectionModal open={true} onClose={onClose} />);

    expect(screen.getByText("Lite")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Master")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("exibe badge 'Popular' apenas no plano Master", () => {
    const onClose = vi.fn();
    render(<PlanSelectionModal open={true} onClose={onClose} />);

    const popularBadges = screen.getAllByText("Popular");
    expect(popularBadges).toHaveLength(1);
  });

  it("exibe features de cada plano", () => {
    const onClose = vi.fn();
    render(<PlanSelectionModal open={true} onClose={onClose} />);

    // Lite feature
    expect(
      screen.getByText("Plataforma completa (até 50 usuários)")
    ).toBeInTheDocument();
    // Pro feature
    expect(screen.getByText("Tudo do Lite")).toBeInTheDocument();
    // Master feature
    expect(screen.getByText("Tudo do Pro")).toBeInTheDocument();
    // Enterprise feature
    expect(screen.getByText("Tudo do Master")).toBeInTheDocument();
  });

  it("renderiza botoes 'Fale com um especialista' para cada plano", () => {
    const onClose = vi.fn();
    render(<PlanSelectionModal open={true} onClose={onClose} />);

    const buttons = screen.getAllByText("Fale com um especialista");
    expect(buttons).toHaveLength(4);
  });

  it("chama onClose ao clicar no botao de um plano", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PlanSelectionModal open={true} onClose={onClose} />);

    const buttons = screen.getAllByText("Fale com um especialista");
    await user.click(buttons[0]!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
