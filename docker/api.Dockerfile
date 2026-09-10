FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS api-builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @ones-panel/shared build
RUN pnpm --filter @ones-panel/database generate
RUN pnpm --filter @ones-panel/api build

FROM base AS api
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod
COPY --from=api-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=api-builder /app/packages/database/src ./packages/database/src
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
