# Bud SaaS — Diretrizes de Desenvolvimento

## Sobre o Produto

Bud é uma plataforma de gestão de desempenho contínua, manager-first, para o mercado brasileiro/LATAM. Três pilares:
1. **Manager-First** — gestores são os usuários primários, não o RH
2. **Contínuo** — rituais diários/semanais/mensais/trimestrais, não avaliações anuais
3. **AI-Copilot** — IA amplifica decisões humanas

### Funcionalidades-chave
- Missões (OKRs e execução estratégica)
- Check-ins contínuos (cadências diárias a trimestrais)
- Pesquisas (engagement, clima, avaliações)
- Analytics de performance e engajamento com IA
- Dashboards de time e organização
- Integrações (Slack, Teams, WhatsApp)
- Nudges e notificações inteligentes
- Gamificação (streaks, badges)

### Público-alvo
- **Primário:** Gestores de equipes (50-5.000 colaboradores, sweet spot 200-1.000)
- **Secundário:** Líderes de People/RH
- **Terciário:** Executivos/CEOs

---

## Estrutura do Repositório

```
bud2-saas/                         ← Monorepo principal
├── backend/                       ← Backend Go (chi + sqlc + Casbin + JWT)
└── frontend/                      ← ESTE PROJETO (SaaS — Vite React SPA)

Repos separados (siblings):
├── ../bud2-design-system/         ← Design System (@getbud-co/buds)
└── ../bud2-landing-page/          ← Landing page (Next.js)
```

---

## Stack do SaaS

- React 19 + TypeScript (strict)
- CSS Modules (`.module.css`) — sem Tailwind, consistente com o DS
- Vite como bundler (aliases: `@/` → `src/`, DS resolvido do source)
- Recharts para gráficos
- Phosphor Icons (`@phosphor-icons/react`)
- Fontes: `@fontsource/crimson-pro`, `@fontsource/plus-jakarta-sans`, `@fontsource/inter`
- **Testes:** Vitest + React Testing Library + happy-dom
- Conteúdo em **português brasileiro** (PT-BR)

---

## Estrutura do Projeto SaaS

```
src/
├── App.tsx                        ← Root com Toaster
├── main.tsx                       ← Entry point com providers
├── routes/index.tsx               ← React Router config
├── styles/global.css              ← Reset + tipografia
├── components/
│   ├── BudLogo.tsx                ← SVG logo
│   └── layout/
│       ├── AppLayout.tsx          ← Layout principal (sidebar + content + assistant panel)
│       ├── AppSidebar.tsx         ← Navegação com grupos expansíveis
│       └── PageHeader.tsx         ← Wrapper com Search/Notification/Assistant
├── contexts/
│   ├── AssistantContext.tsx       ← { open, toggle } para AI Assistant
│   ├── SavedViewsContext.tsx      ← Filtros persistidos (missions/surveys)
│   └── SidebarContext.tsx         ← { isMobile, openSidebar }
└── pages/
    ├── home/                      ← Dashboard com widgets
    ├── missions/                  ← Missões (OKR) — página mais complexa
    ├── surveys/                   ← Pesquisas
    ├── people/                    ← Empresa (Usuários, Times, Organograma)
    │   ├── PeoplePage.tsx         ← Router com modules
    │   └── modules/
    │       ├── TeamsModule.tsx     ← CRUD de times com Table/Modals
    │       └── OrgChartModule.tsx  ← Organograma (lista + árvore)
    └── settings/                  ← Configurações (Tags, Ciclos, IA, Integrações, Tipos de usuário)
        ├── SettingsPage.tsx
        ├── SettingsNav.tsx
        └── modules/               ← UsersModule, TagsModule, CyclesModule, etc.
```

### Rotas principais
| Rota | Página |
|---|---|
| `/home` | Dashboard |
| `/missions/*` | Missões |
| `/missions/mine/*` | Minhas Missões |
| `/surveys/*` | Pesquisas |
| `/people/users` | Usuários |
| `/people/teams` | Times |
| `/people/org-chart` | Organograma |
| `/settings/*` | Configurações (tags, cycles, ai, integrations, roles) |

