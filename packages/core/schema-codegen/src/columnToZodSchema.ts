import type { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { getZodBaseType } from "./type-mapping/zod";

export const columnToZodSchema = (column: ColumnSchema): string => {
  const baseType = getZodBaseType(column.type as ColumnType, column);
  return column.array ? `z.array(${baseType})` : baseType;
};
