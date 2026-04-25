const STATUS_MESSAGES: Record<number, string> = {
  401: "Sessão expirada. Faça login novamente.",
  403: "Sem permissão para esta operação.",
  409: "Conflito: registro duplicado.",
};

export function apiErrorToMessage(
  err: unknown,
  overrides?: Record<number, string>,
): string {
  if (err == null || typeof err !== "object") return "Erro inesperado. Tente novamente.";

  const status = "status" in err ? (err as { status: number }).status : undefined;
  const detail = "detail" in err ? (err as { detail: string }).detail : undefined;

  if (status == null) return "Erro inesperado. Tente novamente.";

  const custom = overrides?.[status];
  if (custom) return custom;

  if (status === 422 && detail) return `Dados inválidos: ${detail}`;

  return STATUS_MESSAGES[status] ?? "Erro inesperado. Tente novamente.";
}