### Sidebar (AppSidebar.tsx)
- Grupo **"Performance e Engajamento"**: Início, Missões (expansível com saved views), Pesquisas
- Grupo **"Estrutura"**: Empresa (Usuários, Times, Organograma), Configurações, Ajuda
- Footer: SidebarUser com Popover (Minha conta, Sair)
- Auto-collapse de seções via `key={`name-${activeSection}`}` forçando re-mount

---

## Design System — REGRA FUNDAMENTAL

### O Design System é obrigatório

**Pacote:** `@getbud-co/buds` (GitHub Packages)
**Fonte:** `/Users/dsbraz/Projetos/bud2-design-system/`

> **REGRA CRÍTICA:** Todo elemento visual criado neste SaaS DEVE primeiro ser verificado contra o Design System. Se o componente ou token existir no DS, DEVE ser utilizado. Se NÃO existir, ALERTAR O USUÁRIO de forma clara e explícita antes de prosseguir, para que ele decida entre:
> 1. Hard-coded no SaaS (exceção documentada)
> 2. Criar/atualizar o componente no Design System primeiro

### Formato do alerta obrigatório

Quando um componente ou token necessário NÃO existir no DS, usar este formato:

```
⚠️ COMPONENTE/TOKEN AUSENTE NO DESIGN SYSTEM

Necessário: [nome do componente/token]
Uso pretendido: [descrição]
Opções:
  (A) Hard-coded neste projeto (exceção)
  (B) Criar no Design System primeiro

Aguardando sua decisão antes de prosseguir.
```

---

## Regras Críticas de Desenvolvimento

> ⚠️ **REGRAS INVIOLÁVEIS** — Qualquer violação deve ser reportada imediatamente ao desenvolvedor.

### 0. NUNCA Derrubar Servidor Local

**NUNCA** matar, parar ou reiniciar um servidor de desenvolvimento que já esteja rodando para subir outro. Antes de executar `npm run dev` ou qualquer comando de servidor, verificar se já existe um ativo (ex: `lsof -i :5173`). Se estiver rodando, NÃO tocar nele.

### 1. Testes Unitários Obrigatórios

Toda funcionalidade criada ou modificada DEVE ter cobertura de testes unitários.

**Antes de considerar uma tarefa completa:**
- [ ] Testes unitários existem para o código novo/modificado
- [ ] Todos os testes passam (`npm test -- --run`)
- [ ] Cobertura adequada de casos de uso e edge cases

**Formato do alerta quando testes estão faltando:**
```
⚠️ TESTES UNITÁRIOS AUSENTES

Funcionalidade: [nome do componente/módulo]
Arquivo: [caminho do arquivo]
Motivo: [código novo | código modificado]

Opções:
  (A) Criar testes agora antes de prosseguir
  (B) Documentar como débito técnico (não recomendado)

Aguardando sua decisão.
```

### 2. Validação Contínua de Testes

Sempre que código for criado ou editado, os testes DEVEM ser executados para garantir que nenhum bug foi introduzido.

**Fluxo obrigatório:**
1. Fazer alteração no código
2. Executar `npm test -- --run`
3. Se houver falhas: corrigir ANTES de prosseguir
4. Se todos passarem: continuar desenvolvimento

**Formato do alerta quando testes falham:**
```
🚨 TESTES FALHANDO APÓS ALTERAÇÃO

Testes afetados: [número] de [total]
Arquivos com falha: [lista]

Ação necessária: Corrigir os testes antes de continuar.
Deseja que eu analise e corrija as falhas?
```

### 3. Design System Obrigatório

(Já documentado na seção "Design System — REGRA FUNDAMENTAL" acima)

---

## Componentes do Design System (40)

### Formulários e Controles (8)

