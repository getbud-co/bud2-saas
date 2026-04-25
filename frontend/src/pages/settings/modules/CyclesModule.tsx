import { useState, useMemo } from "react";
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
  Select,
  DatePicker,
  Alert,
  ChoiceBox,
  ChoiceBoxGroup,
  toast,
  RowActionsPopover,
  useDataTable,
} from "@getbud-co/buds";
import type { PopoverItem, CalendarDate } from "@getbud-co/buds";
import { Plus, PencilSimple, Trash, Play, Stop, MagnifyingGlass } from "@phosphor-icons/react";
import { useCycles, useCreateCycle, useUpdateCycle, useDeleteCycle, type Cycle, type CycleType, type CycleStatus } from "@/hooks/use-cycles";
import { apiErrorToMessage } from "@/lib/api-error";
import styles from "./CyclesModule.module.css";

/** Converts an ISO date string (YYYY-MM-DD) to a CalendarDate for the DatePicker */
function isoToCalendarDate(iso: string): CalendarDate {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** Converts a CalendarDate to an ISO date string (YYYY-MM-DD) */
function calendarDateToIso(cd: CalendarDate): string {
  return `${cd.year}-${String(cd.month).padStart(2, "0")}-${String(cd.day).padStart(2, "0")}`;
}

const TYPE_OPTIONS = [
  { value: "quarterly" satisfies CycleType, label: "Trimestral" },
  { value: "semi_annual" satisfies CycleType, label: "Semestral" },
  { value: "annual" satisfies CycleType, label: "Anual" },
  { value: "custom" satisfies CycleType, label: "Personalizado" },
];

/** Formats an ISO date string as DD/MM/YYYY for display */
function formatDateDisplay(iso: string): string {
  return formatDateBR(iso) || "-";
}

const STATUS_BADGE: Partial<Record<CycleStatus, { label: string; color: "success" | "orange" | "neutral" }>> = {
  active: { label: "Ativo", color: "success" },
  planning: { label: "Futuro", color: "orange" },
  ended: { label: "Encerrado", color: "neutral" },
  review: { label: "Em revisão", color: "orange" },
  archived: { label: "Arquivado", color: "neutral" },
};

const CYCLE_ERROR_OVERRIDES: Record<number, string> = {
  409: "Conflito: já existe um ciclo com esse nome.",
};

export function CyclesModule() {
  const { data: cycles = [], isLoading, error, isTruncated, total } = useCycles();
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();
  const deleteCycleMutation = useDeleteCycle();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<Cycle | null>(null);
  const [actionsPopoverCycle, setActionsPopoverCycle] = useState<string | null>(null);
  const {
    selectedRows,
    clearSelection,
    handleSelectRow,
    handleSelectAll,
  } = useDataTable<"name">();

  /* form */
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CycleType>("quarterly");
  const [formDates, setFormDates] = useState<[CalendarDate | null, CalendarDate | null]>([null, null]);
  const [formStatus, setFormStatus] = useState<CycleStatus>("planning");

  const filtered = useMemo(
    () => cycles.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [cycles, search],
  );

  const rowIds = useMemo(() => filtered.map((c) => c.id), [filtered]);

  async function handleBulkDelete() {
    const results = await Promise.allSettled(
      [...selectedRows].map((cycleId) => deleteCycleMutation.mutateAsync(cycleId)),
    );
    const failed = results.filter((r) => r.status === "rejected");
    const succeeded = results.length - failed.length;
    if (succeeded > 0) toast.success(`${succeeded} ciclo(s) excluído(s)`);
    if (failed.length > 0) toast.error(`${failed.length} ciclo(s) não puderam ser excluídos`);
    clearSelection();
  }

  function openCreate() {
    setEditingCycle(null);
    setFormName("");
    setFormType("quarterly");
    setFormDates([null, null]);
    setFormStatus("planning");
    setModalOpen(true);
  }

  function openEdit(cycle: Cycle) {
    setEditingCycle(cycle);
    setFormName(cycle.name);
    setFormType(cycle.type);
    setFormDates([isoToCalendarDate(cycle.start_date), isoToCalendarDate(cycle.end_date)]);
    setFormStatus(cycle.status);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formDates[0] || !formDates[1]) return;

    try {
      const body = {
        name: formName,
        type: formType,
        start_date: calendarDateToIso(formDates[0]),
        end_date: calendarDateToIso(formDates[1]),
        status: formStatus,
      };

      if (editingCycle) {
        await updateCycle.mutateAsync({ id: editingCycle.id, body });
        toast.success("Ciclo atualizado");
      } else {
        await createCycle.mutateAsync(body);
        toast.success("Ciclo criado");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorToMessage(err, CYCLE_ERROR_OVERRIDES));
    }
  }

  async function handleDelete() {
    if (!deletingCycle) return;
    try {
      await deleteCycleMutation.mutateAsync(deletingCycle.id);
      setDeletingCycle(null);
      toast.success("Ciclo excluído");
    } catch (err) {
      toast.error(apiErrorToMessage(err, CYCLE_ERROR_OVERRIDES));
    }
  }

  async function handleToggleStatus(cycle: Cycle) {
    const newStatus: CycleStatus = cycle.status === "active" ? "ended" : "active";
    setActionsPopoverCycle(null);
    try {
      await updateCycle.mutateAsync({
        id: cycle.id,
        body: {
          name: cycle.name,
          type: cycle.type,
          start_date: cycle.start_date,
          end_date: cycle.end_date,
          status: newStatus,
        },
      });
      toast.success(newStatus === "active" ? "Ciclo ativado" : "Ciclo encerrado");
    } catch (err) {
      toast.error(apiErrorToMessage(err, CYCLE_ERROR_OVERRIDES));
    }
  }

  function getRowActions(cycle: Cycle): PopoverItem[] {
    const items: PopoverItem[] = [
      { id: "edit", label: "Editar", icon: PencilSimple, onClick: () => openEdit(cycle) },
    ];
    if (cycle.status === "active") {
      items.push({ id: "end", label: "Encerrar", icon: Stop, onClick: () => handleToggleStatus(cycle) });
    } else {
      items.push({ id: "activate", label: "Ativar", icon: Play, onClick: () => handleToggleStatus(cycle) });
    }
    items.push({ id: "delete", label: "Excluir", icon: Trash, danger: true, onClick: () => setDeletingCycle(cycle) });
    return items;
  }

  return (
    <>
      <Alert variant="info" title="Defina os períodos da sua organização">
        Os ciclos criados aqui ficam disponíveis como períodos pré-definidos nas funcionalidades de missões e pesquisas da plataforma.
      </Alert>

      {error && (
        <Alert variant="error" title="Não foi possível carregar os ciclos">
          {apiErrorToMessage(error, CYCLE_ERROR_OVERRIDES)}
        </Alert>
      )}

      {isLoading && cycles.length === 0 && (
        <Alert variant="info" title="Carregando ciclos">
          Buscando os ciclos cadastrados para a organização ativa.
        </Alert>
      )}

      {isTruncated && (
        <Alert variant="warning" title="Lista de ciclos parcial">
          Mostrando {cycles.length} de {total} ciclos. A paginação completa ainda precisa ser implementada.
        </Alert>
      )}

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
          title="Ciclos"
          badge={<Badge color="neutral">{filtered.length}</Badge>}
          actions={
            <div className={styles.headerActions}>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar ciclo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={MagnifyingGlass}
                />
              </div>
              <Button variant="primary" size="md" leftIcon={Plus} disabled={isLoading} onClick={openCreate}>
                Novo ciclo
              </Button>
            </div>
          }
        />
        <TableContent>
          <TableHead>
            <TableRow>
              <TableHeaderCell isCheckbox />
              <TableHeaderCell>Nome</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Início</TableHeaderCell>
              <TableHeaderCell>Fim</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((c) => {
              const sb = STATUS_BADGE[c.status] ?? { label: c.status, color: "neutral" as const };
              return (
                <TableRow key={c.id} rowId={c.id}>
                  <TableCell isCheckbox rowId={c.id} />
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{TYPE_OPTIONS.find((t) => t.value === c.type)?.label ?? c.type}</TableCell>
                  <TableCell>{formatDateDisplay(c.start_date)}</TableCell>
                  <TableCell>{formatDateDisplay(c.end_date)}</TableCell>
                  <TableCell><Badge color={sb.color}>{sb.label}</Badge></TableCell>
                  <TableCell>
                    <RowActionsPopover
                      className={styles.actionsField}
                      items={getRowActions(c)}
                      open={actionsPopoverCycle === c.id}
                      onToggle={() => setActionsPopoverCycle(actionsPopoverCycle === c.id ? null : c.id)}
                      onClose={() => setActionsPopoverCycle(null)}
                      buttonAriaLabel={`Abrir ações do ciclo ${c.name}`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TableContent>
        <TableBulkActions count={selectedRows.size} onClear={clearSelection}>
          <Button variant="danger" size="md" leftIcon={Trash} disabled={isLoading} onClick={handleBulkDelete}>
            Excluir
          </Button>
        </TableBulkActions>
      </Table>

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <ModalHeader title={editingCycle ? "Editar ciclo" : "Novo ciclo"} onClose={() => setModalOpen(false)} />
        <ModalBody>
          <div className={styles.formStack}>
            <Input label="Nome do ciclo" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Q1 2027" />
            <Select
              label="Tipo"
              value={formType}
              onChange={(value: string) => setFormType(value as CycleType)}
              options={TYPE_OPTIONS}
            />
            <div>
              <label className={styles.fieldLabel}>Período</label>
              <DatePicker
                mode="range"
                value={formDates}
                onChange={setFormDates}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Status</label>
              <ChoiceBoxGroup value={formStatus} onChange={(v) => setFormStatus(v as CycleStatus)}>
                <ChoiceBox value="active" title="Ativo" description="O ciclo está em andamento e visível para os usuários" />
                <ChoiceBox value="planning" title="Futuro" description="Agendado para início posterior, ainda não disponível" />
                <ChoiceBox value="ended" title="Encerrado" description="O ciclo já foi finalizado e está disponível apenas para consulta" />
              </ChoiceBoxGroup>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={createCycle.isPending || updateCycle.isPending || isLoading || !formName.trim() || !formDates[0] || !formDates[1]} onClick={handleSave}>
            {editingCycle ? "Salvar" : "Criar ciclo"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deletingCycle} onClose={() => setDeletingCycle(null)} size="sm">
        <ModalHeader title="Excluir ciclo" onClose={() => setDeletingCycle(null)} />
        <ModalBody>
          {deletingCycle && (
            <p className={styles.confirmText}>
              Tem certeza que deseja excluir o ciclo <strong>{deletingCycle.name}</strong>? Missões e indicadores vinculados a este período não serão afetados.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeletingCycle(null)}>Cancelar</Button>
          <Button variant="danger" size="md" leftIcon={Trash} disabled={isLoading} onClick={handleDelete}>Excluir</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
