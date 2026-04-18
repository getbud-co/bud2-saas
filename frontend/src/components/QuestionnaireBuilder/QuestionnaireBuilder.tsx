import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash,
  Bank,
  DotsSixVertical,
  DotsThree,
  Asterisk,
  TextAa,
  Paragraph,
  RadioButton,
  CheckSquare,
  CaretCircleDown,
  Sliders,
  ChartBar,
  Star,
  SortAscending,
  Calendar,
  ToggleLeft,
  X,
  ListPlus,
  Rows,
  Lightning,
  Diamond,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import {
  Button,
  Badge,
  Accordion,
  AccordionItem,
  Alert,
  FilterDropdown,
  DropdownButton,
  Modal,
  ModalHeader,
  ModalBody,
  TabBar,
} from "@getbud-co/buds";
import { useQuestionnaire } from "./QuestionnaireContext";
import { QUESTION_BANK } from "@/pages/surveys/templates/questionBank";
import type { QuestionType, WizardQuestion, WizardSection } from "@/types/survey";
import { QUESTION_TYPE_LABELS as QT_LABELS } from "@/utils/questionTypeLabels";
import type { Icon } from "@phosphor-icons/react";
import styles from "./QuestionnaireBuilder.module.css";

/* ——— Question type config ——— */

interface QuestionTypeConfig {
  id: QuestionType;
  label: string;
  icon: Icon;
  group: "text" | "selection" | "scale" | "other";
  badgeColor: "neutral" | "orange" | "wine" | "caramel";
}

const QUESTION_TYPES: QuestionTypeConfig[] = [
  { id: "text_short", label: QT_LABELS.text_short, icon: TextAa, group: "text", badgeColor: "neutral" },
  { id: "text_long", label: QT_LABELS.text_long, icon: Paragraph, group: "text", badgeColor: "neutral" },
  { id: "multiple_choice", label: QT_LABELS.multiple_choice, icon: RadioButton, group: "selection", badgeColor: "orange" },
  { id: "checkbox", label: QT_LABELS.checkbox, icon: CheckSquare, group: "selection", badgeColor: "orange" },
  { id: "dropdown", label: QT_LABELS.dropdown, icon: CaretCircleDown, group: "selection", badgeColor: "orange" },
  { id: "likert", label: QT_LABELS.likert, icon: Sliders, group: "scale", badgeColor: "wine" },
  { id: "nps", label: QT_LABELS.nps, icon: ChartBar, group: "scale", badgeColor: "wine" },
  { id: "rating", label: QT_LABELS.rating, icon: Star, group: "scale", badgeColor: "wine" },
  { id: "ranking", label: QT_LABELS.ranking, icon: SortAscending, group: "scale", badgeColor: "wine" },
  { id: "date", label: QT_LABELS.date, icon: Calendar, group: "other", badgeColor: "caramel" },
  { id: "yes_no", label: QT_LABELS.yes_no, icon: ToggleLeft, group: "other", badgeColor: "caramel" },
];

const TYPE_CONFIG_MAP = Object.fromEntries(QUESTION_TYPES.map((t) => [t.id, t])) as Record<QuestionType, QuestionTypeConfig>;

const GROUP_LABELS: Record<string, string> = {
  text: "Texto",
  selection: "Seleção",
  scale: "Escala",
  other: "Outros",
};

const GROUPS_ORDER = ["text", "selection", "scale", "other"];

/* ——— Bank modal tabs ——— */

const BANK_TABS = [
  { value: "all", label: "Todas" },
  { value: "text", label: "Texto" },
  { value: "selection", label: "Seleção" },
  { value: "scale", label: "Escala" },
  { value: "other", label: "Outros" },
];

/* ——— Fallback data (IDs match config-store) ——— */

const DEFAULT_COMPANY_VALUES = [
  { id: "value-inovacao", label: "Inovação" },
  { id: "value-transparencia", label: "Transparência" },
  { id: "value-colaboracao", label: "Colaboração" },
  { id: "value-excelencia", label: "Excelência" },
  { id: "value-foco-cliente", label: "Foco no cliente" },
  { id: "value-integridade", label: "Integridade" },
];

// Note: Cycles are generated dynamically by config-store.
// These defaults are fallbacks if props are not provided.
// The parent component (StepQuestionnaire) should always pass cycles from context.
const DEFAULT_CYCLES: { id: string; label: string; status: string }[] = [];

let newQuestionCounter = 0;
let sectionCounter = 0;
let optionCounter = 0;

function generateOptionId(): string {
  return `opt-${Date.now()}-${++optionCounter}`;
}

function generateSectionId(): string {
  return `s-new-${Date.now()}-${++sectionCounter}`;
}

/* ——— Flat item type for unified DnD ——— */

interface FlatItem {
  kind: "section" | "question";
  id: string;
}

/* ——— Props ——— */

export interface QuestionnaireBuilderProps {
  /** Callback for "Criar pergunta com IA" button. If omitted, button is hidden. */
  onAiCreate?: () => void;
  /** Company values for token input. Defaults to mock data. */
  companyValues?: { id: string; label: string }[];
  /** Cycles for token input. Defaults to mock data. */
  cycles?: { id: string; label: string; status: string }[];
}