| Componente | Props principais | Notas |
|---|---|---|
| **Button** | `variant`: primary/secondary/tertiary/danger, `size`: sm/md/lg, `leftIcon`, `rightIcon`, `loading` | Icon sizes auto-scale (sm:14, md:16, lg:20) |
| **Input** | `size`: sm/md/lg, `label`, `leftIcon`, `rightIcon`, `message`, `messageType`: error/attention/success | Suporta `ref` (forwardRef) |
| **Textarea** | `label`, `message`, `messageType`, `rows` (default: 4) | |
| **Select** | `options: {value, label}[]`, `searchable`, `multiple`, `value`, `onChange` | Portal-based dropdown. Multi mostra "N selecionados" |
| **Checkbox** | `size`: sm/md, `indeterminate`, `label`, `description` | `indeterminate` mostra ícone Minus |
| **Radio** | `size`: sm/md, `label`, `description` | |
| **Toggle** | `label`, `description` | `role="switch"` interno |
| **DatePicker** | `mode`: single/range, `value`, `onChange`, `size`, `label`, `minDate`, `maxDate` | Usa `CalendarDate: {year, month, day}`. Input com máscara DD/MM/YYYY |

### Layout e Estrutura (5 famílias)

**Card:**
| Sub | Props |
|---|---|
| `Card` | `padding`: none/sm/md/lg, `shadow`: boolean |
| `CardHeader` | `title`, `description?`, `action?` |
| `CardBody` | `children` |
| `CardFooter` | `children` |
| `CardDivider` | — |

**Modal:**
| Sub | Props |
|---|---|
| `Modal` | `open`, `onClose`, `size`: sm/md/lg, `sidePanel?` |
| `ModalHeader` | `title`, `description?`, `onClose?`, `children?` |
| `ModalBody` | `children` |
| `ModalFooter` | `children`, `align`: end/between |

**Sidebar:**
| Sub | Props |
|---|---|
| `Sidebar` | `collapsed`, `onCollapse`, `mobileOpen`, `onMobileClose` |
| `SidebarHeader` | `children` |
| `SidebarNav` | `children`, `aria-label?` |
| `SidebarGroup` | `label`, `children` |
| `SidebarItem` | `icon`, `label`, `active`, `defaultExpanded`, `onClick`, `children` |
| `SidebarSubItem` | `active`, `onClick`, `children` |
| `SidebarFooter` | `children` |
| `SidebarUser` | `name`, `role?`, `avatar`, `onClick?` — suporta `ref` |
| `SidebarOrgSwitcher` | `icon`, `label`, `onClick?` |
| `SidebarDivider` | — |

**Table:**
| Sub | Props |
|---|---|
| `Table` | `variant`: divider/striped, `elevated` (default true), `bordered` (default true), `selectable`, `selectedRows: Set<string>`, `rowIds: string[]`, `onSelectRow`, `onSelectAll` |
| `TableCardHeader` | `title`, `badge?`, `actions?` |
| `TableContent` | wrapper do `<table>` |
| `TableHead` / `TableBody` | — |
| `TableRow` | `rowId?` |
| `TableHeaderCell` | `sortable`, `sortDirection`: asc/desc/undefined, `onSort`, `isCheckbox` |
| `TableCell` | `isCheckbox`, `rowId?` |
| `TableBulkActions` | `count`, `onClear`, `children` (portals to body quando count > 0) |
| `TablePagination` | `currentPage`, `totalPages`, `onPageChange` |

**Outros layout:** `Breadcrumb` (`items: {label, href?, onClick?}[]`, `current?`), `Popover`, `Tooltip`

### Feedback e Status (5)
| Componente | Props |
|---|---|
| **Alert** | `variant`: info/success/warning/error, `title`, `children?`, `onDismiss?`, `action?: {label, onClick}` |
| **Badge** | `color`: neutral/orange/wine/caramel/error/warning/success, `size`: sm/md/lg, `leftIcon?`, `rightIcon?` |
| **Toast** | API singleton: `toast.success(msg)`, `toast.error(msg)`, `toast.warning(msg)`, `toast.black(msg)`. Componente `<Toaster />` no App root |
| **GoalProgressBar** | `label`, `value`, `target?`, `min?`, `expected?`, `status?`: on-track/attention/off-track, `onChange?` (slider interativo) |
| **GoalGaugeBar** | `label`, `value`, `max?`, `min?`, `expected?`, `status?`, `size`: sm/md, `onClick?` |

### Representação de Usuário (3)
| Componente | Props |
|---|---|
| **Avatar** | `size`: xs/sm/md/lg/xl/2xl, `src?`, `initials?`, `online?`, `companyLogo?` |
| **AvatarGroup** | `avatars: {src?, initials?, alt?}[]`, `size`: xs/sm/md, `maxVisible` (default 5), `showAddButton?`, `onAddClick?` |
| **AvatarLabelGroup** | `name`, `supportingText?`, `size`: sm/md/lg/xl, `src?`, `initials?`, `online?` |

