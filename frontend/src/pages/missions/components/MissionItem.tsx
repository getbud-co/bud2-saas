import { Fragment, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Button,
  Badge,
  Avatar,
  Chart,
  GoalProgressBar,
  GoalGaugeBar,
  FilterDropdown,
  Checkbox,
  Input,
} from "@getbud-co/buds";
import {
  CaretDown,
  CaretUp,
  PencilSimple,
  Trash,
  ArrowsOutSimple,
  DotsThree,
  GitBranch,
  Target,
  EyeSlash,
  MagnifyingGlass,
  X,
  Gauge,
  ListChecks,
} from "@phosphor-icons/react";
import type { Mission, KeyResult, MissionTask, ExternalContribution } from "@/types";
import {
  numVal,
  getGoalLabel,
  formatPeriodRange,
  getOwnerInitials,
  getIndicatorIcon,
} from "@/lib/missions";
import type { MissionItemProps } from "../missionTypes";
import styles from "../MissionsPage.module.css";

/* ——— Mission item (recursive) ——— */

export function MissionItem({
  mission,
  isOpen,
  onToggle,
  onExpand,
  onEdit,
  onDelete,
  onCheckin,
  onToggleTask,
  onOpenTaskDrawer,
  expandedMissions,
  isChild = false,
  isLast = false,
  hideExpand = false,
  openRowMenu = null,
  setOpenRowMenu,
  openContributeFor = null,
  setOpenContributeFor,
  contributePickerSearch = "",
  setContributePickerSearch,
  rowMenuBtnRefs,
  allMissions = [],
  onAddContribution,
  onRemoveContribution,
  onOpenExternalContrib,
  onToggleSubtask,
}: MissionItemProps) {
  const missionItemNavigate = useNavigate();
  const [indicatorValues, setIndicatorValues] = useState<Record<string, number>>({});
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set());
  const dragRef = useRef<{ keyResult: KeyResult; value: number } | null>(null);

  function getIndicatorValue(kr: KeyResult) {
    return indicatorValues[kr.id] ?? kr.progress;
  }

  function handleIndicatorDrag(kr: KeyResult, newValue: number) {
    dragRef.current = { keyResult: kr, value: newValue };
    setIndicatorValues((prev) => ({ ...prev, [kr.id]: newValue }));
  }

  useEffect(() => {
    if (!onCheckin) return;
    function onPointerUp() {
      if (!dragRef.current) return;
      const { keyResult, value } = dragRef.current;
      dragRef.current = null;
      // Reset bar to original value
      setIndicatorValues((prev) => {
        const next = { ...prev };
        delete next[keyResult.id];
        return next;
      });
      requestAnimationFrame(() => {
        onCheckin!({ keyResult, currentValue: keyResult.progress, newValue: value });
      });
    }
    document.addEventListener("pointerup", onPointerUp);
    return () => document.removeEventListener("pointerup", onPointerUp);
  }, [onCheckin]);

  function handleIndicatorClick(kr: KeyResult) {
    if (onCheckin) {
      onCheckin({ keyResult: kr, currentValue: getIndicatorValue(kr), newValue: getIndicatorValue(kr) });
    }
  }

  const keyResults = mission.keyResults ?? [];
  const rs = mission.restrictedSummary;
  const hasRestricted = rs != null && (rs.keyResults > 0 || rs.tasks > 0 || rs.children > 0);
  const extContribs = mission.externalContributions ?? [];
  const hasContent = keyResults.length > 0 || (mission.tasks?.length ?? 0) > 0 || (mission.children?.length ?? 0) > 0 || hasRestricted || extContribs.length > 0;
  const items: { type: "indicator" | "task" | "mission"; data: KeyResult | MissionTask | Mission }[] = [
    ...keyResults.map((kr) => ({ type: "indicator" as const, data: kr })),
    ...(mission.tasks ?? []).map((task) => ({ type: "task" as const, data: task })),
    ...(mission.children ?? []).map((child) => ({ type: "mission" as const, data: child })),
  ];

  const cardClasses = [
    styles.missionCard,
    mission.status === "draft" ? styles.missionCardDraft : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${isChild ? styles.childMissionWrapper : ""} ${isChild && isLast ? styles.childMissionWrapperLast : ""}`}>
      <Card
        padding="sm"
        className={cardClasses}
        onClick={() => hasContent && onToggle(mission.id)}
        role={hasContent ? "button" : undefined}
        tabIndex={hasContent ? 0 : undefined}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (hasContent && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onToggle(mission.id);
          }
        }}
      >
        <CardBody>
          <div className={styles.missionRow}>
            <Chart value={mission.progress} size={40} />
            <span className={styles.missionTitleText}>{mission.title}</span>
            {mission.status === "draft" && <Badge color="caramel">Rascunho</Badge>}
            <div className={styles.missionActions}>
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={PencilSimple}
                aria-label="Editar missão"
                className={styles.missionEditBtn}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onEdit(mission);
                }}
              />
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={Trash}
                aria-label="Excluir missão"
                className={styles.missionEditBtn}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete?.(mission);
                }}
              />
              {!hideExpand && (
                <Button
                  variant="tertiary"
                  size="sm"
                  leftIcon={ArrowsOutSimple}
                  aria-label="Expandir missão"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onExpand(mission);
                  }}
                />
              )}
            </div>
            {hasContent && (
              <span className={styles.missionToggleIcon}>
                {isOpen ? <CaretUp size={20} /> : <CaretDown size={20} />}
              </span>
            )}
          </div>

          <div className={`${styles.indicatorCollapse} ${isOpen ? styles.indicatorCollapseOpen : ""}`}>
            <div className={styles.indicatorTree}>
              <div className={styles.indicatorList} onClick={(e) => e.stopPropagation()}>
                {items.map((item, idx) => {
                  const itemIsLast = idx === items.length - 1;

                  if (item.type === "indicator") {
                    const kr = item.data as KeyResult;
                    const Icon = getIndicatorIcon(kr);
                    const hasIndChildren = (kr.tasks?.length ?? 0) > 0;
                    const isIndExpanded = expandedIndicators.has(kr.id);
                    return (
                      <div key={kr.id} className={styles.indicatorWrapper}>
                        <div
                          className={`${styles.indicatorRow} ${itemIsLast ? styles.indicatorRowLast : ""} ${onCheckin ? styles.indicatorRowClickable : ""} ${hasIndChildren ? styles.indicatorRowWithBadge : ""}`}
                          onClick={() => handleIndicatorClick(kr)}
                          role={onCheckin ? "button" : undefined}
                          tabIndex={onCheckin ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (onCheckin && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              handleIndicatorClick(kr);
                            }
                          }}
                        >
                          {hasIndChildren && (
                            <div className={styles.indicatorBadgeRow}>
                              <Badge color="neutral">
                                {kr.tasks?.length ?? 0} {(kr.tasks?.length ?? 0) === 1 ? "tarefa" : "tarefas"}
                              </Badge>
                            </div>
                          )}
                          <div className={styles.indicatorTitle}>
                            {hasIndChildren && (
                              <button
                                type="button"
                                className={styles.indicatorExpandBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedIndicators((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(kr.id)) next.delete(kr.id);
                                    else next.add(kr.id);
                                    return next;
                                  });
                                }}
                                aria-label={isIndExpanded ? "Recolher" : "Expandir"}
                              >
                                {isIndExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                              </button>
                            )}
                            <Icon size={24} className={styles.indicatorIcon} />
                            <span className={styles.indicatorName}>{kr.title}</span>
                          </div>
                          <div className={styles.indicatorDetails}>
                            <div className={styles.indicatorPeriod}>
                              <span className={styles.periodBold}>{kr.periodLabel ?? ""}</span>
                              <span className={styles.periodRange}>{formatPeriodRange(kr.periodStart, kr.periodEnd)}</span>
                            </div>
                            <div className={styles.indicatorProgress} onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const val = getIndicatorValue(kr);
                                return kr.goalType === "reach" ? (
                                  <GoalProgressBar
                                    label={getGoalLabel(kr)}
                                    value={val}
                                    target={numVal(kr.targetValue)}
                                    expected={numVal(kr.expectedValue)}
                                    formattedValue={`${val}%`}
                                    onChange={(v: number) => handleIndicatorDrag(kr, v)}
                                  />
                                ) : (
                                  <GoalGaugeBar
                                    label={getGoalLabel(kr)}
                                    value={val}
                                    goalType={kr.goalType as "above" | "below" | "between"}
                                    low={numVal(kr.lowThreshold)}
                                    high={numVal(kr.highThreshold)}
                                    min={0}
                                    max={100}
                                    formattedValue={String(val)}
                                    onChange={(v: number) => handleIndicatorDrag(kr, v)}
                                  />
                                );
                              })()}
                            </div>
                            <div className={styles.indicatorRowActions}>
                              <Avatar initials={getOwnerInitials(kr.owner)} size="sm" />
                              <div className={styles.indicatorRowMenu} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                <Button
                                  ref={(el: HTMLButtonElement | null) => { if (rowMenuBtnRefs) rowMenuBtnRefs.current[kr.id] = el; }}
                                  variant="tertiary"
                                  size="sm"
                                  leftIcon={DotsThree}
                                  aria-label="Mais ações"
                                  onClick={() => {
                                    setOpenRowMenu?.(openRowMenu === kr.id ? null : kr.id);
                                    setOpenContributeFor?.(null);
                                  }}
                                />
                                <FilterDropdown
                                  open={openRowMenu === kr.id && openContributeFor !== kr.id}
                                  onClose={() => setOpenRowMenu?.(null)}
                                  anchorRef={{ current: rowMenuBtnRefs?.current[kr.id] ?? null }}
                                  noOverlay
                                >
                                  <div className={styles.filterDropdownBody}>
                                    <button
                                      type="button"
                                      className={styles.filterDropdownItem}
                                      onClick={() => { setOpenContributeFor?.(kr.id); setContributePickerSearch?.(""); }}
                                    >
                                      <GitBranch size={14} />
                                      <span>Contribui para...</span>
                                    </button>
                                    {(kr.contributesTo?.length ?? 0) > 0 && (
                                      <>
                                        <div className={styles.filterDropdownSeparator} />
                                        {kr.contributesTo!.map((ct) => (
                                          <button
                                            key={ct.missionId}
                                            type="button"
                                            className={`${styles.filterDropdownItem} ${styles.filterDropdownItemDanger}`}
                                            onClick={() => onRemoveContribution?.(kr.id, "indicator", ct.missionId, ct.missionTitle)}
                                          >
                                            <X size={14} />
                                            <span className={styles.contributeMissionLabel} title={`Desconectar de ${ct.missionTitle}`}>Desconectar de {ct.missionTitle}</span>
                                          </button>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                </FilterDropdown>
                                <FilterDropdown
                                  open={openContributeFor === kr.id}
                                  onClose={() => { setOpenContributeFor?.(null); setOpenRowMenu?.(null); }}
                                  anchorRef={{ current: rowMenuBtnRefs?.current[kr.id] ?? null }}
                                  noOverlay
                                >
                                  <div className={styles.filterDropdownBody}>
                                    <Input
                                      leftIcon={MagnifyingGlass}
                                      placeholder="Buscar missão..."
                                      value={contributePickerSearch}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContributePickerSearch?.(e.target.value)}
                                    />
                                    {allMissions
                                      .filter((m) => m.id !== mission.id)
                                      .filter((m) => !kr.contributesTo?.some((c) => c.missionId === m.id))
                                      .filter((m) => m.title.toLowerCase().includes(contributePickerSearch.toLowerCase()))
                                      .map((m) => (
                                        <button
                                          key={m.id}
                                          type="button"
                                          className={styles.filterDropdownItem}
                                          onClick={() => onAddContribution?.(kr, "indicator", mission.id, mission.title, m.id, m.title)}
                                        >
                                          <Target size={14} />
                                          <span className={styles.contributeMissionLabel} title={m.title}>{m.title}</span>
                                        </button>
                                      ))}
                                  </div>
                                </FilterDropdown>
                              </div>
                            </div>
                          </div>
                        </div>
                        {hasIndChildren && isIndExpanded && (
                          <div className={styles.indicatorChildren}>
                            {kr.tasks?.map((task) => {
                              return (
                              <Fragment key={task.id}>
                              <div
                                className={`${styles.indicatorRow} ${styles.indicatorRowNested} ${styles.indicatorRowClickable}`}
                                onClick={() => onOpenTaskDrawer?.(task, `${mission.title} › ${kr.title}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenTaskDrawer?.(task, `${mission.title} › ${kr.title}`); } }}
                              >
                                <div className={styles.indicatorTitle}>
                                  <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={task.isDone}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { e.stopPropagation(); onToggleTask?.(task.id); }}
                                    />
                                  </div>
                                  <span className={`${styles.indicatorName} ${task.isDone ? styles.taskNameDone : ""}`}>{task.title}</span>
                                </div>
                                <div className={styles.indicatorDetails}>
                                  <Badge color={task.isDone ? "success" : "neutral"}>
                                    {task.isDone ? "Concluída" : "Pendente"}
                                  </Badge>
                                  <div className={styles.taskRowActions}>
                                    <Avatar initials={getOwnerInitials(task.owner)} size="sm" />
                                    <div className={styles.taskRowMenu} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                      <Button
                                        ref={(el: HTMLButtonElement | null) => { if (rowMenuBtnRefs) rowMenuBtnRefs.current[task.id] = el; }}
                                        variant="tertiary"
                                        size="sm"
                                        leftIcon={DotsThree}
                                        aria-label="Mais ações"
                                        onClick={() => {
                                          setOpenRowMenu?.(openRowMenu === task.id ? null : task.id);
                                          setOpenContributeFor?.(null);
                                        }}
                                      />
                                      <FilterDropdown
                                        open={openRowMenu === task.id && openContributeFor !== task.id}
                                        onClose={() => setOpenRowMenu?.(null)}
                                        anchorRef={{ current: rowMenuBtnRefs?.current[task.id] ?? null }}
                                        noOverlay
                                      >
                                        <div className={styles.filterDropdownBody}>
                                          <button
                                            type="button"
                                            className={styles.filterDropdownItem}
                                            onClick={() => { setOpenContributeFor?.(task.id); setContributePickerSearch?.(""); }}
                                          >
                                            <GitBranch size={14} />
                                            <span>Contribui para...</span>
                                          </button>
                                          {(task.contributesTo?.length ?? 0) > 0 && (
                                            <>
                                              <div className={styles.filterDropdownSeparator} />
                                              {task.contributesTo!.map((ct) => (
                                                <button
                                                  key={ct.missionId}
                                                  type="button"
                                                  className={`${styles.filterDropdownItem} ${styles.filterDropdownItemDanger}`}
                                                  onClick={() => onRemoveContribution?.(task.id, "task", ct.missionId, ct.missionTitle)}
                                                >
                                                  <X size={14} />
                                                  <span className={styles.contributeMissionLabel} title={`Desconectar de ${ct.missionTitle}`}>Desconectar de {ct.missionTitle}</span>
                                                </button>
                                              ))}
                                            </>
                                          )}
                                        </div>
                                      </FilterDropdown>
                                      <FilterDropdown
                                        open={openContributeFor === task.id}
                                        onClose={() => { setOpenContributeFor?.(null); setOpenRowMenu?.(null); }}
                                        anchorRef={{ current: rowMenuBtnRefs?.current[task.id] ?? null }}
                                        noOverlay
                                      >
                                        <div className={styles.filterDropdownBody}>
                                          <Input
                                            leftIcon={MagnifyingGlass}
                                            placeholder="Buscar missão..."
                                            value={contributePickerSearch}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContributePickerSearch?.(e.target.value)}
                                          />
                                          {allMissions
                                            .filter((m) => m.id !== mission.id)
                                            .filter((m) => !task.contributesTo?.some((c) => c.missionId === m.id))
                                            .filter((m) => m.title.toLowerCase().includes(contributePickerSearch.toLowerCase()))
                                            .map((m) => (
                                              <button
                                                key={m.id}
                                                type="button"
                                                className={styles.filterDropdownItem}
                                                onClick={() => onAddContribution?.(task, "task", mission.id, mission.title, m.id, m.title)}
                                              >
                                                <Target size={14} />
                                                <span>{m.title}</span>
                                              </button>
                                            ))}
                                        </div>
                                      </FilterDropdown>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              </Fragment>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (item.type === "task") {
                    const task = item.data as MissionTask;
                    return (
                      <Fragment key={task.id}>
                      <div
                        className={`${styles.indicatorRow} ${itemIsLast ? styles.indicatorRowLast : ""} ${styles.indicatorRowClickable}`}
                        onClick={() => onOpenTaskDrawer?.(task, mission.title)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenTaskDrawer?.(task, mission.title); } }}
                      >
                        <div className={styles.indicatorTitle}>
                          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={task.isDone}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { e.stopPropagation(); onToggleTask?.(task.id); }}
                            />
                          </div>
                          <span className={`${styles.indicatorName} ${task.isDone ? styles.taskNameDone : ""}`}>{task.title}</span>
                        </div>
                        <div className={styles.indicatorDetails}>
                          <Badge color={task.isDone ? "success" : "neutral"}>
                            {task.isDone ? "Concluída" : "Pendente"}
                          </Badge>
                          <div className={styles.taskRowActions}>
                            <Avatar initials={getOwnerInitials(task.owner)} size="sm" />
                            <div className={styles.taskRowMenu} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                              <Button
                                ref={(el: HTMLButtonElement | null) => { if (rowMenuBtnRefs) rowMenuBtnRefs.current[task.id] = el; }}
                                variant="tertiary"
                                size="sm"
                                leftIcon={DotsThree}
                                aria-label="Mais ações"
                                onClick={() => {
                                  setOpenRowMenu?.(openRowMenu === task.id ? null : task.id);
                                  setOpenContributeFor?.(null);
                                }}
                              />
                              <FilterDropdown
                                open={openRowMenu === task.id && openContributeFor !== task.id}
                                onClose={() => setOpenRowMenu?.(null)}
                                anchorRef={{ current: rowMenuBtnRefs?.current[task.id] ?? null }}
                                noOverlay
                              >
                                <div className={styles.filterDropdownBody}>
                                  <button
                                    type="button"
                                    className={styles.filterDropdownItem}
                                    onClick={() => { setOpenContributeFor?.(task.id); setContributePickerSearch?.(""); }}
                                  >
                                    <GitBranch size={14} />
                                    <span>Contribui para...</span>
                                  </button>
                                  {(task.contributesTo?.length ?? 0) > 0 && (
                                    <>
                                      <div className={styles.filterDropdownSeparator} />
                                      {task.contributesTo!.map((ct) => (
                                        <button
                                          key={ct.missionId}
                                          type="button"
                                          className={`${styles.filterDropdownItem} ${styles.filterDropdownItemDanger}`}
                                          onClick={() => onRemoveContribution?.(task.id, "task", ct.missionId, ct.missionTitle)}
                                        >
                                          <X size={14} />
                                          <span className={styles.contributeMissionLabel} title={`Desconectar de ${ct.missionTitle}`}>Desconectar de {ct.missionTitle}</span>
                                        </button>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </FilterDropdown>
                              <FilterDropdown
                                open={openContributeFor === task.id}
                                onClose={() => { setOpenContributeFor?.(null); setOpenRowMenu?.(null); }}
                                anchorRef={{ current: rowMenuBtnRefs?.current[task.id] ?? null }}
                                noOverlay
                              >
                                <div className={styles.filterDropdownBody}>
                                  <Input
                                    leftIcon={MagnifyingGlass}
                                    placeholder="Buscar missão..."
                                    value={contributePickerSearch}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContributePickerSearch?.(e.target.value)}
                                  />
                                  {allMissions
                                    .filter((m) => m.id !== mission.id)
                                    .filter((m) => !task.contributesTo?.some((c) => c.missionId === m.id))
                                    .filter((m) => m.title.toLowerCase().includes(contributePickerSearch.toLowerCase()))
                                    .map((m) => (
                                      <button
                                        key={m.id}
                                        type="button"
                                        className={styles.filterDropdownItem}
                                        onClick={() => onAddContribution?.(task, "task", mission.id, mission.title, m.id, m.title)}
                                      >
                                        <Target size={14} />
                                        <span>{m.title}</span>
                                      </button>
                                    ))}
                                </div>
                              </FilterDropdown>
                            </div>
                          </div>
                        </div>
                      </div>
                      </Fragment>
                    );
                  }

                  const child = item.data as Mission;
                  return (
                    <MissionItem
                      key={child.id}
                      mission={child}
                      isOpen={expandedMissions.has(child.id)}
                      onToggle={onToggle}
                      onExpand={onExpand}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onCheckin={onCheckin}
                      onToggleTask={onToggleTask}
                      onOpenTaskDrawer={onOpenTaskDrawer}
                      expandedMissions={expandedMissions}
                      isChild
                      isLast={itemIsLast}
                      openRowMenu={openRowMenu}
                      setOpenRowMenu={setOpenRowMenu}
                      openContributeFor={openContributeFor}
                      setOpenContributeFor={setOpenContributeFor}
                      contributePickerSearch={contributePickerSearch}
                      setContributePickerSearch={setContributePickerSearch}
                      rowMenuBtnRefs={rowMenuBtnRefs}
                      allMissions={allMissions}
                      onAddContribution={onAddContribution}
                      onRemoveContribution={onRemoveContribution}
                      onOpenExternalContrib={onOpenExternalContrib}
                      onToggleSubtask={onToggleSubtask}
                    />
                  );
                })}
                {extContribs.length > 0 && (
                  <>
                    <div className={styles.externalSectionHeader}>
                      <GitBranch size={14} />
                      <span>Contribuições externas</span>
                      <Badge color="neutral" size="sm">{extContribs.length}</Badge>
                    </div>
                    {extContribs.map((ec: ExternalContribution) => (
                      <div
                        key={ec.id}
                        className={`${styles.externalRow} ${styles.indicatorRowClickable}`}
                        onClick={() => onOpenExternalContrib?.(ec)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") onOpenExternalContrib?.(ec); }}
                      >
                        <div className={styles.externalRowContent}>
                          <div className={styles.externalRowMain}>
                            {ec.type === "indicator" ? <Gauge size={16} /> : <ListChecks size={16} />}
                            <span className={styles.externalRowTitle}>{ec.title}</span>
                            {ec.type === "indicator" && ec.status && (
                              <Badge
                                color={ec.status === "on_track" ? "success" : ec.status === "attention" ? "warning" : ec.status === "off_track" ? "error" : "neutral"}
                                size="sm"
                              >
                                {ec.status === "on_track" ? "No ritmo" : ec.status === "attention" ? "Atenção" : ec.status === "off_track" ? "Atrasado" : "Concluído"}
                              </Badge>
                            )}
                            {ec.type === "task" && (
                              <Badge color={ec.isDone ? "success" : "neutral"} size="sm">
                                {ec.isDone ? "Concluída" : "Pendente"}
                              </Badge>
                            )}
                            {ec.type === "indicator" && ec.progress != null && (
                              <span className={styles.externalRowProgress}>{ec.progress}%</span>
                            )}
                          </div>
                          <div className={styles.externalRowSource}>
                            <Target size={12} />
                            <span
                              className={styles.externalSourceLink}
                              onClick={(e) => { e.stopPropagation(); missionItemNavigate(`/missions/${ec.sourceMission.id}`); }}
                              role="link"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); missionItemNavigate(`/missions/${ec.sourceMission.id}`); } }}
                            >
                              de {ec.sourceMission.title}
                            </span>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="tertiary"
                            size="sm"
                            leftIcon={X}
                            aria-label="Remover contribuição"
                            onClick={() => onRemoveContribution?.(ec.id, ec.type, mission.id, mission.title)}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {hasRestricted && (() => {
                  const parts: string[] = [];
                  if (rs!.keyResults > 0) parts.push(`${rs!.keyResults} indicador${rs!.keyResults > 1 ? "es" : ""}`);
                  if (rs!.tasks > 0) parts.push(`${rs!.tasks} tarefa${rs!.tasks > 1 ? "s" : ""}`);
                  if (rs!.children > 0) parts.push(`${rs!.children} sub-miss${rs!.children > 1 ? "ões" : "ão"}`);
                  const joined = parts.length > 1
                    ? parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1]
                    : parts[0];
                  return (
                    <div className={styles.restrictedBanner}>
                      <EyeSlash size={16} weight="regular" />
                      <span>{joined} oculto{(rs!.keyResults + rs!.tasks + rs!.children) > 1 ? "s" : ""} contribuem para o progresso desta missão</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

