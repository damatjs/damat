/**
 * Session Model
 *
 * User sessions for authentication (Better Auth compatible)
 */

import { Entity, PrimaryKey, Property, ManyToOne, Index } from "@damatjs/deps/mikro-orm/core";
import { User } from "./user";

@Entity({ tableName: "sessions" })
@Index({ properties: ["user"] })
@Index({ properties: ["token"] })
export class Session {
  @PrimaryKey()
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @Property()
  token!: string;

  @Property()
  expiresAt!: Date;

  @Property({ nullable: true, length: 45 })
  ipAddress?: string;

  @Property({ nullable: true, type: "text" })
  userAgent?: string;

  @Property({ defaultRaw: "now()" })
  createdAt: Date = new Date();

  @Property({ defaultRaw: "now()", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
