/**
 * Verification Entity
 * 
 * Email verification tokens (Better Auth compatible)
 */

import { Entity, Property, PrimaryKey, Index, Opt } from '@damatjs/deps/mikro-orm/core'
import { v4 as uuid } from '@damatjs/deps/uuid';

@Entity({ tableName: 'verifications' })
export class Verification {
    @PrimaryKey()
    id: string = uuid();

    @Property()
    @Index()
    identifier!: string; // email or phone

    @Property()
    value!: string; // token or code

    @Property()
    expiresAt!: Date;

    @Property()
    createdAt: Date & Opt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date & Opt = new Date();
}
