/**
 * User Model
 *
 * Core user identity for authentication (Better Auth compatible)
 */

import { model, columns } from "@damatjs/orm-model";
import { Account } from "./account";
import { Session } from "./session";

export const User = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),

  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),
  image: columns.text().nullable(),

  accounts: columns.hasMany(() => Account).mappedBy("user"),
  sessions: columns.hasMany(() => Session).mappedBy("user"),

  createdAt: columns.timestamp({ withTimezone: true }).defaultRaw("now()"),
  updatedAt: columns.timestamp({ withTimezone: true }).defaultRaw("now()"),
  deletedAt: columns.timestamp({ withTimezone: true }).nullable(),
});
// .constrain([columns.constrains().columns(["email"]).unique()]);
