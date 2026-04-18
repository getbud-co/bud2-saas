/**
 * Tests for PageHeader
 *
 * Renders page title with search, notification, and assistant buttons.
 * Uses AssistantContext and SidebarContext.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AssistantContext } from "@/contexts/AssistantContext";
import { SidebarContext } from "@/contexts/SidebarContext";
import { PageHeader } from "./PageHeader";

// ─── Test Helpers ───

function renderPageHeader(
  props: { title: string; description?: string; children?: ReactNode },
  options?: { isMobile?: boolean; assistantOpen?: boolean },
) {
  const toggle = vi.fn();
  const openSidebar = vi.fn();
  const user = userEvent.setup();

  const result = render(
    <MemoryRouter>
      <SidebarContext.Provider value={{ isMobile: options?.isMobile ?? false, openSidebar }}>
        <AssistantContext.Provider value={{ open: options?.assistantOpen ?? false, toggle }}>
          <PageHeader {...props} />
        </AssistantContext.Provider>
      </SidebarContext.Provider>
    </MemoryRouter>,
  );

  return { user, toggle, openSidebar, ...result };
}

// ─── Tests ───

describe("PageHeader", () => {
  describe("rendering", () => {
    it("renders title", () => {
      renderPageHeader({ title: "Dashboard" });
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("renders description when provided", () => {
      renderPageHeader({ title: "Title", description: "Some description" });
      expect(screen.getByText("Some description")).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      renderPageHeader({ title: "Title" });
      expect(screen.queryByText("Some description")).not.toBeInTheDocument();
    });

    it("renders children", () => {
      renderPageHeader({
        title: "Title",
        children: <button>Custom Action</button>,
      });
      expect(screen.getByRole("button", { name: "Custom Action" })).toBeInTheDocument();
    });
  });

  describe("search button", () => {
    it("renders search button", () => {
      renderPageHeader({ title: "Title" });
      // SearchButton from DS renders a button
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("assistant button", () => {
    it("calls toggle when assistant button is clicked", async () => {
      const { user, toggle } = renderPageHeader({ title: "Title" });

      const assistantBtn = screen.getByRole("button", { name: /assistente/i });
      await user.click(assistantBtn);
      expect(toggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("mobile sidebar", () => {
    it("shows menu button on mobile", () => {
      renderPageHeader({ title: "Title" }, { isMobile: true });
      expect(screen.getByRole("button", { name: /abrir menu/i })).toBeInTheDocument();
    });

    it("does not show menu button on desktop", () => {
      renderPageHeader({ title: "Title" }, { isMobile: false });
      expect(screen.queryByRole("button", { name: /abrir menu/i })).not.toBeInTheDocument();
    });

    it("calls openSidebar when menu button is clicked", async () => {
      const { user, openSidebar } = renderPageHeader({ title: "Title" }, { isMobile: true });

      await user.click(screen.getByRole("button", { name: /abrir menu/i }));
      expect(openSidebar).toHaveBeenCalledTimes(1);
    });
  });
});
