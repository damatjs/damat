import { model, columns } from "@damatjs/orm-model";
import { UserModel } from "./user";

export const AccountModel = model("accounts", {
  id: columns.id({ prefix: "acc" }).primaryKey(),
  userId: columns.belongsTo(() => UserModel,)
    .link({ foreignKey: "user_id" })
    .indexed(),
  accountId: columns.text(),
  providerId: columns.text(),
  accessToken: columns.text().nullable(),
  refreshToken: columns.text().nullable(),
  accessTokenExpiresAt: columns.timestamp().nullable(),
  refreshTokenExpiresAt: columns.timestamp().nullable(),
  scope: columns.text().nullable(),
  idToken: columns.text().nullable(),
  password: columns.text().nullable(),
}).indexes([
  columns.indexes().columns(["accountId"]),
  columns.indexes().columns(["providerId"]),
  columns.indexes().columns(["providerId", "accountId"]),
]);