import { type IconProps, iconBase } from "./base";

export const TagIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="M12.6 2.9a2 2 0 0 0-1.4-.6H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.3 8.3a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8L12.6 2.9Z" />
    <circle cx="7.5" cy="7.5" r="1" />
  </svg>
);
