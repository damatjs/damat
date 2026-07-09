export const AGENTS_HERO = {
  eyebrow: "Built for AI agents",
  title: "Your agent asks before it installs.",
  lead: "AI agents install dependencies at machine speed — and typosquats, hijacked maintainers, and poisoned versions are exactly the attacks they cannot eyeball. The registry gives agents a question to ask first: is this package legit?",
};

export const VERDICT_API = {
  eyebrow: "One endpoint",
  title: "GET /packages/:name/:version/verdict",
  lead: "A structured answer written for machine consumption — status, score, reasons, and a plain-language summary an LLM can reason over.",
  response: `{
  "status": "pass",
  "score": 96,
  "reasons": [
    "owner verified (org: lodash)",
    "provenance attestation valid",
    "no static findings",
    "AI scan: no suspicious behavior"
  ],
  "summary": "lodash@4.17.21 is published by its verified
   owner, carries valid provenance, and no scan raised
   findings. Safe to install.",
  "checkedAt": "2026-07-09T18:12:04Z",
  "scans": { "static": "done", "ai": "done" }
}`,
} as const;

export const AGENT_FLOW = [
  {
    step: "Agent resolves a dependency",
    detail:
      "A coding agent decides it needs a package — from a prompt, a lockfile, or its own plan.",
  },
  {
    step: "It queries the verdict API",
    detail:
      "One HTTP call — or the MCP module_info tool, which now carries verification and verdict fields.",
  },
  {
    step: "It reads the answer",
    detail:
      "pass → install. warn → tell the human. flagged or malicious → stop and say why.",
  },
  {
    step: "The gate backs it up",
    detail:
      "Even if an agent skips the question, the install itself passes through the same policy gate.",
  },
] as const;

export const MCP = {
  eyebrow: "MCP-native",
  title: "The registry is already in your agent's toolbox.",
  lead: "The Damat MCP server exposes search_modules, module_info, and add_module against the hosted registry — with verification status and trust verdicts in the responses, so the safety check happens inside the tool call.",
} as const;
