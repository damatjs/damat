import { ModelDefinition } from "@damatjs/orm-model";
import { z } from "@damatjs/deps/zod";
import { QueryResultRow } from "@damatjs/orm-type";

export type ModelsMap = Record<string, ModelDefinition>;
export type TypesMap = Record<string, QueryResultRow>;

export interface FindOptions<Cols extends string = string> {
    select?: Cols[];
    where?: Record<string, unknown>;
    orderBy?: Array<{ column: Cols; direction?: "ASC" | "DESC" }>;
    skip?: number;
    take?: number;
}

export interface CreateOptions<TData = Record<string, unknown>> {
    data: TData;
    returning?: string[];
}

export interface CreateManyOptions<TData = Record<string, unknown>> {
    data: TData[];
    returning?: string[];
}

export interface UpdateOptions<TData = Record<string, unknown>> {
    where: Record<string, unknown>;
    data: TData;
    returning?: string[];
}

export interface DeleteOptions {
    where: Record<string, unknown>;
    returning?: string[];
}

export interface SoftDeleteOptions {
    where: Record<string, unknown>;
    returning?: string[];
}

export interface CountOptions {
    where?: Record<string, unknown>;
}

export interface ExistsOptions {
    where: Record<string, unknown>;
}


export interface ModuleServiceConfig<
    TModels extends ModelsMap = ModelsMap,
    TCredentialsSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
    TTypes extends TypesMap | undefined = undefined,
> {
    models: TModels;
    credentialsSchema?: TCredentialsSchema;
    types?: TTypes;
}

export type ToCamelCase<S extends string> = S extends `${infer First}${infer Rest}`
    ? `${Lowercase<First>}${Rest}`
    : S;
