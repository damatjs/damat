/**
 * Session Model
 *
 * User sessions for authentication (Better Auth compatible)
 */

import { model, columns } from "@damatjs/orm-model";
import { User } from "./user";

export const Session = model("sessions", {
  id: columns.id({ prefix: "ses" }).primaryKey(),

  user: columns
    .belongsTo(() => User)
    .link({ foreignKey: "user_id" })
    .onDelete("CASCADE"),

  token: columns.text(),
  expiresAt: columns.timestamp({ withTimezone: true }),

  ipAddress: columns.varchar(45).nullable(),
  userAgent: columns.text().nullable(),

  createdAt: columns.timestamp({ withTimezone: true }).defaultRaw("now()"),
  updatedAt: columns.timestamp({ withTimezone: true }).defaultRaw("now()"),
}).indexes([
  columns.indexes("idx_sessions_user_id").columns(["user_id"]),
  columns.indexes("uniq_sessions_token").columns(["token"]).unique(),
]);
