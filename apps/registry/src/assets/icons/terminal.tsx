import { type IconProps, iconBase } from "./base";

export const TerminalIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="m7 9 3 3-3 3M13 15h4" />
  </svg>
);
