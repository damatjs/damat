import { type IconProps, iconBase } from "./base";

export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);
