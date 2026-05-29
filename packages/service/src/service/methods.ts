import { ModelDefinition } from "@damatjs/orm-model";
import { TransactionalEntityManager, PgRepository, PgEntityManager } from "@damatjs/orm-pg";
import { QueryResultRow } from "@damatjs/orm-type";
import { CountOptions, CreateManyOptions, CreateOptions, DeleteOptions, ExistsOptions, FindOptions, SoftDeleteOptions, UpdateOptions } from "./type";

export class ModelMethods<T extends QueryResultRow = QueryResultRow> {
    private model: ModelDefinition;
    private modelName: string;
    private transactionalEm: TransactionalEntityManager | null = null;
    private entityManager?: PgEntityManager<Record<string, ModelDefinition>>

    constructor(model: ModelDefinition, modelName: string, em: PgEntityManager<Record<string, ModelDefinition>>) {
        this.model = model;
        this.modelName = modelName;
        this.entityManager = em
    }

    private getRepository(): PgRepository<T> {
        if (!this.entityManager) throw new Error("")

        if (this.transactionalEm) {
            return this.transactionalEm.getRepository<T>(this.modelName);
        }

        return this.entityManager.getRepository<T>(this.modelName);
    }

    setTransactionalEm(txEm: TransactionalEntityManager | null): void {
        this.transactionalEm = txEm;
    }

    async create(options: CreateOptions): Promise<T> {
        this._validateData(options.data);
        const repo = this.getRepository();
        return repo.create(options as any);
    }

    async createMany(options: CreateManyOptions): Promise<T[]> {
        for (const item of options.data) {
            this._validateData(item);
        }
        const repo = this.getRepository();
        return repo.createMany(options as any);
    }

    async find(options: FindOptions = {}): Promise<T | null> {
        const repo = this.getRepository();
        const result = await repo.findOne(options as any);
        return result ?? null;
    }

    async findMany(options: FindOptions = {}): Promise<T[]> {
        const repo = this.getRepository();
        return repo.findMany(options as any);
    }

    async update(options: UpdateOptions): Promise<T[]> {
        this._validateData(options.data, true);
        const repo = this.getRepository();
        return repo.update(options as any);
    }

    async delete(options: DeleteOptions): Promise<number> {
        const repo = this.getRepository();
        return repo.delete(options as any);
    }

    async softDelete(options: SoftDeleteOptions): Promise<T[]> {
        const deletedAtField = this.model._deletedAtField ?? "deleted_at";
        const repo = this.getRepository();
        return repo.update({
            set: { [deletedAtField]: new Date() },
            where: options.where,
            returning: options.returning,
        } as any);
    }

    async restore(options: { where: Record<string, unknown>; returning?: string[] }): Promise<T[]> {
        const deletedAtField = this.model._deletedAtField ?? "deleted_at";
        const repo = this.getRepository();
        return repo.update({
            set: { [deletedAtField]: null },
            where: options.where,
            returning: options.returning,
        } as any);
    }

    async count(options: CountOptions = {}): Promise<number> {
        const repo = this.getRepository();
        return repo.count(options.where);
    }

    async exists(options: ExistsOptions): Promise<boolean> {
        const repo = this.getRepository();
        return repo.exists(options.where);
    }

    private _validateData(_data: Record<string, unknown>, _partial: boolean = false): void {
    }
}