/* ——— Inline type preview/config ——— */

function QuestionTypePreview({
  question,
  onUpdate,
}: {
  question: WizardQuestion;
  onUpdate: (id: string, changes: Partial<WizardQuestion>) => void;
}) {
  const { type } = question;

  /* --- Options editor (multiple_choice, checkbox, dropdown, ranking) --- */
  if (type === "multiple_choice" || type === "checkbox" || type === "dropdown" || type === "ranking") {
    const options = question.options ?? [];
    const iconMap: Record<string, React.ReactNode> = {
      multiple_choice: <div className={styles.optionRadio} />,
      checkbox: <div className={styles.optionCheckbox} />,
      dropdown: null,
      ranking: null,
    };

    function addOption() {
      const newOpts = [...options, { id: generateOptionId(), label: "" }];
      onUpdate(question.id, { options: newOpts });
    }

    function updateOption(optId: string, label: string) {
      onUpdate(question.id, {
        options: options.map((o) => (o.id === optId ? { ...o, label } : o)),
      });
    }

    function removeOption(optId: string) {
      onUpdate(question.id, {
        options: options.filter((o) => o.id !== optId),
      });
    }

    return (
      <div className={styles.previewBlock}>
        {options.map((opt, i) => (
          <div key={opt.id} className={styles.optionRow}>
            {type === "dropdown" || type === "ranking" ? (
              <span className={styles.optionIndex}>{i + 1}.</span>
            ) : (
              iconMap[type]
            )}
            <input
              type="text"
              className={styles.optionInput}
              placeholder={`Opção ${i + 1}`}
              value={opt.label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateOption(opt.id, e.target.value)
              }
            />
            <button
              type="button"
              className={styles.optionRemove}
              onClick={() => removeOption(opt.id)}
              aria-label="Remover opção"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button type="button" className={styles.addOptionBtn} onClick={addOption}>
          <Plus size={14} />
          <span>Adicionar opção</span>
        </button>
      </div>
    );
  }

  /* --- Likert scale config --- */
  if (type === "likert") {
    const min = question.scaleMin ?? 1;
    const max = question.scaleMax ?? 5;
    const labels = question.scaleLabels ?? {};

    return (
      <div className={styles.previewBlock}>
        <div className={styles.scaleConfig}>
          <div className={styles.scaleRange}>
            <select
              className={styles.scaleSelect}
              value={min}
              onChange={(e) => onUpdate(question.id, { scaleMin: Number(e.target.value) })}
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
            </select>
            <span className={styles.scaleTo}>até</span>
            <select
              className={styles.scaleSelect}
              value={max}
              onChange={(e) => onUpdate(question.id, { scaleMax: Number(e.target.value) })}
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={7}>7</option>
              <option value={10}>10</option>
            </select>
          </div>
          <div className={styles.scalePreview}>
            {Array.from({ length: max - min + 1 }, (_, i) => (
              <span key={i} className={styles.scaleNumber}>{min + i}</span>
            ))}
          </div>
          <div className={styles.scaleLabels}>
            <input
              type="text"
              className={styles.scaleLabelInput}
              placeholder="Label mínimo (ex: Discordo totalmente)"
              value={labels.min ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(question.id, { scaleLabels: { ...labels, min: e.target.value } })
              }
            />
            <input
              type="text"
              className={styles.scaleLabelInput}
              placeholder="Label máximo (ex: Concordo totalmente)"
              value={labels.max ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(question.id, { scaleLabels: { ...labels, max: e.target.value } })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  /* --- NPS --- */
  if (type === "nps") {
    const labels = question.scaleLabels ?? {};
    return (
      <div className={styles.previewBlock}>
        <div className={styles.scaleConfig}>
          <div className={styles.scalePreview}>
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} className={styles.scaleNumber}>{i}</span>
            ))}
          </div>
          <div className={styles.scaleLabels}>
            <input
              type="text"
              className={styles.scaleLabelInput}
              placeholder="Label para 0 (ex: Nada provável)"
              value={labels.min ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(question.id, { scaleLabels: { ...labels, min: e.target.value } })
              }
            />
            <input
              type="text"
              className={styles.scaleLabelInput}
              placeholder="Label para 10 (ex: Extremamente provável)"
              value={labels.max ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate(question.id, { scaleLabels: { ...labels, max: e.target.value } })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  /* --- Rating --- */
  if (type === "rating") {
    const max = question.ratingMax ?? 5;
    return (
      <div className={styles.previewBlock}>
        <div className={styles.ratingConfig}>
          <div className={styles.ratingStars}>
            {Array.from({ length: max }, (_, i) => (
              <Star key={i} size={24} className={styles.ratingStar} />
            ))}
          </div>
          <div className={styles.ratingMaxRow}>
            <span className={styles.ratingLabel}>Estrelas:</span>
            <select
              className={styles.scaleSelect}
              value={max}
              onChange={(e) => onUpdate(question.id, { ratingMax: Number(e.target.value) })}
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={7}>7</option>
              <option value={10}>10</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  /* --- Yes/No --- */
  if (type === "yes_no") {
    return (
      <div className={styles.previewBlock}>
        <div className={styles.yesNoPreview}>
          <div className={styles.optionRow}>
            <div className={styles.optionRadio} />
            <span className={styles.optionFixed}>Sim</span>
          </div>
          <div className={styles.optionRow}>
            <div className={styles.optionRadio} />
            <span className={styles.optionFixed}>Não</span>
          </div>
        </div>
      </div>
    );
  }

  /* --- Date --- */
  if (type === "date") {
    return (
      <div className={styles.previewBlock}>
        <div className={styles.datePreview}>
          <Calendar size={16} />
          <span>DD / MM / AAAA</span>
        </div>
      </div>
    );
  }

  /* --- Text short --- */
  if (type === "text_short") {
    return (
      <div className={styles.previewBlock}>
        <div className={styles.textPreview} />
      </div>
    );
  }

  /* --- Text long --- */
  if (type === "text_long") {
    return (
      <div className={styles.previewBlock}>
        <div className={styles.textareaPreview} />
      </div>
    );
  }

  return null;
}

/* ——— Token input (contentEditable with inline badges) ——— */

interface QuestionTokenInputHandle {
  insertToken: (type: "value" | "cycle", id: string) => void;
}

function tokenLabelLookup(
  type: "value" | "cycle",
  id: string,
  companyValues: { id: string; label: string }[],
  cycles: { id: string; label: string }[],
): string {
  if (type === "value") return companyValues.find((v) => v.id === id)?.label ?? id;
  return cycles.find((c) => c.id === id)?.label ?? id;
}

function buildTokenSpan(type: string, id: string, label: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.draggable = true;
  span.dataset.tokenType = type;
  span.dataset.tokenId = id;
  span.className = styles.inlineToken ?? "";

  const iconChar = type === "value" ? "\u25C6" : "\u21BB";
  const iconSpan = document.createElement("span");
  iconSpan.className = styles.inlineTokenIcon ?? "";
  iconSpan.textContent = iconChar;

  const labelNode = document.createTextNode("\u00A0" + label);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.dataset.remove = "true";
  removeBtn.className = styles.inlineTokenX ?? "";
  removeBtn.setAttribute("aria-label", "Remover");
  removeBtn.textContent = "\u00D7";

  span.appendChild(iconSpan);
  span.appendChild(labelNode);
  span.appendChild(removeBtn);
  return span;
}

const TOKEN_REGEX = /\{\{(value|cycle):([^}]+)\}\}/g;

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function textToHTML(
  text: string,
  companyValues: { id: string; label: string }[],
  cycles: { id: string; label: string }[],
): string {
  if (!text) return "";
  const parts: string[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_REGEX.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(escapeHTML(text.slice(lastIdx, m.index)));
    }
    const type = m[1];
    const id = m[2];
    if (!type || !id) continue;
    const label = tokenLabelLookup(type as "value" | "cycle", id, companyValues, cycles);
    const iconChar = type === "value" ? "◆" : "↻";
    parts.push(
      `<span contenteditable="false" draggable="true" data-token-type="${type}" data-token-id="${id}" class="${styles.inlineToken}"><span class="${styles.inlineTokenIcon}">${iconChar}</span>\u00A0${escapeHTML(label)}<button type="button" data-remove="true" class="${styles.inlineTokenX}" aria-label="Remover">\u00D7</button></span>`
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(escapeHTML(text.slice(lastIdx)));
  }
  return parts.join("");
}

function serializeDOM(el: HTMLElement): string {
  let result = "";
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? "";
    } else if (node instanceof HTMLElement) {
      if (styles.dropIndicator && node.classList.contains(styles.dropIndicator)) continue;
      if (node.dataset.tokenType && node.dataset.tokenId) {
        result += `{{${node.dataset.tokenType}:${node.dataset.tokenId}}}`;
      } else {
        result += serializeDOM(node);
      }
    }
  }
  return result;
}

const QuestionTokenInput = forwardRef<QuestionTokenInputHandle, {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  companyValues: { id: string; label: string }[];
  cycles: { id: string; label: string }[];
}>(function QuestionTokenInput({ value, onChange, placeholder, className, companyValues, cycles }, ref) {
  const divRef = useRef<HTMLDivElement>(null);
  const lastSerializedRef = useRef(value);
  const draggedTokenRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!divRef.current) return;
    const currentSerialized = serializeDOM(divRef.current);
    if (currentSerialized !== value) {
      divRef.current.innerHTML = textToHTML(value, companyValues, cycles);
    }
    lastSerializedRef.current = value;
  }, [value, companyValues, cycles]);

  function emitChange() {
    if (!divRef.current) return;
    const serialized = serializeDOM(divRef.current);
    if (serialized !== lastSerializedRef.current) {
      lastSerializedRef.current = serialized;
      onChange(serialized);
    }
  }

  function removeDropIndicator() {
    if (!divRef.current) return;
    const existing = divRef.current.querySelector(`.${styles.dropIndicator}`);
    if (existing) existing.remove();
  }

  function caretRangeAt(x: number, y: number): Range | null {
    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(x, y);
    }
    const doc = document as unknown as { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
    if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(x, y);
      if (pos) {
        const range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.setEnd(pos.offsetNode, pos.offset);
        return range;
      }
    }
    return null;
  }

  function handleDragStart(e: React.DragEvent) {
    const token = (e.target as HTMLElement).closest("[data-token-type]") as HTMLSpanElement | null;
    if (!token || !divRef.current?.contains(token)) {
      e.preventDefault();
      return;
    }
    draggedTokenRef.current = token;
    if (styles.inlineTokenDragging) token.classList.add(styles.inlineTokenDragging);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  }

  function handleDragOver(e: React.DragEvent) {
    if (!draggedTokenRef.current || !divRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    removeDropIndicator();
    const range = caretRangeAt(e.clientX, e.clientY);
    if (range && divRef.current.contains(range.startContainer)) {
      const ancestor = range.startContainer instanceof HTMLElement
        ? range.startContainer
        : range.startContainer.parentElement;
      if (ancestor?.closest("[data-token-type]") === draggedTokenRef.current) return;

      const indicator = document.createElement("span");
      indicator.className = styles.dropIndicator ?? "";
      indicator.contentEditable = "false";
      range.insertNode(indicator);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    removeDropIndicator();
    const token = draggedTokenRef.current;
    if (!token || !divRef.current) return;

    if (styles.inlineTokenDragging) token.classList.remove(styles.inlineTokenDragging);

    const range = caretRangeAt(e.clientX, e.clientY);
    if (!range || !divRef.current.contains(range.startContainer)) {
      draggedTokenRef.current = null;
      return;
    }

    token.remove();

    const spaceBefore = document.createTextNode("\u00A0");
    const spaceAfter = document.createTextNode("\u00A0");
    range.insertNode(spaceAfter);
    range.insertNode(token);
    range.insertNode(spaceBefore);

    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStartAfter(spaceAfter);
      newRange.setEndAfter(spaceAfter);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    draggedTokenRef.current = null;
    emitChange();
  }

  function handleDragEnd() {
    removeDropIndicator();
    if (draggedTokenRef.current) {
      if (styles.inlineTokenDragging) {
        draggedTokenRef.current.classList.remove(styles.inlineTokenDragging);
      }
      draggedTokenRef.current = null;
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!divRef.current?.contains(e.relatedTarget as Node)) {
      removeDropIndicator();
    }
  }

  function handleClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.dataset.remove === "true" || target.closest("[data-remove='true']")) {
      e.preventDefault();
      e.stopPropagation();
      const tokenEl = target.closest("[data-token-type]");
      if (tokenEl && divRef.current) {
        tokenEl.remove();
        emitChange();
        divRef.current.focus();
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") e.preventDefault();
  }

  useImperativeHandle(ref, () => ({
    insertToken(type: "value" | "cycle", id: string) {
      if (!divRef.current) return;
      divRef.current.focus();

      const label = tokenLabelLookup(type, id, companyValues, cycles);
      const span = buildTokenSpan(type, id, label);
      const spacer = document.createTextNode("\u00A0");

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (divRef.current.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          range.insertNode(spacer);
          range.insertNode(span);
          range.setStartAfter(spacer);
          range.setEndAfter(spacer);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          divRef.current.appendChild(span);
          divRef.current.appendChild(spacer);
        }
      } else {
        divRef.current.appendChild(span);
        divRef.current.appendChild(spacer);
      }

      emitChange();
    },
  }));

  return (
    <div
      ref={divRef}
      className={className}
      contentEditable
      suppressContentEditableWarning
      onInput={emitChange}
      onClick={handleClick}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onDragLeave={handleDragLeave}
      data-placeholder={placeholder}
      role="textbox"
      aria-placeholder={placeholder}
    />
  );
});

/* ——— Sortable section header ——— */

function SortableSectionHeader({
  section,
  onUpdate,
  onRemove,
}: {
  section: WizardSection;
  onUpdate: (id: string, changes: Partial<WizardSection>) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.sectionCard} data-item-id={section.id}>
      <button
        type="button"
        className={styles.sectionDragHandle}
        {...attributes}
        {...listeners}
        aria-label="Arrastar seção para reordenar"
      >
        <DotsSixVertical size={16} />
      </button>
      <div className={styles.sectionFields}>
        <input
          type="text"
          className={styles.sectionTitleInput}
          placeholder="Título da seção..."
          value={section.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onUpdate(section.id, { title: e.target.value })
          }
        />
        <input
          type="text"
          className={styles.sectionDescInput}
          placeholder="Descrição da seção (opcional)"
          value={section.description ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onUpdate(section.id, { description: e.target.value || undefined })
          }
        />
      </div>
      <button
        type="button"
        className={styles.sectionRemove}
        onClick={() => onRemove(section.id)}
        aria-label="Remover seção"
      >
        <Trash size={14} />
      </button>
    </div>
  );
}

