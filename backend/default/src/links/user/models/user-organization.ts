import { defineLink } from "@damatjs/framework";

/**
 * A many-to-many link between the `user` module's user and the `organization`
 * module's organization. Generates the `user_organization` junction table.
 *
 * Neither module imports the other — the relationship lives here under
 * links/user (the owning module).
 */
export default defineLink(
  { module: "user", model: "user", field: "users" },
  { module: "organization", model: "organization", field: "organizations" },
);
