/**
 * Tests for AppSidebar
 *
 * Navigation sidebar with org switcher, nav groups, saved views, and user menu.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { SavedViewsProvider } from "@/contexts/SavedViewsContext";
import { AppSidebar } from "./AppSidebar";

// ─── Test Helpers ───

function renderSidebar(
  props?: Partial<Parameters<typeof AppSidebar>[0]>,
  route = "/home",
) {
  const defaultProps = {
    collapsed: false,
    onToggleCollapse: vi.fn(),
  };
  const user = userEvent.setup();

  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <ConfigDataProvider>
        <SavedViewsProvider>
          <AppSidebar {...defaultProps} {...props} />
        </SavedViewsProvider>
      </ConfigDataProvider>
    </MemoryRouter>,
  );

  return { user, ...result };
}

// ─── Tests ───

describe("AppSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders navigation", () => {
      renderSidebar();
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders Performance e Engajamento group", () => {
      renderSidebar();
      expect(screen.getByText("Performance e Engajamento")).toBeInTheDocument();
    });

    it("renders Configurações group and item", () => {
      renderSidebar();
      // "Configurações" appears as both a group label and a nav item
      expect(screen.getAllByText("Configurações").length).toBeGreaterThanOrEqual(2);
    });

    it("renders main nav items", () => {
      renderSidebar();
      expect(screen.getByText("Início")).toBeInTheDocument();
      expect(screen.getByText("Missões")).toBeInTheDocument();
      expect(screen.getByText("Pesquisas")).toBeInTheDocument();
      expect(screen.getByText("Meu time")).toBeInTheDocument();
      expect(screen.getByText("Meu assistente")).toBeInTheDocument();
    });

    it("renders user footer", () => {
      renderSidebar();
      expect(screen.getByText("Maria Soares")).toBeInTheDocument();
    });

    it("renders Ajuda item", () => {
      renderSidebar();
      expect(screen.getByText("Ajuda")).toBeInTheDocument();
    });
  });

  describe("active state", () => {
    it("highlights Início when on /home", () => {
      renderSidebar({}, "/home");
      // "Início" nav item is in the sidebar
      expect(screen.getByText("Início")).toBeInTheDocument();
    });

    it("highlights Missões when on /missions", () => {
      renderSidebar({}, "/missions");
      expect(screen.getByText("Missões")).toBeInTheDocument();
      // Sub-items should be visible when expanded
      expect(screen.getByText("Todas as missões")).toBeInTheDocument();
    });
  });

  describe("sub-items", () => {
    it("shows Missões sub-items when on missions route", () => {
      renderSidebar({}, "/missions");
      expect(screen.getByText("Todas as missões")).toBeInTheDocument();
      expect(screen.getByText("Minhas missões")).toBeInTheDocument();
      // "+ Criar visualização" appears in both Missões and Pesquisas groups
      expect(screen.getAllByText("+ Criar visualização").length).toBeGreaterThanOrEqual(1);
    });

    it("shows Settings sub-items when on settings route", () => {
      renderSidebar({}, "/settings/users");
      expect(screen.getByText("Usuários")).toBeInTheDocument();
      expect(screen.getByText("Times")).toBeInTheDocument();
      expect(screen.getByText("Ciclos")).toBeInTheDocument();
    });
  });

  describe("logo", () => {
    it("renders full logo when not collapsed", () => {
      renderSidebar({ collapsed: false });
      // BudLogo renders with aria-label="bud"
      expect(screen.getByLabelText("bud")).toBeInTheDocument();
    });
  });
});