/* ——— Sortable question card ——— */

interface SortableQuestionProps {
  question: WizardQuestion;
  index: number;
  onUpdate: (id: string, changes: Partial<WizardQuestion>) => void;
  typeBtnRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  moreBtnRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  tokenInputRefs: React.MutableRefObject<Record<string, QuestionTokenInputHandle | null>>;
  onOpenType: (id: string) => void;
  onOpenMore: (id: string) => void;
  typeOpenId: string | null;
  moreOpenId: string | null;
  companyValues: { id: string; label: string }[];
  cycles: { id: string; label: string }[];
}

function SortableQuestion({
  question,
  index,
  onUpdate,
  typeBtnRefs,
  moreBtnRefs,
  tokenInputRefs,
  onOpenType,
  onOpenMore,
  typeOpenId,
  moreOpenId,
  companyValues,
  cycles,
}: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const typeConfig = TYPE_CONFIG_MAP[question.type];
  const TypeIcon = typeConfig?.icon;

  return (
    <div ref={setNodeRef} style={style} className={styles.questionCard} data-item-id={question.id}>
      <button
        type="button"
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
      >
        <DotsSixVertical size={16} />
      </button>

      <div className={styles.questionContent}>
        <div className={styles.questionFields}>
          <div className={styles.questionTitleRow}>
            <span className={styles.questionNumber}>{index + 1}.</span>
            <QuestionTokenInput
              ref={(el) => { tokenInputRefs.current[question.id] = el; }}
              value={question.text}
              onChange={(text) => onUpdate(question.id, { text })}
              placeholder="Texto da pergunta..."
              className={styles.questionTitleInput}
              companyValues={companyValues}
              cycles={cycles}
            />
            {question.isRequired && (
              <Asterisk size={12} className={styles.requiredIcon} />
            )}
          </div>

          <input
            type="text"
            className={styles.questionDescInput}
            placeholder="Descrição da pergunta (opcional)"
            value={question.description ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onUpdate(question.id, { description: e.target.value || undefined })
            }
          />
        </div>

        <QuestionTypePreview question={question} onUpdate={onUpdate} />

        <div className={styles.questionActions}>
          <Button
            ref={(el: HTMLButtonElement | null) => { typeBtnRefs.current[question.id] = el; }}
            variant="secondary"
            size="sm"
            leftIcon={TypeIcon}
            onClick={() => onOpenType(typeOpenId === question.id ? "" : question.id)}
          >
            {typeConfig?.label ?? question.type}
          </Button>

          <Button
            variant={question.isRequired ? "primary" : "secondary"}
            size="sm"
            leftIcon={Asterisk}
            onClick={() => onUpdate(question.id, { isRequired: !question.isRequired })}
          >
            {question.isRequired ? "É obrigatório" : "É opcional"}
          </Button>

          <Button
            ref={(el: HTMLButtonElement | null) => { moreBtnRefs.current[question.id] = el; }}
            variant="secondary"
            size="sm"
            leftIcon={DotsThree}
            aria-label="Mais opções"
            onClick={() => onOpenMore(moreOpenId === question.id ? "" : question.id)}
          />
        </div>
      </div>
    </div>
  );
}

