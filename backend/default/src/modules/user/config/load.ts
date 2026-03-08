export const load = (env: NodeJS.ProcessEnv) => ({
  betterAuth: {
    betterAuthSecret: env.BETTER_AUTH_SECRET || env.AUTH_SECRET,
    betterAuthUrl: env.BETTER_AUTH_URL || env.API_BASE_URL,
    sessionMaxAge: env.SESSION_MAX_AGE,
    sessionUpdateAge: env.SESSION_UPDATE_AGE,
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    githubClientId: env.GITHUB_CLIENT_ID,
    githubClientSecret: env.GITHUB_CLIENT_SECRET,
    adminSecret: env.ADMIN_SECRET,
    superAdminEmail: env.SUPER_ADMIN_EMAIL,
  }
});

