import { TableSchema } from "./table";
import { EnumSchema } from "./enum";

/**
 * Schema for an entire module (collection of tables)
 */
export interface ModuleSchema {
    /** Module name */
    moduleName: string;
    /** Tables in the module */
    tables: TableSchema[];
    /** Enum types defined in the module */
    enums: EnumSchema[];
}
