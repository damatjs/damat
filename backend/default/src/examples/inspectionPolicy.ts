export const referenceInspectionPolicy = {
  inspectionVisibility: "metadata" as const,
  redaction: { keys: ["password", "token", "secret"] },
};
