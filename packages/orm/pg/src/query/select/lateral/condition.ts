export function compileRelCondition(colExpr: string, val: unknown, params: unknown[]): string {
  if (val === null) return `${colExpr} IS NULL`;
  if (typeof val === "object" && !Array.isArray(val)) {
    const op = val as Record<string, unknown>;
    const parts: string[] = [];
    if ("eq" in op) {
      if (op.eq === null) parts.push(`${colExpr} IS NULL`);
      else { params.push(op.eq); parts.push(`${colExpr} = $${params.length}`); }
    }
    if ("neq" in op) {
      if (op.neq === null) parts.push(`${colExpr} IS NOT NULL`);
      else { params.push(op.neq); parts.push(`${colExpr} <> $${params.length}`); }
    }
    if ("gt" in op) { params.push(op.gt); parts.push(`${colExpr} > $${params.length}`); }
    if ("gte" in op) { params.push(op.gte); parts.push(`${colExpr} >= $${params.length}`); }
    if ("lt" in op) { params.push(op.lt); parts.push(`${colExpr} < $${params.length}`); }
    if ("lte" in op) { params.push(op.lte); parts.push(`${colExpr} <= $${params.length}`); }
    if ("like" in op) { params.push(op.like); parts.push(`${colExpr} LIKE $${params.length}`); }
    if ("ilike" in op) { params.push(op.ilike); parts.push(`${colExpr} ILIKE $${params.length}`); }
    if ("in" in op) {
      const arr = op.in as unknown[];
      if (arr.length === 0) parts.push("FALSE");
      else {
        const ph = arr.map((v) => { params.push(v); return `$${params.length}`; });
        parts.push(`${colExpr} IN (${ph.join(", ")})`);
      }
    }
    if ("notIn" in op) {
      const arr = op.notIn as unknown[];
      if (arr.length === 0) parts.push("TRUE");
      else {
        const ph = arr.map((v) => { params.push(v); return `$${params.length}`; });
        parts.push(`${colExpr} NOT IN (${ph.join(", ")})`);
      }
    }
    if ("isNull" in op) parts.push(`${colExpr} IS NULL`);
    if ("isNotNull" in op) parts.push(`${colExpr} IS NOT NULL`);
    if ("between" in op) {
      const [lo, hi] = op.between as [unknown, unknown];
      params.push(lo); const loIdx = params.length;
      params.push(hi); const hiIdx = params.length;
      parts.push(`${colExpr} BETWEEN $${loIdx} AND $${hiIdx}`);
    }
    return parts.length > 0 ? parts.join(" AND ") : "TRUE";
  }
  params.push(val);
  return `${colExpr} = $${params.length}`;
}
