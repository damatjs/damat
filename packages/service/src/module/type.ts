import { z } from "@damatjs/deps/zod";

export interface ModuleCredentials<
    TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
> {
    schema: TSchema;
    load: (env: NodeJS.ProcessEnv) => z.infer<TSchema>;
}

export interface ModuleDefinition<TService> {
    service: new (credentials: any) => TService;
    credentials: (env: NodeJS.ProcessEnv) => any
}

export interface ModuleInstance<TService> {
    readonly name: string;
    readonly service: TService;
    readonly credentials: unknown;
    init(): void;
}

export interface ModuleRegistry {
    // Projects extend this interface via declaration merging
}
