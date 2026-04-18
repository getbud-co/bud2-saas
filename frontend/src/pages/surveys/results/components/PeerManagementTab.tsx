import { useState, useMemo, type ChangeEvent } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Alert,
  Input,
  Select,
  AvatarLabelGroup,
  Tooltip,
  toast,
} from "@getbud-co/buds";
import {
  MagnifyingGlass,
  Users,
  CheckCircle,
  ClockCountdown,
  XCircle,
  Sparkle,
  Check,
  X,
  ChartLineUp,
} from "@phosphor-icons/react";
import type { SurveyResultData, PeerNominationStatus } from "../types";
import styles from "./PeerManagementTab.module.css";

/* ——— Constants ——— */

const STATUS_CONFIG: Record<PeerNominationStatus, { label: string; color: "warning" | "success" | "error" | "orange" }> = {
  pending: { label: "Pendente", color: "warning" },
  approved: { label: "Aprovada", color: "success" },
  rejected: { label: "Rejeitada", color: "error" },
  overridden: { label: "Sobrescrita", color: "orange" },
};

const PHASE_CONFIG: Record<string, { label: string; color: "warning" | "success" | "orange" | "neutral" }> = {
  nomination: { label: "Nomeação em andamento", color: "orange" },
  approval: { label: "Aprovação em andamento", color: "warning" },
  in_evaluation: { label: "Avaliação de pares ativa", color: "success" },
  closed: { label: "Encerrado", color: "neutral" },
};

/* ——— Component ——— */

interface PeerManagementTabProps {
  data: SurveyResultData;
}

export function PeerManagementTab({ data }: PeerManagementTabProps) {
  const session = data.peerNominationSession;

  if (!session) {
    return (
      <div className={styles.tab}>
        <Alert variant="info" title="Sem dados de nomeação">
          Esta pesquisa não possui um fluxo de nomeação de pares configurado.
        </Alert>
      </div>
    );
  }

  return <PeerManagementContent session={session} />;
}

