import { useState, useMemo, useEffect, type ChangeEvent } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardDivider,
  Badge,
  Button,
  Alert,
  AvatarLabelGroup,
  AvatarGroup,
  Tooltip,
  Input,
  Select,
  Toggle,
  ChoiceBox,
  ChoiceBoxGroup,
  Table,
  TableCardHeader,
  TableContent,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@getbud-co/buds";
import {
  MagnifyingGlass,
  Users,
  CheckCircle,
  WarningCircle,
  Sparkle,
  Plus,
  X,
  Info,
  UserCircle,
  ShieldCheck,
  ClockCountdown,
  ArrowRight,
  Warning,
} from "@phosphor-icons/react";
import type {
  PeerAssignment,
  PeerSuggestion,
  PeerSuggestionReason,
  PeerAssignmentMode,
  PeerNominationConfig,
} from "@/types/survey";
import { usePeopleData, type PeopleUserView } from "@/contexts/PeopleDataContext";
import { useWizard } from "../SurveyWizardContext";
import { needsPeerAssignment } from "../wizardReducer";
import styles from "./StepPeerAssignment.module.css";

/* ——— Constants ——— */

const REASON_LABELS: Record<PeerSuggestionReason, string> = {
  same_team: "Mesmo time",
  shared_okr: "OKR compartilhado",
  frequent_feedback: "Feedbacks frequentes",
  cross_functional: "Cross-funcional",
  direct_collaboration: "Colaboração direta",
  manager_recommendation: "Recomendação do gestor",
};

const REASON_COLORS: Record<PeerSuggestionReason, "neutral" | "orange" | "success" | "caramel" | "wine"> = {
  same_team: "caramel",
  shared_okr: "orange",
  frequent_feedback: "success",
  cross_functional: "wine",
  direct_collaboration: "neutral",
  manager_recommendation: "orange",
};

/* ——— AI suggestion generator (mock) ——— */

function generateAiSuggestions(
  evaluateeId: string,
  allUsers: PeopleUserView[],
  evaluatee: PeopleUserView | undefined,
): PeerSuggestion[] {
  if (!evaluatee) return [];
  const candidates = allUsers.filter((u) => u.id !== evaluateeId && u.status === "active");
  return candidates.slice(0, 7).map((candidate, i) => {
    const reasons: PeerSuggestionReason[] = [];
    const sharedTeams = candidate.teams.filter((t) => evaluatee.teams.includes(t));
    if (sharedTeams.length > 0) reasons.push("same_team");
    if (i % 3 === 0) reasons.push("shared_okr");
    if (i % 4 === 0) reasons.push("frequent_feedback");
    if (sharedTeams.length === 0 && i % 2 === 0) reasons.push("cross_functional");
    if (reasons.length === 0) reasons.push("direct_collaboration");
    return { peerId: candidate.id, reasons, confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100 };
  });
}

/* ——— Main component ——— */

export function StepPeerAssignment() {
  const { state, dispatch } = useWizard();
  const { users } = usePeopleData();

  if (!needsPeerAssignment(state)) {
    return (
      <div className={styles.step}>
        <Alert variant="info" title="Atribuição de pares não aplicável">
          Esta pesquisa não utiliza avaliação de pares. Prossiga para o próximo passo.
        </Alert>
      </div>
    );
  }

  const mode = state.peerAssignmentMode;
  const config = state.peerNominationConfig;
  const peerPerspective = state.perspectives.find((p) => p.perspective === "peers");
  const minPeers = peerPerspective?.minEvaluators ?? 3;
  const maxPeers = peerPerspective?.maxEvaluators ?? 5;

  function handleModeChange(newMode: string | undefined) {
    if (newMode) dispatch({ type: "SET_PEER_ASSIGNMENT_MODE", payload: newMode as PeerAssignmentMode });
  }

  function updateConfig(changes: Partial<PeerNominationConfig>) {
    dispatch({ type: "SET_PEER_NOMINATION_CONFIG", payload: changes });
  }

  return (
    <div className={styles.step}>
      {/* Mode selection */}
      <Card padding="md">
        <CardHeader
          title="Como os pares serão definidos?"
          description="Escolha o modelo de atribuição de avaliadores para esta pesquisa"
        />
        <CardBody>
          <ChoiceBoxGroup value={mode} onChange={handleModeChange}>
            <ChoiceBox
              value="employee_nominates"
              title="Colaborador nomeia (recomendado)"
              description="Cada colaborador indica seus pares → Gestor revisa e aprova. Escala para empresas de qualquer tamanho."
            />
            <ChoiceBox
              value="manager_assigns"
              title="Gestor define"
              description="Gestor define os pares de cada liderado → RH supervisiona. Ideal para primeira 360 ou times menores."
            />
            <ChoiceBox
              value="centralized"
              title="RH define agora"
              description="RH atribui todos os pares neste momento com sugestões da IA. Para equipes pequenas (<50 pessoas) ou controle total."
            />
          </ChoiceBoxGroup>
        </CardBody>
      </Card>

      {/* Mode-specific content */}
      {mode === "centralized" ? (
        <CentralizedAssignment
          state={state}
          dispatch={dispatch}
          users={users}
          minPeers={minPeers}
          maxPeers={maxPeers}
          maxReviewsPerEvaluator={config.maxReviewsPerEvaluator}
        />
      ) : (
        <NominationFlowConfig
          mode={mode}
          config={config}
          minPeers={minPeers}
          maxPeers={maxPeers}
          updateConfig={updateConfig}
        />
      )}
    </div>
  );
}

