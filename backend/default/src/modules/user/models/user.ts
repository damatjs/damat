/**
 * User Model
 *
 * Core user identity for authentication (Better Auth compatible)
 * Uses MikroORM decorators for entity definition.
 */

import { Entity, PrimaryKey, Property, OneToMany, Collection } from "@damatjs/deps/mikro-orm/core";
import { Account } from "./account";
import { Session } from "./session";

@Entity({ tableName: "users" })
export class User {
  @PrimaryKey()
  id!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ default: false })
  emailVerified: boolean = false;

  @Property({ nullable: true })
  name?: string;

  @Property({ nullable: true })
  image?: string;

  @OneToMany(() => Account, (account) => account.user)
  accounts = new Collection<Account>(this);

  @OneToMany(() => Session, (session) => session.user)
  sessions = new Collection<Session>(this);

  @Property({ defaultRaw: "now()" })
  createdAt: Date = new Date();

  @Property({ defaultRaw: "now()", onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt?: Date;
}
