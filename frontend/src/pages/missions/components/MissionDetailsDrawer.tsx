import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MutableRefObject, type ReactNode } from "react";
import {
  FilterDropdown,
  Button,
  GoalProgressBar,
  GoalGaugeBar,
  Avatar,
  AvatarGroup,
  Input,
  Checkbox,
  Badge,
  Textarea,
  ChartTooltipContent,
  DrawerHeader,
  DrawerBody,
  DragToCloseDrawer,
} from "@getbud-co/buds";
import {
  Target,
  GitBranch,
  X,
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  ArrowRight,
  CaretDown,
  Fire,
} from "@phosphor-icons/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { CheckIn, ConfidenceLevel, KeyResult, MissionTask } from "@/types";
import {
  numVal,
  getGoalLabel,
  getOwnerName,
  getOwnerInitials,
  formatCheckinDate,
} from "@/lib/missions";
import type { CheckInChartPoint } from "../utils/checkinReadModels";
import styles from "../MissionsPage.module.css";

interface OwnerOption {
  id: string;
  label: string;
  initials: string;
}

interface ConfidenceOption {
  id: ConfidenceLevel;
  label: string;
  description: string;
  color: string;
}

interface MentionPerson {
  id: string;
  label: string;
  initials: string;
}

interface DrawerTask {
  id: string;
  title: string;
  isDone: boolean;
}

interface CheckInSyncState {
  syncStatus: "pending" | "synced" | "failed";
  error: string | null;
  nextRetryAt: string | null;
}

interface UpdateCheckInPatch {
  note?: string | null;
  confidence?: ConfidenceLevel | null;
}

interface MissionDetailsDrawerProps {
  drawerOpen: boolean;
  drawerMode: "indicator" | "task";
  drawerIndicator: KeyResult | null;
  drawerTask: MissionTask | null;
  drawerMissionTitle: string;
  drawerEditing: boolean;
  editingItem: unknown;
  renderInlineForm: () => ReactNode;
  startDrawerEdit: () => void;
  handleCloseDrawer: () => void;
  drawerContributesTo: { missionId: string; missionTitle: string }[];
  setDrawerContributesTo: (updater: (prev: { missionId: string; missionTitle: string }[]) => { missionId: string; missionTitle: string }[]) => void;
  drawerItemId: string | null;
  handleRequestRemoveContribution: (itemId: string, itemType: "indicator" | "task", targetMissionId: string, targetMissionTitle: string) => void;
  drawerContribPickerOpen: boolean;
  setDrawerContribPickerOpen: (open: boolean) => void;
  drawerContribPickerSearch: string;
  setDrawerContribPickerSearch: (value: string) => void;
  addContribRef: MutableRefObject<HTMLButtonElement | null>;
  allMissions: { id: string; title: string }[];
  drawerSourceMissionId: string | null;
  drawerSourceMissionTitle: string;
  handleAddContribution: (item: KeyResult | MissionTask, itemType: "indicator" | "task", sourceMissionId: string, sourceMissionTitle: string, targetMissionId: string, targetMissionTitle: string) => void;
  supportTeam: string[];
  setSupportTeam: (updater: (prev: string[]) => string[]) => void;
  addSupportOpen: boolean;
  setAddSupportOpen: (updater: (prev: boolean) => boolean) => void;
  addSupportRef: MutableRefObject<HTMLDivElement | null>;
  supportSearch: string;
  setSupportSearch: (value: string) => void;
  ownerOptions: OwnerOption[];
  drawerValue: string;
  setDrawerValue: (value: string) => void;
  drawerConfidence: ConfidenceLevel | null;
  setDrawerConfidence: (value: ConfidenceLevel) => void;
  confidenceOpen: boolean;
  setConfidenceOpen: (updater: (prev: boolean) => boolean) => void;
  confidenceBtnRef: MutableRefObject<HTMLButtonElement | null>;
  confidenceOptions: ConfidenceOption[];
  drawerNote: string;
  drawerNoteRef: MutableRefObject<HTMLTextAreaElement | null>;
  handleNoteChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleNoteKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  mentionQuery: string | null;
  mentionIndex: number;
  mentionResults: MentionPerson[];
  insertMention: (person: MentionPerson) => void;
  handleConfirmCheckin: () => void;
  checkInHistoryForIndicator: CheckIn[];
  checkInChartDataForIndicator: CheckInChartPoint[];
  checkInSyncStateById: Record<string, CheckInSyncState>;
  retryCheckInSync: (checkInId: string) => void;
  onUpdateCheckIn: (checkInId: string, patch: UpdateCheckInPatch) => void;
  onDeleteCheckIn: (checkInId: string) => void;
  newlyCreatedCheckInId: string | null;
  drawerTasks: DrawerTask[];
  setDrawerTasks: (updater: (prev: DrawerTask[]) => DrawerTask[]) => void;
  newTaskLabel: string;
  setNewTaskLabel: (value: string) => void;
  setDrawerTask: (updater: (prev: MissionTask | null) => MissionTask | null) => void;
}

