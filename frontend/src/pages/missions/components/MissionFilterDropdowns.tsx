import type { RefObject } from "react";
import {
  FilterDropdown,
  Checkbox,
  Radio,
  Avatar,
  DatePicker,
} from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import { Plus, CaretRight } from "@phosphor-icons/react";
import {
  STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  INDICATOR_TYPE_OPTIONS,
  CONTRIBUTION_OPTIONS,
  TASK_STATE_OPTIONS,
  MISSION_STATUS_OPTIONS,
} from "../missionConstants";
import styles from "../MissionsPage.module.css";

interface MissionFilterOption {
  id: string;
  label: string;
  initials?: string;
}

interface PresetPeriod {
  id: string;
  label: string;
  start: CalendarDate;
  end: CalendarDate;
}

export interface MissionFilterDropdownsProps {
  openFilter: string | null;
  setOpenFilter: (f: string | null) => void;
  ignoreChipRefs: RefObject<HTMLElement | null>[];
  /* refs */
  teamChipRef: RefObject<HTMLElement | null>;
  statusChipRef: RefObject<HTMLElement | null>;
  ownerChipRef: RefObject<HTMLElement | null>;
  itemTypeChipRef: RefObject<HTMLElement | null>;
  indicatorTypeChipRef: RefObject<HTMLElement | null>;
  contributionChipRef: RefObject<HTMLElement | null>;
  supporterChipRef: RefObject<HTMLElement | null>;
  taskStateChipRef: RefObject<HTMLElement | null>;
  missionStatusChipRef: RefObject<HTMLElement | null>;
  periodChipRef: RefObject<HTMLElement | null>;
  filterPeriodCustomBtnRef: RefObject<HTMLButtonElement | null>;
  /* options */
  teamFilterOptions: MissionFilterOption[];
  ownerFilterOptions: MissionFilterOption[];
  presetPeriods: PresetPeriod[];
  /* state */
  selectedTeams: string[];
  setSelectedTeams: React.Dispatch<React.SetStateAction<string[]>>;
  selectedStatus: string;
  setSelectedStatus: React.Dispatch<React.SetStateAction<string>>;
  selectedOwners: string[];
  setSelectedOwners: React.Dispatch<React.SetStateAction<string[]>>;
  selectedItemTypes: string[];
  setSelectedItemTypes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedIndicatorTypes: string[];
  setSelectedIndicatorTypes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedContributions: string[];
  setSelectedContributions: React.Dispatch<React.SetStateAction<string[]>>;
  selectedSupporters: string[];
  setSelectedSupporters: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTaskState: string;
  setSelectedTaskState: React.Dispatch<React.SetStateAction<string>>;
  selectedMissionStatuses: string[];
  setSelectedMissionStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPeriod: [CalendarDate | null, CalendarDate | null];
  setSelectedPeriod: React.Dispatch<React.SetStateAction<[CalendarDate | null, CalendarDate | null]>>;
  filterPeriodCustom: boolean;
  setFilterPeriodCustom: React.Dispatch<React.SetStateAction<boolean>>;
  /* resolvers */
  resolveTeamId: (id: string) => string;
  resolveUserId: (id: string) => string;
}

