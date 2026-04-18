import { useEffect, useMemo, useState } from "react";
import { formatDateBR } from "@/lib/date-format";
import {
  Card,
  Input,
  Textarea,
  Button,
  Badge,
  TabBar,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  toast,
  RowActionsPopover,
} from "@getbud-co/buds";
import type { PopoverItem } from "@getbud-co/buds";
import {
  Plus,
  PencilSimple,
  Trash,
  MagnifyingGlass,
  UploadSimple,
  Diamond,
  FloppyDisk,
} from "@phosphor-icons/react";
import { useConfigData } from "@/contexts/ConfigDataContext";
import styles from "./CompanyModule.module.css";

/* ——— Types ——— */

/* ——— Constants ——— */

const TABS = [
  { value: "info", label: "Dados gerais" },
  { value: "values", label: "Valores da empresa" },
];

/* ——— Component ——— */

export function CompanyModule() {
  const {
    activeOrganization,
    companyValues,
    updateCompanyProfile,
    createCompanyValue,
    updateCompanyValue,
    deleteCompanyValue,
  } = useConfigData();
  const [activeTab, setActiveTab] = useState("info");

  /* ——— Company info state ——— */
  const [companyName, setCompanyName] = useState(activeOrganization?.name ?? "");
  const [cnpj, setCnpj] = useState(activeOrganization?.cnpj ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(activeOrganization?.logoUrl ?? null);
  const [saving, setSaving] = useState(false);

  /* ——— Values state ——— */
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<(typeof companyValues)[number] | null>(null);
  const [deleteValue, setDeleteValue] = useState<(typeof companyValues)[number] | null>(null);
  const [actionsPopover, setActionsPopover] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    setCompanyName(activeOrganization?.name ?? "");
    setCnpj(activeOrganization?.cnpj ?? "");
    setLogoUrl(activeOrganization?.logoUrl ?? null);
  }, [activeOrganization]);

  /* ——— Company info handlers ——— */

  function formatCnpj(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  function handleLogoUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg, image/svg+xml";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setLogoUrl(url);
        toast.success("Símbolo atualizado");
      }
    };
    input.click();
  }

  function handleSaveInfo() {
    if (!companyName.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      updateCompanyProfile({
        name: companyName.trim(),
        cnpj: cnpj.trim() || null,
        logoUrl,
      });
      setSaving(false);
      toast.success("Dados da empresa salvos");
    }, 500);
  }

  /* ——— Values handlers ——— */

  const filtered = useMemo(() => {
    if (!search) return companyValues;
    const q = search.toLowerCase();
    return companyValues.filter((v) => v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
  }, [companyValues, search]);

  function openCreate() {
    setEditingValue(null);
    setFormName("");
    setFormDescription("");
    setModalOpen(true);
  }

  function openEdit(value: (typeof companyValues)[number]) {
    setEditingValue(value);
    setFormName(value.name);
    setFormDescription(value.description);
    setModalOpen(true);
  }

  function handleSaveValue() {
    if (!formName.trim()) {
      toast.error("Nome do valor é obrigatório");
      return;
    }
    if (editingValue) {
      updateCompanyValue(editingValue.id, {
        name: formName,
        description: formDescription,
      });
      toast.success(`Valor "${formName}" atualizado`);
    } else {
      createCompanyValue({
        name: formName,
        description: formDescription,
      });
      toast.success(`Valor "${formName}" criado`);
    }
    setModalOpen(false);
  }

  function handleDelete() {
    if (!deleteValue) return;
    deleteCompanyValue(deleteValue.id);
    toast.success(`Valor "${deleteValue.name}" excluído`);
    setDeleteValue(null);
  }

  function getRowActions(value: (typeof companyValues)[number]): PopoverItem[] {
    return [
      { id: "edit", label: "Editar", icon: PencilSimple, onClick: () => openEdit(value) },
      { id: "delete", label: "Excluir", icon: Trash, danger: true, onClick: () => setDeleteValue(value) },
    ];
  }

  /* ——— Render ——— */

  return (
    <>
      <Card padding="none">
        <TabBar
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ariaLabel="Configurações da empresa"
        />

        {/* ——— Dados gerais ——— */}
        {activeTab === "info" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitle}>Símbolo da empresa</div>
            <div className={styles.logoSection}>
              <div className={styles.logoPreview}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Símbolo da empresa" className={styles.logoImage} />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <UploadSimple size={24} />
                  </div>
                )}
              </div>
              <div className={styles.logoActions}>
                <Button variant="secondary" size="sm" leftIcon={UploadSimple} onClick={handleLogoUpload}>
                  {logoUrl ? "Alterar símbolo" : "Enviar símbolo"}
                </Button>
                <span className={styles.logoHint}>Imagem quadrada, PNG, JPG ou SVG. Máx. 2MB.</span>
                <span className={styles.logoHint}>Este símbolo será exibido no seletor de organizações da barra lateral.</span>
              </div>
            </div>
            {logoUrl && (
              <div className={styles.logoSwitcherPreview}>
                <span className={styles.logoPreviewLabel}>Prévia no seletor:</span>
                <div className={styles.logoSwitcherMock}>
                  <img src={logoUrl} alt="" className={styles.logoSwitcherImage} />
                  <span className={styles.logoSwitcherName}>{companyName || "Empresa"}</span>
                </div>
              </div>
            )}

            <div className={styles.sectionTitle}>Informações básicas</div>
            <div className={styles.formRow}>
              <Input
                label="Nome da empresa"
                value={companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
                placeholder="Nome fantasia ou razão social"
              />
              <Input
                label="CNPJ"
                value={cnpj}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className={styles.saveRow}>
              <Button variant="primary" size="md" leftIcon={FloppyDisk} onClick={handleSaveInfo} loading={saving}>
                Salvar alterações
              </Button>
            </div>
          </div>
        )}

        {/* ——— Valores da empresa ——— */}
        {activeTab === "values" && (
          <div className={styles.tabContent}>
            <div className={styles.valuesHeader}>
              <div className={styles.sectionTitle}>Valores ({filtered.length})</div>
              <div className={styles.valuesActions}>
                <div className={styles.searchWrapper}>
                  <Input
                    placeholder="Buscar valor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    leftIcon={MagnifyingGlass}
                  />
                </div>
                <Button variant="primary" size="md" leftIcon={Plus} onClick={openCreate}>
                  Novo valor
                </Button>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className={styles.valueList}>
                {filtered.map((v) => (
                  <div key={v.id} className={styles.valueItem}>
                    <div className={styles.valueLeft}>
                      <div className={styles.valueIcon}>
                        <Diamond size={20} />
                      </div>
                      <div className={styles.valueInfo}>
                        <div className={styles.valueNameRow}>
                          <span className={styles.valueName}>{v.name}</span>
                          <Badge color="neutral" size="sm">0 pesquisas</Badge>
                        </div>
                        <span className={styles.valueDescription}>{v.description}</span>
                      </div>
                    </div>
                    <div className={styles.valueActions}>
                      <span className={styles.valueMeta}>{formatDateBR(v.createdAt)}</span>
                      <RowActionsPopover
                        items={getRowActions(v)}
                        open={actionsPopover === v.id}
                        onToggle={() => setActionsPopover(actionsPopover === v.id ? null : v.id)}
                        onClose={() => setActionsPopover(null)}
                        buttonAriaLabel={`Abrir ações do valor ${v.name}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Diamond size={32} />
                <p className={styles.emptyTitle}>Nenhum valor encontrado</p>
                <p className={styles.emptyDesc}>
                  {search
                    ? "Nenhum valor corresponde à busca."
                    : "Adicione valores culturais para usar como fatores de avaliação em pesquisas."
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ——— Create/Edit modal ——— */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <ModalHeader
          title={editingValue ? "Editar valor" : "Novo valor da empresa"}
          onClose={() => setModalOpen(false)}
        />
        <ModalBody>
          <div className={styles.formStack}>
            <Input
              label="Nome do valor"
              value={formName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
              placeholder="Ex: Inovação, Colaboração, Transparência..."
            />
            <Textarea
              label="Descrição"
              value={formDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormDescription(e.target.value)}
              placeholder="Descreva o que este valor representa para a empresa e como ele se manifesta no dia a dia..."
              rows={4}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!formName.trim()} onClick={handleSaveValue}>
            {editingValue ? "Salvar" : "Criar valor"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ——— Delete confirmation ——— */}
      <Modal open={!!deleteValue} onClose={() => setDeleteValue(null)} size="sm">
        <ModalHeader title="Excluir valor" onClose={() => setDeleteValue(null)} />
        <ModalBody>
          {deleteValue && (
            <p className={styles.confirmText}>
              Tem certeza que deseja excluir o valor <strong>{deleteValue.name}</strong>?
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeleteValue(null)}>Cancelar</Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleDelete}>Excluir</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