### Seleção e Navegação (3)
| Componente | Props |
|---|---|
| **ChoiceBox / ChoiceBoxGroup** | ChoiceBox deve estar dentro de ChoiceBoxGroup |
| **DropdownButton** | `items: {id, label, icon?, description?}[]`, `onSelect`, `variant`, `size`, `searchable?`, `children` (label do botão) |
| **Accordion / AccordionItem** | `header?` (bg no trigger), AccordionItem: `icon?`, `title`, `description?`, `action?`, `defaultOpen?`, `open?`, `onToggle?`, `disabled?` |

### Filtragem (3)
| Componente | Props | Notas |
|---|---|---|
| **FilterBar** | `filters: {id, label, icon?}[]`, `onAddFilter(id)`, `onClearAll?`, `onSaveView?`, `saveViewLabel?`, `primaryAction?`, `children` | Gerencia popover "Adicionar filtro" com busca |
| **FilterChip** | `label`, `icon?`, `onClick?`, `onRemove?`, `active?` | **NÃO suporta ref** — envolver em `<div ref={...}>` |
| **FilterDropdown** | `open`, `onClose`, `anchorRef` (obrigatório), `children`, `placement?`, `noOverlay?`, `ignoreRefs?` | Portal-based. Conteúdo é livre (custom) |

### Navegação e Chrome (3)
| Componente | Props |
|---|---|
| **PageHeader** | `title`, `children?` (botões à direita) |
| **SearchButton** | `onClick`, etc. |
| **NotificationButton** | `hasUnread?`, `onClick` |
| **AssistantButton** | `label?` (default "Assistente"), `active?` (mostra X quando true) |
| **CommandPalette** | Controlado com grupos de comandos |
| **NotificationPanel** | Painel de notificações |

### Visualização de Dados (6)
| Componente | Uso |
|---|---|
| **Chart** | SVG circular 0-100% |
| **ChartTooltipContent** | Para Recharts: `<Tooltip content={<ChartTooltipContent />} />` |
| **Heatmap** | Mapa de calor |
| **Sparkline** | Linha sparkline |
| **Radar** | Gráfico radar |
| **Funnel** | Gráfico funil |

### Outros (5)
| Componente | Props |
|---|---|
| **TabBar** | `tabs: {value, label, badge?, disabled?}[]`, `activeTab`, `onTabChange`. Usar `getTabId()`/`getPanelId()` para acessibilidade |
| **Skeleton** | `variant`: text/circular/rectangular/rounded, `width?`, `height?`, `animation?` |
| **Pagination** | `currentPage`, `totalPages`, `onPageChange` |
| **AiAssistant** | Chat com upload de arquivos e contexto |
| **date-utils** | `CalendarDate`, `formatDate`, `parseDate`, `today()`, etc. |

---

## Padrões de Implementação Consolidados

### Pattern: Tabela CRUD completa

Referência: `TeamsModule.tsx`, `UsersModule.tsx`

