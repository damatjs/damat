FROM oven/bun:1.3.14-alpine AS build

WORKDIR /workspace

COPY . .

RUN --mount=type=cache,id=damat-bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
RUN ln -s /workspace/packages/cli/damat/dist/cli.js /usr/local/bin/damat
RUN ln -s /workspace/packages/orm/cli/dist/bin.js /usr/local/bin/damat-orm
RUN --mount=type=cache,id=damat-turbo,target=/workspace/.turbo \
    bunx turbo run build --filter=@damatjs/default...
RUN rm -rf node_modules
RUN --mount=type=cache,id=damat-bun,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile
RUN rm -rf .turbo

FROM oven/bun:1.3.14-alpine AS runtime

WORKDIR /workspace

ENV NODE_ENV=production
ENV PORT=9000

COPY --chown=bun:bun --from=build /workspace /workspace
RUN ln -s /workspace/packages/cli/damat/dist/cli.js /usr/local/bin/damat
RUN ln -s /workspace/packages/orm/cli/dist/bin.js /usr/local/bin/damat-orm

USER bun
WORKDIR /workspace/backend/default

EXPOSE 9000

CMD ["bun", "run", "start"]
