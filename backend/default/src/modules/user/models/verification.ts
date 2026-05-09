/**
 * Verification Model
 *
 * Email verification tokens (Better Auth compatible)
 */

import { Entity, PrimaryKey, Property, Index } from "@damatjs/deps/mikro-orm/core";

@Entity({ tableName: "verifications" })
@Index({ properties: ["identifier"] })
export class Verification {
  @PrimaryKey()
  id!: string;

  @Property()
  identifier!: string;

  @Property()
  value!: string;

  @Property()
  expiresAt!: Date;

  @Property({ defaultRaw: "now()" })
  createdAt: Date = new Date();

  @Property({ defaultRaw: "now()", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
