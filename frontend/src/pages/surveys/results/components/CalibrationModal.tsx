import { useState, useMemo, type ChangeEvent } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Textarea,
  Alert,
  Badge,
  AiAssistant,
  AssistantButton,
} from "@getbud-co/buds";
import { FloppyDisk } from "@phosphor-icons/react";
import type { CalibrationParticipant, CalibrationQuestionScore } from "../types";
import styles from "./CalibrationModal.module.css";

/* ——— 9-Box mapping ——— */

type PerfLevel = "baixo" | "médio" | "alto";
type PotLevel = "baixo" | "médio" | "alto";

/** 9-box label by [potential][performance] */
const NINE_BOX_LABELS: Record<PotLevel, Record<PerfLevel, { label: string; color: "error" | "warning" | "caramel" | "success" | "neutral" }>> = {
  alto: {
    baixo:  { label: "Enigma",           color: "warning" },
    médio:  { label: "Alto potencial",   color: "success" },
    alto:   { label: "Estrela",          color: "success" },
  },
  médio: {
    baixo:  { label: "Questionável",     color: "error" },
    médio:  { label: "Mantenedor",       color: "caramel" },
    alto:   { label: "Forte desempenho", color: "success" },
  },
  baixo: {
    baixo:  { label: "Insuficiente",     color: "error" },
    médio:  { label: "Eficaz",           color: "caramel" },
    alto:   { label: "Comprometido",     color: "warning" },
  },
};

/** Derive performance level from numeric score (1-5 scale) */
function derivePerformanceLevel(score: number): PerfLevel {
  if (score >= 3.7) return "alto";
  if (score >= 2.5) return "médio";
  return "baixo";
}

const PERF_LEVEL_LABELS: Record<PerfLevel, string> = {
  baixo: "Baixo",
  médio: "Médio",
  alto: "Alto",
};

/* ——— Score gauge status ——— */

function getScoreStatusColor(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.75) return "var(--color-success-600)";
  if (ratio >= 0.5) return "var(--color-warning-600)";
  return "var(--color-error-600)";
}

/** Background color for score chips in the comparison table */
function getScoreChipBg(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.75) return "var(--color-success-100)";
  if (ratio >= 0.5) return "var(--color-warning-100)";
  return "var(--color-error-100)";
}

/* ——— Helpers ——— */

/** Pre-fill calibrated score from existing scores */
function computePreFill(q: CalibrationQuestionScore): number {
  const scores: { value: number; weight: number }[] = [];
  if (q.managerScore != null) scores.push({ value: q.managerScore, weight: 0.5 });
  if (q.score360 != null) scores.push({ value: q.score360, weight: 0.3 });
  if (q.selfScore != null) scores.push({ value: q.selfScore, weight: 0.2 });

  if (scores.length === 0) return Math.round(((q.scaleMin + q.scaleMax) / 2) * 10) / 10;

  // Normalize weights
  const totalWeight = scores.reduce((s, v) => s + v.weight, 0);
  const weighted = scores.reduce((s, v) => s + v.value * (v.weight / totalWeight), 0);
  return Math.round(Math.max(q.scaleMin, Math.min(q.scaleMax, weighted)) * 10) / 10;
}

/** Compute calibrated score for a dimension (average, normalized to 1-5) */
function computeDimensionScore(
  scores: Map<string, number>,
  questions: CalibrationQuestionScore[],
  dimension?: "performance" | "potential",
): number | null {
  const filtered = dimension ? questions.filter(q => q.dimension === dimension) : questions;
  const numericEntries: { calibrated: number; scaleMin: number; scaleMax: number }[] = [];
  for (const q of filtered) {
    const val = scores.get(q.questionId);
    if (val != null) {
      numericEntries.push({ calibrated: val, scaleMin: q.scaleMin, scaleMax: q.scaleMax });
    }
  }
  if (numericEntries.length === 0) return null;

  const sum = numericEntries.reduce((s, e) => {
    const normalized = ((e.calibrated - e.scaleMin) / (e.scaleMax - e.scaleMin)) * 4 + 1;
    return s + normalized;
  }, 0);
  return Math.round((sum / numericEntries.length) * 10) / 10;
}

/** Derive potential level from numeric score */
function derivePotentialLevel(score: number): PotLevel {
  if (score >= 3.7) return "alto";
  if (score >= 2.5) return "médio";
  return "baixo";
}

