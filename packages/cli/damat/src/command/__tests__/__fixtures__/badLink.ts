// Fixture: a link module that throws on import (exercises the per-link-module
// load catch in augmentWithLinks).
throw new Error("cannot load this link module");
export {};
