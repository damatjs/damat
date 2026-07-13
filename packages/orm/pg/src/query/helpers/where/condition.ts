import type { WhereConditionValue, WhereOperators } from "../../types";

export function isOperatorObject(v: WhereConditionValue): v is WhereOperators {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const validOps = new Set([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "in",
    "notIn",
    "isNull",
    "isNotNull",
    "between",
  ]);
  const keys = Object.keys(v as object);
  return keys.length > 0 && keys.every((k) => validOps.has(k));
}

export function compileCondition(
  col: string,
  val: WhereConditionValue,
  params: unknown[],
): string {
  if (!isOperatorObject(val)) {
    if (val === null) return `${col} IS NULL`;
    params.push(val);
    return `${col} = $${params.length}`;
  }

  const op = val as Record<string, unknown>;
  const parts: string[] = [];

  if ("eq" in op) {
    if (op.eq === null) parts.push(`${col} IS NULL`);
    else {
      params.push(op.eq);
      parts.push(`${col} = $${params.length}`);
    }
  }
  if ("neq" in op) {
    if (op.neq === null) parts.push(`${col} IS NOT NULL`);
    else {
      params.push(op.neq);
      parts.push(`${col} <> $${params.length}`);
    }
  }
  if ("gt" in op) {
    params.push(op.gt);
    parts.push(`${col} > $${params.length}`);
  }
  if ("gte" in op) {
    params.push(op.gte);
    parts.push(`${col} >= $${params.length}`);
  }
  if ("lt" in op) {
    params.push(op.lt);
    parts.push(`${col} < $${params.length}`);
  }
  if ("lte" in op) {
    params.push(op.lte);
    parts.push(`${col} <= $${params.length}`);
  }
  if ("like" in op) {
    params.push(op.like);
    parts.push(`${col} LIKE $${params.length}`);
  }
  if ("ilike" in op) {
    params.push(op.ilike);
    parts.push(`${col} ILIKE $${params.length}`);
  }

  if ("in" in op) {
    const arr = op.in as unknown[];
    if (arr.length === 0) parts.push("FALSE");
    else {
      const ph = arr.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      parts.push(`${col} IN (${ph.join(", ")})`);
    }
  }
  if ("notIn" in op) {
    const arr = op.notIn as unknown[];
    if (arr.length === 0) parts.push("TRUE");
    else {
      const ph = arr.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      parts.push(`${col} NOT IN (${ph.join(", ")})`);
    }
  }
  if ("isNull" in op) parts.push(`${col} IS NULL`);
  if ("isNotNull" in op) parts.push(`${col} IS NOT NULL`);

  if ("between" in op) {
    const [lo, hi] = op.between as [unknown, unknown];
    params.push(lo);
    const loIdx = params.length;
    params.push(hi);
    const hiIdx = params.length;
    parts.push(`${col} BETWEEN $${loIdx} AND $${hiIdx}`);
  }

  return parts.join(" AND ");
}
