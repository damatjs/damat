// Fixture: a link module that exports a `links` array. Each link names the two
// sides by module + model key (matching the model keys in the *Models fixtures).
export const links = [
  {
    left: { module: "user", model: "User" },
    right: { module: "organization", model: "Organization", isList: true },
  },
];
