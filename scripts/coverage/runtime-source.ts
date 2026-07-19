import ts from "typescript";

function isDeclared(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return Boolean(
    ts.getModifiers(node)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword,
    ),
  );
}

function statementRuns(statement: ts.Statement): boolean {
  if (
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement)
  ) {
    return false;
  }
  if (
    ts.isImportDeclaration(statement) ||
    ts.isExportDeclaration(statement) ||
    ts.isImportEqualsDeclaration(statement)
  ) {
    return false;
  }
  return !isDeclared(statement);
}

export function hasRuntimeSource(source: string, fileName: string): boolean {
  const scriptKind = fileName.endsWith("x")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    false,
    scriptKind,
  );
  return file.statements.some(statementRuns);
}
