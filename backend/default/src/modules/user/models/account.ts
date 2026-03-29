/**
 * Account Model
 *
 * OAuth/Auth provider accounts linked to users (Better Auth compatible)
 */

import { model, columns } from "@damatjs/orm-model";
import { User } from "./user";

export const Account = model("accounts", {
  id: columns.id({ prefix: "acc" }).primaryKey(),

  user: columns
    .belongsTo(() => User)
    .link({ foreignKey: "user_id" })
    .onDelete("CASCADE"),

  accountId: columns.text(),
  providerId: columns.text(),

  // OAuth tokens
  accessToken: columns.text().nullable(),
  refreshToken: columns.text().nullable(),
  accessTokenExpiresAt: columns.timestamp({ withTimezone: true }).nullable(),
  refreshTokenExpiresAt: columns.timestamp({ withTimezone: true }).nullable(),
  scope: columns.text().nullable(),
  idToken: columns.text().nullable(),

  // Password for credential auth
  password: columns.text().nullable(),

  createdAt: columns.timestamp({ withTimezone: true }).defaultRaw("now()"),
  updatedAt: columns.timestamp({ withTimezone: true }).defaultRaw("now()"),
}).indexes([
  columns.indexes().columns(["accountId"]),
  columns.indexes().columns(["providerId"]),
  columns
    .indexes()
    .columns(["providerId", "accountId"])
    .unique(),
]);
