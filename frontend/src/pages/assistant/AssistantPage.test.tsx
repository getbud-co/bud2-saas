/**
 * Tests for AssistantPage
 *
 * A página principal do "Meu assistente" que usa sub-rotas:
 * /assistant/chat, /assistant/customize, /assistant/company
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render } from "@testing-library/react";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { SavedViewsProvider } from "@/contexts/SavedViewsContext";
import { AssistantPage } from "./AssistantPage";

function renderAtRoute(route: string) {
  return render(
    <ConfigDataProvider>
      <ActivityDataProvider>
        <PeopleDataProvider>
          <MissionsDataProvider>
            <SurveysDataProvider>
              <SettingsDataProvider>
                <IntegrationsDataProvider>
                  <ConversationsProvider>
                    <SavedViewsProvider>
                      <MemoryRouter initialEntries={[route]}>
                        <Routes>
                          <Route path="assistant/*" element={<AssistantPage />} />
                        </Routes>
                      </MemoryRouter>
                    </SavedViewsProvider>
                  </ConversationsProvider>
                </IntegrationsDataProvider>
              </SettingsDataProvider>
            </SurveysDataProvider>
          </MissionsDataProvider>
        </PeopleDataProvider>
      </ActivityDataProvider>
    </ConfigDataProvider>,
  );
}

describe("AssistantPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("sub-rotas", () => {
    it("/assistant redireciona para /assistant/chat", () => {
      renderAtRoute("/assistant");
      expect(screen.getByText("Meu assistente")).toBeInTheDocument();
    });

    it("/assistant/chat renderiza a página de conversas", () => {
      renderAtRoute("/assistant/chat");
      expect(screen.getByText("Meu assistente")).toBeInTheDocument();
      const buttons = screen.getAllByRole("button", { name: /nova conversa/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it("/assistant/customize renderiza a página de personalização", () => {
      renderAtRoute("/assistant/customize");
      expect(screen.getByText("Personalizar")).toBeInTheDocument();
      expect(screen.getByText("Tom de voz")).toBeInTheDocument();
    });

    it("/assistant/company renderiza as configurações da empresa", () => {
      renderAtRoute("/assistant/company");
      expect(screen.getByText("Empresa")).toBeInTheDocument();
    });
  });
});
