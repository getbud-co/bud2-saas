import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button } from "@getbud-co/buds";
import { CheckCircle, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useSurveysData } from "@/contexts/SurveysDataContext";
import { SurveyRenderer } from "../components/SurveyRenderer";
import { BudLogo } from "@/components/BudLogo";
import styles from "./SurveyPreviewPage.module.css";

/**
 * Preview page for a survey — standalone layout (no sidebar).
 * Shows the survey exactly as a respondent would see it,
 * with a warning banner and interactive fields (no real submission).
 */
export function SurveyPreviewPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const { getRendererDataBySurveyId } = useSurveysData();
  const pageRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);

  const surveyData = surveyId
    ? getRendererDataBySurveyId(surveyId)
    : null;

  if (!surveyData) {
    return (
      <div className={styles.page}>
        <Alert variant="error" title="Pesquisa não encontrada">
          Não foi possível carregar os dados da pesquisa
          {surveyId ? ` (ID: ${surveyId})` : ""}.
        </Alert>
      </div>
    );
  }

  function handleRestart() {
    setSubmitted(false);
    requestAnimationFrame(() => {
      pageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (submitted) {
    return (
      <div ref={pageRef} className={styles.thankYouContainer}>
        <div className={styles.thankYouCard}>
          <div className={styles.thankYouIcon}>
            <CheckCircle size={64} color="var(--color-green-500)" />
          </div>
          <h1 className={styles.thankYouTitle}>Obrigado!</h1>
          <p className={styles.thankYouText}>
            Sua resposta à pesquisa <strong>{surveyData.name}</strong> foi enviada com sucesso.
          </p>
          {surveyData.isAnonymous && (
            <p className={styles.thankYouAnonymous}>
              Esta pesquisa é anônima — suas respostas não serão associadas à sua identidade.
            </p>
          )}
          <p className={styles.thankYouHint}>Você já pode fechar esta janela com segurança.</p>
          <div className={styles.thankYouLogo}>
            <BudLogo height={24} color="var(--color-neutral-300)" />
          </div>
          <Alert variant="warning" title="Modo de pré-visualização">
            Nenhuma resposta foi salva. Esta é apenas uma simulação.
          </Alert>
          <Button
            variant="secondary"
            size="md"
            leftIcon={ArrowCounterClockwise}
            onClick={handleRestart}
          >
            Reiniciar preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className={styles.page}>
      <SurveyRenderer
        survey={surveyData}
        mode="preview"
        onSubmit={() => setSubmitted(true)}
      />
    </div>
  );
}
