import type { SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement>

/** Shared stroke-icon defaults; individual icons spread these first. */
export function iconBase(props: IconProps) {
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
}
