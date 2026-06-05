import { model, columns } from "@damatjs/orm-model";
// import AccountModel from './account';

export const UserModel = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),
  image: columns.text().nullable(),
  // account: columns.hasMany(AccountModel)
}).indexes([
  columns.indexes().columns(["email"]).unique(),
]);

export default UserModel;