import { useState, useMemo, type ChangeEvent } from "react";
import { formatDateBR } from "@/lib/date-format";
import {
  Table,
  TableCardHeader,
  TableContent,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableBulkActions,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Toggle,
  toast,
  RowActionsPopover,
  useDataTable,
} from "@getbud-co/buds";
import type { PopoverItem } from "@getbud-co/buds";
import {
  Plus,
  PencilSimple,
  Trash,
  MagnifyingGlass,
  Copy,
} from "@phosphor-icons/react";
import {
  QuestionnaireBuilder,
  QuestionnaireProvider,
  useQuestionnaire,
} from "@/components/QuestionnaireBuilder";
import { useSurveysData } from "@/contexts/SurveysDataContext";
import type { SurveyType, WizardQuestion, WizardSection, QuestionType } from "@/types/survey";
import type { SurveyTemplateRecord } from "@/lib/surveys-store";
import styles from "./SurveyTemplatesModule.module.css";

/* ——— Types ——— */

interface TemplateQuestionDraft {
  id: string;
  type: string;
  text: string;
  isRequired: boolean;
  options: { id: string; label: string }[];
}

interface TemplateSectionDraft {
  id: string;
  title: string;
  description: string;
  questions: TemplateQuestionDraft[];
}

interface SurveyTemplateItem {
  id: string;
  type: SurveyType;
  name: string;
  subtitle: string;
  category: "pesquisa" | "ciclo";
  isSystem: boolean;
  isAnonymous: boolean;
  sections: TemplateSectionDraft[];
  questionCount: number;
  linkedSurveys: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "pesquisa", label: "Pesquisa" },
  { value: "ciclo", label: "Ciclo de avaliação" },
];

/* ——— Helpers ——— */

function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseDate(str: string): number {
  const [d = 1, m = 1, y = 1970] = str.split("/").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function formatIsoToBrDate(iso: string): string {
  return formatDateBR(iso) || "-";
}

function mapTemplateSections(template: SurveyTemplateRecord): TemplateSectionDraft[] {
  const mapped: TemplateSectionDraft[] = template.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description ?? "",
    questions: template.questions
      .filter((question) => question.sectionId === section.id)
      .map((question) => ({
        id: question.id,
        type: question.type,
        text: question.text,
        isRequired: question.isRequired,
        options: question.options ?? [],
      })),
  }));

  const unsectioned = template.questions.filter((question) => question.sectionId === null);
  if (unsectioned.length > 0) {
    mapped.unshift({
      id: `general-${template.id}`,
      title: "Geral",
      description: "",
      questions: unsectioned.map((question) => ({
        id: question.id,
        type: question.type,
        text: question.text,
        isRequired: question.isRequired,
        options: question.options ?? [],
      })),
    });
  }

  return mapped;
}

/** Convert template sections to flat wizard format */
function templateToWizard(sections: TemplateSectionDraft[]): { sections: WizardSection[]; questions: WizardQuestion[] } {
  const wizardSections: WizardSection[] = [];
  const wizardQuestions: WizardQuestion[] = [];

  for (const section of sections) {
    wizardSections.push({ id: section.id, title: section.title, description: section.description });
    for (const q of section.questions) {
      wizardQuestions.push({
        id: q.id,
        sectionId: section.id,
        type: q.type as QuestionType,
        text: q.text,
        isRequired: q.isRequired,
        options: q.options.length > 0 ? q.options : undefined,
      });
    }
  }

  return { sections: wizardSections, questions: wizardQuestions };
}

/** Convert flat wizard format back to template sections */
function wizardToTemplate(
  wizardSections: WizardSection[],
  wizardQuestions: WizardQuestion[],
): TemplateSectionDraft[] {
  const result: TemplateSectionDraft[] = [];

  for (const section of wizardSections) {
    result.push({
      id: section.id,
      title: section.title,
      description: section.description ?? "",
      questions: wizardQuestions
        .filter((q) => q.sectionId === section.id)
        .map((q) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          isRequired: q.isRequired,
          options: q.options ?? [],
        })),
    });
  }

  const unsectioned = wizardQuestions.filter((q) => !q.sectionId);
  if (unsectioned.length > 0) {
    result.unshift({
      id: uid(),
      title: "Geral",
      description: "",
      questions: unsectioned.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        isRequired: q.isRequired,
        options: q.options ?? [],
      })),
    });
  }

  return result;
}

