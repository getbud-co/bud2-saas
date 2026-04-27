import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockAuthProvider } from "../../../tests/setup/MockAuthProvider";
import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { MyTeamPage } from "./MyTeamPage";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wrapper with all providers but using a custom MemoryRouter initial entry.
 * AllProviders from test-utils includes its own MemoryRouter so we can't use it here.
 */
function ProvidersWithoutRouter({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MockAuthProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigDataProvider>
          <ActivityDataProvider>
            <PeopleDataProvider>
              <MissionsDataProvider>
                <SurveysDataProvider>
                  <SettingsDataProvider>
                    <IntegrationsDataProvider>
                      {children}
                    </IntegrationsDataProvider>
                  </SettingsDataProvider>
                </SurveysDataProvider>
              </MissionsDataProvider>
            </PeopleDataProvider>
          </ActivityDataProvider>
        </ConfigDataProvider>
      </QueryClientProvider>
    </MockAuthProvider>
  );
}

function renderAtRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProvidersWithoutRouter>
        <Routes>
          <Route path="/my-team/*" element={<MyTeamPage />} />
        </Routes>
      </ProvidersWithoutRouter>
    </MemoryRouter>,
  );
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("MyTeamPage", () => {
  beforeEach(() => localStorage.clear());

  it("renderiza sem erros", () => {
    expect(() => renderAtRoute("/my-team/")).not.toThrow();
  });

  it("redireciona rota index para overview", () => {
    renderAtRoute("/my-team/");
    // Deve redirecionar para /my-team/overview e exibir TeamOverviewModule
    expect(screen.getByText(/Meu time/i)).toBeInTheDocument();
  });

  it("exibe TeamOverviewModule na rota /overview", () => {
    renderAtRoute("/my-team/overview");
    expect(screen.getByText(/Meu time/i)).toBeInTheDocument();
  });

  it("exibe organograma na rota /org-chart", () => {
    renderAtRoute("/my-team/org-chart");
    // TeamOrgChartModule re-exporta OrgChartModule que tem campo de busca
    expect(screen.getByPlaceholderText("Buscar colaborador...")).toBeInTheDocument();
  });

  it("exibe EngagementStatsBar na pagina de overview", () => {
    renderAtRoute("/my-team/overview");
    expect(screen.getAllByText("Performance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Engajamento").length).toBeGreaterThan(0);
  });

  it("exibe tabela de saude do time na pagina de overview", () => {
    renderAtRoute("/my-team/overview");
    expect(screen.getByText("Saúde do Time")).toBeInTheDocument();
  });

  it("exibe campo de busca de colaborador na tabela de overview", () => {
    renderAtRoute("/my-team/overview");
    expect(screen.getByPlaceholderText("Buscar colaborador...")).toBeInTheDocument();
  });

  it("exibe contagem de ativos na rota org-chart", () => {
    renderAtRoute("/my-team/org-chart");
    expect(screen.getByText(/\d+ ativos/)).toBeInTheDocument();
  });
});
