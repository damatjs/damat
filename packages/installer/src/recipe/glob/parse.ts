const SPECIAL = new Set([
  ".",
  "+",
  "^",
  "$",
  "{",
  "}",
  "(",
  ")",
  "|",
  "[",
  "]",
  "\\",
]);

export function globSource(pattern: string): string {
  let output = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]!;
    if (char === "*" && pattern[index + 1] === "*") {
      if (pattern[index + 2] === "/") {
        output += "(?:.*/)?";
        index += 2;
      } else {
        output += ".*";
        index += 1;
      }
    } else if (char === "*") output += "[^/]*";
    else if (char === "?") output += "[^/]";
    else output += SPECIAL.has(char) ? `\\${char}` : char;
  }
  return output;
}
