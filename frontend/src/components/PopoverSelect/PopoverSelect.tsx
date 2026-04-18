import { useState, useMemo, type ReactNode, type RefObject } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { FilterDropdown, Checkbox, Radio, Avatar, Button } from "@getbud-co/buds";
import styles from "./PopoverSelect.module.css";

/* ——— Types ——— */

export interface PopoverSelectOption {
  id: string;
  label: string;
  /** Avatar initials (renders Avatar when provided) */
  initials?: string;
  /** Avatar image src */
  avatarSrc?: string;
  /** Icon component rendered before the label */
  icon?: Icon;
}

interface BaseProps {
  /** Whether the popover is open */
  open: boolean;
  /** Called when the popover should close */
  onClose: () => void;
  /** Anchor element ref for positioning */
  anchorRef: RefObject<HTMLElement | null>;
  /** FilterDropdown placement */
  placement?: "bottom-start" | "right-start";
  /** Skip overlay (useful for nested/sub-panel popovers) */
  noOverlay?: boolean;
  /** Refs to ignore for click-outside (passed to FilterDropdown) */
  ignoreRefs?: RefObject<HTMLElement | null>[];
  /** List of selectable options */
  options: PopoverSelectOption[];
  /** Render custom content after the indicator (Checkbox/Radio) and before the label */
  renderOptionPrefix?: (option: PopoverSelectOption) => ReactNode;
  /** Enable search filtering */
  searchable?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Content rendered in a footer section (below the list, with top border) */
  footer?: ReactNode;
  /** Text shown when filtered list is empty */
  emptyText?: string;
}

interface SingleSelectProps extends BaseProps {
  /** Single selection mode (Radio indicators) */
  mode: "single";
  value: string | null;
  onChange: (id: string) => void;
  /** Whether to close popover after selecting */
  closeOnSelect?: boolean;
}

interface MultiSelectProps extends BaseProps {
  /** Multiple selection mode (Checkbox indicators) */
  mode: "multiple";
  value: string[];
  onChange: (value: string[]) => void;
  /** Enable inline creation of new options */
  creatable?: boolean;
  /** Placeholder for the create input */
  createPlaceholder?: string;
  /** Called when a new option is created; should return the new option to add */
  onCreateOption?: (label: string) => PopoverSelectOption;
  /** Icon rendered next to each creatable option */
  creatableIcon?: Icon;
}

export type PopoverSelectProps = SingleSelectProps | MultiSelectProps;

/* ——— Helpers ——— */

/**
 * Formats a multi-select value into a display label.
 * Returns first selected label + count of remaining, or the fallback.
 */
export function formatMultiLabel(
  ids: string[],
  options: { id: string; label: string }[],
  fallback: string,
): string {
  if (ids.length === 0) return fallback;
  const labels = ids.map((id) => options.find((o) => o.id === id)?.label ?? id);
  if (labels.length === 1) return labels[0]!;
  return `${labels[0]} +${labels.length - 1}`;
}

/* ——— Component ——— */

export function PopoverSelect(props: PopoverSelectProps) {
  const {
    open,
    onClose,
    anchorRef,
    placement,
    noOverlay,
    ignoreRefs,
    options,
    renderOptionPrefix,
    searchable,
    searchPlaceholder = "Buscar...",
    footer,
    emptyText = "Nenhum resultado encontrado",
  } = props;

  const [search, setSearch] = useState("");
  const [createValue, setCreateValue] = useState("");

  /* Filter options by search term */
  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const term = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, search, searchable]);

  /* Selection helpers */
  function isSelected(id: string): boolean {
    if (props.mode === "single") return props.value === id;
    return props.value.includes(id);
  }

  function handleSelect(id: string) {
    if (props.mode === "single") {
      props.onChange(id);
      if (props.closeOnSelect !== false) onClose();
    } else {
      const prev = props.value;
      props.onChange(
        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
      );
    }
  }

  /* Creatable handler */
  function handleCreate() {
    if (props.mode !== "multiple" || !props.creatable || !props.onCreateOption) return;
    const label = createValue.trim();
    if (!label) return;
    const newOpt = props.onCreateOption(label);
    props.onChange([...props.value, newOpt.id]);
    setCreateValue("");
  }

  const Indicator = props.mode === "single" ? Radio : Checkbox;
  const CreatableIcon = props.mode === "multiple" && props.creatable ? props.creatableIcon : undefined;

  return (
    <FilterDropdown
      open={open}
      onClose={() => {
        setSearch("");
        onClose();
      }}
      anchorRef={anchorRef}
      placement={placement}
      noOverlay={noOverlay}
      ignoreRefs={ignoreRefs}
    >
      <div className={styles.body}>
        {/* Search row */}
        {searchable && (
          <div className={styles.searchRow}>
            <MagnifyingGlass size={14} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Options list */}
        {filtered.length === 0 && (
          <div className={styles.empty}>{emptyText}</div>
        )}
        {filtered.map((opt) => {
          const active = isSelected(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`${styles.item} ${active ? styles.itemActive : ""}`}
              onClick={() => handleSelect(opt.id)}
            >
              <Indicator checked={active} readOnly />
              {renderOptionPrefix?.(opt)}
              {!renderOptionPrefix && opt.initials && (
                <Avatar initials={opt.initials} src={opt.avatarSrc} size="xs" />
              )}
              {!renderOptionPrefix && opt.icon && <opt.icon size={14} />}
              <span>{opt.label}</span>
            </button>
          );
        })}

        {/* Creatable row */}
        {props.mode === "multiple" && props.creatable && props.onCreateOption && (
          <div className={styles.createRow}>
            <input
              type="text"
              className={styles.createInput}
              placeholder={props.createPlaceholder ?? "Criar novo..."}
              value={createValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateValue(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <Button
              variant="tertiary"
              size="sm"
              leftIcon={CreatableIcon ?? Plus}
              aria-label="Criar"
              disabled={!createValue.trim()}
              onClick={handleCreate}
            />
          </div>
        )}
      </div>

      {/* Footer section */}
      {footer && <div className={styles.footer}>{footer}</div>}
    </FilterDropdown>
  );
}

export default PopoverSelect;
