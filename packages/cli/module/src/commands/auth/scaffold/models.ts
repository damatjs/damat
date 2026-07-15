export function modelsTemplate(): string {
  return `import { model, columns } from "@damatjs/orm-model";

// Better Auth's default core schema, as Damat models. Timestamps are declared
// explicitly (camelCase, to match Better Auth) rather than via .timestamps().

export const AuthUserModel = model("user", {
  id: columns.text().primaryKey(),
  name: columns.text().nullable(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  image: columns.text().nullable(),
  createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: columns.timestamp({ withTimezone: true }).nullable(),
}).timestamps(false).softDelete(false);

export const AuthSessionModel = model("session", {
  id: columns.text().primaryKey(),
  userId: columns.belongsTo("user").onDelete("CASCADE").indexed(),
  token: columns.text().unique(),
  expiresAt: columns.timestamp({ withTimezone: true }),
  ipAddress: columns.text().nullable(),
  userAgent: columns.text().nullable(),
  createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: columns.timestamp({ withTimezone: true }).nullable(),
}).timestamps(false).softDelete(false);

export const AuthAccountModel = model("account", {
  id: columns.text().primaryKey(),
  userId: columns.belongsTo("user").onDelete("CASCADE").indexed(),
  accountId: columns.text(),
  providerId: columns.text(),
  accessToken: columns.text().nullable(),
  refreshToken: columns.text().nullable(),
  idToken: columns.text().nullable(),
  accessTokenExpiresAt: columns.timestamp({ withTimezone: true }).nullable(),
  refreshTokenExpiresAt: columns.timestamp({ withTimezone: true }).nullable(),
  scope: columns.text().nullable(),
  password: columns.text().nullable(),
  createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: columns.timestamp({ withTimezone: true }).nullable(),
}).timestamps(false).softDelete(false);

export const AuthVerificationModel = model("verification", {
  id: columns.text().primaryKey(),
  identifier: columns.text(),
  value: columns.text(),
  expiresAt: columns.timestamp({ withTimezone: true }),
  createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: columns.timestamp({ withTimezone: true }).nullable(),
}).timestamps(false).softDelete(false);
`;
}
