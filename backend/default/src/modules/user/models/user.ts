import { model, columns } from "@damatjs/orm-model";

export const UserModel = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),
  image: columns.text().nullable(),
  accounts: columns.hasMany("accounts"),
  sessions: columns.hasMany("sessions"),
}).indexes([columns.indexes().columns(["email"]).unique()]);

export default UserModel;
