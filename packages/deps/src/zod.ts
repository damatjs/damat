// Re-export all from zod
export * from "zod";

// Also export default as z for backward compatibility with zod v3 patterns
import * as zod from "zod";
export { zod as z };
