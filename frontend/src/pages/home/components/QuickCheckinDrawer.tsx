import { useState, useMemo, useEffect, useRef } from "react";
import {
  DragToCloseDrawer,
  DrawerHeader,
  DrawerBody,
  Input,
  Textarea,
  Button,
  GoalProgressBar,
  Badge,
  Avatar,
  FilterDropdown,
  toast,
} from "@getbud-co/buds";
import {
  ArrowRight,
  Target,
  CaretDown,
  Fire,
} from "@phosphor-icons/react";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { useMissionsData } from "@/contexts/MissionsDataContext";
import { useCheckIns, useCreateCheckIn } from "@/hooks/use-checkins";
import type { KeyResult, Mission, CheckIn, ConfidenceLevel } from "@/types";
import styles from "./QuickCheckinDrawer.module.css";

interface QuickCheckinDrawerProps {
  open: boolean;
  onClose: () => void;
  keyResultId: string | null;
}

interface ConfidenceOption {
  id: ConfidenceLevel;
  label: string;
  description: string;
  color: string;
}

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  { id: "high", label: "Alta", description: "Confiante que vamos atingir", color: "var(--color-green-500)" },
  { id: "medium", label: "Média", description: "Possível, mas com riscos", color: "var(--color-yellow-500)" },
  { id: "low", label: "Baixa", description: "Difícil atingir no prazo", color: "var(--color-red-500)" },
  { id: "barrier", label: "Bloqueado", description: "Há impedimentos críticos", color: "var(--color-red-700)" },
];

function flattenMissions(missions: Mission[]): Mission[] {
  const flat: Mission[] = [];
  for (const m of missions) {
    flat.push(m);
    if (m.children?.length) flat.push(...flattenMissions(m.children));
  }
  return flat;
}

function findKeyResult(missions: Mission[], krId: string): { kr: KeyResult; mission: Mission } | null {
  for (const mission of flattenMissions(missions)) {
    for (const kr of mission.keyResults ?? []) {
      if (kr.id === krId) return { kr, mission };
      if (kr.children?.length) {
        for (const child of kr.children) {
          if (child.id === krId) return { kr: child, mission };
        }
      }
    }
  }
  return null;
}

function getOwnerInitials(owner?: { firstName: string; lastName: string; initials?: string | null } | null): string {
  if (!owner) return "??";
  return owner.initials ?? `${owner.firstName[0]}${owner.lastName[0]}`.toUpperCase();
}

function getOwnerName(owner?: { firstName: string; lastName: string } | null): string {
  if (!owner) return "Não atribuído";
  return `${owner.firstName} ${owner.lastName}`;
}

function formatCheckinDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function getGoalLabel(kr: KeyResult): string {
  const target = kr.targetValue ?? "100";
  const unit = kr.unitLabel ?? "%";
  if (kr.goalType === "reach") return `Atingir ${target}${unit}`;
  if (kr.goalType === "above") return `Manter acima de ${kr.lowThreshold ?? "0"}${unit}`;
  if (kr.goalType === "below") return `Manter abaixo de ${kr.highThreshold ?? "100"}${unit}`;
  return `Meta: ${target}${unit}`;
}