function MultiCheckboxDropdown({
  open,
  onClose,
  anchorRef,
  ignoreRefs,
  options,
  selected,
  setSelected,
  resolveId,
  showAvatar,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  ignoreRefs: RefObject<HTMLElement | null>[];
  options: MissionFilterOption[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  resolveId?: (id: string) => string;
  showAvatar?: boolean;
}) {
  return (
    <FilterDropdown open={open} onClose={onClose} anchorRef={anchorRef} ignoreRefs={ignoreRefs}>
      <div className={styles.filterDropdownBody}>
        {options.map((opt) => {
          const isAll = opt.id === "all";
          const resolve = resolveId ?? ((id: string) => id);
          const checked = isAll
            ? selected.length === 0 || selected.includes("all")
            : selected.some((id) => resolve(id) === opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`${styles.filterDropdownItem} ${checked ? styles.filterDropdownItemActive : ""}`}
              onClick={() => {
                if (isAll) {
                  setSelected(["all"]);
                } else {
                  setSelected((prev) => {
                    const withoutAll = prev.filter((id) => id !== "all").map(resolve);
                    const without = Array.from(new Set(withoutAll));
                    return without.includes(opt.id)
                      ? without.filter((id) => id !== opt.id)
                      : [...without, opt.id];
                  });
                }
              }}
            >
              <Checkbox checked={checked} readOnly />
              {showAvatar && opt.initials && <Avatar initials={opt.initials} size="xs" />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </FilterDropdown>
  );
}

function RadioDropdown({
  open,
  onClose,
  anchorRef,
  ignoreRefs,
  options,
  selected,
  setSelected,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  ignoreRefs: RefObject<HTMLElement | null>[];
  options: { id: string; label: string }[];
  selected: string;
  setSelected: (v: string) => void;
}) {
  return (
    <FilterDropdown open={open} onClose={onClose} anchorRef={anchorRef} ignoreRefs={ignoreRefs}>
      <div className={styles.filterDropdownBody}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`${styles.filterDropdownItem} ${selected === opt.id ? styles.filterDropdownItemActive : ""}`}
            onClick={() => { setSelected(opt.id); onClose(); }}
          >
            <Radio checked={selected === opt.id} readOnly />
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </FilterDropdown>
  );
}

export function MissionFilterDropdowns(props: MissionFilterDropdownsProps) {
  const {
    openFilter, setOpenFilter, ignoreChipRefs,
    teamChipRef, statusChipRef, ownerChipRef, itemTypeChipRef,
    indicatorTypeChipRef, contributionChipRef, supporterChipRef,
    taskStateChipRef, missionStatusChipRef, periodChipRef, filterPeriodCustomBtnRef,
    teamFilterOptions, ownerFilterOptions, presetPeriods,
    selectedTeams, setSelectedTeams,
    selectedStatus, setSelectedStatus,
    selectedOwners, setSelectedOwners,
    selectedItemTypes, setSelectedItemTypes,
    selectedIndicatorTypes, setSelectedIndicatorTypes,
    selectedContributions, setSelectedContributions,
    selectedSupporters, setSelectedSupporters,
    selectedTaskState, setSelectedTaskState,
    selectedMissionStatuses, setSelectedMissionStatuses,
    selectedPeriod, setSelectedPeriod,
    filterPeriodCustom, setFilterPeriodCustom,
    resolveTeamId, resolveUserId,
  } = props;

  const close = () => setOpenFilter(null);

  return (
    <>
      <MultiCheckboxDropdown
        open={openFilter === "team"} onClose={close} anchorRef={teamChipRef} ignoreRefs={ignoreChipRefs}
        options={teamFilterOptions} selected={selectedTeams} setSelected={setSelectedTeams} resolveId={resolveTeamId}
      />
      <RadioDropdown
        open={openFilter === "status"} onClose={close} anchorRef={statusChipRef} ignoreRefs={ignoreChipRefs}
        options={STATUS_OPTIONS} selected={selectedStatus} setSelected={setSelectedStatus}
      />
      <MultiCheckboxDropdown
        open={openFilter === "owner"} onClose={close} anchorRef={ownerChipRef} ignoreRefs={ignoreChipRefs}
        options={ownerFilterOptions} selected={selectedOwners} setSelected={setSelectedOwners} resolveId={resolveUserId} showAvatar
      />
      <MultiCheckboxDropdown
        open={openFilter === "itemType"} onClose={close} anchorRef={itemTypeChipRef} ignoreRefs={ignoreChipRefs}
        options={ITEM_TYPE_OPTIONS} selected={selectedItemTypes} setSelected={setSelectedItemTypes}
      />
      <MultiCheckboxDropdown
        open={openFilter === "indicatorType"} onClose={close} anchorRef={indicatorTypeChipRef} ignoreRefs={ignoreChipRefs}
        options={INDICATOR_TYPE_OPTIONS} selected={selectedIndicatorTypes} setSelected={setSelectedIndicatorTypes}
      />
      <MultiCheckboxDropdown
        open={openFilter === "contribution"} onClose={close} anchorRef={contributionChipRef} ignoreRefs={ignoreChipRefs}
        options={CONTRIBUTION_OPTIONS} selected={selectedContributions} setSelected={setSelectedContributions}
      />
      <MultiCheckboxDropdown
        open={openFilter === "supporter"} onClose={close} anchorRef={supporterChipRef} ignoreRefs={ignoreChipRefs}
        options={ownerFilterOptions} selected={selectedSupporters} setSelected={setSelectedSupporters} resolveId={resolveUserId} showAvatar
      />
      <RadioDropdown
        open={openFilter === "taskState"} onClose={close} anchorRef={taskStateChipRef} ignoreRefs={ignoreChipRefs}
        options={TASK_STATE_OPTIONS} selected={selectedTaskState} setSelected={setSelectedTaskState}
      />
      <MultiCheckboxDropdown
        open={openFilter === "missionStatus"} onClose={close} anchorRef={missionStatusChipRef} ignoreRefs={ignoreChipRefs}
        options={MISSION_STATUS_OPTIONS} selected={selectedMissionStatuses} setSelected={setSelectedMissionStatuses}
      />

      {/* Period filter — presets */}
      <FilterDropdown
        open={openFilter === "period"}
        onClose={() => { close(); setFilterPeriodCustom(false); }}
        anchorRef={periodChipRef}
        ignoreRefs={ignoreChipRefs}
      >
        <div className={styles.filterDropdownBody}>
          {presetPeriods.map((p) => {
            const isActive = selectedPeriod[0]?.year === p.start.year
              && selectedPeriod[0]?.month === p.start.month
              && selectedPeriod[0]?.day === p.start.day
              && selectedPeriod[1]?.year === p.end.year
              && selectedPeriod[1]?.month === p.end.month
              && selectedPeriod[1]?.day === p.end.day;
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.filterDropdownItem} ${isActive ? styles.filterDropdownItemActive : ""}`}
                onClick={() => { setSelectedPeriod([p.start, p.end]); close(); setFilterPeriodCustom(false); }}
              >
                <Radio checked={isActive} readOnly />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.periodDropdownFooter}>
          <button
            ref={filterPeriodCustomBtnRef}
            type="button"
            className={`${styles.filterDropdownItem} ${filterPeriodCustom ? styles.filterDropdownItemActive : ""}`}
            onClick={() => setFilterPeriodCustom((v) => !v)}
          >
            <Plus size={14} />
            <span>Período personalizado</span>
            <CaretRight size={12} className={styles.moreMenuArrow} />
          </button>
        </div>
      </FilterDropdown>

      {/* Period filter — custom calendar sub-panel */}
      <FilterDropdown
        open={openFilter === "period" && filterPeriodCustom}
        onClose={() => setFilterPeriodCustom(false)}
        anchorRef={filterPeriodCustomBtnRef}
        placement="right-start"
        noOverlay
      >
        <div className={styles.periodCustomPopover}>
          <DatePicker
            mode="range"
            value={selectedPeriod}
            onChange={(range: [CalendarDate | null, CalendarDate | null]) => {
              setSelectedPeriod(range);
              if (range[0] && range[1]) {
                close();
                setFilterPeriodCustom(false);
              }
            }}
          />
        </div>
      </FilterDropdown>
    </>
  );
}
