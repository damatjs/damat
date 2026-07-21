import { model, columns } from "@damatjs/orm-model";

export const VerificationModel = model("verifications", {
  id: columns.id({ prefix: "vrf" }).primaryKey(),
  identifier: columns.text(),
  value: columns.text(),
  expiresAt: columns.timestamp(),
}).indexes([columns.indexes().columns(["identifier"])]);

export default VerificationModel;
