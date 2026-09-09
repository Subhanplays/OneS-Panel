FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS worker-builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @ones-panel/shared build
RUN pnpm --filter @ones-panel/database generate
RUN pnpm --filter @ones-panel/worker build

FROM base AS worker
WORKDIR /app
COPY --from=worker-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=worker-builder /app/packages/shared/package.json ./packages/shared/
COPY --from=worker-builder /app/packages/database/src ./packages/database/src
COPY --from=worker-builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=worker-builder /app/packages/database/package.json ./packages/database/
COPY --from=worker-builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=worker-builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=worker-builder /app/apps/worker/package.json ./apps/worker/
COPY --from=worker-builder /app/node_modules ./node_modules
COPY --from=worker-builder /app/pnpm-lock.yaml ./
CMD ["node", "apps/worker/dist/index.js"]
