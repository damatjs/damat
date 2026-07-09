import { type IconProps, iconBase } from "./base";

export const CloseIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
