/**
 * Account Model
 *
 * OAuth/Auth provider accounts linked to users (Better Auth compatible)
 */

import { Entity, PrimaryKey, Property, ManyToOne, Index } from "@damatjs/deps/mikro-orm/core";
import { User } from "./user";

@Entity({ tableName: "accounts" })
@Index({ properties: ["accountId"] })
@Index({ properties: ["providerId"] })
@Index({ properties: ["providerId", "accountId"] })
export class Account {
  @PrimaryKey()
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @Property()
  accountId!: string;

  @Property()
  providerId!: string;

  @Property({ nullable: true })
  accessToken?: string;

  @Property({ nullable: true })
  refreshToken?: string;

  @Property({ nullable: true })
  accessTokenExpiresAt?: Date;

  @Property({ nullable: true })
  refreshTokenExpiresAt?: Date;

  @Property({ nullable: true })
  scope?: string;

  @Property({ nullable: true })
  idToken?: string;

  @Property({ nullable: true })
  password?: string;

  @Property({ defaultRaw: "now()" })
  createdAt: Date = new Date();

  @Property({ defaultRaw: "now()", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
