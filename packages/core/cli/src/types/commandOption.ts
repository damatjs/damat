export interface CommandOption {
  name: string;
  alias?: string;
  description: string;
  type?: "string" | "boolean" | "number";
  default?: unknown;
  required?: boolean;
}
