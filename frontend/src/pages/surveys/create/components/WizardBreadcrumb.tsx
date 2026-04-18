import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumb } from "@getbud-co/buds";
import type { WizardStep } from "@/types/survey";
import { useWizard, clearWizardState } from "../SurveyWizardContext";
import { needsPeerAssignment } from "../wizardReducer";
import styles from "./WizardBreadcrumb.module.css";

/** All step labels indexed by internal step number */
const ALL_STEPS: { step: number; label: string }[] = [
  { step: 0, label: "Escolher template" },
  { step: 1, label: "Participantes" },
  { step: 2, label: "Atribuição de pares" },
  { step: 3, label: "Questionário" },
  { step: 4, label: "Fluxo de aplicação" },
  { step: 5, label: "Resumo" },
];

export function WizardBreadcrumb() {
  const { state, dispatch } = useWizard();
  const navigate = useNavigate();
  const showPeers = needsPeerAssignment(state);

  const visibleSteps = useMemo(
    () => (showPeers ? ALL_STEPS : ALL_STEPS.filter((s) => s.step !== 2)),
    [showPeers],
  );

  // Map current internal step to visible breadcrumb index
  const currentVisibleIndex = visibleSteps.findIndex((s) => s.step === state.step);

  const items = visibleSteps.map((s, i) => ({
    label: s.label,
    onClick:
      s.step === 0
        ? () => { clearWizardState(); navigate("/surveys"); }
        : i < currentVisibleIndex
          ? () => dispatch({ type: "SET_STEP", payload: s.step as WizardStep })
          : undefined,
  }));

  return (
    <div className={styles.breadcrumbWrapper}>
      <Breadcrumb items={items} current={currentVisibleIndex} />
    </div>
  );
}