```tsx
// 1. STATE
const [items, setItems] = useState(MOCK_DATA);
const [search, setSearch] = useState("");
const [sortKey, setSortKey] = useState<string | null>(null);
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
const [actionsPopover, setActionsPopover] = useState<string | null>(null);
const actionsRefs = useRef<Record<string, HTMLButtonElement | null>>({});

// 2. DERIVED DATA (sempre useMemo)
const filtered = useMemo(() => { /* search + filter logic */ }, [items, search, ...]);
const sorted = useMemo(() => { /* sorting logic */ }, [filtered, sortKey, sortDir]);
const rowIds = useMemo(() => sorted.map(i => i.id), [sorted]);

// 3. SORTING
function handleSort(key: string) {
  if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
  else { setSortKey(key); setSortDir("asc"); }
}
function getSortDirection(key: string) { return sortKey === key ? sortDir : undefined; }

// 4. SELECTION
function handleSelectRow(id: string, checked: boolean) { ... }
function handleSelectAll(checked: boolean) { ... }

// 5. RENDER
<Table variant="divider" elevated={false} selectable selectedRows={selectedRows} rowIds={rowIds} ...>
  <TableCardHeader title="..." badge={<Badge>N</Badge>} actions={<div>Search + Buttons</div>} />
  <TableContent>
    <TableHead><TableRow>
      <TableHeaderCell isCheckbox />
      <TableHeaderCell sortable sortDirection={getSortDirection("name")} onSort={() => handleSort("name")}>Nome</TableHeaderCell>
    </TableRow></TableHead>
    <TableBody>{sorted.map(item => (
      <TableRow key={item.id} rowId={item.id}>
        <TableCell isCheckbox rowId={item.id} />
        <TableCell>...</TableCell>
        <TableCell>
          <Button ref={el => { actionsRefs.current[item.id] = el; }}
            variant="secondary" size="md" leftIcon={DotsThreeVertical}
            onClick={() => setActionsPopover(actionsPopover === item.id ? null : item.id)} />
          <Popover items={getRowActions(item)} open={actionsPopover === item.id}
            onClose={() => setActionsPopover(null)}
            anchorRef={{ current: actionsRefs.current[item.id] ?? null }} />
        </TableCell>
      </TableRow>
    ))}</TableBody>
  </TableContent>
  <TableBulkActions count={selectedRows.size} onClear={() => setSelectedRows(new Set())}>
    <Button>Ação em lote</Button>
  </TableBulkActions>
</Table>
```

### Pattern: Filtros (FilterBar + FilterChip + FilterDropdown)

**IMPORTANTE:** FilterChip NÃO suporta ref. Envolver em `<div ref={...}>`.

```tsx
const [activeFilters, setActiveFilters] = useState<string[]>([]);
const [openFilter, setOpenFilter] = useState<string | null>(null);
const [filterStatus, setFilterStatus] = useState("all");
const statusChipRef = useRef<HTMLDivElement>(null);

<FilterBar
  filters={FILTER_OPTIONS.filter(f => !activeFilters.includes(f.id))}
  onAddFilter={(id) => {
    setActiveFilters(prev => [...prev, id]);
    // Se quiser abrir imediatamente:
    requestAnimationFrame(() => setOpenFilter(id));
  }}
  onClearAll={activeFilters.length > 0 ? clearAll : undefined}
>
  {activeFilters.includes("status") && (
    <div ref={statusChipRef} style={{ display: "inline-flex" }}>
      <FilterChip
        label={`Status: ${filterStatus}`}
        active={openFilter === "status"}
        onClick={() => setOpenFilter(openFilter === "status" ? null : "status")}
        onRemove={() => removeFilter("status")}
      />
    </div>
  )}
</FilterBar>
<FilterDropdown open={openFilter === "status"} onClose={() => setOpenFilter(null)} anchorRef={statusChipRef}>
  {/* Conteúdo livre: Radio buttons, Checkboxes, DatePicker, etc. */}
</FilterDropdown>
```

### Pattern: Modal CRUD

```tsx
// Create/Edit (size="md")
<Modal open={editOpen} onClose={() => setEditOpen(false)} size="md">
  <ModalHeader title={editing ? "Editar" : "Novo"} onClose={() => setEditOpen(false)} />
  <ModalBody>
    <div className={styles.formStack}>
      <Input label="Nome" value={formName} onChange={...} />
      <Textarea label="Descrição" value={formDesc} onChange={...} rows={3} />
    </div>
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" size="md" onClick={close}>Cancelar</Button>
    <Button variant="primary" size="md" onClick={save}>{editing ? "Salvar" : "Criar"}</Button>
  </ModalFooter>
</Modal>

// Delete confirmation (size="sm")
<Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} size="sm">
  <ModalHeader title="Excluir" onClose={() => setDeleteItem(null)} />
  <ModalBody>
    <p className={styles.confirmText}>Tem certeza que deseja excluir <strong>{name}</strong>?</p>
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" size="md" onClick={close}>Cancelar</Button>
    <Button variant="danger" size="md" leftIcon={Trash} onClick={handleDelete}>Excluir</Button>
  </ModalFooter>
</Modal>
```

### Pattern: Row Actions com Popover

