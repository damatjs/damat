import { model, columns } from "@damatjs/orm-model";

export const UserModel = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),
  image: columns.text().nullable(),
  deletedAt: columns.timestamp().nullable(),
}).indexes([
  columns.indexes().columns(["email"]).unique(),
]);