/**
 * Session Entity
 * 
 * User sessions for authentication (Better Auth compatible)
 */

import { Entity, Property, PrimaryKey, ManyToOne, Index, Opt } from '@damatjs/deps/mikro-orm/core'
import { v4 as uuid } from '@damatjs/deps/uuid';
import { User } from './user';

@Entity({ tableName: 'sessions' })
export class Session {
    @PrimaryKey()
    id: string = uuid();

    @ManyToOne(() => User, { deleteRule: 'cascade' })
    @Index()
    user!: User;

    @Property()
    @Index()
    token!: string;

    @Property()
    expiresAt!: Date;

    @Property({ nullable: true, length: 45 })
    ipAddress?: string;

    @Property({ nullable: true, type: 'text' })
    userAgent?: string;

    @Property()
    createdAt: Date & Opt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date & Opt = new Date();
}
