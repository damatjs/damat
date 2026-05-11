export function folderToUrlPath(folderPath: string): string {
  return (
    folderPath
      .replace(/\[\.\.\.([^\]]+)\]/g, "*")
      .replace(/\[([^\]]+)\]/g, ":$1")
  );
}
