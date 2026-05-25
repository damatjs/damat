import { z } from "@damatjs/deps/zod";

export interface ModuleCredentials<
    TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
> {
    schema: TSchema;
    load: (env: NodeJS.ProcessEnv) => z.infer<TSchema>;
}

export interface ModuleDefinition<
    TService,
    TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
> {
    service: new (credentials: z.infer<TSchema>) => TService;
    credentials: ModuleCredentials<TSchema>;
}

export interface ModuleInstance<
    TService,
    TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
> {
    readonly name: string;
    readonly service: TService;
    readonly credentials: z.infer<TSchema>;
    init(): void;
}
