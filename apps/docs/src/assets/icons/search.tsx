import { type IconProps, iconBase } from "./base";

export const SearchIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);
