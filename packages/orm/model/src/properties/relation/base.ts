import { ForeignKeyAction, RelationDefinition, RelationType } from "@/types";

/**
 * Base relation builder
 */
export abstract class RelationBuilder {
  protected _type: RelationType;
  protected _target: () => string;
  protected _foreignKey?: string;
  protected _mappedBy?: string;
  protected _nullable: boolean = false;
  protected _onDelete?: ForeignKeyAction;
  protected _onUpdate?: ForeignKeyAction;

  constructor(type: RelationType, target: () => string) {
    this._type = type;
    this._target = target;
  }

  /** Mark relation as nullable */
  nullable(): this {
    this._nullable = true;
    return this;
  }

  /** Set on delete action */
  onDelete(action: ForeignKeyAction): this {
    this._onDelete = action;
    return this;
  }

  /** Set on update action */
  onUpdate(action: ForeignKeyAction): this {
    this._onUpdate = action;
    return this;
  }

  /** Get the target table name */
  getTargetTableName(): string {
    return this._target();
  }

  /** Get the mappedBy property name */
  getMappedBy(): string | undefined {
    return this._mappedBy;
  }

  /** Get relation definition */
  toDefinition(): RelationDefinition {
    const def: RelationDefinition = {
      type: this._type,
      target: this._target,
      nullable: this._nullable,
    };

    if (this._foreignKey !== undefined) {
      def.foreignKey = this._foreignKey;
    }
    if (this._mappedBy !== undefined) {
      def.mappedBy = this._mappedBy;
    }
    if (this._onDelete !== undefined) {
      def.onDelete = this._onDelete;
    }
    if (this._onUpdate !== undefined) {
      def.onUpdate = this._onUpdate;
    }

    return def;
  }

  /** Check if this relation creates a foreign key column */
  abstract createsForeignKey(): boolean;

  /** Get the foreign key column name if this relation creates one */
  abstract getForeignKeyColumn(): string | undefined;
}
