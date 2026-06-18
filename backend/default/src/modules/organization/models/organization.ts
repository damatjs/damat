import { model, columns } from "@damatjs/orm-model";

export const OrganizationModel = model("organizations", {
  id: columns.id({ prefix: "org" }).primaryKey(),
  name: columns.text(),
  slug: columns.text().unique(),
}).indexes([columns.indexes().columns(["slug"]).unique()]);

export default OrganizationModel;
