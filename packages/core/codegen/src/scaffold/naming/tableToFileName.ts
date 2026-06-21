
/** table name → file/folder base (mirrors orm-codegen's `tableToFileName`). */
export function tableToFileNameCodeGen(tableName: string): string {
  return tableName.replace(/_/g, "-");
}
