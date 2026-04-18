import { Routes, Route, Navigate } from "react-router-dom";
import { TeamOverviewModule } from "./modules/TeamOverviewModule";
import { TeamOrgChartModule } from "./modules/TeamOrgChartModule";

export function MyTeamPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="overview"   element={<TeamOverviewModule />} />
      <Route path="org-chart"  element={<TeamOrgChartModule />} />
    </Routes>
  );
}