/* ——— Template Editor inner component (reads questionnaire state for save) ——— */

interface TemplateEditorContentProps {
  formName: string;
  setFormName: (v: string) => void;
  formSubtitle: string;
  setFormSubtitle: (v: string) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  formAnonymous: boolean;
  setFormAnonymous: (v: boolean) => void;
  editingId: string | null;
  onSave: (sections: TemplateSectionDraft[]) => void;
  onClose: () => void;
}

function TemplateEditorContent({
  formName,
  setFormName,
  formSubtitle,
  setFormSubtitle,
  formCategory,
  setFormCategory,
  formAnonymous,
  setFormAnonymous,
  editingId,
  onSave,
  onClose,
}: TemplateEditorContentProps) {
  const { questions, sections } = useQuestionnaire();

  function handleSave() {
    const templateSections = wizardToTemplate(sections, questions);
    onSave(templateSections);
  }

  return (
    <>
      <ModalBody>
        <div className={styles.formStack}>
          <div className={styles.formRow}>
            <Input label="Nome do template" value={formName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)} placeholder="Ex: Pulse semanal" />
            <Input label="Subtítulo" value={formSubtitle} onChange={(e: ChangeEvent<HTMLInputElement>) => setFormSubtitle(e.target.value)} placeholder="Breve descrição" />
          </div>
          <div className={styles.formRow}>
            <Select
              label="Categoria"
              options={CATEGORY_OPTIONS}
              value={formCategory}
              onChange={(v: string | undefined) => setFormCategory(v ?? "pesquisa")}
              size="md"
            />
            <div>
              <Toggle
                label="Respostas anônimas"
                description="Respondentes não serão identificados"
                checked={formAnonymous}
                onChange={() => setFormAnonymous(!formAnonymous)}
              />
            </div>
          </div>

          <div className={styles.questionnaireWrapper}>
            <QuestionnaireBuilder />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="tertiary" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" size="md" disabled={!formName.trim()} onClick={handleSave}>
          {editingId ? "Salvar" : "Criar template"}
        </Button>
      </ModalFooter>
    </>
  );
}

/* ——— Main Component ——— */

