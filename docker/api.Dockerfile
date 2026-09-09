FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# API stage
FROM base AS api-builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @ones-panel/shared build
RUN pnpm --filter @ones-panel/database build
RUN pnpm --filter @ones-panel/api build

FROM base AS api
WORKDIR /app
COPY --from=api-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=api-builder /app/packages/shared/package.json ./packages/shared/
COPY --from=api-builder /app/packages/database/dist ./packages/database/dist
COPY --from=api-builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=api-builder /app/packages/database/package.json ./packages/database/
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist
COPY --from=api-builder /app/apps/api/package.json ./apps/api/
COPY --from=api-builder /app/node_modules ./node_modules
COPY --from=api-builder /app/pnpm-lock.yaml ./
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