/* ——— Component ——— */

export interface CalibrationSaveData {
  scores: { questionId: string; calibratedScore: number }[];
  calibratedFinalScore: number;
  performance: PerfLevel;
  potential: PotLevel;
  classification: string;
  justification: string;
}

interface CalibrationModalProps {
  participant: CalibrationParticipant;
  /** Perguntas da pesquisa com scores por perspectiva */
  questions: CalibrationQuestionScore[];
  open: boolean;
  onClose: () => void;
  onSave: (participantId: string, data: CalibrationSaveData) => void;
}

export function CalibrationModal({ participant, questions, open, onClose, onSave }: CalibrationModalProps) {
  /* ——— State ——— */
  const [justification, setJustification] = useState(participant.calibrationJustification ?? "");
  const [showAssistant, setShowAssistant] = useState(false);

  // Per-question calibrated scores
  const [calibratedScores, setCalibratedScores] = useState<Map<string, number>>(() => {
    const initial = new Map<string, number>();
    for (const q of questions) {
      const existing = q.calibratedScore;
      initial.set(q.questionId, existing ?? computePreFill(q));
    }
    return initial;
  });

  function handleScoreChange(questionId: string, value: string, scaleMin: number, scaleMax: number) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    const clamped = Math.max(scaleMin, Math.min(scaleMax, Math.round(num * 10) / 10));
    setCalibratedScores(prev => {
      const next = new Map(prev);
      next.set(questionId, clamped);
      return next;
    });
  }

  /* ——— Computed values ——— */
  const perfScore = useMemo(
    () => computeDimensionScore(calibratedScores, questions, "performance"),
    [calibratedScores, questions],
  );

  const potScore = useMemo(
    () => computeDimensionScore(calibratedScores, questions, "potential"),
    [calibratedScores, questions],
  );

  const performanceLevel = useMemo(
    () => (perfScore != null ? derivePerformanceLevel(perfScore) : "médio" as PerfLevel),
    [perfScore],
  );

  const potentialLevel = useMemo(
    () => (potScore != null ? derivePotentialLevel(potScore) : "médio" as PotLevel),
    [potScore],
  );

  const nineBoxResult = NINE_BOX_LABELS[potentialLevel][performanceLevel];

  // Split questions by dimension
  const perfQuestions = useMemo(() => questions.filter(q => q.dimension === "performance"), [questions]);
  const potQuestions = useMemo(() => questions.filter(q => q.dimension === "potential"), [questions]);

  /* ——— Save ——— */
  function handleSave() {
    if (perfScore == null) return;

    const scoreEntries: CalibrationSaveData["scores"] = [];
    for (const q of questions) {
      const val = calibratedScores.get(q.questionId);
      if (val != null) {
        scoreEntries.push({ questionId: q.questionId, calibratedScore: val });
      }
    }

    onSave(participant.id, {
      scores: scoreEntries,
      calibratedFinalScore: perfScore,
      performance: performanceLevel,
      potential: potentialLevel,
      classification: nineBoxResult.label,
      justification,
    });
  }

  const hasQuestions = questions.length > 0;
  const has360 = questions.some(q => q.score360 != null);

  /** Render a score table section for a dimension */
  function renderScoreSection(
    title: string,
    dimensionQuestions: CalibrationQuestionScore[],
    dimensionScore: number | null,
    dimensionLabel: string,
  ) {
    if (dimensionQuestions.length === 0) return null;

    // Aggregate reference scores for the footer
    const avgSelf = dimensionQuestions.reduce((s, q) => s + (q.selfScore ?? 0), 0) / dimensionQuestions.length;
    const avgManager = dimensionQuestions.reduce((s, q) => s + (q.managerScore ?? 0), 0) / dimensionQuestions.length;
    const avg360Values = dimensionQuestions.filter(q => q.score360 != null).map(q => q.score360!);
    const avg360 = avg360Values.length > 0 ? avg360Values.reduce((s, v) => s + v, 0) / avg360Values.length : null;

    return (
      <div className={styles.dimensionSection}>
        <span className={styles.dimensionTitle}>{title}</span>
        <div className={`${styles.scoreTable} ${!has360 ? styles.scoreTableNo360 : ""}`}>
          {/* Header */}
          <div className={styles.scoreTableHeader}>
            <span className={styles.scoreTableColQuestion}>Competência</span>
            <span className={styles.scoreTableColScore}>Auto</span>
            <span className={styles.scoreTableColScore}>Gestor</span>
            {has360 && <span className={styles.scoreTableColScore}>360°</span>}
            <span className={styles.scoreTableColCalibrated}>Calibrada</span>
          </div>

          {/* Rows */}
          {dimensionQuestions.map((q) => {
            const currentScore = calibratedScores.get(q.questionId);
            const preFilledScore = computePreFill(q);
            const hasDeviation = currentScore != null && Math.abs(currentScore - preFilledScore) > 0.3;

            return (
              <div key={q.questionId} className={styles.scoreTableRow}>
                <span className={styles.scoreTableColQuestion} title={q.questionText}>
                  {q.questionText}
                </span>
                <span className={styles.scoreTableColScore}>
                  {q.selfScore != null ? (
                    <span className={styles.scoreChip} style={{ backgroundColor: getScoreChipBg(q.selfScore, q.scaleMax) }}>
                      {q.selfScore.toFixed(1)}
                    </span>
                  ) : "—"}
                </span>
                <span className={styles.scoreTableColScore}>
                  {q.managerScore != null ? (
                    <span className={styles.scoreChip} style={{ backgroundColor: getScoreChipBg(q.managerScore, q.scaleMax) }}>
                      {q.managerScore.toFixed(1)}
                    </span>
                  ) : "—"}
                </span>
                {has360 && (
                  <span className={styles.scoreTableColScore}>
                    {q.score360 != null ? (
                      <span className={styles.scoreChip} style={{ backgroundColor: getScoreChipBg(q.score360, q.scaleMax) }}>
                        {q.score360.toFixed(1)}
                      </span>
                    ) : "—"}
                  </span>
                )}
                <span className={styles.scoreTableColCalibrated}>
                  <input
                    className={`${styles.calibratedInput} ${hasDeviation ? styles.calibratedInputDeviated : ""}`}
                    type="number"
                    step="0.1"
                    min={q.scaleMin}
                    max={q.scaleMax}
                    value={currentScore?.toString() ?? ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleScoreChange(q.questionId, e.target.value, q.scaleMin, q.scaleMax)
                    }
                    placeholder="—"
                  />
                </span>
              </div>
            );
          })}

          {/* Footer */}
          <div className={styles.scoreTableFooter}>
            <span className={styles.scoreTableColQuestion}>
              <strong>{dimensionLabel}</strong>
            </span>
            <span className={styles.scoreTableColScore}>
              <span className={styles.scoreChip} style={{ backgroundColor: getScoreChipBg(avgSelf, 5) }}>
                {avgSelf.toFixed(1)}
              </span>
            </span>
            <span className={styles.scoreTableColScore}>
              <span className={styles.scoreChip} style={{ backgroundColor: getScoreChipBg(avgManager, 5) }}>
                {avgManager.toFixed(1)}
              </span>
            </span>
            {has360 && (
              <span className={styles.scoreTableColScore}>
                {avg360 != null ? (
                  <span className={styles.scoreChip} style={{ backgroundColor: getScoreChipBg(avg360, 5) }}>
                    {avg360.toFixed(1)}
                  </span>
                ) : "—"}
              </span>
            )}
            <span className={styles.scoreTableColCalibrated}>
              <span className={`${styles.finalScoreValue} ${dimensionScore != null ? styles.finalScoreActive : ""}`}>
                {dimensionScore != null ? dimensionScore.toFixed(1) : "—"}
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      sidePanel={
        showAssistant ? (
          <AiAssistant
            title="Assistente de calibragem"
            heading={`Tenha ajuda na calibragem de '${participant.name}'`}
            suggestions={[
              "Resumo de desempenho e OKRs",
              "Comparar autoavaliação vs gestor",
              "Pontos de desenvolvimento",
            ]}
            onClose={() => setShowAssistant(false)}
            allowUpload
            onMessage={async () =>
              "Desculpe, ainda estou em desenvolvimento. Em breve poderei ajudá-lo a analisar os resultados e calibrar notas!"
            }
          />
        ) : null
      }
    >
      <ModalHeader title={`Calibragem — ${participant.name}`} onClose={onClose}>
        <Badge color={participant.status === "calibrado" ? "success" : "warning"} size="sm">
          {participant.status === "calibrado" ? "Calibrado" : "Pendente"}
        </Badge>
        <AssistantButton
          active={showAssistant}
          onClick={() => setShowAssistant((v) => !v)}
        />
      </ModalHeader>
      <ModalBody>
        <div className={styles.modalContent}>
          {/* 9-Box result (live preview) */}
          <div className={styles.nineBoxCard}>
            <div className={styles.nineBoxCardCenter}>
              <Badge color={nineBoxResult.color} size="lg">{nineBoxResult.label}</Badge>
              <span className={styles.nineBoxCardSubtitle}>Posição no 9-Box</span>
            </div>
            <div className={styles.nineBoxCardDivider} />
            <div className={styles.nineBoxCardMetrics}>
              <div className={styles.nineBoxMetric}>
                <span className={styles.nineBoxMetricLabel}>Desempenho</span>
                <div className={styles.nineBoxMetricRow}>
                  <span
                    className={styles.nineBoxMetricScore}
                    style={{ color: perfScore != null ? getScoreStatusColor(perfScore, 5) : undefined }}
                  >
                    {perfScore != null ? perfScore.toFixed(1) : "—"}
                  </span>
                  <Badge color="neutral" size="sm">{PERF_LEVEL_LABELS[performanceLevel]}</Badge>
                </div>
              </div>
              <div className={styles.nineBoxMetric}>
                <span className={styles.nineBoxMetricLabel}>Potencial</span>
                <div className={styles.nineBoxMetricRow}>
                  <span
                    className={styles.nineBoxMetricScore}
                    style={{ color: potScore != null ? getScoreStatusColor(potScore, 5) : undefined }}
                  >
                    {potScore != null ? potScore.toFixed(1) : "—"}
                  </span>
                  <Badge color="neutral" size="sm">{PERF_LEVEL_LABELS[potentialLevel]}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Calibration tables by dimension */}
          {hasQuestions ? (
            <div className={styles.questionsSection}>
              {renderScoreSection("Desempenho", perfQuestions, perfScore, "Score desempenho")}
              {renderScoreSection("Potencial e crescimento", potQuestions, potScore, "Score potencial")}
            </div>
          ) : (
            <Alert variant="info" title="Sem perguntas numéricas">
              Esta pesquisa não possui perguntas com escala numérica para calibrar.
            </Alert>
          )}

          {/* Justification */}
          <Textarea
            label="Justificativa"
            value={justification}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setJustification(e.target.value)}
            rows={3}
            placeholder="Descreva a justificativa para esta calibragem..."
          />

          {/* Bias alert */}
          {participant.biasAlert && (
            <Alert variant="warning" title="Alerta de viés detectado pela IA">
              {participant.biasAlert}. Considere revisar os scores antes de finalizar a calibragem.
            </Alert>
          )}

          {/* Support data */}
          <Card padding="sm">
            <CardBody>
              <span className={styles.sectionTitle}>Dados de suporte</span>
              <div className={styles.supportGrid}>
                {participant.okrCompletion != null && (
                  <div className={styles.supportItem}>
                    <span className={styles.supportLabel}>OKRs concluídos</span>
                    <span className={styles.supportValue}>{participant.okrCompletion}%</span>
                  </div>
                )}
                {participant.feedbackCount != null && (
                  <div className={styles.supportItem}>
                    <span className={styles.supportLabel}>Feedbacks recebidos</span>
                    <span className={styles.supportValue}>{participant.feedbackCount}</span>
                  </div>
                )}
                {participant.pulseMean != null && (
                  <div className={styles.supportItem}>
                    <span className={styles.supportLabel}>Pulse médio</span>
                    <span className={styles.supportValue}>{participant.pulseMean.toFixed(1)}</span>
                  </div>
                )}
                {participant.score360 != null && (
                  <div className={styles.supportItem}>
                    <span className={styles.supportLabel}>Score 360°</span>
                    <span className={styles.supportValue}>{participant.score360.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
        <Button
          variant="primary"
          size="md"
          leftIcon={FloppyDisk}
          onClick={handleSave}
          disabled={perfScore == null}
        >
          Salvar calibragem
        </Button>
      </ModalFooter>
    </Modal>
  );
}
