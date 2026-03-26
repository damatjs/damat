import { RelationViolation } from "./types";

// ─── Indent helper ────────────────────────────────────────────────────────────

const I = "  "; // base indent (2 spaces)

// ─── Per-violation message builders ──────────────────────────────────────────

function formatMissingInverse(v: RelationViolation): string {
  return [
    `${I}${v.sourceTable}.${v.sourceProp} is a belongsTo pointing at "${v.targetTable}",`,
    `${I}but "${v.targetTable}" has no "${v.targetProp}" property pointing back.`,
    ``,
    `${I}Fix: add one of the following to ${v.targetTable}:`,
    `${I}  ${v.targetProp}: hasMany(${v.sourceTable}Schema).mappedBy("${v.sourceProp}")`,
    `${I}  ${v.targetProp}: hasOne(${v.sourceTable}Schema).mappedBy("${v.sourceProp}")`,
  ].join("\n");
}

function formatMissingBelongsTo(v: RelationViolation): string {
  return [
    `${I}${v.sourceTable}.${v.sourceProp} is a ${v.sourceType} pointing at "${v.targetTable}"`,
    `${I}with mappedBy: "${v.targetProp}", but "${v.targetTable}" has no "${v.targetProp}" property pointing back.`,
    ``,
    `${I}Fix: add the following to ${v.targetTable}:`,
    `${I}  ${v.targetProp}: belongsTo(${v.sourceTable}Schema)`,
  ].join("\n");
}

function formatWrongType(v: RelationViolation): string {
  const expected =
    v.sourceType === "belongsTo"
      ? "hasMany(...) or hasOne(...)"
      : "belongsTo(...)";
  return [
    `${I}${v.sourceTable}.${v.sourceProp} is a ${v.sourceType} pointing at "${v.targetTable}"`,
    `${I}and expects "${v.targetTable}.${v.targetProp}" to be ${expected},`,
    `${I}but found: ${v.foundType ?? "unknown"}.`,
    ``,
    `${I}Fix: change ${v.targetTable}.${v.targetProp} to ${expected}`,
  ].join("\n");
}

function formatMappedByMismatch(v: RelationViolation): string {
  return [
    `${I}Both sides of the relation exist:`,
    `${I}  ${v.sourceTable}.${v.sourceProp} (${v.sourceType}) and ${v.targetTable}.${v.targetProp}`,
    `${I}but their mappedBy values do not agree with each other.`,
    ``,
    `${I}Fix: make sure each side references the other's property name:`,
    `${I}  ${v.sourceTable}.${v.sourceProp}  →  mappedBy: "${v.targetProp}"`,
    `${I}  ${v.targetTable}.${v.targetProp}  →  mappedBy: "${v.sourceProp}"`,
  ].join("\n");
}

// ─── Public formatter ─────────────────────────────────────────────────────────

/**
 * Render all collected violations into a single human-readable string.
 *
 * Example output:
 * ```
 * Found 2 relation violation(s):
 *
 * 1. missing_inverse  (item → order)
 *    item.order is a belongsTo pointing at "order",
 *    but "order" has no "items" property pointing back.
 *    ...
 *
 * 2. missing_belongsTo  (author → book)
 *    ...
 * ```
 */
export function formatViolations(violations: RelationViolation[]): string {
  const count = violations.length;
  const header = `Found ${count} relation violation${count === 1 ? "" : "s"}:`;

  const body = violations
    .map((v, i) => {
      let detail: string;
      switch (v.kind) {
        case "missing_inverse":
          detail = formatMissingInverse(v);
          break;
        case "missing_belongsTo":
          detail = formatMissingBelongsTo(v);
          break;
        case "wrong_type":
          detail = formatWrongType(v);
          break;
        case "mappedBy_mismatch":
          detail = formatMappedByMismatch(v);
          break;
      }
      const label = `${i + 1}. ${v.kind}  (${v.sourceTable} → ${v.targetTable})`;
      return `${label}\n${detail}`;
    })
    .join("\n\n");

  return `${header}\n\n${body}`;
}
