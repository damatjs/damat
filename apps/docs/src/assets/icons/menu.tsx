import { type IconProps, iconBase } from "./base";

export const MenuIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
