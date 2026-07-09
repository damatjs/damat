import { type IconProps, iconBase } from "./base";

export const LayersIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5M3 17l9 5 9-5" opacity="0.55" />
  </svg>
);
