/**
 * Account Entity
 * 
 * OAuth/Auth provider accounts linked to users (Better Auth compatible)
 */

import { Entity, Property, PrimaryKey, ManyToOne, Index, Unique, Opt } from '@damatjs/deps/mikro-orm/core'
import { v4 as uuid } from '@damatjs/deps/uuid';
import { User } from './user';

@Entity({ tableName: 'accounts' })
@Unique({ properties: ['providerId', 'accountId'] })
export class Account {
    @PrimaryKey()
    id: string = uuid();

    @ManyToOne(() => User, { deleteRule: 'cascade' })
    user!: User;

    @Property()
    @Index()
    accountId!: string;

    @Property()
    @Index()
    providerId!: string;

    // OAuth tokens
    @Property({ nullable: true, type: 'text' })
    accessToken?: string;

    @Property({ nullable: true, type: 'text' })
    refreshToken?: string;

    @Property({ nullable: true })
    accessTokenExpiresAt?: Date;

    @Property({ nullable: true })
    refreshTokenExpiresAt?: Date;

    @Property({ nullable: true, type: 'text' })
    scope?: string;

    @Property({ nullable: true, type: 'text' })
    idToken?: string;

    // Password for credential auth
    @Property({ nullable: true, type: 'text' })
    password?: string;

    @Property()
    createdAt: Date & Opt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date & Opt = new Date();
}