```tsx
function getRowActions(item: Item): PopoverItem[] {
  return [
    { id: "edit", label: "Editar", icon: PencilSimple, onClick: () => openEdit(item) },
    { id: "delete", label: "Excluir", icon: Trash, danger: true, onClick: () => setDeleteItem(item) },
  ];
}

// Ref dinâmico por row:
const actionsRefs = useRef<Record<string, HTMLButtonElement | null>>({});

<Button ref={el => { actionsRefs.current[item.id] = el; }}
  variant="secondary" size="md" leftIcon={DotsThreeVertical}
  onClick={() => toggle(item.id)} />
<Popover items={getRowActions(item)} open={actionsPopover === item.id}
  onClose={() => setActionsPopover(null)}
  anchorRef={{ current: actionsRefs.current[item.id] ?? null }} />
```

### Pattern: View Mode Toggle (consistente com Missões)

```tsx
const [viewMode, setViewMode] = useState<"list" | "chart">("chart");
const [viewModeOpen, setViewModeOpen] = useState(false);
const viewModeBtnRef = useRef<HTMLButtonElement>(null);

<Button ref={viewModeBtnRef} variant="secondary" size="md"
  leftIcon={viewMode === "chart" ? TreeStructure : ListBullets}
  rightIcon={CaretDown}
  onClick={() => setViewModeOpen(v => !v)}>
  {viewMode === "chart" ? "Vendo em árvore" : "Vendo em lista"}
</Button>
<FilterDropdown open={viewModeOpen} onClose={() => setViewModeOpen(false)} anchorRef={viewModeBtnRef} noOverlay>
  {/* Opções com ícone + label */}
</FilterDropdown>
```

### Pattern: Drawer / Bottom Sheet (mobile)

Referência: `MissionsPage.tsx` (check-in), `OrgChartModule.tsx` (detalhe)

No mobile (≤960px), painéis de detalhe devem virar bottom sheets. ESC sempre fecha.

```css
/* Backdrop — display:none no desktop, ativado via media query */
.drawerBackdrop {
  display: none;
}

@media (max-width: 960px) {
  .drawerBackdrop {
    display: block;
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0);
    z-index: 9099;
    pointer-events: none;
    transition: background-color 250ms ease;
  }

  .drawerBackdropVisible {
    background-color: rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  }

  .panel {
    position: fixed;
    top: var(--sp-4xl);
    right: 0; bottom: 0; left: 0;
    width: 100%;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: var(--shadow-xl);
    z-index: 9100;
    transform: translateY(100%);
    transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .panelOpen { transform: translateY(0); }

  /* Drag handle — usar position absolute, NÃO flex-basis */
  .panelHeader {
    position: relative;
    padding-top: var(--sp-md);
  }
  .panelHeader::before {
    content: "";
    position: absolute;
    top: var(--sp-2xs);
    left: 50%;
    transform: translateX(-50%);
    width: 36px; height: 4px;
    background: var(--color-caramel-300);
    border-radius: var(--radius-full);
  }
}
```

```tsx
// ESC key handler — sempre incluir quando painel/drawer pode ser fechado
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && selectedId) closePanel();
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [selectedId]);

// Backdrop (sempre no DOM, visível só via CSS no mobile)
<div
  className={`${styles.drawerBackdrop} ${selectedPerson ? styles.drawerBackdropVisible : ""}`}
  onClick={closePanel}
  aria-hidden
/>
<div className={`${styles.panel} ${styles.panelOpen}`}>...</div>
```

---

## Design Tokens obrigatórios

Todos os valores visuais DEVEM usar tokens CSS do DS:

| Categoria | Token | Nunca usar |
|---|---|---|
| Cores | `var(--color-*)` | hex, rgb, hsl direto |
| Tipografia | `var(--font-display/heading/body/label)` | font-family literal |
| Font sizes | `var(--text-*)` | px/rem direto |
| Espaçamento | `var(--sp-*)` | valores soltos para padding/margin/gap |
| Border radius | `var(--radius-*)` | px direto |
| Sombras | `var(--shadow-*)` | box-shadow literal (exceto focus rings) |