export function SurveyTemplatesModule() {
  const {
    templates: storedTemplates,
    surveys,
    upsertSurveyTemplate,
    duplicateSurveyTemplate,
    deleteSurveyTemplate,
  } = useSurveysData();

  const [search, setSearch] = useState("");
  const [actionsPopover, setActionsPopover] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<SurveyTemplateItem | null>(null);

  const templates = useMemo<SurveyTemplateItem[]>(() => {
    return storedTemplates
      .filter((template) => !template.isArchived)
      .map((template) => {
        const linkedSurveys = surveys.filter((survey) => (
          survey.templateId === template.id
          || (survey.templateId === null && survey.type === template.type)
        )).length;

        return {
          id: template.id,
          type: template.type,
          name: template.name,
          subtitle: template.subtitle,
          category: template.category,
          isSystem: template.isSystem,
          isAnonymous: template.defaultConfig.isAnonymous,
          sections: mapTemplateSections(template),
          questionCount: template.questions.length,
          linkedSurveys,
          createdAt: formatIsoToBrDate(template.createdAt),
          updatedAt: formatIsoToBrDate(template.updatedAt),
        };
      });
  }, [storedTemplates, surveys]);

  /* Sorting */
  type SortKey = "name" | "category" | "questionCount" | "linkedSurveys" | "updatedAt";
  const {
    selectedRows,
    clearSelection,
    sortKey,
    sortDir,
    handleSort,
    getSortDirection,
    handleSelectRow,
    handleSelectAll,
  } = useDataTable<SortKey>();

  const filtered = useMemo(() =>
    templates
      .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subtitle.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (!sortKey) return 0;
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
          case "name": return dir * a.name.localeCompare(b.name);
          case "category": return dir * a.category.localeCompare(b.category);
          case "questionCount": return dir * (a.questionCount - b.questionCount);
          case "linkedSurveys": return dir * (a.linkedSurveys - b.linkedSurveys);
          case "updatedAt": return dir * (parseDate(a.updatedAt) - parseDate(b.updatedAt));
          default: return 0;
        }
      }),
    [templates, search, sortKey, sortDir],
  );

  const rowIds = useMemo(() => filtered.map((t) => t.id), [filtered]);

  function handleBulkDelete() {
    let deletedCount = 0;
    let blockedCount = 0;

    selectedRows.forEach((templateId: string) => {
      const deleted = deleteSurveyTemplate(templateId);
      if (deleted) deletedCount += 1;
      else blockedCount += 1;
    });

    if (deletedCount > 0) {
      toast.success(`${deletedCount} template(s) excluído(s)`);
    }
    if (blockedCount > 0) {
      toast.warning(`${blockedCount} template(s) de sistema não podem ser excluídos`);
    }

    clearSelection();
  }

  function handleDelete() {
    if (!deleteItem) return;

    const deleted = deleteSurveyTemplate(deleteItem.id);
    setDeleteItem(null);

    if (deleted) {
      toast.success("Template excluído");
      return;
    }

    toast.warning("Templates de sistema não podem ser excluídos");
  }

  /* ——— Create / Edit modal ——— */

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formCategory, setFormCategory] = useState("pesquisa");
  const [formType, setFormType] = useState<SurveyType>("custom");
  const [formAnonymous, setFormAnonymous] = useState(true);
  const [initialQuestions, setInitialQuestions] = useState<WizardQuestion[]>([]);
  const [initialSections, setInitialSections] = useState<WizardSection[]>([]);

  function openCreate() {
    setEditingId(null);
    setFormName("");
    setFormSubtitle("");
    setFormType("custom");
    setFormCategory("pesquisa");
    setFormAnonymous(true);
    setInitialQuestions([]);
    setInitialSections([]);
    setModalOpen(true);
  }

  function openEdit(tpl: SurveyTemplateItem) {
    setEditingId(tpl.id);
    setFormName(tpl.name);
    setFormSubtitle(tpl.subtitle);
    setFormType(tpl.type);
    setFormCategory(tpl.category);
    setFormAnonymous(tpl.isAnonymous);
    const { sections, questions } = templateToWizard(JSON.parse(JSON.stringify(tpl.sections)));
    setInitialSections(sections);
    setInitialQuestions(questions);
    setModalOpen(true);
  }

  function openDuplicate(tpl: SurveyTemplateItem) {
    const duplicated = duplicateSurveyTemplate(tpl.id);
    if (!duplicated) {
      toast.error("Não foi possível duplicar este template");
      return;
    }

    toast.success("Template duplicado");
  }

  function handleSaveTemplate(sections: TemplateSectionDraft[]) {
    const converted = templateToWizard(sections);

    upsertSurveyTemplate({
      templateId: editingId ?? undefined,
      type: editingId ? formType : "custom",
      name: formName,
      subtitle: formSubtitle,
      category: formCategory as "pesquisa" | "ciclo",
      isAnonymous: formAnonymous,
      sections: converted.sections,
      questions: converted.questions,
    });

    if (editingId) {
      toast.success("Template atualizado");
    } else {
      toast.success("Template criado");
    }
    setModalOpen(false);
  }

  /* ——— Row actions ——— */

  function getRowActions(tpl: SurveyTemplateItem): PopoverItem[] {
    const items: PopoverItem[] = [
      { id: "edit", label: "Editar", icon: PencilSimple, onClick: () => openEdit(tpl) },
      { id: "duplicate", label: "Duplicar", icon: Copy, onClick: () => openDuplicate(tpl) },
    ];

    if (!tpl.isSystem) {
      items.push({
        id: "delete",
        label: "Excluir",
        icon: Trash,
        danger: true,
        onClick: () => setDeleteItem(tpl),
      });
    }

    return items;
  }

  return (
    <>
      {/* ——— Table ——— */}
      <Table
        variant="divider"
        elevated={false}
        selectable
        selectedRows={selectedRows}
        rowIds={rowIds}
        onSelectRow={handleSelectRow}
        onSelectAll={(checked: boolean) => handleSelectAll(checked, rowIds)}
      >
        <TableCardHeader
          title="Templates de pesquisa"
          badge={<Badge color="neutral">{filtered.length}</Badge>}
          actions={
            <div className={styles.headerActions}>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar template..."
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  leftIcon={MagnifyingGlass}
                />
              </div>
              <Button variant="primary" size="md" leftIcon={Plus} onClick={openCreate}>
                Novo template
              </Button>
            </div>
          }
        />
        <TableContent>
          <TableHead>
            <TableRow>
              <TableHeaderCell isCheckbox />
              <TableHeaderCell sortable sortDirection={getSortDirection("name")} onSort={() => handleSort("name")}>Nome</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("category")} onSort={() => handleSort("category")}>Categoria</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("questionCount")} onSort={() => handleSort("questionCount")}>Perguntas</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("linkedSurveys")} onSort={() => handleSort("linkedSurveys")}>Pesquisas vinculadas</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("updatedAt")} onSort={() => handleSort("updatedAt")}>Atualizado em</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((tpl) => (
              <TableRow key={tpl.id} rowId={tpl.id}>
                <TableCell isCheckbox rowId={tpl.id} />
                <TableCell>
                  <div>
                    <span style={{ fontFamily: "var(--font-label)", fontWeight: 500, fontSize: "var(--text-sm)", color: "var(--color-neutral-950)" }}>{tpl.name}</span>
                    <br />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", color: "var(--color-neutral-500)" }}>{tpl.subtitle}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge color={tpl.category === "ciclo" ? "wine" : "orange"} size="sm">
                    {tpl.category === "ciclo" ? "Ciclo" : "Pesquisa"}
                  </Badge>
                  {tpl.isSystem && (
                    <Badge color="neutral" size="sm">Base</Badge>
                  )}
                </TableCell>
                <TableCell>{tpl.questionCount}</TableCell>
                <TableCell>{tpl.linkedSurveys}</TableCell>
                <TableCell>{tpl.updatedAt}</TableCell>
                <TableCell>
                  <RowActionsPopover
                    className={styles.actionsField}
                    items={getRowActions(tpl)}
                    open={actionsPopover === tpl.id}
                    onToggle={() => setActionsPopover(actionsPopover === tpl.id ? null : tpl.id)}
                    onClose={() => setActionsPopover(null)}
                    buttonAriaLabel={`Abrir ações do template ${tpl.name}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableContent>
        <TableBulkActions count={selectedRows.size} onClear={clearSelection}>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleBulkDelete}>Excluir</Button>
        </TableBulkActions>
      </Table>

      {/* ——— Create / Edit modal with QuestionnaireBuilder ——— */}
      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} size="lg">
          <ModalHeader title={editingId ? "Editar template" : "Novo template"} onClose={() => setModalOpen(false)} />
          <QuestionnaireProvider
            initialQuestions={initialQuestions}
            initialSections={initialSections}
          >
            <TemplateEditorContent
              formName={formName}
              setFormName={setFormName}
              formSubtitle={formSubtitle}
              setFormSubtitle={setFormSubtitle}
              formCategory={formCategory}
              setFormCategory={setFormCategory}
              formAnonymous={formAnonymous}
              setFormAnonymous={setFormAnonymous}
              editingId={editingId}
              onSave={handleSaveTemplate}
              onClose={() => setModalOpen(false)}
            />
          </QuestionnaireProvider>
        </Modal>
      )}

      {/* ——— Delete confirmation ——— */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} size="sm">
        <ModalHeader title="Excluir template" onClose={() => setDeleteItem(null)} />
        <ModalBody>
          {deleteItem && (
            <p className={styles.confirmText}>
              Tem certeza que deseja excluir o template <strong>{deleteItem.name}</strong>?
              {deleteItem.linkedSurveys > 0 && ` Ele está vinculado a ${deleteItem.linkedSurveys} pesquisa(s).`}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeleteItem(null)}>Cancelar</Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleDelete}>Excluir</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
