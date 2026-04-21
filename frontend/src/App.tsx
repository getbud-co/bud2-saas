import { useState, useEffect } from "react";
import { Toaster, LoadingScreen } from "@getbud-co/buds";
import { clearStaleLocalStorage } from "@/lib/seed-version";
import { AuthProvider } from "@/contexts/AuthContext";
import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import { AppRoutes } from "./routes";

// Clear stale localStorage on app boot when seed data changes
clearStaleLocalStorage();

export function App() {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (booting) return <LoadingScreen />;

  return (
    <AuthProvider>
      <ConfigDataProvider>
        <ActivityDataProvider>
          <PeopleDataProvider>
            <MissionsDataProvider>
              <SurveysDataProvider>
                <SettingsDataProvider>
                  <IntegrationsDataProvider>
                    <ConversationsProvider>
                      <AppRoutes />
                      <Toaster />
                    </ConversationsProvider>
                  </IntegrationsDataProvider>
                </SettingsDataProvider>
              </SurveysDataProvider>
            </MissionsDataProvider>
          </PeopleDataProvider>
        </ActivityDataProvider>
      </ConfigDataProvider>
    </AuthProvider>
  );
}
