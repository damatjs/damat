import { model, columns } from "@damatjs/orm-model";
import { UserModel } from "./user";

export const SessionModel = model("sessions", {
  id: columns.id({ prefix: "ses" }).primaryKey(),
  userId: columns.belongsTo(() => UserModel)
    .link({ foreignKey: "user_id" })
    .indexed(),
  token: columns.text().unique(),
  expiresAt: columns.timestamp(),
  ipAddress: columns.varchar(45).nullable(),
  userAgent: columns.text().nullable(),
}).indexes([
  columns.indexes().columns(["token"]),
]);
