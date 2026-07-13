export class RelationGuardError extends Error {
  readonly modelName: string;
  readonly unknownRelation: string;
  readonly availableRelations: string[];

  constructor(
    modelName: string,
    unknownRelation: string,
    availableRelations: string[],
  ) {
    const list =
      availableRelations.length > 0
        ? availableRelations.join(", ")
        : "(none defined)";
    super(
      `[query:with] Unknown relation "${unknownRelation}" on model "${modelName}".\n` +
        `  Available relations: ${list}`,
    );
    this.name = "RelationGuardError";
    this.modelName = modelName;
    this.unknownRelation = unknownRelation;
    this.availableRelations = availableRelations;
  }
}
