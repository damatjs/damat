import { type IconProps, iconBase } from "./base";

export const BoxIcon = (p: IconProps) => (
  <svg {...iconBase(p)} aria-hidden="true">
    <path d="m21 8-9-5-9 5v8l9 5 9-5V8Z" />
    <path d="m3.3 8.3 8.7 4.8 8.7-4.8M12 22V13" />
  </svg>
);
