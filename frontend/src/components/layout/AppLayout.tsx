import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AiAssistant } from "@getbud-co/buds";
import type { MissionItem } from "@getbud-co/buds";
import { AppSidebar } from "./AppSidebar";
import { SidebarSkeleton } from "./SidebarSkeleton";
import { AssistantContext } from "@/contexts/AssistantContext";
import { SidebarContext } from "@/contexts/SidebarContext";
import { SavedViewsProvider } from "@/contexts/SavedViewsContext";
import { useMissionsData } from "@/contexts/MissionsDataContext";
import { useSurveysData } from "@/contexts/SurveysDataContext";
import styles from "./AppLayout.module.css";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= breakpoint,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

export function AppLayout() {
  const location = useLocation();
  const { missions } = useMissionsData();
  const { surveys } = useSurveysData();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSidebarReady(true), 400);
    return () => clearTimeout(timer);
  }, []);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);

  const toggleAssistant = useCallback(() => {
    setAssistantOpen((prev) => !prev);
  }, []);

  const assistantCtx = useMemo(
    () => ({ open: assistantOpen, toggle: toggleAssistant }),
    [assistantOpen, toggleAssistant],
  );

  const sidebarCtx = useMemo(
    () => ({ isMobile, openSidebar: () => setSidebarOpen(true) }),
    [isMobile],
  );

  const assistantMissions = useMemo<MissionItem[]>(() => {
    const missionItems = missions.map((mission) => ({
      id: mission.id,
      label: mission.title,
    }));
    const surveyItems = surveys
      .filter((survey) => survey.status === "active" || survey.status === "scheduled")
      .map((survey) => ({
        id: `survey-${survey.id}`,
        label: survey.name,
      }));
    return [...missionItems, ...surveyItems];
  }, [missions, surveys]);

  // Close sidebar on mobile when navigating
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false);
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <SavedViewsProvider>
    <SidebarContext.Provider value={sidebarCtx}>
    <AssistantContext.Provider value={assistantCtx}>
      <div
        className={styles.layout}
        data-sidebar-collapsed={(!isMobile && collapsed) || undefined}
      >
        {sidebarReady ? (
          <AppSidebar
            collapsed={isMobile ? false : collapsed}
            onToggleCollapse={() => setCollapsed((prev) => !prev)}
            mobileOpen={isMobile ? sidebarOpen : undefined}
            onMobileClose={isMobile ? () => setSidebarOpen(false) : undefined}
          />
        ) : (
          !isMobile && <SidebarSkeleton />
        )}
        <main ref={mainRef} className={styles.main} data-scroll-region>
          <Outlet />
        </main>

        <aside className={`${styles.assistant} ${assistantOpen ? styles.assistantOpen : ""}`}>
          <AiAssistant
            title="Assistente de IA"
            heading="Como posso ajudá-lo hoje?"
            onClose={() => setAssistantOpen(false)}
            allowUpload
            missions={assistantMissions}
            selectedMissions={selectedMissions}
            onMissionsChange={setSelectedMissions}
            onMessage={async () =>
              "Desculpe, ainda estou em desenvolvimento. Em breve poderei ajudá-lo!"
            }
          />
        </aside>
      </div>
    </AssistantContext.Provider>
    </SidebarContext.Provider>
    </SavedViewsProvider>
  );
}
