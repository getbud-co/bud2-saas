import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { QuestionnaireBuilder } from "./QuestionnaireBuilder";
import { QuestionnaireProvider } from "./QuestionnaireContext";
import type { WizardQuestion, WizardSection } from "@/types/survey";

/* ——— Mock DnD kit (avoid actual drag-and-drop in unit tests) ——— */

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Translate: { toString: () => undefined },
  },
}));

/* ——— Helpers ——— */

function makeQuestion(overrides: Partial<WizardQuestion> = {}): WizardQuestion {
  return {
    id: "q-1",
    sectionId: null,
    type: "multiple_choice",
    text: "Qual a sua satisfação?",
    isRequired: true,
    options: [{ id: "opt-1", label: "Opção 1" }],
    ...overrides,
  };
}

function makeSection(overrides: Partial<WizardSection> = {}): WizardSection {
  return {
    id: "s-1",
    title: "Seção de engajamento",
    ...overrides,
  };
}

function renderBuilder(
  props: Partial<React.ComponentProps<typeof QuestionnaireBuilder>> = {},
  initialQuestions: WizardQuestion[] = [],
  initialSections: WizardSection[] = []
) {
  return render(
    <QuestionnaireProvider
      initialQuestions={initialQuestions}
      initialSections={initialSections}
    >
      <QuestionnaireBuilder {...props} />
    </QuestionnaireProvider>
  );
}

/* ——— Tests ——— */