export function MissionDetailsDrawer({
  drawerOpen,
  drawerMode,
  drawerIndicator,
  drawerTask,
  drawerMissionTitle,
  drawerEditing,
  editingItem,
  renderInlineForm,
  startDrawerEdit,
  handleCloseDrawer,
  drawerContributesTo,
  setDrawerContributesTo,
  drawerItemId,
  handleRequestRemoveContribution,
  drawerContribPickerOpen,
  setDrawerContribPickerOpen,
  drawerContribPickerSearch,
  setDrawerContribPickerSearch,
  addContribRef,
  allMissions,
  drawerSourceMissionId,
  drawerSourceMissionTitle,
  handleAddContribution,
  supportTeam,
  setSupportTeam,
  addSupportOpen,
  setAddSupportOpen,
  addSupportRef,
  supportSearch,
  setSupportSearch,
  ownerOptions,
  drawerValue,
  setDrawerValue,
  drawerConfidence,
  setDrawerConfidence,
  confidenceOpen,
  setConfidenceOpen,
  confidenceBtnRef,
  confidenceOptions,
  drawerNote,
  drawerNoteRef,
  handleNoteChange,
  handleNoteKeyDown,
  mentionQuery,
  mentionIndex,
  mentionResults,
  insertMention,
  handleConfirmCheckin,
  checkInHistoryForIndicator,
  checkInChartDataForIndicator,
  checkInSyncStateById,
  retryCheckInSync,
  onUpdateCheckIn,
  onDeleteCheckIn,
  newlyCreatedCheckInId,
  drawerTasks,
  setDrawerTasks,
  newTaskLabel,
  setNewTaskLabel,
  setDrawerTask,
}: MissionDetailsDrawerProps) {
  const newlyCreatedCheckInRef = useRef<HTMLDivElement | null>(null);
  const [highlightedCheckInId, setHighlightedCheckInId] = useState<string | null>(null);
  const [editingCheckInId, setEditingCheckInId] = useState<string | null>(null);
  const [editingCheckInNote, setEditingCheckInNote] = useState("");
  const [editingCheckInConfidence, setEditingCheckInConfidence] = useState<ConfidenceLevel | "">("");

  function startEditingCheckIn(entry: CheckIn) {
    setEditingCheckInId(entry.id);
    setEditingCheckInNote(entry.note ?? "");
    setEditingCheckInConfidence(entry.confidence ?? "");
  }

  function cancelEditingCheckIn() {
    setEditingCheckInId(null);
    setEditingCheckInNote("");
    setEditingCheckInConfidence("");
  }

  function saveEditingCheckIn() {
    if (!editingCheckInId) return;

    const trimmed = editingCheckInNote.trim();
    onUpdateCheckIn(editingCheckInId, {
      note: trimmed.length > 0 ? trimmed : null,
      confidence: editingCheckInConfidence === "" ? null : editingCheckInConfidence,
    });
    cancelEditingCheckIn();
  }

  function confirmDeleteCheckIn(checkInId: string) {
    if (!window.confirm("Deseja excluir este check-in?")) {
      return;
    }
    onDeleteCheckIn(checkInId);
    if (editingCheckInId === checkInId) {
      cancelEditingCheckIn();
    }
  }

  useEffect(() => {
    if (!drawerOpen || drawerMode !== "indicator" || !newlyCreatedCheckInId) {
      setHighlightedCheckInId(null);
      return;
    }

    setHighlightedCheckInId(null);
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let fallbackTimerId: number | null = null;

    const activateHighlight = () => {
      if (cancelled) return;
      setHighlightedCheckInId(newlyCreatedCheckInId);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
        fallbackTimerId = null;
      }
    };

    const frameId = requestAnimationFrame(() => {
      const targetElement = newlyCreatedCheckInRef.current;
      if (!targetElement) return;

      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      observer = new IntersectionObserver(
        (entries) => {
          const targetEntry = entries[0];
          if (!targetEntry) return;
          if (targetEntry.isIntersecting && targetEntry.intersectionRatio >= 0.7) {
            activateHighlight();
          }
        },
        {
          threshold: [0.7],
        },
      );

      observer.observe(targetElement);
      fallbackTimerId = window.setTimeout(activateHighlight, 650);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
      }
    };
  }, [
    drawerOpen,
    drawerMode,
    newlyCreatedCheckInId,
    checkInHistoryForIndicator.length,
  ]);

  useEffect(() => {
    if (!highlightedCheckInId) return;

    const timerId = window.setTimeout(() => {
      setHighlightedCheckInId((current) => (current === highlightedCheckInId ? null : current));
    }, 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [highlightedCheckInId]);

  useEffect(() => {
    if (!drawerOpen || drawerMode !== "indicator") {
      cancelEditingCheckIn();
    }
  }, [drawerOpen, drawerMode]);

  return (
    <DragToCloseDrawer
      open={drawerOpen}
      onClose={handleCloseDrawer}
      size="md"
      aria-label={drawerMode === "task" ? "Detalhe da tarefa" : "Detalhe do indicador"}
    >
      {drawerMode === "task" && drawerTask && (
        <>
          <DrawerHeader
            title={drawerTask.title}
            onClose={handleCloseDrawer}
            afterTitle={
              <>
                <div className={styles.drawerMissionLink}>
                  <Target size={14} />
                  <span>{drawerMissionTitle}</span>
                </div>
                <div className={styles.drawerContributesTo}>
                  <GitBranch size={12} />
                  <div className={styles.drawerContributesToList}>
                    {drawerContributesTo.map((ct) => (
                      <span key={ct.missionId} className={styles.drawerContributesToChip}>
                        <span>{ct.missionTitle}</span>
                        <button
                          type="button"
                          className={styles.drawerContributesToRemove}
                          aria-label={`Remover contribuição para ${ct.missionTitle}`}
                          onClick={() => drawerItemId && handleRequestRemoveContribution(drawerItemId, "task", ct.missionId, ct.missionTitle)}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <button
                      ref={addContribRef}
                      type="button"
                      className={styles.drawerContributesToAdd}
                      onClick={() => {
                        setDrawerContribPickerOpen(true);
                        setDrawerContribPickerSearch("");
                      }}
                    >
                      <Plus size={10} />
                      <span>Contribui para...</span>
                    </button>
                  </div>
                </div>
              </>
            }
          >
            {drawerTask.dueDate && <Badge color="neutral">{drawerTask.dueDate}</Badge>}
            <Badge color={drawerTask.isDone ? "success" : "neutral"}>
              {drawerTask.isDone ? "Concluída" : "Pendente"}
            </Badge>
            {!drawerEditing && (
              <Button variant="secondary" size="sm" leftIcon={PencilSimple} onClick={startDrawerEdit}>
                Editar
              </Button>
            )}
          </DrawerHeader>

          <DrawerBody>
            <FilterDropdown
              open={drawerContribPickerOpen}
              onClose={() => setDrawerContribPickerOpen(false)}
              anchorRef={addContribRef}
              noOverlay
            >
              <div className={styles.filterDropdownBody}>
                <div className={styles.searchRow}>
                  <MagnifyingGlass size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Buscar missão..."
                    value={drawerContribPickerSearch}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDrawerContribPickerSearch(e.target.value)}
                  />
                </div>
                {allMissions
                  .filter((m) => m.id !== drawerSourceMissionId)
                  .filter((m) => !drawerContributesTo.some((ct) => ct.missionId === m.id))
                  .filter((m) => m.title.toLowerCase().includes(drawerContribPickerSearch.toLowerCase()))
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={styles.filterDropdownItem}
                      onClick={() => {
                        if (!drawerItemId || !drawerSourceMissionId || !drawerTask) return;
                        handleAddContribution(drawerTask, "task", drawerSourceMissionId, drawerSourceMissionTitle, m.id, m.title);
                        setDrawerContributesTo((prev) => [...prev, { missionId: m.id, missionTitle: m.title }]);
                        setDrawerContribPickerOpen(false);
                      }}
                    >
                      <Target size={14} />
                      <span>{m.title}</span>
                    </button>
                  ))}
              </div>
            </FilterDropdown>

            {drawerEditing && editingItem ? (
              <div className={styles.drawerSection}>{renderInlineForm()}</div>
            ) : (
              <>
                {drawerTask.description && (
                  <div className={styles.drawerSection}>
                    <span className={styles.drawerSectionLabel}>Descrição</span>
                    <p className={styles.drawerDescription}>{drawerTask.description}</p>
                  </div>
                )}

                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Participantes</span>
                  <div className={styles.drawerParticipantsCols}>
                    <div className={styles.drawerParticipantCol}>
                      <span className={styles.drawerParticipantColLabel}>Responsável</span>
                      <div className={styles.drawerParticipantRow}>
                        <Avatar initials={getOwnerInitials(drawerTask.owner)} size="sm" />
                        <span className={styles.drawerParticipantName}>{getOwnerName(drawerTask.owner)}</span>
                      </div>
                    </div>
                    <div className={styles.drawerParticipantCol}>
                      <span className={styles.drawerParticipantColLabel}>Time de apoio</span>
                      <div ref={addSupportRef}>
                        <AvatarGroup
                          size="sm"
                          avatars={supportTeam.map((initials) => ({
                            initials,
                            alt: ownerOptions.find((o) => o.initials === initials)?.label ?? initials,
                          }))}
                          maxVisible={5}
                          showAddButton
                          onAddClick={() => {
                            setAddSupportOpen((v) => !v);
                            setSupportSearch("");
                          }}
                        />
                      </div>
                      <FilterDropdown
                        open={addSupportOpen}
                        onClose={() => setAddSupportOpen(() => false)}
                        anchorRef={addSupportRef}
                      >
                        <div className={styles.filterDropdownBody}>
                          <div className={styles.searchRow}>
                            <MagnifyingGlass size={14} className={styles.searchIcon} />
                            <input
                              className={styles.searchInput}
                              placeholder="Buscar pessoa..."
                              value={supportSearch}
                              onChange={(e) => setSupportSearch(e.target.value)}
                              autoFocus
                            />
                          </div>
                          {(() => {
                            const candidates = ownerOptions
                              .filter((o) => o.id !== "all" && o.initials !== getOwnerInitials(drawerTask.owner))
                              .filter((o) => !supportSearch || o.label.toLowerCase().includes(supportSearch.toLowerCase()));
                            const active = candidates.filter((o) => supportTeam.includes(o.initials));
                            const inactive = candidates
                              .filter((o) => !supportTeam.includes(o.initials))
                              .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
                            const sorted = [...active, ...inactive];
                            return sorted.map((o) => {
                              const isIn = supportTeam.includes(o.initials);
                              return (
                                <button
                                  key={o.id}
                                  className={`${styles.filterDropdownItem} ${isIn ? styles.filterDropdownItemActive : ""}`}
                                  onClick={() =>
                                    setSupportTeam((prev) =>
                                      isIn ? prev.filter((i) => i !== o.initials) : [...prev, o.initials]
                                    )
                                  }
                                >
                                  <Checkbox checked={isIn} readOnly tabIndex={-1} />
                                  <Avatar initials={o.initials} size="xs" />
                                  {o.label}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </FilterDropdown>
                    </div>
                  </div>
                </div>

              </>
            )}
          </DrawerBody>
        </>
      )}

      {drawerMode === "indicator" && drawerIndicator && (
        <>
          <DrawerHeader
            title={drawerIndicator.title}
            onClose={handleCloseDrawer}
            afterTitle={
              <>
                <div className={styles.drawerMissionLink}>
                  <Target size={14} />
                  <span>{drawerMissionTitle}</span>
                </div>
                <div className={styles.drawerContributesTo}>
                  <GitBranch size={12} />
                  <div className={styles.drawerContributesToList}>
                    {drawerContributesTo.map((ct) => (
                      <span key={ct.missionId} className={styles.drawerContributesToChip}>
                        <span>{ct.missionTitle}</span>
                        <button
                          type="button"
                          className={styles.drawerContributesToRemove}
                          aria-label={`Remover contribuição para ${ct.missionTitle}`}
                          onClick={() => drawerItemId && handleRequestRemoveContribution(drawerItemId, "indicator", ct.missionId, ct.missionTitle)}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <button
                      ref={addContribRef}
                      type="button"
                      className={styles.drawerContributesToAdd}
                      onClick={() => {
                        setDrawerContribPickerOpen(true);
                        setDrawerContribPickerSearch("");
                      }}
                    >
                      <Plus size={10} />
                      <span>Contribui para...</span>
                    </button>
                  </div>
                </div>
              </>
            }
          >
            <Badge color="neutral">{drawerIndicator.periodLabel ?? ""}</Badge>
            {!drawerEditing && (
              <Button variant="secondary" size="sm" leftIcon={PencilSimple} onClick={startDrawerEdit}>
                Editar
              </Button>
            )}
          </DrawerHeader>

          <DrawerBody>
            <FilterDropdown
              open={drawerContribPickerOpen}
              onClose={() => setDrawerContribPickerOpen(false)}
              anchorRef={addContribRef}
              noOverlay
            >
              <div className={styles.filterDropdownBody}>
                <div className={styles.searchRow}>
                  <MagnifyingGlass size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Buscar missão..."
                    value={drawerContribPickerSearch}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDrawerContribPickerSearch(e.target.value)}
                  />
                </div>
                {allMissions
                  .filter((m) => m.id !== drawerSourceMissionId)
                  .filter((m) => !drawerContributesTo.some((ct) => ct.missionId === m.id))
                  .filter((m) => m.title.toLowerCase().includes(drawerContribPickerSearch.toLowerCase()))
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={styles.filterDropdownItem}
                      onClick={() => {
                        if (!drawerItemId || !drawerSourceMissionId || !drawerIndicator) return;
                        handleAddContribution(drawerIndicator, "indicator", drawerSourceMissionId, drawerSourceMissionTitle, m.id, m.title);
                        setDrawerContributesTo((prev) => [...prev, { missionId: m.id, missionTitle: m.title }]);
                        setDrawerContribPickerOpen(false);
                      }}
                    >
                      <Target size={14} />
                      <span>{m.title}</span>
                    </button>
                  ))}
              </div>
            </FilterDropdown>

            {drawerEditing && editingItem ? (
              <div className={styles.drawerSection}>{renderInlineForm()}</div>
            ) : (
              <>
                <div className={styles.drawerSection}>
                  <div className={styles.drawerProgress}>
                    {drawerIndicator.goalType === "reach" ? (
                      <GoalProgressBar
                        label={getGoalLabel(drawerIndicator)}
                        value={drawerIndicator.progress}
                        target={numVal(drawerIndicator.targetValue)}
                        expected={numVal(drawerIndicator.expectedValue)}
                        formattedValue={`${drawerIndicator.progress}%`}
                      />
                    ) : (
                      <GoalGaugeBar
                        label={getGoalLabel(drawerIndicator)}
                        value={drawerIndicator.progress}
                        goalType={drawerIndicator.goalType as "above" | "below" | "between"}
                        low={numVal(drawerIndicator.lowThreshold)}
                        high={numVal(drawerIndicator.highThreshold)}
                        min={0}
                        max={100}
                        formattedValue={String(drawerIndicator.progress)}
                      />
                    )}
                  </div>
                </div>

                {checkInChartDataForIndicator.length > 0 && (
                  <div className={styles.drawerSection}>
                    <span className={styles.drawerSectionLabel}>Evolução</span>
                    <div className={styles.drawerChart}>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={checkInChartDataForIndicator} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-caramel-200)" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontFamily: "var(--font-label)", fontSize: 11, fill: "var(--color-neutral-500)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontFamily: "var(--font-label)", fontSize: 11, fill: "var(--color-neutral-500)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <RechartsTooltip content={<ChartTooltipContent />} animationDuration={150} animationEasing="ease-out" />
                          <Line type="monotone" dataKey="value" stroke="var(--color-orange-500)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-orange-500)" }} activeDot={{ r: 5 }} name="Valor" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Registrar check-in</span>
                  <div className={styles.drawerCheckinForm}>
                    <div className={styles.checkinValueRow}>
                      <Input label="Valor atual" type="number" value={String(drawerIndicator.progress)} disabled />
                      <div className={styles.checkinArrow}>
                        <ArrowRight size={16} />
                      </div>
                      <Input
                        label="Novo valor"
                        type="number"
                        value={drawerValue}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setDrawerValue(e.target.value)}
                      />
                    </div>
                    <div className={styles.confidenceField}>
                      <span className={styles.confidenceLabel}>Confiança</span>
                      <button
                        ref={confidenceBtnRef}
                        className={styles.confidenceTrigger}
                        onClick={() => setConfidenceOpen((v) => !v)}
                        type="button"
                      >
                        {drawerConfidence ? (
                          <>
                            <span className={styles.confidenceDot} style={{ backgroundColor: confidenceOptions.find((o) => o.id === drawerConfidence)?.color }} />
                            <span className={styles.confidenceTriggerText}>{confidenceOptions.find((o) => o.id === drawerConfidence)?.label}</span>
                          </>
                        ) : (
                          <span className={styles.confidencePlaceholder}>Selecione o nível de confiança</span>
                        )}
                        <CaretDown size={14} className={styles.confidenceChevron} />
                      </button>
                      <FilterDropdown
                        open={confidenceOpen}
                        onClose={() => setConfidenceOpen(() => false)}
                        anchorRef={confidenceBtnRef}
                      >
                        <div className={styles.confidenceDropdown}>
                          {confidenceOptions.map((opt) => (
                            <button
                              key={opt.id}
                              className={`${styles.confidenceOption} ${drawerConfidence === opt.id ? styles.confidenceOptionActive : ""}`}
                              onClick={() => {
                                setDrawerConfidence(opt.id);
                                setConfidenceOpen(() => false);
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
                    <div className={styles.drawerMentionWrapper}>
                      <Textarea
                        ref={drawerNoteRef}
                        label="Comentário"
                        placeholder="O que mudou desde o último check-in? Para marcar alguém, use @"
                        value={drawerNote}
                        onChange={handleNoteChange}
                        onKeyDown={handleNoteKeyDown}
                        rows={3}
                      />
                      {mentionQuery !== null && mentionResults.length > 0 && (
                        <ul className={styles.mentionDropdown}>
                          {mentionResults.map((person, idx) => (
                            <li key={person.id}>
                              <button
                                className={`${styles.mentionDropdownItem} ${idx === mentionIndex ? styles.mentionDropdownItemActive : ""}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  insertMention(person);
                                }}
                              >
                                <Avatar initials={person.initials} size="xs" />
                                <span>{person.label}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button variant="primary" size="md" onClick={handleConfirmCheckin} style={{ alignSelf: "flex-end" }}>
                      Registrar check-in
                    </Button>
                  </div>
                </div>

                <div className={styles.drawerSection}>
                  <span className={styles.drawerSectionLabel}>Participantes</span>
                  <div className={styles.drawerParticipantsCols}>
                    <div className={styles.drawerParticipantCol}>
                      <span className={styles.drawerParticipantColLabel}>Responsável</span>
                      <div className={styles.drawerParticipantRow}>
                        <Avatar initials={getOwnerInitials(drawerIndicator.owner)} size="sm" />
                        <span className={styles.drawerParticipantName}>{getOwnerName(drawerIndicator.owner)}</span>
                      </div>
                    </div>
                    <div className={styles.drawerParticipantCol}>
                      <span className={styles.drawerParticipantColLabel}>Time de apoio</span>
                      <div ref={addSupportRef}>
                        <AvatarGroup
                          size="sm"
                          avatars={supportTeam.map((initials) => ({
                            initials,
                            alt: ownerOptions.find((o) => o.initials === initials)?.label ?? initials,
                          }))}
                          maxVisible={5}
                          showAddButton
                          onAddClick={() => {
                            setAddSupportOpen((v) => !v);
                            setSupportSearch("");
                          }}
                        />
                      </div>
                      <FilterDropdown
                        open={addSupportOpen}
                        onClose={() => setAddSupportOpen(() => false)}
                        anchorRef={addSupportRef}
                      >
                        <div className={styles.filterDropdownBody}>
                          <div className={styles.searchRow}>
                            <MagnifyingGlass size={14} className={styles.searchIcon} />
                            <input
                              className={styles.searchInput}
                              placeholder="Buscar pessoa..."
                              value={supportSearch}
                              onChange={(e) => setSupportSearch(e.target.value)}
                              autoFocus
                            />
                          </div>
                          {(() => {
                            const candidates = ownerOptions
                              .filter((o) => o.id !== "all" && o.initials !== getOwnerInitials(drawerIndicator.owner))
                              .filter((o) => !supportSearch || o.label.toLowerCase().includes(supportSearch.toLowerCase()));
                            const active = candidates.filter((o) => supportTeam.includes(o.initials));
                            const inactive = candidates
                              .filter((o) => !supportTeam.includes(o.initials))
                              .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
                            const sorted = [...active, ...inactive];
                            return sorted.map((o) => {
                              const isIn = supportTeam.includes(o.initials);
                              return (
                                <button
                                  key={o.id}
                                  className={`${styles.filterDropdownItem} ${isIn ? styles.filterDropdownItemActive : ""}`}
                                  onClick={() =>
                                    setSupportTeam((prev) =>
                                      isIn ? prev.filter((i) => i !== o.initials) : [...prev, o.initials]
                                    )
                                  }
                                >
                                  <Checkbox checked={isIn} readOnly tabIndex={-1} />
                                  <Avatar initials={o.initials} size="xs" />
                                  {o.label}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </FilterDropdown>
                    </div>
                  </div>
                </div>

                <div className={styles.drawerSection}>
                  <div className={styles.drawerSectionHeader}>
                    <span className={styles.drawerSectionLabel}>Tarefas</span>
                    <span className={styles.drawerTaskCount}>
                      {drawerTasks.filter((t) => t.isDone).length}/{drawerTasks.length}
                    </span>
                  </div>
                  {drawerTasks.length > 0 && (
                    <div className={styles.drawerTaskProgress}>
                      <div
                        className={styles.drawerTaskProgressFill}
                        style={{ width: `${(drawerTasks.filter((t) => t.isDone).length / drawerTasks.length) * 100}%` }}
                      />
                    </div>
                  )}
                  <ul className={styles.drawerTaskList}>
                    {[...drawerTasks]
                      .sort((a, b) => Number(a.isDone) - Number(b.isDone))
                      .map((task) => (
                        <li key={task.id} className={styles.drawerTaskItem}>
                          <Checkbox
                            checked={task.isDone}
                            onChange={() =>
                              setDrawerTasks((prev) =>
                                prev.map((t) => (t.id === task.id ? { ...t, isDone: !t.isDone } : t))
                              )
                            }
                          />
                          <span className={`${styles.drawerTaskLabel} ${task.isDone ? styles.drawerTaskLabelDone : ""}`}>
                            {task.title}
                          </span>
                        </li>
                      ))}
                  </ul>
                  <form
                    className={styles.drawerTaskForm}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTaskLabel.trim()) return;
                      setDrawerTasks((prev) => [
                        ...prev,
                        { id: `t-${Date.now()}`, title: newTaskLabel.trim(), isDone: false },
                      ]);
                      setNewTaskLabel("");
                    }}
                  >
                    <Plus size={16} className={styles.drawerTaskAddIcon} />
                    <input
                      className={styles.drawerTaskInput}
                      placeholder="Adicionar tarefa..."
                      value={newTaskLabel}
                      onChange={(e) => setNewTaskLabel(e.target.value)}
                    />
                  </form>
                </div>

                {(() => {
                  const checkins = checkInHistoryForIndicator;
                  if (checkins.length === 0) return null;
                  return (
                    <div className={styles.drawerSection}>
                      <span className={styles.drawerSectionLabel}>Histórico de check-ins</span>
                      <div className={styles.drawerTimeline}>
                        {checkins.map((entry: CheckIn, idx: number) => {
                          const syncState = checkInSyncStateById[entry.id];
                          const isSyncPending = syncState?.syncStatus === "pending";
                          const isSyncFailed = syncState?.syncStatus === "failed";

                          return (
                            <div
                              key={entry.id}
                              ref={entry.id === newlyCreatedCheckInId ? newlyCreatedCheckInRef : null}
                              className={`${styles.drawerTimelineItem} ${entry.id === highlightedCheckInId ? styles.drawerTimelineItemNew : ""}`}
                            >
                              <div className={styles.drawerTimelineDot}>
                                <span className={`${styles.drawerTimelineDotInner} ${idx === 0 ? styles.drawerTimelineDotLatest : ""} ${entry.id === highlightedCheckInId ? styles.drawerTimelineDotPulse : ""}`} />
                                {idx < checkins.length - 1 && <span className={styles.drawerTimelineLine} />}
                              </div>
                              <div className={styles.drawerTimelineContent}>
                                <div className={styles.drawerTimelineHeader}>
                                  <Avatar initials={getOwnerInitials(entry.author)} size="xs" />
                                  <span className={styles.drawerTimelineAuthor}>{getOwnerName(entry.author)}</span>
                                  <div className={styles.drawerTimelineMeta}>
                                    <span className={styles.drawerTimelineDate}>{formatCheckinDate(entry.createdAt)}</span>
                                    <div className={styles.drawerTimelineActions}>
                                      <button
                                        type="button"
                                        className={styles.drawerTimelineActionBtn}
                                        aria-label="Editar check-in"
                                        onClick={() => startEditingCheckIn(entry)}
                                      >
                                        <PencilSimple size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        className={`${styles.drawerTimelineActionBtn} ${styles.drawerTimelineActionDanger}`}
                                        aria-label="Excluir check-in"
                                        onClick={() => confirmDeleteCheckIn(entry.id)}
                                      >
                                        <Trash size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div className={styles.drawerTimelineValueChange}>
                                  <span className={styles.drawerTimelinePrev}>{numVal(entry.previousValue)}%</span>
                                  <ArrowRight size={12} />
                                  <span className={styles.drawerTimelineNew}>{numVal(entry.value)}%</span>
                                  {entry.confidence && (
                                    <span
                                      className={styles.drawerTimelineConfidence}
                                      style={{ color: confidenceOptions.find((c) => c.id === entry.confidence)?.color }}
                                    >
                                      <Fire size={12} />
                                      {confidenceOptions.find((c) => c.id === entry.confidence)?.label}
                                    </span>
                                  )}
                                </div>
                                {(isSyncPending || isSyncFailed) && (
                                  <div className={styles.drawerTimelineSyncMeta}>
                                    {isSyncPending && <Badge color="neutral">Sincronizando</Badge>}
                                    {isSyncFailed && <Badge color="error">Falha de sync</Badge>}
                                    {isSyncFailed && (
                                      <button
                                        type="button"
                                        className={styles.drawerTimelineRetryBtn}
                                        onClick={() => retryCheckInSync(entry.id)}
                                      >
                                        Tentar novamente
                                      </button>
                                    )}
                                  </div>
                                )}
                                {isSyncFailed && syncState?.error && (
                                  <p className={styles.drawerTimelineSyncError}>{syncState.error}</p>
                                )}
                                {isSyncFailed && syncState?.nextRetryAt && (
                                  <p className={styles.drawerTimelineSyncHint}>
                                    Nova tentativa automatica as {new Date(syncState.nextRetryAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
                                  </p>
                                )}
                                {editingCheckInId === entry.id ? (
                                  <div className={styles.drawerTimelineEditBox}>
                                    <div className={styles.drawerTimelineEditMetaRow}>
                                      <label className={styles.drawerTimelineEditLabel} htmlFor={`checkin-confidence-${entry.id}`}>
                                        Confianca
                                      </label>
                                      <select
                                        id={`checkin-confidence-${entry.id}`}
                                        className={styles.drawerTimelineEditSelect}
                                        value={editingCheckInConfidence}
                                        onChange={(event: ChangeEvent<HTMLSelectElement>) => setEditingCheckInConfidence(event.target.value as ConfidenceLevel | "")}
                                      >
                                        <option value="">Sem confianca</option>
                                        {confidenceOptions.map((opt) => (
                                          <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <textarea
                                      className={styles.drawerTimelineEditInput}
                                      value={editingCheckInNote}
                                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setEditingCheckInNote(event.target.value)}
                                      rows={2}
                                      placeholder="Comentário do check-in"
                                    />
                                    <div className={styles.drawerTimelineEditActions}>
                                      <Button variant="secondary" size="sm" onClick={cancelEditingCheckIn}>
                                        Cancelar
                                      </Button>
                                      <Button variant="primary" size="sm" onClick={saveEditingCheckIn}>
                                        Salvar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  entry.note && <p className={styles.drawerTimelineNote}>{entry.note}</p>
                                )}
                                {entry.mentions && entry.mentions.length > 0 && (
                                  <div className={styles.drawerTimelineMentions}>
                                    {entry.mentions.map((m: string) => (
                                      <span key={m} className={styles.drawerTimelineMention}>@{m}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </DrawerBody>
        </>
      )}
    </DragToCloseDrawer>
  );
}
