import { useMemo, useState } from "react";
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
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  toast,
  RowActionsPopover,
  useDataTable,
} from "@getbud-co/buds";
import type { PopoverItem } from "@getbud-co/buds";
import { Plus, PencilSimple, Trash, Tag as TagIcon, MagnifyingGlass } from "@phosphor-icons/react";
import type { Tag } from "@/types";
import { useConfigData } from "@/contexts/ConfigDataContext";
import styles from "./TagsModule.module.css";

/** Tag with linkedItems guaranteed for UI display */
interface TagView extends Tag {
  linkedItems: number;
}

const COLOR_OPTIONS = [
  { value: "neutral", label: "Cinza" },
  { value: "orange", label: "Laranja" },
  { value: "wine", label: "Vinho" },
  { value: "caramel", label: "Caramelo" },
  { value: "success", label: "Verde" },
  { value: "warning", label: "Amarelo" },
  { value: "error", label: "Vermelho" },
];

export function TagsModule() {
  const { tags, createTag, updateTag, deleteTag } = useConfigData();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagView | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagView | null>(null);
  const [actionsPopoverTag, setActionsPopoverTag] = useState<string | null>(null);

  /* sorting */
  type SortKey = "name" | "linkedItems" | "createdAt";
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

  function parseDate(str: string): number {
    const [d = 1, m = 1, y = 1970] = str.split("/").map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  const tagsView = useMemo<TagView[]>(() => (
    tags.map((tag) => ({
      ...tag,
      linkedItems: 0,
      createdAt: formatDateBR(tag.createdAt),
      updatedAt: formatDateBR(tag.updatedAt),
    }))
  ), [tags]);

  const filtered = useMemo(() =>
    tagsView
      .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (!sortKey) return 0;
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
          case "name": return dir * a.name.localeCompare(b.name);
          case "linkedItems": return dir * (a.linkedItems - b.linkedItems);
          case "createdAt": return dir * (parseDate(a.createdAt) - parseDate(b.createdAt));
          default: return 0;
        }
      }),
    [tagsView, search, sortKey, sortDir],
  );

  const rowIds = useMemo(() => filtered.map((t) => t.id), [filtered]);

  function handleBulkDelete() {
    for (const tagId of selectedRows) {
      deleteTag(tagId);
    }
    toast.success(`${selectedRows.size} tag(s) excluída(s)`);
    clearSelection();
  }

  /* form */
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("neutral");

  function openCreate() {
    setEditingTag(null);
    setFormName("");
    setFormColor("neutral");
    setModalOpen(true);
  }

  function openEdit(tag: TagView) {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color);
    setModalOpen(true);
  }

  function handleSave() {
    if (editingTag) {
      updateTag(editingTag.id, { name: formName, color: formColor });
      toast.success("Tag atualizada");
    } else {
      createTag({ name: formName, color: formColor });
      toast.success("Tag criada");
    }
    setModalOpen(false);
  }

  function handleDelete() {
    if (!deletingTag) return;
    deleteTag(deletingTag.id);
    setDeletingTag(null);
    toast.success("Tag excluída");
  }

  function getRowActions(tag: TagView): PopoverItem[] {
    return [
      { id: "edit", label: "Editar", icon: PencilSimple, onClick: () => openEdit(tag) },
      { id: "delete", label: "Excluir", icon: Trash, danger: true, onClick: () => setDeletingTag(tag) },
    ];
  }

  return (
    <>
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
          title="Tags"
          badge={<Badge color="neutral">{filtered.length}</Badge>}
          actions={
            <div className={styles.headerActions}>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={MagnifyingGlass}
                />
              </div>
              <Button variant="primary" size="md" leftIcon={Plus} onClick={openCreate}>
                Nova tag
              </Button>
            </div>
          }
        />
        <TableContent>
          <TableHead>
            <TableRow>
              <TableHeaderCell isCheckbox />
              <TableHeaderCell sortable sortDirection={getSortDirection("name")} onSort={() => handleSort("name")}>Nome</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("linkedItems")} onSort={() => handleSort("linkedItems")}>Itens vinculados</TableHeaderCell>
              <TableHeaderCell sortable sortDirection={getSortDirection("createdAt")} onSort={() => handleSort("createdAt")}>Criado em</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id} rowId={t.id}>
                <TableCell isCheckbox rowId={t.id} />
                <TableCell>
                  <Badge color={t.color as "neutral"} leftIcon={TagIcon}>{t.name}</Badge>
                </TableCell>
                <TableCell>{t.linkedItems}</TableCell>
                <TableCell>{t.createdAt}</TableCell>
                <TableCell>
                  <RowActionsPopover
                    className={styles.actionsField}
                    items={getRowActions(t)}
                    open={actionsPopoverTag === t.id}
                    onToggle={() => setActionsPopoverTag(actionsPopoverTag === t.id ? null : t.id)}
                    onClose={() => setActionsPopoverTag(null)}
                    buttonAriaLabel={`Abrir ações da tag ${t.name}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableContent>
        <TableBulkActions count={selectedRows.size} onClear={clearSelection}>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleBulkDelete}>
            Excluir
          </Button>
        </TableBulkActions>
      </Table>

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="sm">
        <ModalHeader title={editingTag ? "Editar tag" : "Nova tag"} onClose={() => setModalOpen(false)} />
        <ModalBody>
          <div className={styles.formStack}>
            <Input label="Nome" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome da tag" />

            <div>
              <label className={styles.fieldLabel}>Cor</label>
              <div className={styles.colorGrid}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`${styles.colorSwatch} ${formColor === c.value ? styles.colorSwatchActive : ""}`}
                    onClick={() => setFormColor(c.value)}
                    title={c.label}
                  >
                    <Badge color={c.value as "neutral"}>{c.label}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!formName.trim()} onClick={handleSave}>
            {editingTag ? "Salvar" : "Criar tag"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deletingTag} onClose={() => setDeletingTag(null)} size="sm">
        <ModalHeader title="Excluir tag" onClose={() => setDeletingTag(null)} />
        <ModalBody>
          {deletingTag && (
            <p className={styles.confirmText}>
              Tem certeza que deseja excluir a tag <strong>{deletingTag.name}</strong>?
              {deletingTag.linkedItems > 0 && ` Ela está vinculada a ${deletingTag.linkedItems} itens.`}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeletingTag(null)}>Cancelar</Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleDelete}>Excluir</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
