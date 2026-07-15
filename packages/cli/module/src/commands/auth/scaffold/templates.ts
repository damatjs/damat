/**
 * Templates for the Better Auth **storage module** `damat auth init better-auth`
 * scaffolds into an app. These are Damat-native models + service + entry that
 * the person OWNS and applies through the normal migration flow — the auth
 * adapter never creates or migrates schema, it only reads/writes the tables
 * these files define. The column set matches Better Auth's default core schema
 * (user / session / account / verification); adjust if your Better Auth version
 * or plugins add fields.
 */

export * from "./models";
export * from "./service";
export * from "./indexLayer";
export * from "./manifest";
export * from "./readme";
