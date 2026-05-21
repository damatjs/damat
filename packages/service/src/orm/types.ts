export interface BaseEntity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListOptions<T> {
  page?: number;
  pageSize?: number;
  orderBy?: Record<string, "asc" | "desc">;
  filters?: Record<string, unknown>;
}
