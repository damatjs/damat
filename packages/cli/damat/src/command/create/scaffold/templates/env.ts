/** Placeholder-only template, safe to commit. */
export function envExampleTemplate(name: string): string {
  return `# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL="postgres://postgres:postgres@localhost:5432/${dbName(name)}"

# =============================================================================
# REDIS (optional — caching, rate limiting, sessions, workflow locks)
# =============================================================================
REDIS_URL="redis://localhost:6379"

# =============================================================================
# SERVER
# =============================================================================
PORT=6543
HOST=0.0.0.0
NODE_ENV=development

# Comma-separated origins allowed by CORS
FRONTEND_CORS="http://localhost:3000,http://localhost:5173"

# =============================================================================
# SECRETS (generate with: openssl rand -hex 32)
# =============================================================================
JWT_SECRET=""
COOKIE_SECRET=""

# =============================================================================
# LOGGING
# =============================================================================
LOG_FILE="false"
LOG_DIR="logs"
`;
}

/**
 * The real .env written once at scaffold time — same keys as the example but
 * with generated secrets filled in. Never committed (.gitignore covers it).
 */
export function envTemplate(
  name: string,
  secrets: { jwtSecret: string; cookieSecret: string },
): string {
  return envExampleTemplate(name)
    .replace('JWT_SECRET=""', `JWT_SECRET="${secrets.jwtSecret}"`)
    .replace('COOKIE_SECRET=""', `COOKIE_SECRET="${secrets.cookieSecret}"`)
    // Redis is optional and a wrong localhost instance (e.g. one requiring
    // auth) would fail the very first boot — ship it commented out.
    .replace('REDIS_URL="redis://localhost:6379"', '# REDIS_URL="redis://localhost:6379"');
}

/** App name → a safe postgres database name (kebab → snake). */
export function dbName(name: string): string {
  return name.replace(/-/g, "_");
}
