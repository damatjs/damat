import { FilterQuery, FindOptions } from "@damatjs/deps/mikro-orm/core";

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
  orderBy?: FindOptions<T>["orderBy"];
  filters?: FilterQuery<T>;
}
