import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { LoadingDemo } from "@/pages/auth/LoadingDemo";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { HomePageSkeleton } from "@/pages/home/components/HomeSkeletons";
import { MissionsPageSkeleton } from "@/pages/missions/components/MissionsSkeleton";
import { SurveysPageSkeleton } from "@/pages/surveys/components/SurveysSkeleton";

// Lazy-loaded pages
const HomePage = lazy(() => import("@/pages/home/HomePage").then((m) => ({ default: m.HomePage })));
const EngagementDetailPage = lazy(() => import("@/pages/home/EngagementDetailPage").then((m) => ({ default: m.EngagementDetailPage })));
const ActivitiesDetailPage = lazy(() => import("@/pages/home/ActivitiesDetailPage").then((m) => ({ default: m.ActivitiesDetailPage })));
const SurveysPage = lazy(() => import("@/pages/surveys/SurveysPage").then((m) => ({ default: m.SurveysPage })));
const SurveyWizardPage = lazy(() => import("@/pages/surveys/create/SurveyWizardPage").then((m) => ({ default: m.SurveyWizardPage })));
const SurveyResultsPage = lazy(() => import("@/pages/surveys/results/SurveyResultsPage").then((m) => ({ default: m.SurveyResultsPage })));
const SurveyPreviewPage = lazy(() => import("@/pages/surveys/preview/SurveyPreviewPage").then((m) => ({ default: m.SurveyPreviewPage })));
const SurveyRespondLayout = lazy(() => import("@/pages/surveys/respond/SurveyRespondLayout").then((m) => ({ default: m.SurveyRespondLayout })));
const SurveyRespondPage = lazy(() => import("@/pages/surveys/respond/SurveyRespondPage").then((m) => ({ default: m.SurveyRespondPage })));
const MyTeamPage = lazy(() => import("@/pages/my-team/MyTeamPage").then((m) => ({ default: m.MyTeamPage })));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const MissionsPage = lazy(() => import("@/pages/missions/MissionsPage").then((m) => ({ default: m.MissionsPage })));
const MyMissionsPage = lazy(() => import("@/pages/missions/MissionsPage").then((m) => ({ default: m.MyMissionsPage })));
const AnnualMissionsPage = lazy(() => import("@/pages/missions/MissionsPage").then((m) => ({ default: m.AnnualMissionsPage })));
const QuarterlyMissionsPage = lazy(() => import("@/pages/missions/MissionsPage").then((m) => ({ default: m.QuarterlyMissionsPage })));
const MissionDetailPage = lazy(() => import("@/pages/missions/MissionsPage").then((m) => ({ default: m.MissionDetailPage })));
const AssistantPage = lazy(() => import("@/pages/assistant/AssistantPage").then((m) => ({ default: m.AssistantPage })));
const AccountPage = lazy(() => import("@/pages/account/AccountPage").then((m) => ({ default: m.AccountPage })));

function SuspenseOutlet({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/login" replace />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="loading-demo" element={<LoadingDemo />} />

      {/* Standalone survey layout (no sidebar) — preview and respond */}
      <Route element={<Suspense fallback={<PageSkeleton />}><SurveyRespondLayout /></Suspense>}>
        <Route path="surveys/:surveyId/preview" element={<SuspenseOutlet><SurveyPreviewPage /></SuspenseOutlet>} />
        <Route path="surveys/:surveyId/respond" element={<SuspenseOutlet><SurveyRespondPage /></SuspenseOutlet>} />
      </Route>

      {/* Main app layout */}
      <Route element={<AppLayout />}>
        <Route path="home" element={<Suspense fallback={<HomePageSkeleton />}><HomePage /></Suspense>} />
        <Route path="home/engagement" element={<SuspenseOutlet><EngagementDetailPage /></SuspenseOutlet>} />
        <Route path="home/activities" element={<SuspenseOutlet><ActivitiesDetailPage /></SuspenseOutlet>} />
        <Route path="assistant/*" element={<SuspenseOutlet><AssistantPage /></SuspenseOutlet>} />
        <Route path="missions/mine/*" element={<Suspense fallback={<MissionsPageSkeleton />}><MyMissionsPage /></Suspense>} />
        <Route path="missions/annual" element={<SuspenseOutlet><AnnualMissionsPage /></SuspenseOutlet>} />
        <Route path="missions/quarterly" element={<SuspenseOutlet><QuarterlyMissionsPage /></SuspenseOutlet>} />
        <Route path="missions/:missionId" element={<SuspenseOutlet><MissionDetailPage /></SuspenseOutlet>} />
        <Route path="missions/*" element={<Suspense fallback={<MissionsPageSkeleton />}><MissionsPage /></Suspense>} />
        <Route path="surveys/new/:step?" element={<SuspenseOutlet><SurveyWizardPage /></SuspenseOutlet>} />
        <Route path="surveys/:surveyId/results" element={<SuspenseOutlet><SurveyResultsPage /></SuspenseOutlet>} />
        <Route path="surveys/*" element={<Suspense fallback={<SurveysPageSkeleton />}><SurveysPage /></Suspense>} />
        <Route path="my-team/*" element={<SuspenseOutlet><MyTeamPage /></SuspenseOutlet>} />
        <Route path="account" element={<SuspenseOutlet><AccountPage /></SuspenseOutlet>} />
        <Route path="settings/*" element={<SuspenseOutlet><SettingsPage /></SuspenseOutlet>} />
        {/* Redirect legacy /people routes */}
        <Route path="people/*" element={<Navigate to="/my-team" replace />} />
      </Route>
    </Routes>
  );
}