function PeerManagementContent({ session }: { session: NonNullable<SurveyResultData["peerNominationSession"]> }) {
  const [search, setSearch] = useState("");
  const [nominations, setNominations] = useState(session.nominations);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  /** Max reviews per evaluator — from config, fallback to 7 */
  const maxLoad = 7; // TODO: read from survey config when available (peerNominationConfig.maxReviewsPerEvaluator)

  /* KPIs */
  const pendingCount = nominations.filter((n) => n.status === "pending").length;
  const approvedCount = nominations.filter((n) => n.status === "approved" || n.status === "overridden").length;
  const rejectedCount = nominations.filter((n) => n.status === "rejected").length;
  const totalCount = nominations.length;

  /* ——— Holistic people view ——— */

  interface PersonLoadView {
    id: string;
    name: string;
    initials: string;
    department: string;
    /** How many evaluations this person will WRITE (as evaluator) */
    evaluationsToWrite: number;
    /** How many evaluations this person will RECEIVE (as evaluatee) */
    evaluationsToReceive: number;
    /** Status flags */
    isOverloaded: boolean;
    hasNoPeers: boolean;
    willWriteNothing: boolean;
  }

  const peopleLoadView = useMemo<PersonLoadView[]>(() => {
    const activeNoms = nominations.filter((n) => n.status === "approved" || n.status === "overridden" || n.status === "pending");

    // Collect all unique people (both evaluatees and peers)
    const peopleMap = new Map<string, PersonLoadView>();

    function ensurePerson(id: string, name: string, initials: string, dept: string) {
      if (!peopleMap.has(id)) {
        peopleMap.set(id, { id, name, initials, department: dept, evaluationsToWrite: 0, evaluationsToReceive: 0, isOverloaded: false, hasNoPeers: false, willWriteNothing: false });
      }
      return peopleMap.get(id)!;
    }

    // Count from evaluatee side (receiving)
    for (const n of activeNoms) {
      const evaluatee = ensurePerson(n.evaluateeId, n.evaluateeName, n.evaluateeInitials, n.evaluateeDepartment);
      evaluatee.evaluationsToReceive++;
      const peer = ensurePerson(n.nominatedPeerId, n.nominatedPeerName, n.nominatedPeerInitials, n.nominatedPeerDepartment);
      peer.evaluationsToWrite++;
    }

    // Also ensure all evaluatees appear even if they have 0 approved nominations
    for (const n of nominations) {
      ensurePerson(n.evaluateeId, n.evaluateeName, n.evaluateeInitials, n.evaluateeDepartment);
    }

    // Flag issues
    for (const p of peopleMap.values()) {
      p.isOverloaded = p.evaluationsToWrite > maxLoad;
      p.hasNoPeers = p.evaluationsToReceive === 0;
      p.willWriteNothing = p.evaluationsToWrite === 0;
    }

    return [...peopleMap.values()].sort((a, b) => {
      // Sort: problems first (overloaded, no peers), then by name
      const aScore = (a.isOverloaded ? 100 : 0) + (a.hasNoPeers ? 50 : 0);
      const bScore = (b.isOverloaded ? 100 : 0) + (b.hasNoPeers ? 50 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return a.name.localeCompare(b.name);
    });
  }, [nominations]);

  const overloadedCount = peopleLoadView.filter((p) => p.isOverloaded).length;
  const noPeersCount = peopleLoadView.filter((p) => p.hasNoPeers).length;

  /* Overload detection (for alerts — kept for backward compat) */
  const overloadedPeers = peopleLoadView.filter((p) => p.isOverloaded);

  /* Reciprocity detection */
  const reciprocities = useMemo(() => {
    const pairs: { a: string; b: string }[] = [];
    const seen = new Set<string>();
    const activeNoms = nominations.filter((n) => n.status === "approved" || n.status === "overridden" || n.status === "pending");
    for (const n of activeNoms) {
      const reverse = activeNoms.find((r) => r.evaluateeId === n.nominatedPeerId && r.nominatedPeerId === n.evaluateeId);
      if (reverse) {
        const key = [n.evaluateeId, n.nominatedPeerId].sort().join("__");
        if (!seen.has(key)) { seen.add(key); pairs.push({ a: n.evaluateeName, b: n.nominatedPeerName }); }
      }
    }
    return pairs;
  }, [nominations]);

  /* Actions */
  function handleApprove(id: string) {
    setNominations((prev) => prev.map((n) => n.id === id ? { ...n, status: "approved" as const, reviewedAt: new Date().toISOString().slice(0, 10), reviewedByName: "Admin (RH)" } : n));
    toast.success("Nomeação aprovada");
  }

  function handleReject(id: string) {
    setNominations((prev) => prev.map((n) => n.id === id ? { ...n, status: "rejected" as const, reviewedAt: new Date().toISOString().slice(0, 10), reviewedByName: "Admin (RH)", rejectionReason: "Rejeitado pelo RH" } : n));
    toast.success("Nomeação rejeitada");
  }

  function handleBulkApproveAll() {
    setNominations((prev) => prev.map((n) => n.status === "pending" ? { ...n, status: "approved" as const, reviewedAt: new Date().toISOString().slice(0, 10), reviewedByName: "Admin (RH)" } : n));
    toast.success(`${pendingCount} nomeações aprovadas`);
  }

  const phaseConfig = PHASE_CONFIG[session.phase] ?? { label: "Em andamento", color: "warning" as const };

  return (
    <div className={styles.tab}>
      {/* Phase status bar */}
      <div className={styles.phaseBar}>
        <div className={styles.phaseLeft}>
          <Badge color={phaseConfig.color} size="md">{phaseConfig.label}</Badge>
          {session.nominationDeadline && (
            <span className={styles.phaseDeadline}>
              Nomeação até {session.nominationDeadline} · Aprovação até {session.approvalDeadline}
            </span>
          )}
        </div>
        {pendingCount > 0 && (
          <Button variant="primary" size="sm" leftIcon={Check} onClick={handleBulkApproveAll}>
            Aprovar todas ({pendingCount})
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        {[
          { label: "Total", value: totalCount, icon: Users, bg: "var(--color-caramel-100)", iconColor: "var(--color-caramel-600)" },
          { label: "Pendentes", value: pendingCount, icon: ClockCountdown, bg: "var(--color-warning-50)", iconColor: "var(--color-warning-600)" },
          { label: "Aprovadas", value: approvedCount, icon: CheckCircle, bg: "var(--color-green-50)", iconColor: "var(--color-green-600)" },
          { label: "Rejeitadas", value: rejectedCount, icon: XCircle, bg: "var(--color-error-50)", iconColor: "var(--color-error-600)" },
          { label: "Avaliados cobertos", value: `${session.evaluateesWithNominations}/${session.totalEvaluatees}`, icon: ChartLineUp, bg: "var(--color-orange-50)", iconColor: "var(--color-orange-600)" },
        ].map((kpi) => { const Icon = kpi.icon; return (
          <Card key={kpi.label} padding="sm"><CardBody><div className={styles.kpi}>
            <div className={styles.kpiIcon} style={{ background: kpi.bg }}><Icon size={20} color={kpi.iconColor} /></div>
            <div className={styles.kpiContent}><span className={styles.kpiValue}>{kpi.value}</span><span className={styles.kpiLabel}>{kpi.label}</span></div>
          </div></CardBody></Card>
        ); })}
      </div>

      {/* Alerts */}
      {overloadedPeers.length > 0 && (
        <Alert variant="warning" title={`${overloadedCount} colaborador(es) sobrecarregado(s)`}>
          {overloadedPeers.slice(0, 3).map((p) => `${p.name} (${p.evaluationsToWrite} avaliações)`).join(", ")}
          {overloadedPeers.length > 3 ? ` e mais ${overloadedPeers.length - 3}` : ""}.
          O limite recomendado é {maxLoad} avaliações por pessoa.
        </Alert>
      )}
      {noPeersCount > 0 && (
        <Alert variant="error" title={`${noPeersCount} avaliado(s) sem nenhum par aprovado`}>
          Estes colaboradores não receberão avaliação de pares. Revise as nomeações ou adicione pares manualmente.
        </Alert>
      )}
      {reciprocities.length > 0 && (
        <Alert variant="warning" title={`${reciprocities.length} par(es) com avaliação mútua`}>
          {reciprocities.slice(0, 3).map((r) => `${r.a} ↔ ${r.b}`).join(", ")}.
          Avaliação mútua pode gerar viés de reciprocidade.
        </Alert>
      )}

      {/* ——— People view with inline expansion ——— */}
      <Card padding="md">
        <CardHeader
          title="Visão por colaborador"
          description="Clique em um colaborador para gerenciar suas nomeações"
          action={
            <Input
              size="sm"
              leftIcon={MagnifyingGlass}
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          }
        />
        <CardBody>
          <div className={styles.peopleList}>
            {peopleLoadView
              .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
              .map((person) => {
              const isExpanded = selectedPersonId === person.id;
              const receiving = nominations.filter((n) => n.evaluateeId === person.id && (n.status === "approved" || n.status === "overridden" || n.status === "pending"));
              const writing = nominations.filter((n) => n.nominatedPeerId === person.id && (n.status === "approved" || n.status === "overridden" || n.status === "pending"));
              const receivingPending = receiving.filter((n) => n.status === "pending").length;

              return (
                <div key={person.id} className={styles.personItem}>
                  {/* Person row */}
                  <button
                    className={`${styles.personRow} ${isExpanded ? styles.personRowExpanded : ""}`}
                    onClick={() => setSelectedPersonId(isExpanded ? null : person.id)}
                    type="button"
                  >
                    <AvatarLabelGroup name={person.name} initials={person.initials} supportingText={person.department} size="sm" />
                    <div className={styles.personMetrics}>
                      <Tooltip content="Avaliações a receber (como avaliado)">
                        <div className={styles.metricChip}>
                          <span className={styles.metricLabel}>Recebe</span>
                          <span className={`${styles.metricValue} ${person.hasNoPeers ? styles.metricError : ""}`}>{person.evaluationsToReceive}</span>
                        </div>
                      </Tooltip>
                      <Tooltip content="Avaliações a fazer (como avaliador)">
                        <div className={styles.metricChip}>
                          <span className={styles.metricLabel}>Faz</span>
                          <span className={`${styles.metricValue} ${person.isOverloaded ? styles.metricWarning : ""}`}>{person.evaluationsToWrite}</span>
                        </div>
                      </Tooltip>
                      {person.isOverloaded ? (
                        <Badge color="warning" size="sm">Sobrecarregado</Badge>
                      ) : person.hasNoPeers ? (
                        <Badge color="error" size="sm">Sem pares</Badge>
                      ) : receivingPending > 0 ? (
                        <Badge color="orange" size="sm">{receivingPending} pendente{receivingPending > 1 ? "s" : ""}</Badge>
                      ) : (
                        <Badge color="success" size="sm">OK</Badge>
                      )}
                    </div>
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className={styles.personPanel}>
                      {/* Evaluations to RECEIVE */}
                      <div className={styles.panelSection}>
                        <div className={styles.panelSectionHeader}>
                          <span className={styles.panelSectionTitle}>Pares que avaliam {person.name.split(" ")[0]}</span>
                          {receiving.some((n) => n.status === "pending") && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={Check}
                              onClick={() => {
                                receiving.filter((n) => n.status === "pending").forEach((n) => handleApprove(n.id));
                              }}
                            >
                              Aprovar todas pendentes
                            </Button>
                          )}
                        </div>
                        {receiving.length === 0 ? (
                          <span className={styles.emptyText}>Nenhum par nomeado ainda</span>
                        ) : (
                          <div className={styles.nominationList}>
                            {receiving.map((nom) => {
                              const peerPerson = peopleLoadView.find((p) => p.id === nom.nominatedPeerId);
                              const peerLoad = peerPerson?.evaluationsToWrite ?? 0;
                              const isPeerOverloaded = peerLoad > maxLoad;

                              return (
                                <div key={nom.id} className={`${styles.nominationRow} ${nom.status === "pending" ? styles.nominationPending : ""}`}>
                                  <AvatarLabelGroup
                                    name={nom.nominatedPeerName}
                                    initials={nom.nominatedPeerInitials}
                                    supportingText={`${nom.nominatedPeerDepartment} · ${peerLoad} avaliação${peerLoad !== 1 ? "ões" : ""} a fazer`}
                                    size="sm"
                                  />
                                  <div className={styles.nominationMeta}>
                                    {isPeerOverloaded && (
                                      <Tooltip content={`Sobrecarregado: ${peerLoad} avaliações (limite: ${maxLoad})`}>
                                        <Badge color="warning" size="sm">Sobrecarga</Badge>
                                      </Tooltip>
                                    )}
                                    {nom.aiSuggested && (
                                      <Tooltip content={`Confiança IA: ${nom.aiConfidence ? Math.round(nom.aiConfidence * 100) : "—"}%`}>
                                        <Badge color="orange" size="sm" leftIcon={Sparkle}>IA</Badge>
                                      </Tooltip>
                                    )}
                                    <Badge color={STATUS_CONFIG[nom.status].color} size="sm">
                                      {STATUS_CONFIG[nom.status].label}
                                    </Badge>
                                  </div>
                                  <div className={styles.nominationActions}>
                                    {nom.status === "pending" && (
                                      <>
                                        <Button variant="primary" size="sm" leftIcon={Check} onClick={() => handleApprove(nom.id)}>Aprovar</Button>
                                        <Button variant="secondary" size="sm" leftIcon={X} onClick={() => handleReject(nom.id)}>Rejeitar</Button>
                                      </>
                                    )}
                                    {nom.status === "approved" && (
                                      <Button variant="secondary" size="sm" leftIcon={X} onClick={() => handleReject(nom.id)}>Remover</Button>
                                    )}
                                    {nom.status === "rejected" && (
                                      <Button variant="secondary" size="sm" leftIcon={Check} onClick={() => handleApprove(nom.id)}>Reaprovar</Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Add evaluator */}
                        <div className={styles.addPeerRow}>
                          <Select
                            label=""
                            size="sm"
                            searchable
                            placeholder="Adicionar avaliador..."
                            options={peopleLoadView
                              .filter((p) => p.id !== person.id && !receiving.some((n) => n.nominatedPeerId === p.id))
                              .slice(0, 20)
                              .map((p) => ({
                                value: p.id,
                                label: `${p.name} (${p.evaluationsToWrite} avaliação${p.evaluationsToWrite !== 1 ? "ões" : ""})${p.isOverloaded ? " ⚠" : ""}`,
                              }))}
                            value=""
                            onChange={(v: string | undefined) => {
                              if (!v) return;
                              const peer = peopleLoadView.find((p) => p.id === v);
                              if (!peer) return;
                              setNominations((prev) => [...prev, {
                                id: `nom-manual-${Date.now()}`,
                                evaluateeId: person.id, evaluateeName: person.name, evaluateeInitials: person.initials, evaluateeDepartment: person.department,
                                nominatedPeerId: peer.id, nominatedPeerName: peer.name, nominatedPeerInitials: peer.initials, nominatedPeerDepartment: peer.department,
                                nominatedById: "admin", nominatedByName: "Admin (RH)",
                                status: "approved", submittedAt: new Date().toISOString().slice(0, 10), reviewedAt: new Date().toISOString().slice(0, 10), reviewedByName: "Admin (RH)",
                                aiSuggested: false,
                              }]);
                              toast.success(`${peer.name} adicionado como avaliador de ${person.name.split(" ")[0]}`);
                            }}
                          />
                        </div>
                      </div>

                      {/* Evaluations to WRITE */}
                      {writing.length > 0 && (
                        <div className={styles.panelSection}>
                          <span className={styles.panelSectionTitle}>{person.name.split(" ")[0]} avalia</span>
                          <div className={styles.nominationList}>
                            {writing.map((nom) => (
                              <div key={nom.id} className={styles.nominationRow}>
                                <AvatarLabelGroup name={nom.evaluateeName} initials={nom.evaluateeInitials} supportingText={nom.evaluateeDepartment} size="sm" />
                                <Badge color={STATUS_CONFIG[nom.status].color} size="sm">
                                  {STATUS_CONFIG[nom.status].label}
                                </Badge>
                                <div className={styles.nominationActions}>
                                  {(nom.status === "approved" || nom.status === "pending") && (
                                    <Button variant="secondary" size="sm" leftIcon={X} onClick={() => handleReject(nom.id)}>Remover</Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
