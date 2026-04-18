import { useState, useMemo, useCallback, useRef } from "react";
import { Button, Badge, Alert, Avatar } from "@getbud-co/buds";
import { ArrowLeft, ArrowRight, PaperPlaneTilt, Check } from "@phosphor-icons/react";
import { QuestionField } from "./QuestionField";
import type { WizardQuestion, WizardSection, EvaluationPerspective } from "@/types/survey";
import { PERSPECTIVE_CONFIG, PERSPECTIVE_INSTRUCTION, PERSPECTIVE_RELATION_LABEL } from "../utils/perspectiveConfig";
import styles from "./SurveyRenderer.module.css";

/* ——— Types ——— */

export interface SurveyRendererData {
  name: string;
  description?: string;
  isAnonymous?: boolean;
  sections: WizardSection[];
  questions: WizardQuestion[];
  /** Enabled evaluation perspectives (only for ciclo surveys) */
  enabledPerspectives?: EvaluationPerspective[];
}

/** Context about who is being evaluated — shown as a header card */
export interface EvaluationContext {
  /** Name of the person being evaluated */
  evaluateeName: string;
  /** Initials for the avatar */
  evaluateeInitials: string;
  /** Role/position of the person being evaluated */
  evaluateeRole?: string;
  /** The evaluation perspective */
  perspective: EvaluationPerspective;
}

export interface SurveyRendererProps {
  /** Survey content to render */
  survey: SurveyRendererData;
  /** "preview" shows banner warning, "respond" enables real submission */
  mode: "preview" | "respond";
  /** Called with all answers when form is submitted (respond mode only) */
  onSubmit?: (answers: Record<string, unknown>) => void;
  /** Whether the form is currently submitting */
  submitting?: boolean;
  /** Evaluation context — who is being evaluated (for ciclo surveys) */
  evaluationContext?: EvaluationContext;
}

/* ——— Section grouping ——— */

interface SectionGroup {
  section: WizardSection | null;
  questions: WizardQuestion[];
}

function groupQuestionsBySection(
  sections: WizardSection[],
  questions: WizardQuestion[],
): SectionGroup[] {
  const groups: SectionGroup[] = [];
  const sectionMap = new Map<string | null, WizardQuestion[]>();

  for (const q of questions) {
    const key = q.sectionId;
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    sectionMap.get(key)!.push(q);
  }

  // Ordered sections first
  for (const section of sections) {
    const sectionQuestions = sectionMap.get(section.id) ?? [];
    if (sectionQuestions.length > 0) {
      groups.push({ section, questions: sectionQuestions });
    }
    sectionMap.delete(section.id);
  }

  // Unsectioned questions
  const unsectioned = sectionMap.get(null);
  if (unsectioned && unsectioned.length > 0) {
    groups.push({ section: null, questions: unsectioned });
  }

  return groups;
}

/* ——— Component ——— */

