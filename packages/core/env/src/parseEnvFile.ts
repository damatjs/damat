/**
 * Parse a .env file content into key-value pairs
 */
export const parseEnvFile = (content: string): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Find the first = sign
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Handle quoted values
    if (value.startsWith('"')) {
      // Find the closing quote
      const closingQuote = value.indexOf('"', 1);
      if (closingQuote !== -1) {
        value = value.slice(1, closingQuote);
      }
    } else if (value.startsWith("'")) {
      // Find the closing quote
      const closingQuote = value.indexOf("'", 1);
      if (closingQuote !== -1) {
        value = value.slice(1, closingQuote);
      }
    } else {
      // Handle inline comments (only for unquoted values)
      const commentIndex = value.indexOf("#");
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex).trim();
      }
    }

    result[key] = value;
  }

  return result;
}