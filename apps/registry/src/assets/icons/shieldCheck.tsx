import { type IconProps, iconBase } from "./base";

export const ShieldCheckIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="M12 2 4 5.5V11c0 5 3.4 8.8 8 11 4.6-2.2 8-6 8-11V5.5L12 2Z" />
    <path d="m8.8 11.8 2.2 2.2 4.2-4.5" />
  </svg>
);
