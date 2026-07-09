import { type IconProps, iconBase } from "./base";

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
