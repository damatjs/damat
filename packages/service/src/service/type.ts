import { ModelDefinition } from "@damatjs/orm-model";
import { z } from "@damatjs/deps/zod";

export type ModelsMap = Record<string, ModelDefinition>;

export interface FindOptions<Cols extends string = string> {
    select?: Cols[];
    where?: Record<string, unknown>;
    orderBy?: Array<{ column: Cols; direction?: "ASC" | "DESC" }>;
    skip?: number;
    take?: number;
}

export interface CreateOptions {
    data: Record<string, unknown>;
    returning?: string[];
}

export interface CreateManyOptions {
    data: Record<string, unknown>[];
    returning?: string[];
}

export interface UpdateOptions {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
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
> {
    models: TModels;
    credentialsSchema?: TCredentialsSchema;
}

export type ToCamelCase<S extends string> = S extends `${infer First}${infer Rest}`
    ? `${Lowercase<First>}${Rest}`
    : S;
