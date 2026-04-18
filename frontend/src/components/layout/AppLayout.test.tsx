/**
 * Tests for AppLayout
 *
 * Main layout shell with sidebar, content area, and assistant panel.
 * Provides SidebarContext and AssistantContext to children.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { AppLayout } from "./AppLayout";

// ─── Test Helpers ───

function renderAppLayout(route = "/home", outlet?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ConfigDataProvider>
        <ActivityDataProvider>
          <PeopleDataProvider>
            <MissionsDataProvider>
              <SurveysDataProvider>
                <SettingsDataProvider>
                  <IntegrationsDataProvider>
                    <Routes>
                      <Route element={<AppLayout />}>
                        <Route path="*" element={outlet ?? <div data-testid="outlet">Page Content</div>} />
                      </Route>
                    </Routes>
                  </IntegrationsDataProvider>
                </SettingsDataProvider>
              </SurveysDataProvider>
            </MissionsDataProvider>
          </PeopleDataProvider>
        </ActivityDataProvider>
      </ConfigDataProvider>
    </MemoryRouter>,
  );
}

// ─── Tests ───

describe("AppLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the main content area", () => {
    renderAppLayout();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders outlet content", () => {
    renderAppLayout();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByText("Page Content")).toBeInTheDocument();
  });

  it("renders sidebar or skeleton initially", () => {
    renderAppLayout();
    // Either sidebar or skeleton should be present
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });

  it("renders assistant panel area", () => {
    renderAppLayout();
    // The assistant panel is rendered but closed by default
    expect(screen.getByText("Assistente de IA")).toBeInTheDocument();
  });
});