/* ——— Main component ——— */

export function QuestionnaireBuilder({
  onAiCreate,
  companyValues = DEFAULT_COMPANY_VALUES,
  cycles = DEFAULT_CYCLES,
}: QuestionnaireBuilderProps) {
  const { questions, sections, dispatch } = useQuestionnaire();
  const [bankOpen, setBankOpen] = useState(false);
  const [bankTab, setBankTab] = useState("all");
  const [typeOpenId, setTypeOpenId] = useState<string | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null);
  const [valueOpenId, setValueOpenId] = useState<string | null>(null);
  const [cycleOpenId, setCycleOpenId] = useState<string | null>(null);
  const typeBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const moreBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tokenInputRefs = useRef<Record<string, QuestionTokenInputHandle | null>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* Build flat items list: sections + questions interleaved by position */
  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    const sectionMap = new Map<string | null, WizardQuestion[]>();

    for (const q of questions) {
      const key = q.sectionId;
      if (!sectionMap.has(key)) sectionMap.set(key, []);
      sectionMap.get(key)!.push(q);
    }

    // Unsectioned questions first
    const unsectioned = sectionMap.get(null) ?? [];
    for (const q of unsectioned) items.push({ kind: "question", id: q.id });

    // Then each section header followed by its questions
    for (const section of sections) {
      items.push({ kind: "section", id: section.id });
      const sectionQs = sectionMap.get(section.id) ?? [];
      for (const q of sectionQs) items.push({ kind: "question", id: q.id });
    }

    return items;
  }, [questions, sections]);

  const flatItemIds = useMemo(() => flatItems.map((i) => i.id), [flatItems]);

  /* Question index map (1-based, for display) */
  const questionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const item of flatItems) {
      if (item.kind === "question") {
        map.set(item.id, idx);
        idx++;
      }
    }
    return map;
  }, [flatItems]);

  /* Auto-scroll and auto-focus newly added items */
  useEffect(() => {
    if (!scrollTargetRef.current || !listRef.current) return;
    const targetId = scrollTargetRef.current;
    scrollTargetRef.current = null;
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-item-id="${targetId}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Focus the title field (contentEditable div for questions, input for sections)
      requestAnimationFrame(() => {
        const titleInput = el.querySelector<HTMLElement>(`.${styles.questionTitleInput}`) ??
                           el.querySelector<HTMLInputElement>(`.${styles.sectionTitleInput}`);
        if (titleInput) titleInput.focus();
      });
    });
  }, [questions.length, sections.length]);

  /* ——— Dropdown "Adicionar" handler ——— */

  const addItems = useMemo(() => {
    const items = [
      { id: "question", label: "Adicionar pergunta", icon: ListPlus },
      { id: "section", label: "Adicionar seção", icon: Rows },
    ];
    if (onAiCreate) {
      items.push({ id: "ai", label: "Criar pergunta com IA", icon: Lightning });
    }
    return items;
  }, [onAiCreate]);

  function handleAddItem(item: { id: string }) {
    if (item.id === "question") {
      const id = `q-new-${Date.now()}-${++newQuestionCounter}`;
      const lastSectionId = sections.length > 0 ? (sections[sections.length - 1]?.id ?? null) : null;
      dispatch({
        type: "ADD_QUESTION",
        payload: { id, sectionId: lastSectionId, type: "multiple_choice", text: "", isRequired: true, options: [{ id: generateOptionId(), label: "Opção 1" }] },
      });
      scrollTargetRef.current = id;
    } else if (item.id === "section") {
      const id = generateSectionId();
      dispatch({
        type: "ADD_SECTION",
        payload: { id, title: "", description: undefined },
      });
      scrollTargetRef.current = id;
    } else if (item.id === "ai" && onAiCreate) {
      onAiCreate();
    }
  }

  /* ——— Bank modal ——— */

  const filteredBank = useMemo(() => {
    if (bankTab === "all") return QUESTION_BANK;
    return QUESTION_BANK.filter((cat) => {
      const groupTypes = QUESTION_TYPES.filter((t) => t.group === bankTab);
      const typeIds = new Set(groupTypes.map((t) => t.id));
      return cat.questions.some((q) => typeIds.has(q.type));
    }).map((cat) => {
      if (bankTab === "all") return cat;
      const groupTypes = QUESTION_TYPES.filter((t) => t.group === bankTab);
      const typeIds = new Set(groupTypes.map((t) => t.id));
      return { ...cat, questions: cat.questions.filter((q) => typeIds.has(q.type)) };
    });
  }, [bankTab]);

  function handleAddFromBank(bankQ: typeof QUESTION_BANK[number]["questions"][number]) {
    const id = `q-bank-${Date.now()}-${++newQuestionCounter}`;
    const lastSectionId = sections.length > 0 ? (sections[sections.length - 1]?.id ?? null) : null;
    dispatch({
      type: "ADD_QUESTION",
      payload: {
        id,
        sectionId: lastSectionId,
        type: bankQ.type,
        text: bankQ.text,
        isRequired: true,
        options: bankQ.options,
        scaleMin: bankQ.scaleMin,
        scaleMax: bankQ.scaleMax,
        scaleLabels: bankQ.scaleLabels,
        ratingMax: bankQ.ratingMax,
      },
    });
    scrollTargetRef.current = id;
  }

  /* ——— Unified DnD handler ——— */

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdx = flatItems.findIndex((i) => i.id === active.id);
    const overIdx = flatItems.findIndex((i) => i.id === over.id);
    if (activeIdx < 0 || overIdx < 0) return;

    const moved = flatItems[activeIdx];
    if (!moved) return;

    // Build new flat items order
    const newFlat = [...flatItems];
    newFlat.splice(activeIdx, 1);
    newFlat.splice(overIdx, 0, moved);

    // Rebuild sections & questions from new flat order
    const newSections: WizardSection[] = [];
    const newQuestions: WizardQuestion[] = [];
    let currentSectionId: string | null = null;

    for (const item of newFlat) {
      if (item.kind === "section") {
        const s = sections.find((sec) => sec.id === item.id);
        if (s) newSections.push(s);
        currentSectionId = item.id;
      } else {
        const q = questions.find((qu) => qu.id === item.id);
        if (q) newQuestions.push({ ...q, sectionId: currentSectionId });
      }
    }

    dispatch({ type: "REORDER_ALL", payload: { sections: newSections, questions: newQuestions } });
  }

  /* ——— Handlers forwarding to dispatch ——— */

  function handleUpdate(id: string, changes: Partial<WizardQuestion>) {
    dispatch({ type: "UPDATE_QUESTION", payload: { id, changes } });
  }

  function handleUpdateSection(id: string, changes: Partial<WizardSection>) {
    dispatch({ type: "UPDATE_SECTION", payload: { id, changes } });
  }

  function handleRemoveSection(id: string) {
    dispatch({ type: "REMOVE_SECTION", payload: id });
  }

  function handleRemove(id: string) {
    dispatch({ type: "REMOVE_QUESTION", payload: id });
    if (moreOpenId === id) setMoreOpenId(null);
  }

  function handleSetType(type: QuestionType) {
    if (!typeOpenId) return;
    const defaults: Partial<WizardQuestion> = { type };
    if (type === "multiple_choice" || type === "checkbox" || type === "dropdown" || type === "ranking") {
      defaults.options = [{ id: generateOptionId(), label: "Opção 1" }];
      defaults.scaleMin = undefined;
      defaults.scaleMax = undefined;
      defaults.scaleLabels = undefined;
      defaults.ratingMax = undefined;
    } else if (type === "likert") {
      defaults.scaleMin = 1;
      defaults.scaleMax = 5;
      defaults.scaleLabels = { min: "", max: "" };
      defaults.options = undefined;
      defaults.ratingMax = undefined;
    } else if (type === "nps") {
      defaults.scaleLabels = { min: "Nada provável", max: "Extremamente provável" };
      defaults.options = undefined;
      defaults.scaleMin = undefined;
      defaults.scaleMax = undefined;
      defaults.ratingMax = undefined;
    } else if (type === "rating") {
      defaults.ratingMax = 5;
      defaults.options = undefined;
      defaults.scaleMin = undefined;
      defaults.scaleMax = undefined;
      defaults.scaleLabels = undefined;
    } else {
      defaults.options = undefined;
      defaults.scaleMin = undefined;
      defaults.scaleMax = undefined;
      defaults.scaleLabels = undefined;
      defaults.ratingMax = undefined;
    }
    handleUpdate(typeOpenId, defaults);
    setTypeOpenId(null);
  }

  /* Build section lookup for rendering */
  const sectionLookup = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  );

  return (
    <div className={styles.step}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.pageTitle}>Questionário</h2>
          <p className={styles.subtitle}>
            {questions.length} {questions.length === 1 ? "pergunta" : "perguntas"}
            {sections.length > 0 && ` · ${sections.length} ${sections.length === 1 ? "seção" : "seções"}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <DropdownButton
            items={addItems}
            onSelect={handleAddItem}
            variant="secondary"
            size="md"
          >
            Adicionar
          </DropdownButton>
          <Button variant="secondary" size="md" leftIcon={Bank} onClick={() => setBankOpen(true)}>
            Banco de perguntas
          </Button>
        </div>
      </div>

      {questions.length === 0 && sections.length === 0 && (
        <Alert variant="info" title="Nenhuma pergunta">
          Adicione perguntas manualmente, use o banco de perguntas ou crie com IA.
        </Alert>
      )}

      {/* Unified sortable list: sections + questions */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={flatItemIds} strategy={verticalListSortingStrategy}>
          <div className={styles.questionList} ref={listRef}>
            {flatItems.map((item) => {
              if (item.kind === "section") {
                const section = sectionLookup.get(item.id);
                if (!section) return null;
                return (
                  <SortableSectionHeader
                    key={section.id}
                    section={section}
                    onUpdate={handleUpdateSection}
                    onRemove={handleRemoveSection}
                  />
                );
              }

              const question = questions.find((q) => q.id === item.id);
              if (!question) return null;
              const globalIndex = questionIndexMap.get(question.id) ?? 0;

              return (
                <SortableQuestion
                  key={question.id}
                  question={question}
                  index={globalIndex}
                  onUpdate={handleUpdate}
                  typeBtnRefs={typeBtnRefs}
                  moreBtnRefs={moreBtnRefs}
                  tokenInputRefs={tokenInputRefs}
                  onOpenType={setTypeOpenId}
                  onOpenMore={setMoreOpenId}
                  typeOpenId={typeOpenId}
                  moreOpenId={moreOpenId}
                  companyValues={companyValues}
                  cycles={cycles}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Type selection popover — grouped with icons */}
      <FilterDropdown
        open={!!typeOpenId}
        onClose={() => setTypeOpenId(null)}
        anchorRef={{ current: typeOpenId ? typeBtnRefs.current[typeOpenId] ?? null : null }}
      >
        <div className={styles.typeDropdown}>
          {GROUPS_ORDER.map((groupKey) => {
            const groupTypes = QUESTION_TYPES.filter((t) => t.group === groupKey);
            if (groupTypes.length === 0) return null;
            return (
              <div key={groupKey} className={styles.typeGroup}>
                <span className={styles.typeGroupLabel}>{GROUP_LABELS[groupKey]}</span>
                {groupTypes.map((t) => {
                  const isActive = typeOpenId
                    ? questions.find((q) => q.id === typeOpenId)?.type === t.id
                    : false;
                  const IconComp = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`${styles.typeMenuItem} ${isActive ? styles.typeMenuItemActive : ""}`}
                      onClick={() => handleSetType(t.id)}
                    >
                      <IconComp size={16} className={styles.typeMenuIcon} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </FilterDropdown>

      {/* DotsThree popover — more actions */}
      <FilterDropdown
        open={!!moreOpenId}
        onClose={() => setMoreOpenId(null)}
        anchorRef={{ current: moreOpenId ? moreBtnRefs.current[moreOpenId] ?? null : null }}
      >
        <div className={styles.moreDropdown}>
          <button
            type="button"
            className={styles.moreMenuItem}
            onClick={() => {
              if (moreOpenId) {
                const id = moreOpenId;
                setMoreOpenId(null);
                requestAnimationFrame(() => setValueOpenId(id));
              }
            }}
          >
            <Diamond size={14} />
            <span>Vincular valor da empresa</span>
          </button>
          <button
            type="button"
            className={styles.moreMenuItem}
            onClick={() => {
              if (moreOpenId) {
                const id = moreOpenId;
                setMoreOpenId(null);
                requestAnimationFrame(() => setCycleOpenId(id));
              }
            }}
          >
            <ArrowsClockwise size={14} />
            <span>Vincular ciclo</span>
          </button>
          <div className={styles.moreMenuDivider} />
          <button
            type="button"
            className={`${styles.moreMenuItem} ${styles.moreMenuItemDanger}`}
            onClick={() => { if (moreOpenId) handleRemove(moreOpenId); }}
          >
            <Trash size={14} />
            <span>Remover pergunta</span>
          </button>
        </div>
      </FilterDropdown>

      {/* Company value popover — inserts token into question text */}
      <FilterDropdown
        open={!!valueOpenId}
        onClose={() => setValueOpenId(null)}
        anchorRef={{ current: valueOpenId ? moreBtnRefs.current[valueOpenId] ?? null : null }}
      >
        <div className={styles.linkDropdown}>
          <span className={styles.linkDropdownTitle}>Inserir valor da empresa</span>
          {companyValues.map((val) => (
            <button
              key={val.id}
              type="button"
              className={styles.linkMenuItem}
              onClick={() => {
                if (valueOpenId) {
                  tokenInputRefs.current[valueOpenId]?.insertToken("value", val.id);
                  setValueOpenId(null);
                }
              }}
            >
              <Diamond size={14} className={styles.linkMenuIcon} />
              <span>{val.label}</span>
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Cycle popover — inserts token into question text */}
      <FilterDropdown
        open={!!cycleOpenId}
        onClose={() => setCycleOpenId(null)}
        anchorRef={{ current: cycleOpenId ? moreBtnRefs.current[cycleOpenId] ?? null : null }}
      >
        <div className={styles.linkDropdown}>
          <span className={styles.linkDropdownTitle}>Inserir ciclo</span>
          {cycles.map((cycle) => (
            <button
              key={cycle.id}
              type="button"
              className={styles.linkMenuItem}
              onClick={() => {
                if (cycleOpenId) {
                  tokenInputRefs.current[cycleOpenId]?.insertToken("cycle", cycle.id);
                  setCycleOpenId(null);
                }
              }}
            >
              <ArrowsClockwise size={14} className={styles.linkMenuIcon} />
              <span>{cycle.label}</span>
              <Badge color={cycle.status === "active" ? "success" : "neutral"} size="sm">
                {cycle.status === "active" ? "Ativo" : "Planejamento"}
              </Badge>
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Question bank modal */}
      <Modal open={bankOpen} onClose={() => setBankOpen(false)} size="lg">
        <ModalHeader title="Banco de perguntas" description="Selecione perguntas prontas para adicionar ao questionário" onClose={() => setBankOpen(false)} />
        <ModalBody>
          <div className={styles.bankContent}>
            <TabBar
              tabs={BANK_TABS}
              activeTab={bankTab}
              onTabChange={setBankTab}
            />

            <div className={styles.bankBody}>
              {filteredBank.length === 0 ? (
                <p className={styles.bankEmpty}>Nenhuma pergunta encontrada para este filtro.</p>
              ) : (
                <Accordion>
                  {filteredBank.map((category) => (
                    <AccordionItem
                      key={category.id}
                      title={category.label}
                      description={`${category.questions.length} perguntas`}
                    >
                      <div className={styles.bankQuestions}>
                        {category.questions.map((bq) => {
                          const alreadyAdded = questions.some((q) => q.text === bq.text);
                          const tc = TYPE_CONFIG_MAP[bq.type];
                          const BqIcon = tc?.icon;
                          return (
                            <button
                              key={bq.id}
                              type="button"
                              className={`${styles.bankQuestion} ${alreadyAdded ? styles.bankQuestionAdded : ""}`}
                              onClick={() => { if (!alreadyAdded) handleAddFromBank(bq); }}
                              disabled={alreadyAdded}
                            >
                              {BqIcon && <BqIcon size={16} className={styles.bankQuestionIcon} />}
                              <span className={styles.bankQuestionText}>{bq.text}</span>
                              <Badge color={tc?.badgeColor ?? "neutral"} size="sm">
                                {tc?.label ?? bq.type}
                              </Badge>
                              {alreadyAdded && (
                                <span className={styles.bankAddedLabel}>Adicionada</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
