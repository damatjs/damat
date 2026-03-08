/**
 * User Entity
 * 
 * Core user identity for authentication (Better Auth compatible)
 */

import { Entity, Property, PrimaryKey, Index, Opt } from '@damatjs/deps/mikro-orm/core'
import { v4 as uuid } from '@damatjs/deps/uuid';

@Entity({ tableName: 'users' })
export class User {
    @PrimaryKey()
    id: string = uuid();

    @Property()
    @Index()
    email!: string;

    @Property({ default: false })
    emailVerified: boolean & Opt = false;

    @Property({ nullable: true })
    name?: string;

    @Property({ nullable: true, type: 'text' })
    image?: string;

    @Property()
    createdAt: Date & Opt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date & Opt = new Date();

    @Property({ nullable: true })
    deletedAt?: Date;

    // Relations will be added via links
}