### Paleta de cores
| Grupo | Uso |
|---|---|
| Orange | Cor primária. Botões, CTAs, links ativos |
| Wine | Cor secundária. Destaques institucionais |
| Green/Success | Sucesso, progresso positivo |
| Red/Error | Erro, ações destrutivas |
| Yellow/Warning | Alertas, atenção |
| Neutral | Textos (900-950 principal, 500 secundário, 400 terciário) e backgrounds (0, 50) |
| Caramel | Backgrounds quentes, bordas padrão (caramel-200 leve, caramel-300 padrão), hover (caramel-50, caramel-100) |

### Tipografia
| Token | Fonte | Uso |
|---|---|---|
| `--font-display` | Crimson Pro | Hero, marketing, destaque |
| `--font-heading` | Plus Jakarta Sans | Headings (600 SemiBold) |
| `--font-body` | Inter | Corpo de texto (400 Regular) |
| `--font-label` | Inter Medium | Botões, inputs, rótulos (500 Medium) |

### Iconografia
- **Phosphor Icons 2.1** (`@phosphor-icons/react`), peso **regular** apenas
- Nunca usar bold, fill, light, thin ou duotone
- Tamanhos: 14px, 16px, 20px, 24px, 32px

### Espaçamento (grid 4px)
`3xs`=4, `2xs`=8, `xs`=12, `sm`=16, `md`=20, `lg`=24, `xl`=32, `2xl`=40, `3xl`=48, `4xl`=64

### Border radius
`2xs`=4, `xs`=6, `sm`=8, `md`=12, `lg`=16, `full`=9999

### Charts (Recharts)
- Tooltip: `animationDuration={150}`, `animationEasing="ease-out"`, usar `<ChartTooltipContent />`
- Cores: `var(--color-chart-1)` a `var(--color-chart-5)`
- Grid: caramel-200, `strokeDasharray="3 3"`, `vertical={false}`
- Eixos: `--font-label`, fontSize 12, neutral-500

---

## Convenções de código

### Geral
- Componentes React: PascalCase, um por arquivo
- Estilos: CSS Modules co-localizados (`ComponentName.module.css`)
- Imports do DS: `import { Button, Input, ... } from '@getbud-co/buds'`
- CSS do DS: `import '@getbud-co/buds/styles'` (uma vez, no entry point)
- Nunca duplicar componentes ou tokens que existam no DS
- Classes CSS: camelCase (Vite `localsConvention: "camelCase"`)
- Constantes: UPPER_SNAKE_CASE
- Tipos/interfaces: PascalCase
- Todo conteúdo textual em PT-BR

### Nomes de classes CSS comuns
- Layout: `.page`, `.grid`, `.content`, `.toolbar`, `.toolbarLeft`, `.toolbarRight`
- Busca: `.searchWrapper`
- Formulários: `.formStack`, `.formRow`, `.formField`, `.formLabel`
- Filtros: `.filterDropdownBody`, `.filterActionItem`, `.filterActionItemActive`
- Ações: `.headerActions`, `.actionsField`
- Confirmação: `.confirmText`

### Responsive breakpoints (media queries)
| Breakpoint | Uso |
|---|---|
| `@media (max-width: 1400px)` | Desktop grande → sidebar/assistant layout |
| `@media (max-width: 960px)` | Tablet paisagem → stacking de painéis |
| `@media (max-width: 768px)` | Tablet → sidebar collapse, toolbars empilham |
| `@media (max-width: 480px)` | Mobile → layouts compactos, full-width |

### Toast — sempre após ações CRUD
```tsx
toast.success(`Time "${name}" criado`);
toast.error("Nome é obrigatório");
toast.warning("Ação irreversível");
```

---

## Infraestrutura de Testes

### Stack de Testes
- **Vitest** — Test runner compatível com Vite
- **React Testing Library** — Testes focados em comportamento do usuário
- **happy-dom** — DOM environment leve e rápido
- **@testing-library/user-event** — Simulação realista de interações

### Estrutura de Arquivos
- Testes co-localizados: `ComponentName.test.tsx` ao lado do componente
- Setup global: `tests/setup/vitest.setup.ts`
- Utils de teste: `tests/setup/test-utils.tsx` (wrapper com providers)

### Configuração Crítica (vite.config.ts)

O Design System linkado localmente requer aliases para evitar duplicação de React:

```ts
resolve: {
  alias: {
    react: path.resolve(__dirname, "node_modules/react"),
    "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
    "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime"),
    "@phosphor-icons/react": path.resolve(__dirname, "node_modules/@phosphor-icons/react"),
  },
},
```

### Mocks Globais Necessários (vitest.setup.ts)

```ts
// ResizeObserver — usado pelo TabBar e outros componentes do DS
class ResizeObserverMock {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// matchMedia
Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
```

### Padrões de Teste para Componentes CRUD

```tsx
// Setup padrão
function setup() {
  const user = userEvent.setup();
  const result = renderWithProviders(<Component />);
  return { user, ...result };
}

// Queries para elementos do DS
screen.getByRole("button", { name: /ordenar por nome/i })  // Sortable header
screen.getByRole("option", { name: /status/i })           // FilterBar options
screen.getByRole("tab", { name: /detalhes/i })            // TabBar tabs
screen.getByRole("menuitem", { name: /editar/i })         // Popover actions
screen.getByRole("button", { name: /desmarcar todos/i })  // TableBulkActions clear

// Sortable header + aria-sort
const header = screen.getByRole("button", { name: /ordenar por nome/i });
const th = header.closest("th");
expect(th).toHaveAttribute("aria-sort", "ascending");
// Colunas sortable sem sort ativo têm aria-sort="none"

// Buscar dentro de modal
const dialog = screen.getByRole("dialog");
within(dialog).getByLabelText(/nome/i);
```

### Comandos de Teste

| Comando | Uso |
|---------|-----|
| `npm test` | Modo watch |
| `npm test -- --run` | Execução única (CI) |
| `npm test -- --run src/path/file.test.tsx` | Arquivo específico |
| `npm test -- --coverage` | Com cobertura |

---

## Gotchas e armadilhas conhecidas

1. **FilterChip NÃO aceita ref** — envolver em `<div ref={...} style={{ display: "inline-flex" }}>`
2. **FilterDropdown exige `anchorRef`** — sem ele, o dropdown não posiciona
3. **FilterBar `onAddFilter`** — quando o chip ainda não existe no DOM, usar `requestAnimationFrame(() => setOpenFilter(id))` para aguardar render
4. **Badge é `inline-flex`** — em containers `flex-direction: column`, adicionar `align-items: flex-start` no pai para evitar stretch
5. **Table usa Context** — células devem ser filhas diretas da hierarquia Table > TableContent > TableBody > TableRow > TableCell
6. **TableBulkActions** — renderiza via portal quando `count > 0`; aparece como barra fixa no rodapé
7. **Popover refs dinâmicos** — usar `useRef<Record<string, HTMLButtonElement | null>>({})` para múltiplos botões de ação por row
8. **Modal** — usa portal, trava scroll do body, trap de foco. Sempre incluir `onClose` no ModalHeader
9. **Sidebar auto-collapse** — usar `key={`section-${activeSection}`}` em SidebarItems expansíveis para forçar re-mount quando seção muda
10. **Select portal** — dropdown usa `position: fixed`; pode clipar em containers com overflow
11. **Vite resolve DS do source** — aliases apontam para `design-system/src/`, não `dist/`, evitando conflito com `build:docs`
12. **Pseudo-elementos em flex containers** — `::before`/`::after` viram flex items. Para decorações (drag handles, divisores) dentro de containers flex, usar `position: absolute` no pseudo-elemento + `position: relative` no pai. Não usar `flex-basis: 100%` com `max-width` menor (anula a quebra de linha)
13. **ResizeObserver em testes** — O DS usa ResizeObserver no TabBar. O mock deve ser uma classe com constructor, não uma função simples
14. **FilterBar options em testes** — Opções do "Adicionar filtro" são `role="option"` dentro de um listbox, não texto simples
15. **TabBar tabs em testes** — Tabs são `role="tab"`, não texto simples
16. **aria-sort em colunas sortable** — Colunas sortable sem sort ativo têm `aria-sort="none"`, não undefined
17. **TableBulkActions clear button** — O botão de limpar seleção tem `aria-label="Desmarcar todos"`
18. **Duplicação de React com DS linkado** — Ao usar path local para o DS, adicionar aliases no vite.config.ts para forçar uma única instância de React