/* ————————————————————————————————————————————————————————————
   Nomination / Manager-assigns flow configuration
   ———————————————————————————————————————————————————————————— */

interface NominationFlowConfigProps {
  mode: "employee_nominates" | "manager_assigns";
  config: PeerNominationConfig;
  minPeers: number;
  maxPeers: number;
  updateConfig: (changes: Partial<PeerNominationConfig>) => void;
}

function NominationFlowConfig({ mode, config, minPeers, maxPeers, updateConfig }: NominationFlowConfigProps) {
  const isEmployee = mode === "employee_nominates";

  return (
    <>
      {/* Explanation */}
      <Alert variant="info" title={isEmployee ? "Como funciona a nomeação pelo colaborador" : "Como funciona a definição pelo gestor"}>
        {isEmployee
          ? <>Após o lançamento, cada colaborador indica <strong>{minPeers} a {maxPeers} pares</strong> que podem avaliá-lo. O <strong>gestor revisa e aprova</strong> as nomeações. A IA pode sugerir pares para facilitar a escolha.</>
          : <>Após o lançamento, cada gestor define <strong>{minPeers} a {maxPeers} pares</strong> para cada liderado. O <strong>RH supervisiona</strong> via dashboard e pode ajustar atribuições.</>
        }
      </Alert>

      {/* Flow visualization */}
      <Card padding="md">
        <CardHeader title="Fluxo após o lançamento" description="Fases adicionais antes da avaliação de pares" />
        <CardBody>
          <div className={styles.flowTimeline}>
            <FlowStep
              icon={UserCircle}
              iconBg="var(--color-orange-50)"
              iconColor="var(--color-orange-600)"
              title={isEmployee ? "Nomeação" : "Atribuição"}
              description={isEmployee ? "Colaborador indica seus pares" : "Gestor define pares de cada liderado"}
            >
              <Input
                label="Prazo (dias)"
                size="sm"
                type="number"
                value={String(config.nominationDays)}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateConfig({ nominationDays: Math.max(1, parseInt(e.target.value) || 5) })
                }
              />
            </FlowStep>

            <div className={styles.flowArrow}><ArrowRight size={16} color="var(--color-neutral-300)" /></div>

            <FlowStep
              icon={ShieldCheck}
              iconBg="var(--color-green-50)"
              iconColor="var(--color-green-600)"
              title="Revisão"
              description={isEmployee ? "Gestor revisa e aprova nomeações" : "RH supervisiona e ajusta"}
            >
              <Input
                label="Prazo (dias)"
                size="sm"
                type="number"
                value={String(config.approvalDays)}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateConfig({ approvalDays: Math.max(1, parseInt(e.target.value) || 3) })
                }
              />
            </FlowStep>

            <div className={styles.flowArrow}><ArrowRight size={16} color="var(--color-neutral-300)" /></div>

            <FlowStep
              icon={ClockCountdown}
              iconBg="var(--color-caramel-100)"
              iconColor="var(--color-caramel-600)"
              title="Avaliação de pares"
              description="Pares aprovados respondem a pesquisa"
            />
          </div>
        </CardBody>

        <CardDivider />

        {/* Settings */}
        <CardBody>
          <div className={styles.settingsGrid}>
            <Toggle
              label="Sugestões da IA"
              description={isEmployee
                ? "A Bud IA sugere pares ao colaborador baseada em org chart, OKRs e histórico de feedbacks"
                : "A Bud IA sugere pares ao gestor baseada em org chart, OKRs e histórico de feedbacks"
              }
              checked={config.aiSuggestionsEnabled}
              onChange={() => updateConfig({ aiSuggestionsEnabled: !config.aiSuggestionsEnabled })}
            />
            <Toggle
              label="Admin pode sobrescrever"
              description="RH pode editar qualquer atribuição a qualquer momento, mesmo após aprovação do gestor"
              checked={config.adminOverrideEnabled}
              onChange={() => updateConfig({ adminOverrideEnabled: !config.adminOverrideEnabled })}
            />
            {isEmployee && (
              <Toggle
                label="Nomeações visíveis ao avaliado"
                description="O colaborador pode ver quem foi nomeado para avaliá-lo (desative para total anonimato)"
                checked={config.nominationVisible}
                onChange={() => updateConfig({ nominationVisible: !config.nominationVisible })}
              />
            )}
          </div>
        </CardBody>

        <CardDivider />

        {/* Limits */}
        <CardBody>
          <div className={styles.limitsRow}>
            <div className={styles.limitField}>
              <Input
                label="Máx. avaliações por avaliador"
                size="sm"
                type="number"
                value={String(config.maxReviewsPerEvaluator)}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateConfig({ maxReviewsPerEvaluator: Math.max(1, parseInt(e.target.value) || 7) })
                }
                message="Evita sobrecarga — alerta quando alguém recebe muitas nomeações"
              />
            </div>
            <div className={styles.limitField}>
              <Input
                label={`Pares por avaliado (mín – máx)`}
                size="sm"
                value={`${minPeers} – ${maxPeers}`}
                disabled
                message="Configure no passo Participantes → Perspectivas"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Summary */}
      <Card padding="sm">
        <CardBody>
          <div className={styles.summaryBar}>
            <SummaryChip label="Pares por avaliado" value={`${minPeers}–${maxPeers}`} />
            <SummaryChip label="Tempo total" value={`${config.nominationDays + config.approvalDays} dias`} />
            <SummaryChip label="Sugestão IA" value={config.aiSuggestionsEnabled ? "Ativada" : "Desativada"} color={config.aiSuggestionsEnabled ? "success" : "neutral"} />
            <SummaryChip label="Limite por avaliador" value={`${config.maxReviewsPerEvaluator} avaliações`} />
            <SummaryChip label="Admin override" value={config.adminOverrideEnabled ? "Sim" : "Não"} color={config.adminOverrideEnabled ? "success" : "neutral"} />
          </div>
        </CardBody>
      </Card>
    </>
  );
}

