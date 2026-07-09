import { iconBase, type IconProps } from './base'

export const CopyIcon = (p: IconProps) => (
  <svg {...iconBase(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
)
