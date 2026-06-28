// Fixture: a module's entry that exports `models` keyed by model key, each
// carrying its `_tableName`. Dynamically imported by augmentWithLinks.
export const models = {
  User: { _tableName: "users" },
};
