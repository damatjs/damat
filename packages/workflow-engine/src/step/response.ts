/**
 * The value a step's `invoke` function returns: its downstream `output` plus an
 * optional `compensateInput` — the payload handed to the step's compensation
 * function on rollback.
 *
 * The two are independent. `output` flows to the workflow and the next steps;
 * `compensateInput` is delivered ONLY to `compensate(compensateInput, ctx)`.
 * There is **no fallback** — a step that provides no `compensateInput` gives its
 * compensation `undefined`, never the output.
 *
 * The compensation payload type `C` controls whether the second constructor
 * argument is required:
 * - `C` excludes `undefined` → the payload is REQUIRED; omitting it is a compile
 *   error, so a step that needs rollback data can't forget to capture it.
 * - `C` includes `undefined` (or the default `undefined`) → the payload is
 *   optional; omit it for read-only steps or when rollback needs nothing.
 *
 * @example
 * // update: output is the updated row, compensation restores the prior row
 * return new StepResponse(updatedRow, priorRow);
 * @example
 * // read-only: output only, no compensation payload
 * return new StepResponse(rows);
 */

// Realm-global brand. `Symbol.for` keys into the global registry, so the brand
// is identical across duplicate copies of this package — see `isStepResponse`.
const STEP_RESPONSE_BRAND: unique symbol = Symbol.for(
  "@damatjs/workflow-engine/StepResponse",
);

export class StepResponse<O, C = undefined> {
  /** Marks this object as a StepResponse, even across duplicate module copies. */
  readonly [STEP_RESPONSE_BRAND] = true as const;

  /** The step's output — what the workflow and downstream steps receive. */
  readonly output: O;

  /** The payload passed to the compensation function (or `undefined`). */
  readonly compensateInput: C;

  constructor(
    output: O,
    // The payload is required when `C` cannot be `undefined`, optional otherwise.
    ...rest: undefined extends C ? [compensateInput?: C] : [compensateInput: C]
  ) {
    this.output = output;
    this.compensateInput = rest[0] as C;
  }

  /**
   * Brand check the engine uses to unwrap a step's result. Prefer this over
   * `instanceof`: if two copies of this package are ever loaded, `instanceof`
   * would silently misclassify a StepResponse minted against the other copy —
   * forwarding the output as the compensation payload (data corruption, not a
   * crash). The `Symbol.for` brand lives in the realm-global registry, so it
   * survives duplicate module instances.
   */
  static isStepResponse(
    value: unknown,
  ): value is StepResponse<unknown, unknown> {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as Record<symbol, unknown>)[STEP_RESPONSE_BRAND] === true
    );
  }
}
