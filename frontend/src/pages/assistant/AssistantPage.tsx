import { Routes, Route, Navigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConversationsTab } from "./tabs/ConversationsTab";
import { CustomizeTab } from "./tabs/CustomizeTab";
import { CompanyTab } from "./tabs/CompanyTab";
import styles from "./AssistantPage.module.css";

export function AssistantPage() {
  return (
    <div className={styles.page}>
      <Routes>
        <Route index element={<Navigate to="chat" replace />} />
        <Route path="chat" element={<><PageHeader title="Meu assistente" /><ConversationsTab /></>} />
        <Route path="customize" element={<><PageHeader title="Personalizar" /><CustomizeTab /></>} />
        <Route path="company" element={<><PageHeader title="Empresa" /><CompanyTab /></>} />
      </Routes>
    </div>
  );
}
