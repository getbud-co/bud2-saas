export interface Tag {
  id: string;
  orgId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Contagem de itens vinculados (calculado em queries) */
  linkedItems?: number;
}