/* ————————————————————————————————————————————————————————————
   Centralized assignment (RH assigns with AI suggestions)
   ———————————————————————————————————————————————————————————— */

interface CentralizedAssignmentProps {
  state: ReturnType<typeof useWizard>["state"];
  dispatch: ReturnType<typeof useWizard>["dispatch"];
  users: PeopleUserView[];
  minPeers: number;
  maxPeers: number;
  maxReviewsPerEvaluator: number;
}

function CentralizedAssignment({ state, dispatch, users, minPeers, maxPeers, maxReviewsPerEvaluator }: CentralizedAssignmentProps) {
  const [search, setSearch] = useState("");
  const [expandedEvaluatee, setExpandedEvaluatee] = useState<string | null>(null);

  const evaluatees = useMemo(() => {
    const excluded = new Set(state.excludedUserIds);
    return users.filter((u) => {
      if (excluded.has(u.id) || u.status !== "active") return false;
      if (state.scope.scopeType === "team") return u.teams.some((t) => state.scope.teamIds.includes(t));
      if (state.scope.scopeType === "individual") return state.scope.userIds.includes(u.id);
      return true;
    });
  }, [users, state.scope, state.excludedUserIds]);

  // Initialize with AI suggestions
  useEffect(() => {
    if (state.peerAssignments.length > 0 || evaluatees.length === 0) return;
    const assignments: PeerAssignment[] = evaluatees.map((evaluatee) => {
      const suggestions = generateAiSuggestions(evaluatee.id, users, evaluatee);
      const autoAccepted = suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxPeers)
        .map((s) => s.peerId);
      return { evaluateeId: evaluatee.id, suggestions, assignedPeerIds: autoAccepted };
    });
    dispatch({ type: "SET_PEER_ASSIGNMENTS", payload: assignments });
  }, [evaluatees, users, state.peerAssignments.length, maxPeers, dispatch]);

  const filteredEvaluatees = useMemo(() => {
    if (!search) return evaluatees;
    const q = search.toLowerCase();
    return evaluatees.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.teams.some((t) => t.toLowerCase().includes(q)),
    );
  }, [evaluatees, search]);

  const userMap = useMemo(() => {
    const map = new Map<string, PeopleUserView>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  // KPIs
  const totalComplete = state.peerAssignments.filter((pa) => pa.assignedPeerIds.length >= minPeers).length;
  const totalPending = evaluatees.length - totalComplete;
  const underAssigned = state.peerAssignments.filter((pa) => pa.assignedPeerIds.length < minPeers).length;

  // Overload detection — count how many times each user appears as evaluator
  const evaluatorLoadMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const pa of state.peerAssignments) {
      for (const peerId of pa.assignedPeerIds) {
        map.set(peerId, (map.get(peerId) ?? 0) + 1);
      }
    }
    return map;
  }, [state.peerAssignments]);

  const overloadedEvaluators = useMemo(() => {
    const list: { userId: string; count: number }[] = [];
    for (const [userId, count] of evaluatorLoadMap) {
      if (count > maxReviewsPerEvaluator) list.push({ userId, count });
    }
    return list;
  }, [evaluatorLoadMap, maxReviewsPerEvaluator]);

  // Reciprocity detection — A evaluates B AND B evaluates A
  const reciprocityAlerts = useMemo(() => {
    const alerts: { aId: string; bId: string }[] = [];
    const seen = new Set<string>();
    for (const pa of state.peerAssignments) {
      for (const peerId of pa.assignedPeerIds) {
        const reverse = state.peerAssignments.find((rpa) => rpa.evaluateeId === peerId);
        if (reverse?.assignedPeerIds.includes(pa.evaluateeId)) {
          const key = [pa.evaluateeId, peerId].sort().join("__");
          if (!seen.has(key)) { seen.add(key); alerts.push({ aId: pa.evaluateeId, bId: peerId }); }
        }
      }
    }
    return alerts;
  }, [state.peerAssignments]);

  function getAssignment(id: string) { return state.peerAssignments.find((pa) => pa.evaluateeId === id); }

  function togglePeer(evaluateeId: string, peerId: string) {
    const a = getAssignment(evaluateeId);
    if (!a) return;
    const cur = a.assignedPeerIds;
    dispatch({ type: "UPDATE_PEER_ASSIGNMENT", payload: { evaluateeId, assignedPeerIds: cur.includes(peerId) ? cur.filter((id) => id !== peerId) : [...cur, peerId] } });
  }

  function addManualPeer(evaluateeId: string, peerId: string) {
    const a = getAssignment(evaluateeId);
    if (!a || a.assignedPeerIds.includes(peerId)) return;
    dispatch({ type: "UPDATE_PEER_ASSIGNMENT", payload: { evaluateeId, assignedPeerIds: [...a.assignedPeerIds, peerId] } });
  }

  function getAvailablePeers(evaluateeId: string): PeopleUserView[] {
    const a = getAssignment(evaluateeId);
    const assigned = new Set(a?.assignedPeerIds ?? []);
    const suggested = new Set(a?.suggestions.map((s) => s.peerId) ?? []);
    return users.filter((u) => u.id !== evaluateeId && u.status === "active" && !assigned.has(u.id) && !suggested.has(u.id));
  }

  return (
    <>
      <Alert variant="info" title="Como a IA sugere os avaliadores">
        A Bud IA analisa <strong>estrutura organizacional</strong>, <strong>OKRs compartilhados</strong>,
        <strong> histórico de feedbacks</strong> e <strong>colaboração cross-funcional</strong> para sugerir
        os pares mais relevantes. Cada sugestão mostra a razão e o nível de confiança.
      </Alert>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        {[
          { label: "Avaliados", value: evaluatees.length, icon: Users, bg: "var(--color-caramel-100)", iconColor: "var(--color-caramel-600)" },
          { label: "Completos", value: totalComplete, icon: CheckCircle, bg: "var(--color-green-50)", iconColor: "var(--color-green-600)" },
          { label: "Pendentes", value: totalPending, icon: WarningCircle, bg: "var(--color-warning-50)", iconColor: "var(--color-warning-600)" },
          { label: "Pares/pessoa", value: `${minPeers}–${maxPeers}`, icon: Sparkle, bg: "var(--color-orange-50)", iconColor: "var(--color-orange-600)" },
        ].map((kpi) => { const Icon = kpi.icon; return (
          <Card key={kpi.label} padding="sm"><CardBody><div className={styles.kpi}>
            <div className={styles.kpiIcon} style={{ background: kpi.bg }}><Icon size={20} color={kpi.iconColor} /></div>
            <div className={styles.kpiContent}><span className={styles.kpiValue}>{kpi.value}</span><span className={styles.kpiLabel}>{kpi.label}</span></div>
          </div></CardBody></Card>
        ); })}
      </div>

      {/* Alerts */}
      {underAssigned > 0 && (
        <Alert variant="warning" title={`${underAssigned} avaliado(s) com menos de ${minPeers} pares`}>
          Adicione mais pares para garantir anonimato e representatividade.
        </Alert>
      )}
      {overloadedEvaluators.length > 0 && (
        <Alert variant="warning" title={`${overloadedEvaluators.length} avaliador(es) sobrecarregado(s)`}>
          {overloadedEvaluators.slice(0, 3).map((e) => {
            const u = userMap.get(e.userId);
            return u ? `${u.firstName} ${u.lastName} (${e.count} avaliações)` : "";
          }).filter(Boolean).join(", ")}
          {overloadedEvaluators.length > 3 ? ` e mais ${overloadedEvaluators.length - 3}` : ""}.
          O limite é {maxReviewsPerEvaluator} avaliações por pessoa.
        </Alert>
      )}
      {reciprocityAlerts.length > 0 && (
        <Alert variant="warning" title={`${reciprocityAlerts.length} par(es) com avaliação mútua`}>
          {reciprocityAlerts.slice(0, 3).map((r) => {
            const a = userMap.get(r.aId); const b = userMap.get(r.bId);
            return a && b ? `${a.firstName} ↔ ${b.firstName}` : "";
          }).filter(Boolean).join(", ")}.
          Avaliação mútua pode gerar viés de reciprocidade. Considere remover um dos lados.
        </Alert>
      )}

      {/* Evaluatee table */}
      <Table variant="divider" elevated={false}>
        <TableCardHeader
          title="Atribuição de pares"
          badge={<Badge color="neutral" size="sm">{filteredEvaluatees.length}</Badge>}
          actions={
            <Input
              size="sm"
              leftIcon={MagnifyingGlass}
              placeholder="Buscar avaliado..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          }
        />
        <TableContent>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Avaliado</TableHeaderCell>
              <TableHeaderCell>Departamento</TableHeaderCell>
              <TableHeaderCell>Pares atribuídos</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Ação</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEvaluatees.map((evaluatee) => {
              const assignment = getAssignment(evaluatee.id);
              const count = assignment?.assignedPeerIds.length ?? 0;
              const isComplete = count >= minPeers && count <= maxPeers;
              const isUnder = count < minPeers;

              return (
                <TableRow key={evaluatee.id}>
                  <TableCell>
                    <AvatarLabelGroup
                      name={`${evaluatee.firstName} ${evaluatee.lastName}`}
                      supportingText={evaluatee.jobTitle ?? ""}
                      initials={evaluatee.initials ?? undefined}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>{evaluatee.teams[0] ?? "—"}</TableCell>
                  <TableCell>
                    {count > 0 ? (
                      <AvatarGroup
                        size="xs"
                        maxVisible={4}
                        avatars={assignment!.assignedPeerIds.map((peerId) => {
                          const peer = userMap.get(peerId);
                          return { initials: peer?.initials ?? "?", alt: peer ? `${peer.firstName} ${peer.lastName}` : "" };
                        })}
                      />
                    ) : <span style={{ color: "var(--color-neutral-400)" }}>Nenhum</span>}
                  </TableCell>
                  <TableCell>
                    <Badge color={isUnder ? "error" : isComplete ? "success" : "warning"} size="sm">
                      {count}/{minPeers}–{maxPeers}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={expandedEvaluatee === evaluatee.id ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setExpandedEvaluatee(expandedEvaluatee === evaluatee.id ? null : evaluatee.id)}
                    >
                      {expandedEvaluatee === evaluatee.id ? "Fechar" : "Editar"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TableContent>
      </Table>

      {/* Expanded peer panel below table */}
      {expandedEvaluatee && (() => {
        const assignment = getAssignment(expandedEvaluatee);
        if (!assignment) return null;
        const evaluatee = userMap.get(expandedEvaluatee);

        return (
          <Card padding="md">
            <CardHeader
              title={`Pares de ${evaluatee ? `${evaluatee.firstName} ${evaluatee.lastName}` : ""}`}
              description="Sugestões da IA — aceite, remova ou adicione pares manualmente"
              action={<Button variant="secondary" size="sm" leftIcon={X} onClick={() => setExpandedEvaluatee(null)}>Fechar</Button>}
            />
            <CardBody>
              <div className={styles.peerGrid}>
                {assignment.suggestions.map((suggestion) => {
                  const peer = userMap.get(suggestion.peerId);
                  if (!peer) return null;
                  const isAssigned = assignment.assignedPeerIds.includes(suggestion.peerId);
                  const peerLoad = evaluatorLoadMap.get(suggestion.peerId) ?? 0;
                  const isOverloaded = peerLoad >= maxReviewsPerEvaluator;

                  return (
                    <div key={suggestion.peerId} className={`${styles.peerCard} ${isAssigned ? styles.peerCardSelected : ""}`}>
                      <div className={styles.peerCardHeader}>
                        <AvatarLabelGroup
                          name={`${peer.firstName} ${peer.lastName}`}
                          supportingText={peer.jobTitle ?? ""}
                          initials={peer.initials ?? undefined}
                          size="sm"
                        />
                        <div className={styles.peerCardActions}>
                          {isOverloaded && !isAssigned && (
                            <Tooltip content={`Já tem ${peerLoad} avaliações (limite: ${maxReviewsPerEvaluator})`}>
                              <Warning size={16} color="var(--color-warning-600)" />
                            </Tooltip>
                          )}
                          <Button
                            variant={isAssigned ? "secondary" : "primary"}
                            size="sm"
                            leftIcon={isAssigned ? X : Plus}
                            onClick={() => togglePeer(expandedEvaluatee, suggestion.peerId)}
                          >
                            {isAssigned ? "Remover" : "Adicionar"}
                          </Button>
                        </div>
                      </div>
                      <div className={styles.peerReasons}>
                        {suggestion.reasons.map((reason) => (
                          <Badge key={reason} color={REASON_COLORS[reason]} size="sm">{REASON_LABELS[reason]}</Badge>
                        ))}
                        <Tooltip content={`Confiança da IA: ${Math.round(suggestion.confidence * 100)}%`}>
                          <span className={styles.confidenceDot}>
                            <Info size={12} color="var(--color-neutral-400)" />
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
            <CardDivider />
            <CardBody>
              <div className={styles.manualAddRow}>
                <Select
                  label="Adicionar par manualmente"
                  size="sm"
                  searchable
                  options={getAvailablePeers(expandedEvaluatee).slice(0, 20).map((u) => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName}`,
                  }))}
                  value=""
                  onChange={(v: string | undefined) => { if (v) addManualPeer(expandedEvaluatee, v); }}
                  placeholder="Buscar colaborador..."
                />
              </div>
            </CardBody>
          </Card>
        );
      })()}
    </>
  );
}

/* ————————————————————————————————————————————————————————————
   Shared sub-components
   ———————————————————————————————————————————————————————————— */

function FlowStep({ icon: Icon, iconBg, iconColor, title, description, children }: {
  icon: React.ComponentType<{ size: number; color: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.flowStep}>
      <div className={styles.flowStepIcon} style={{ background: iconBg }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div className={styles.flowStepContent}>
        <span className={styles.flowStepTitle}>{title}</span>
        <span className={styles.flowStepDesc}>{description}</span>
      </div>
      {children && <div className={styles.flowStepConfig}>{children}</div>}
    </div>
  );
}

function SummaryChip({ label, value, color = "neutral" }: { label: string; value: string; color?: "neutral" | "success" }) {
  return (
    <div className={styles.summaryItem}>
      <span className={styles.summaryLabel}>{label}</span>
      <Badge color={color} size="sm">{value}</Badge>
    </div>
  );
}