describe("QuestionnaireBuilder", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Renderizacao basica", () => {
    it("renderiza sem crash com estado vazio", () => {
      renderBuilder();
      expect(screen.getByText("Questionário")).toBeInTheDocument();
    });

    it("exibe contagem '0 perguntas' quando vazio", () => {
      renderBuilder();
      expect(screen.getByText("0 perguntas")).toBeInTheDocument();
    });

    it("exibe contagem singular '1 pergunta'", () => {
      renderBuilder({}, [makeQuestion()]);
      expect(screen.getByText("1 pergunta")).toBeInTheDocument();
    });

    it("exibe contagem plural '3 perguntas'", () => {
      const qs = [
        makeQuestion({ id: "q-1" }),
        makeQuestion({ id: "q-2", text: "Pergunta 2" }),
        makeQuestion({ id: "q-3", text: "Pergunta 3" }),
      ];
      renderBuilder({}, qs);
      expect(screen.getByText("3 perguntas")).toBeInTheDocument();
    });

    it("exibe contagem de secoes junto com perguntas", () => {
      renderBuilder(
        {},
        [makeQuestion({ sectionId: "s-1" })],
        [makeSection()]
      );
      expect(screen.getByText(/1 pergunta/)).toBeInTheDocument();
      expect(screen.getByText(/1 seção/)).toBeInTheDocument();
    });

    it("exibe alerta quando nao ha perguntas nem secoes", () => {
      renderBuilder();
      expect(screen.getByText("Nenhuma pergunta")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Adicione perguntas manualmente, use o banco de perguntas ou crie com IA."
        )
      ).toBeInTheDocument();
    });

    it("nao exibe alerta quando ha perguntas", () => {
      renderBuilder({}, [makeQuestion()]);
      expect(screen.queryByText("Nenhuma pergunta")).not.toBeInTheDocument();
    });
  });

  describe("Botoes de acao", () => {
    it("renderiza botao 'Adicionar'", () => {
      renderBuilder();
      expect(screen.getByText("Adicionar")).toBeInTheDocument();
    });

    it("renderiza botao 'Banco de perguntas'", () => {
      renderBuilder();
      expect(screen.getByText("Banco de perguntas")).toBeInTheDocument();
    });
  });

  describe("Renderizacao de perguntas", () => {
    it("renderiza o campo de texto da pergunta", () => {
      renderBuilder({}, [makeQuestion({ text: "Como voce avalia o ambiente?" })]);
      // The contentEditable div has role="textbox" and aria-placeholder
      const textboxes = screen.getAllByRole("textbox");
      const questionInput = textboxes.find(
        (el) => el.getAttribute("aria-placeholder") === "Texto da pergunta..."
      );
      expect(questionInput).toBeInTheDocument();
      expect(questionInput).toHaveAttribute("contenteditable", "true");
    });

    it("exibe numero da pergunta (1.)", () => {
      renderBuilder({}, [makeQuestion()]);
      expect(screen.getByText("1.")).toBeInTheDocument();
    });

    it("exibe numeros sequenciais para multiplas perguntas", () => {
      const qs = [
        makeQuestion({ id: "q-1" }),
        makeQuestion({ id: "q-2", text: "Segunda" }),
      ];
      renderBuilder({}, qs);
      expect(screen.getByText("1.")).toBeInTheDocument();
      expect(screen.getByText("2.")).toBeInTheDocument();
    });

    it("exibe badge de tipo da pergunta", () => {
      renderBuilder({}, [makeQuestion({ type: "multiple_choice" })]);
      expect(screen.getByText("Múltipla escolha")).toBeInTheDocument();
    });

    it("exibe 'É obrigatório' quando isRequired e true", () => {
      renderBuilder({}, [makeQuestion({ isRequired: true })]);
      expect(screen.getByText("É obrigatório")).toBeInTheDocument();
    });

    it("exibe 'É opcional' quando isRequired e false", () => {
      renderBuilder({}, [makeQuestion({ isRequired: false })]);
      expect(screen.getByText("É opcional")).toBeInTheDocument();
    });

    it("renderiza campo de descricao da pergunta", () => {
      renderBuilder({}, [makeQuestion()]);
      expect(
        screen.getByPlaceholderText("Descrição da pergunta (opcional)")
      ).toBeInTheDocument();
    });
  });

  describe("Tipo de pergunta - previews", () => {
    it("renderiza preview de opcoes para multiple_choice", () => {
      renderBuilder({}, [
        makeQuestion({
          type: "multiple_choice",
          options: [
            { id: "opt-1", label: "Sim" },
            { id: "opt-2", label: "Não" },
          ],
        }),
      ]);
      expect(screen.getByDisplayValue("Sim")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Não")).toBeInTheDocument();
    });

    it("renderiza botao 'Adicionar opção' para multiple_choice", () => {
      renderBuilder({}, [makeQuestion({ type: "multiple_choice" })]);
      expect(screen.getByText("Adicionar opção")).toBeInTheDocument();
    });

    it("renderiza preview 'Sim' e 'Não' para yes_no", () => {
      renderBuilder({}, [
        makeQuestion({ id: "q-yn", type: "yes_no", options: undefined }),
      ]);
      expect(screen.getByText("Sim")).toBeInTheDocument();
      expect(screen.getByText("Não")).toBeInTheDocument();
    });

    it("renderiza preview de data para tipo date", () => {
      renderBuilder({}, [
        makeQuestion({ id: "q-dt", type: "date", options: undefined }),
      ]);
      expect(screen.getByText("DD / MM / AAAA")).toBeInTheDocument();
    });

    it("renderiza preview de estrelas para tipo rating", () => {
      renderBuilder({}, [
        makeQuestion({ id: "q-rt", type: "rating", ratingMax: 5, options: undefined }),
      ]);
      expect(screen.getByText("Estrelas:")).toBeInTheDocument();
    });
  });

  describe("Secoes", () => {
    it("renderiza titulo da secao", () => {
      renderBuilder(
        {},
        [makeQuestion({ sectionId: "s-1" })],
        [makeSection({ title: "Engajamento" })]
      );
      expect(screen.getByDisplayValue("Engajamento")).toBeInTheDocument();
    });

    it("renderiza campo de descricao da secao", () => {
      renderBuilder({}, [], [makeSection()]);
      expect(
        screen.getByPlaceholderText("Descrição da seção (opcional)")
      ).toBeInTheDocument();
    });

    it("renderiza botao de remover secao", () => {
      renderBuilder({}, [], [makeSection()]);
      expect(
        screen.getByLabelText("Remover seção")
      ).toBeInTheDocument();
    });

    it("renderiza handle de arrastar da secao", () => {
      renderBuilder({}, [], [makeSection()]);
      expect(
        screen.getByLabelText("Arrastar seção para reordenar")
      ).toBeInTheDocument();
    });
  });

  describe("Banco de perguntas modal", () => {
    it("abre modal ao clicar em 'Banco de perguntas'", async () => {
      const user = userEvent.setup();
      renderBuilder();

      await user.click(screen.getByText("Banco de perguntas"));

      expect(
        await screen.findByText(
          "Selecione perguntas prontas para adicionar ao questionário"
        )
      ).toBeInTheDocument();
    });
  });

  describe("Callback onAiCreate", () => {
    it("nao exibe opcao IA quando onAiCreate nao e fornecido", () => {
      renderBuilder({});
      // The "Criar pergunta com IA" option should not exist in dropdown items
      expect(
        screen.queryByText("Criar pergunta com IA")
      ).not.toBeInTheDocument();
    });
  });
});
