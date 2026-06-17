import { model, columns } from "@damatjs/orm-model";

export const SessionModel = model("sessions", {
  id: columns.id({ prefix: "ses" }).primaryKey(),
  user: columns
    .belongsTo("users")
    .link({ foreignKey: "user_id" })
    .indexed(),
  token: columns.text().unique(),
  expiresAt: columns.timestamp(),
  ipAddress: columns.varchar(45).nullable(),
  userAgent: columns.text().nullable(),
}).indexes([columns.indexes().columns(["token"])]);

export default SessionModel;
