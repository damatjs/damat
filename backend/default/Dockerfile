# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile



# Copy source
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build TypeScript
RUN bun run build

# Production stage
FROM oven/bun:1 AS runner

WORKDIR /app

# Create non-root user (Bun image typically has 'bun' user)
# We can use the default bun user which is 1000:1000 usually
# But let's be explicit if needed, or stick to root for simplicity in bun containers unless strict security required.
# Official docs suggest running as 'bun' user.
USER bun

# Copy built application and prisma client
# Note: Bun bundles dependencies in the build step? 
# No, tsup (which we set up) outputted a single file that REQUIRES node_modules for dependencies.
# So we must copy node_modules.

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Environment
ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

# Health check
# bun image might not have wget/curl by default depending on version. 
# We can use a simple bun script or assume it's there. 
# oven/bun:1 is based on debian slim usually, which has curl/wget.

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun --eval "fetch('http://localhost:9000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start application
CMD ["bun", "dist/index.js"]
