// ─── TeamHealthTable ──────────────────────────────────────────────────────────
// Tabela de saúde do time: lista todos os colaboradores com seus indicadores de
// Performance, Engajamento, Score Geral e Status de Saúde.
//
// Colunas: Colaborador | Performance | Engajamento | Geral | Status
// Ordenação padrão: Crítico → Atenção → Bem, depois por nome.

import { type ChangeEvent, useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  Table,
  TableContent,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableCardHeader,
  Badge,
  AvatarLabelGroup,
  GoalProgressBar,
  Input,
} from "@getbud-co/buds";
import type { UserEngagementSummary, HealthStatus } from "@/types/engagement";
import styles from "./TeamHealthTable.module.css";

// ── Badge configs ──────────────────────────────────────────────────────────────

const HEALTH_BADGE: Record<HealthStatus, { color: "success" | "warning" | "error"; label: string }> = {
  healthy:   { color: "success", label: "Bem"     },
  attention: { color: "warning", label: "Atenção" },
  critical:  { color: "error",   label: "Crítico" },
};

const SORT_HEALTH: Record<HealthStatus, number> = {
  critical: 0,
  attention: 1,
  healthy: 2,
};

// ── Score cell ─────────────────────────────────────────────────────────────────

function ScoreCell({ value }: { value: number }) {
  const status =
    value >= 70 ? "on-track" : value >= 40 ? "attention" : "off-track";
  return (
    <div className={styles.progressCell}>
      <GoalProgressBar label={`${value}%`} value={value} status={status} />
    </div>
  );
}

// ── Overall score cell ─────────────────────────────────────────────────────────

function OverallCell({ value }: { value: number }) {
  const cls =
    value >= 70 ? styles.overallGood
    : value >= 40 ? styles.overallWarn
    : styles.overallBad;
  return (
    <span className={`${styles.overallValue} ${cls}`}>{value}%</span>
  );
}

// ── Tipo de ordenação ──────────────────────────────────────────────────────────

type SortKey = "healthStatus" | "performanceScore" | "engagementScore" | "overallScore";

// ── TeamHealthTable ────────────────────────────────────────────────────────────

interface TeamHealthTableProps {
  members: UserEngagementSummary[];
  onMemberClick?: (member: UserEngagementSummary) => void;
}

export function TeamHealthTable({ members, onMemberClick }: TeamHealthTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("healthStatus");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function getSortDirection(key: SortKey): "asc" | "desc" | undefined {
    return sortKey === key ? sortDir : undefined;
  }

  // Filtra por busca de texto
  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.jobTitle ?? "").toLowerCase().includes(q),
    );
  }, [members, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "healthStatus":
          diff = SORT_HEALTH[a.healthStatus] - SORT_HEALTH[b.healthStatus];
          if (diff === 0) diff = a.name.localeCompare(b.name, "pt-BR");
          break;
        case "performanceScore":
          diff = b.performanceScore - a.performanceScore;
          break;
        case "engagementScore":
          diff = b.engagementScore - a.engagementScore;
          break;
        case "overallScore":
          diff = b.overallScore - a.overallScore;
          break;
      }
      return sortDir === "asc" ? diff : -diff;
    });
  }, [filtered, sortKey, sortDir]);

  // Contagens baseadas nos membros pré-busca (refletem saúde do time)
  const criticalCount  = members.filter((m) => m.healthStatus === "critical").length;
  const attentionCount = members.filter((m) => m.healthStatus === "attention").length;
  const healthyCount   = members.filter((m) => m.healthStatus === "healthy").length;

  const tableBadge =
    criticalCount > 0
      ? <Badge color="error" size="sm">{criticalCount} crítico{criticalCount > 1 ? "s" : ""}</Badge>
      : attentionCount > 0
        ? <Badge color="warning" size="sm">{attentionCount} em atenção</Badge>
        : <Badge color="success" size="sm">{healthyCount} bem</Badge>;

  return (
    <div className={styles.tableWrapper}>
      <Table variant="divider" elevated={false}>
        <TableCardHeader
          title="Saúde do Time"
          badge={members.length > 0 ? tableBadge : undefined}
          actions={
            <div className={styles.searchWrapper}>
              <Input
                placeholder="Buscar colaborador..."
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                leftIcon={MagnifyingGlass}
              />
            </div>
          }
        />
        <TableContent>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Colaborador</TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirection("performanceScore")}
                onSort={() => handleSort("performanceScore")}
              >
                Performance
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirection("engagementScore")}
                onSort={() => handleSort("engagementScore")}
              >
                Engajamento
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirection("overallScore")}
                onSort={() => handleSort("overallScore")}
              >
                Geral
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortDirection={getSortDirection("healthStatus")}
                onSort={() => handleSort("healthStatus")}
              >
                Status
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell>
                  <p className={styles.empty}>
                    {members.length === 0
                      ? "Nenhum membro encontrado neste time."
                      : `Nenhum colaborador encontrado para "${search}".`}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((member) => {
                const badge = HEALTH_BADGE[member.healthStatus];
                return (
                  <TableRow
                    key={member.userId}
                    onClick={onMemberClick ? () => onMemberClick(member) : undefined}
                    style={onMemberClick ? { cursor: "pointer" } : undefined}
                  >
                    <TableCell>
                      <AvatarLabelGroup
                        name={member.name}
                        supportingText={member.jobTitle ?? undefined}
                        initials={member.initials}
                        src={member.avatarUrl ?? undefined}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <ScoreCell value={member.performanceScore} />
                    </TableCell>
                    <TableCell>
                      <ScoreCell value={member.engagementScore} />
                    </TableCell>
                    <TableCell>
                      <OverallCell value={member.overallScore} />
                    </TableCell>
                    <TableCell>
                      <Badge color={badge.color} size="sm">{badge.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </TableContent>
      </Table>
    </div>
  );
}
