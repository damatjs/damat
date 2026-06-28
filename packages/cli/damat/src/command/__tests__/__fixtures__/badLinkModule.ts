// Fixture: a link module whose import throws (covers the per-link-module load
// catch in augmentWithLinks). Kept separate from other throwing fixtures so
// module-cache state from sibling tests can't mask the failure.
export const links: unknown[] = [];
throw new Error("boom: cannot load this link module");
