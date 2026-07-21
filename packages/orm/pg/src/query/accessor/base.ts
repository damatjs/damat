import { ModelDefinition } from "@damatjs/orm-model";
import { SelectBuilder } from "../select";
import { InsertBuilder } from "../insert";
import { UpdateBuilder } from "../update";
import { DeleteBuilder } from "../delete";
import { UpsertBuilder } from "../upsert";
import { executeFindMany, executeFindOne } from "./find";
import {
  executeCreate,
  executeCreateMany,
  executeUpdate,
  executeDelete,
  executeUpsert,
  executeUpsertMany,
} from "./mutate";
import type {
  FindOptions,
  QueryResult,
  CreateOptions,
  CreateManyOptions,
  UpdateOptions,
  DeleteOptions,
  UpsertOptions,
  UpsertManyOptions,
} from "./type";
import type {
  SelectDescriptor,
  InsertDescriptor,
  UpdateDescriptor,
  DeleteDescriptor,
  UpsertDescriptor,
} from "../types";

export class ModelAccessor<Cols extends string = string> {
  readonly _model: ModelDefinition;
  readonly builders: {
    readonly select: SelectBuilder<Cols>;
    readonly insert: InsertBuilder<Cols>;
    readonly update: UpdateBuilder<Cols>;
    readonly delete: DeleteBuilder<Cols>;
    readonly upsert: UpsertBuilder<Cols>;
  };

  constructor(model: ModelDefinition) {
    this._model = model;
    this.builders = {
      get select() {
        return new SelectBuilder<Cols>(model);
      },
      get insert() {
        return new InsertBuilder<Cols>(model);
      },
      get update() {
        return new UpdateBuilder<Cols>(model);
      },
      get delete() {
        return new DeleteBuilder<Cols>(model);
      },
      get upsert() {
        return new UpsertBuilder<Cols>(model);
      },
    };
  }

  findMany(options: FindOptions<Cols> = {}): QueryResult<SelectDescriptor> {
    return executeFindMany(this as any, options);
  }

  findOne(
    options: Omit<FindOptions<Cols>, "limit" | "offset"> = {},
  ): QueryResult<SelectDescriptor> {
    return executeFindOne(this as any, options);
  }

  create(options: CreateOptions<Cols>): QueryResult<InsertDescriptor> {
    return executeCreate(this as any, options);
  }

  createMany(options: CreateManyOptions<Cols>): QueryResult<InsertDescriptor> {
    return executeCreateMany(this as any, options);
  }

  update(options: UpdateOptions<Cols>): QueryResult<UpdateDescriptor> {
    return executeUpdate(this as any, options);
  }

  delete(options: DeleteOptions<Cols>): QueryResult<DeleteDescriptor> {
    return executeDelete(this as any, options);
  }

  upsert(options: UpsertOptions<Cols>): QueryResult<UpsertDescriptor> {
    return executeUpsert(this as any, options);
  }

  upsertMany(options: UpsertManyOptions<Cols>): QueryResult<UpsertDescriptor> {
    return executeUpsertMany(this as any, options);
  }
}
