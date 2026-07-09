import Link from "next/link";

/** The "blade" mark — two forged blades meeting at a spark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Damat"
      width={26}
      height={26}
    >
      <defs>
        <linearGradient id="damat-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f9ab3b" />
          <stop offset="0.55" stopColor="#e5760a" />
          <stop offset="1" stopColor="#d9640a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#damat-mark)" />
      <path
        d="M9 22.5 16 7l7 15.5-3.4-1.6-3.6 4.1-3.6-4.1L9 22.5Z"
        fill="#fff"
        fillOpacity="0.95"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <LogoMark className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
      <span className="text-base font-semibold tracking-tight text-ink">
        Damat <span className="font-normal text-muted">registry</span>
      </span>
    </Link>
  );
}
