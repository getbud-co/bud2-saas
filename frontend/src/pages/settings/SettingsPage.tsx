import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { TagsModule } from "./modules/TagsModule";
import { CyclesModule } from "./modules/CyclesModule";
import { IntegrationsModule } from "./modules/IntegrationsModule";
import { RolesModule } from "./modules/RolesModule";
import { CompanyModule } from "./modules/CompanyModule";
import { SurveyTemplatesModule } from "./modules/SurveyTemplatesModule";
import { UsersModule } from "./modules/UsersModule";
import { TeamsModule } from "./modules/TeamsModule";
import { OrgStructureModule } from "./modules/OrgStructureModule";
import styles from "./SettingsPage.module.css";

const PAGE_TITLES: Record<string, string> = {
  company:            "Dados da empresa",
  users:              "Usuários",
  teams:              "Times",
  "org-structure":    "Estrutura organizacional",
  tags:               "Tags e organizadores",
  cycles:             "Ciclos e períodos",
  "survey-templates": "Templates de pesquisa",
  integrations:       "Integrações",
  roles:              "Tipos de usuário",
};

export function SettingsPage() {
  const location = useLocation();
  const segment = location.pathname.split("/").pop() ?? "";
  const title = PAGE_TITLES[segment] ?? "Configurações";

  return (
    <div className={styles.page}>
      <PageHeader title={title} />

      <div className={styles.content}>
        <Routes>
          <Route index element={<Navigate to="company" replace />} />
          <Route path="company"          element={<CompanyModule />} />
          <Route path="users"            element={<UsersModule />} />
          <Route path="teams"            element={<TeamsModule />} />
          <Route path="org-structure"    element={<OrgStructureModule />} />
          <Route path="tags"             element={<TagsModule />} />
          <Route path="cycles"           element={<CyclesModule />} />
          <Route path="survey-templates" element={<SurveyTemplatesModule />} />
          <Route path="integrations"     element={<IntegrationsModule />} />
          <Route path="roles"            element={<RolesModule />} />
        </Routes>
      </div>
    </div>
  );
}
