export interface SecretFinding {
  file: string;
  line: number;
  kind: string;
}

const patterns: Array<[string, RegExp]> = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{35}\b/],
  ["npm token", /\bnpm_[A-Za-z0-9]{36}\b/],
];

export function scanText(file: string, text: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const [index, line] of text.split("\n").entries()) {
    if (line.includes("secret-scan: allow")) continue;
    for (const [kind, pattern] of patterns) {
      if (pattern.test(line)) findings.push({ file, line: index + 1, kind });
    }
  }
  return findings;
}