export function SurveyRenderer({
  survey,
  mode,
  onSubmit,
  submitting = false,
  evaluationContext,
}: SurveyRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const perspectives = survey.enabledPerspectives ?? [];
  const hasPerspectives = mode === "preview" && perspectives.length > 0;
  const [activePerspective, setActivePerspective] = useState<EvaluationPerspective>(
    perspectives[0] ?? "self",
  );
  const [activeEvaluateeIndex, setActiveEvaluateeIndex] = useState(0);
  const [completedEvaluatees, setCompletedEvaluatees] = useState<Set<number>>(new Set());

  const activeEvaluatees = hasPerspectives
    ? PERSPECTIVE_CONFIG[activePerspective].previewEvaluatees
    : [];
  const activeEvaluatee = activeEvaluatees[activeEvaluateeIndex] ?? activeEvaluatees[0] ?? null;
  const allEvaluateesCompleted = activeEvaluatees.length > 0
    && completedEvaluatees.size >= activeEvaluatees.length;

  const sectionGroups = useMemo(
    () => groupQuestionsBySection(survey.sections, survey.questions),
    [survey.sections, survey.questions],
  );

  const totalQuestions = survey.questions.length;
  const currentGroup = sectionGroups[currentSectionIndex] ?? null;
  const totalSections = sectionGroups.length;
  const isLastSection = currentSectionIndex >= totalSections - 1;
  const isFirstSection = currentSectionIndex === 0;

  // Count questions before current section for numbering
  const questionOffset = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      offset += sectionGroups[i]?.questions.length ?? 0;
    }
    return offset;
  }, [currentSectionIndex, sectionGroups]);

  // Progress percentage
  const progress =
    totalSections > 0
      ? Math.round(((currentSectionIndex + 1) / totalSections) * 100)
      : 0;

  const handleAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Clear error when user answers
    setErrors((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }, []);

  /** Validate current section's required questions. Returns true if valid. */
  const validateCurrentSection = useCallback((): boolean => {
    if (!currentGroup) return true;

    const newErrors = new Set<string>();
    for (const q of currentGroup.questions) {
      if (!q.isRequired) continue;
      const answer = answers[q.id];
      const isEmpty =
        answer === undefined ||
        answer === null ||
        answer === "" ||
        (Array.isArray(answer) && answer.length === 0);
      if (isEmpty) {
        newErrors.add(q.id);
      }
    }

    if (newErrors.size > 0) {
      setErrors((prev) => new Set([...prev, ...newErrors]));
      // Scroll to first error
      const firstErrorId = currentGroup.questions.find((q) => newErrors.has(q.id))?.id;
      if (firstErrorId) {
        requestAnimationFrame(() => {
          document.getElementById(`question-${firstErrorId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
      }
      return false;
    }
    return true;
  }, [currentGroup, answers]);

  function handleNext() {
    if (!validateCurrentSection()) return;

    if (isLastSection) {
      // Multi-evaluatee preview: mark current as done, advance to next pending
      if (hasPerspectives && activeEvaluatees.length > 1) {
        const newCompleted = new Set(completedEvaluatees);
        newCompleted.add(activeEvaluateeIndex);
        setCompletedEvaluatees(newCompleted);

        // Find next incomplete evaluatee
        const nextPending = activeEvaluatees.findIndex(
          (_, i) => i !== activeEvaluateeIndex && !newCompleted.has(i),
        );

        if (nextPending !== -1) {
          setActiveEvaluateeIndex(nextPending);
          setCurrentSectionIndex(0);
          setAnswers({});
          setErrors(new Set());
          containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        // All done — fall through to onSubmit
      }

      onSubmit?.(answers);
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setCurrentSectionIndex((i) => i + 1);
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePrev() {
    setCurrentSectionIndex((i) => Math.max(0, i - 1));
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (totalQuestions === 0) {
    return (
      <div className={styles.container}>
        <Alert variant="info" title="Sem perguntas">
          Esta pesquisa ainda não possui perguntas.
        </Alert>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.container}>
      {/* Preview banner */}
      {mode === "preview" && (
        <Alert variant="warning" title="Modo de pré-visualização">
          As interações nesta tela são apenas para teste e não salvam respostas reais.
        </Alert>
      )}

      {/* Perspective selector — only in preview for ciclo surveys */}
      {hasPerspectives && (
        <div className={styles.perspectiveSelector}>
          <span className={styles.perspectiveLabel}>Visualizando como:</span>
          <div className={styles.perspectiveChips}>
            {perspectives.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.perspectiveChip} ${activePerspective === p ? styles.perspectiveChipActive : ""}`}
                onClick={() => { setActivePerspective(p); setActiveEvaluateeIndex(0); setCompletedEvaluatees(new Set()); }}
              >
                {PERSPECTIVE_CONFIG[p].viewAsLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation context — who is being evaluated */}
      {hasPerspectives && activeEvaluatee && (
        <>
          {/* Evaluatee list — shows progress across all people */}
          {activeEvaluatees.length > 1 && (
            <div className={styles.evaluateeList}>
              <div className={styles.evaluateeListHeader}>
                <span className={styles.evaluateeListTitle}>
                  Suas avaliações — {PERSPECTIVE_CONFIG[activePerspective].label}
                </span>
                <span className={styles.evaluateeListProgress}>
                  {completedEvaluatees.size} de {activeEvaluatees.length} concluídas
                </span>
              </div>
              <div className={styles.evaluateeListItems}>
                {activeEvaluatees.map((person, i) => {
                  const isDone = completedEvaluatees.has(i);
                  const isCurrent = i === activeEvaluateeIndex && !allEvaluateesCompleted;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.evaluateeItem} ${isCurrent ? styles.evaluateeItemActive : ""} ${isDone ? styles.evaluateeItemDone : ""}`}
                      onClick={() => {
                        setActiveEvaluateeIndex(i);
                        setCurrentSectionIndex(0);
                        setAnswers({});
                        setErrors(new Set());
                      }}
                    >
                      <div className={styles.evaluateeItemAvatar}>
                        {isDone ? (
                          <div className={styles.evaluateeItemCheck}>
                            <Check size={14} weight="bold" />
                          </div>
                        ) : (
                          <Avatar size="sm" initials={person.initials} />
                        )}
                      </div>
                      <div className={styles.evaluateeItemInfo}>
                        <span className={styles.evaluateeItemName}>{person.name}</span>
                        <span className={styles.evaluateeItemRole}>{person.role}</span>
                      </div>
                      {isCurrent && (
                        <Badge color="orange" size="sm">Em andamento</Badge>
                      )}
                      {isDone && (
                        <Badge color="success" size="sm">Concluída</Badge>
                      )}
                      {!isCurrent && !isDone && (
                        <Badge color="neutral" size="sm">Pendente</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current evaluatee card */}
          <div className={styles.evaluationCard}>
            <span className={styles.evaluationCardInstruction}>
              {PERSPECTIVE_CONFIG[activePerspective].instruction}
            </span>
            <Avatar size="xl" initials={activeEvaluatee.initials} />
            <span className={styles.evaluationCardName}>
              {activeEvaluatee.name}
            </span>
            <span className={styles.evaluationCardMeta}>
              <span className={styles.evaluationCardRole}>{activeEvaluatee.role}</span>
              <span className={styles.evaluationCardRelation}>
                {PERSPECTIVE_CONFIG[activePerspective].relationLabel}
              </span>
            </span>
          </div>
        </>
      )}
      {!hasPerspectives && evaluationContext && (
        <div className={styles.evaluationCard}>
          <span className={styles.evaluationCardInstruction}>
            {PERSPECTIVE_INSTRUCTION[evaluationContext.perspective]}
          </span>
          <Avatar size="xl" initials={evaluationContext.evaluateeInitials} />
          <span className={styles.evaluationCardName}>
            {evaluationContext.evaluateeName}
          </span>
          <span className={styles.evaluationCardMeta}>
            {evaluationContext.evaluateeRole && (
              <span className={styles.evaluationCardRole}>{evaluationContext.evaluateeRole}</span>
            )}
            <span className={styles.evaluationCardRelation}>
              {PERSPECTIVE_RELATION_LABEL[evaluationContext.perspective]}
            </span>
          </span>
        </div>
      )}

      {/* Survey header */}
      <div className={styles.surveyHeader}>
        <h1 className={styles.surveyTitle}>
          {survey.name || "Pesquisa sem título"}
        </h1>
        {survey.description && (
          <p className={styles.surveyDescription}>{survey.description}</p>
        )}
        {survey.isAnonymous && (
          <div className={styles.badgeRow}>
            <Badge color="success" size="sm">
              Anônima
            </Badge>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className={styles.progressWrapper}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={styles.progressLabel}>
          {totalSections > 1
            ? `Seção ${currentSectionIndex + 1} de ${totalSections}`
            : `${totalQuestions} perguntas`}
        </span>
      </div>

      {/* Current section */}
      {currentGroup && (
        <div className={styles.sectionBlock}>
          {currentGroup.section && (
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                {currentGroup.section.title}
              </h2>
              {currentGroup.section.description && (
                <p className={styles.sectionDescription}>
                  {currentGroup.section.description}
                </p>
              )}
            </div>
          )}

          <div className={styles.questionsList}>
            {currentGroup.questions.map((q, i) => (
              <QuestionField
                key={q.id}
                question={q}
                index={questionOffset + i}
                total={totalQuestions}
                value={answers[q.id] ?? null}
                onChange={(v) => handleAnswer(q.id, v)}
                error={errors.has(q.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className={styles.navigation}>
        <Button
          variant="secondary"
          size="md"
          leftIcon={ArrowLeft}
          onClick={handlePrev}
          disabled={isFirstSection}
        >
          Anterior
        </Button>
        <Button
          variant="primary"
          size="md"
          rightIcon={isLastSection ? PaperPlaneTilt : ArrowRight}
          onClick={handleNext}
          loading={submitting}
        >
          {isLastSection ? "Enviar respostas" : "Próxima seção"}
        </Button>
      </div>

    </div>
  );
}
