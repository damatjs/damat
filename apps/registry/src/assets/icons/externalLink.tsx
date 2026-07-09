import { type IconProps, iconBase } from "./base";

export const ExternalLinkIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="M15 3h6v6M21 3l-9 9" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);