export function QuickCheckinDrawer({ open, onClose, keyResultId }: QuickCheckinDrawerProps) {
  const { missions } = useMissionsData();
  const { currentUserId } = usePeopleData();
  const { data: checkInsData = [] } = useCheckIns({ indicatorId: keyResultId ?? undefined });
  const createCheckInMutation = useCreateCheckIn();

  const match = useMemo(() => {
    if (!keyResultId) return null;
    return findKeyResult(missions, keyResultId);
  }, [missions, keyResultId]);

  const [newValue, setNewValue] = useState("");
  const [note, setNote] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const confidenceBtnRef = useRef<HTMLButtonElement>(null);

  const recentCheckIns = useMemo<CheckIn[]>(() => checkInsData.slice(0, 5), [checkInsData]);

  // Reset form when drawer opens
  useEffect(() => {
    if (open && match) {
      setNewValue("");
      setNote("");
      setConfidence(null);
      setConfidenceOpen(false);
    }
  }, [open, keyResultId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!match) {
    return (
      <DragToCloseDrawer open={open} onClose={onClose} size="md">
        <DrawerHeader title="Check-in" onClose={onClose} />
        <DrawerBody>
          <p>Indicador não encontrado.</p>
        </DrawerBody>
      </DragToCloseDrawer>
    );
  }

  const { kr, mission } = match;
  const currentValue = kr.currentValue;
  const target = Number(kr.targetValue ?? "100") || 100;
  const selectedConfidence = CONFIDENCE_OPTIONS.find((o) => o.id === confidence);

  function handleSubmit() {
    if (!newValue.trim()) {
      toast.error("Informe o novo valor");
      return;
    }
    if (!currentUserId) {
      toast.error("Usuário não identificado");
      return;
    }
    createCheckInMutation.mutate(
      {
        indicatorId: kr.id,
        authorId: currentUserId,
        value: newValue.trim(),
        previousValue: currentValue,
        confidence: confidence ?? "medium",
        note: note.trim() || null,
        mentions: null,
      },
      {
        onSuccess: () => { toast.success("Check-in registrado"); onClose(); },
        onError: () => toast.error("Não foi possível registrar o check-in."),
      },
    );
  }

  return (
    <DragToCloseDrawer open={open} onClose={onClose} size="md" aria-label="Check-in rápido">
      <DrawerHeader
        title={kr.title}
        onClose={onClose}
        afterTitle={
          <div className={styles.missionLabel}>
            <Target size={14} />
            <span>{mission.title}</span>
          </div>
        }
      >
        <Badge color="neutral" size="sm">{kr.periodLabel ?? getGoalLabel(kr)}</Badge>
      </DrawerHeader>

      <DrawerBody>
        <div className={styles.body}>
          {/* Progress */}
          <div className={styles.section}>
            <GoalProgressBar
              label={getGoalLabel(kr)}
              value={kr.progress}
              target={target}
              expected={Number(kr.expectedValue ?? "50") || undefined}
              formattedValue={`${kr.progress}%`}
            />
          </div>

          {/* Responsável */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Responsável</span>
            <div className={styles.ownerRow}>
              <Avatar initials={getOwnerInitials(kr.owner)} size="sm" />
              <span className={styles.ownerName}>{getOwnerName(kr.owner)}</span>
            </div>
          </div>

          {/* Check-in form */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Registrar check-in</span>
            <div className={styles.checkinForm}>
              <div className={styles.valueRow}>
                <Input
                  label="Valor atual"
                  size="md"
                  type="number"
                  value={currentValue}
                  onChange={() => {}}
                  disabled
                />
                <div className={styles.arrow}>
                  <ArrowRight size={20} />
                </div>
                <Input
                  label="Novo valor"
                  size="md"
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Confiança */}
              <div className={styles.confidenceField}>
                <span className={styles.confidenceLabel}>Confiança</span>
                <button
                  ref={confidenceBtnRef}
                  className={styles.confidenceTrigger}
                  onClick={() => setConfidenceOpen((v) => !v)}
                  type="button"
                >
                  {selectedConfidence ? (
                    <>
                      <span className={styles.confidenceDot} style={{ backgroundColor: selectedConfidence.color }} />
                      <span className={styles.confidenceTriggerText}>{selectedConfidence.label}</span>
                    </>
                  ) : (
                    <span className={styles.confidencePlaceholder}>Selecione o nível de confiança</span>
                  )}
                  <CaretDown size={14} className={styles.confidenceChevron} />
                </button>
                <FilterDropdown
                  open={confidenceOpen}
                  onClose={() => setConfidenceOpen(false)}
                  anchorRef={confidenceBtnRef}
                >
                  <div className={styles.confidenceDropdown}>
                    {CONFIDENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        className={`${styles.confidenceOption} ${confidence === opt.id ? styles.confidenceOptionActive : ""}`}
                        onClick={() => {
                          setConfidence(opt.id);
                          setConfidenceOpen(false);
                        }}
                      >
                        <span className={styles.confidenceDot} style={{ backgroundColor: opt.color }} />
                        <div className={styles.confidenceOptionText}>
                          <span className={styles.confidenceOptionLabel}>{opt.label}</span>
                          <span className={styles.confidenceOptionDesc}>{opt.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </FilterDropdown>
              </div>

              <Textarea
                label="Comentário"
                placeholder="O que mudou desde o último check-in?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />

              <Button variant="primary" size="md" onClick={handleSubmit} style={{ alignSelf: "flex-end" }}>
                Registrar check-in
              </Button>
            </div>
          </div>

          {/* Histórico recente */}
          {recentCheckIns.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Últimos check-ins</span>
              <div className={styles.timeline}>
                {recentCheckIns.map((entry, idx) => (
                  <div key={entry.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot}>
                      <span className={`${styles.timelineDotInner} ${idx === 0 ? styles.timelineDotLatest : ""}`} />
                      {idx < recentCheckIns.length - 1 && <span className={styles.timelineLine} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <Avatar initials={getOwnerInitials(entry.author)} size="xs" />
                        <span className={styles.timelineAuthor}>{getOwnerName(entry.author)}</span>
                        <span className={styles.timelineDate}>{formatCheckinDate(entry.createdAt)}</span>
                      </div>
                      <div className={styles.timelineValue}>
                        {entry.previousValue && (
                          <span className={styles.timelinePrevious}>{entry.previousValue}</span>
                        )}
                        <ArrowRight size={12} />
                        <span className={styles.timelineCurrent}>{entry.value}</span>
                        {entry.confidence && (
                          <Badge color={entry.confidence === "high" ? "success" : entry.confidence === "medium" ? "warning" : "error"} size="sm">
                            {CONFIDENCE_OPTIONS.find((o) => o.id === entry.confidence)?.label ?? entry.confidence}
                          </Badge>
                        )}
                      </div>
                      {entry.note && <p className={styles.timelineNote}>{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streak */}
          {kr.checkIns && kr.checkIns.length > 0 && (
            <div className={styles.streakRow}>
              <Fire size={14} className={styles.streakIcon} />
              <span className={styles.streakText}>{kr.checkIns.length} check-ins registrados</span>
            </div>
          )}
        </div>
      </DrawerBody>
    </DragToCloseDrawer>
  );
}
