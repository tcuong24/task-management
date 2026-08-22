FROM node:22-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/permissions/package.json packages/permissions/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/database packages/database
COPY packages/permissions packages/permissions
COPY packages/typescript-config packages/typescript-config

RUN pnpm --filter api... build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable \
    && apk add --no-cache wget \
    && addgroup -S nodejs \
    && adduser -S taskflow -G nodejs

WORKDIR /app

COPY --from=builder --chown=taskflow:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=taskflow:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=taskflow:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=taskflow:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=taskflow:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=taskflow:nodejs /app/packages/database ./packages/database
COPY --from=builder --chown=taskflow:nodejs /app/packages/permissions/package.json ./packages/permissions/package.json
COPY --from=builder --chown=taskflow:nodejs /app/packages/permissions/dist ./packages/permissions/dist
COPY --from=builder --chown=taskflow:nodejs /app/packages/permissions/node_modules ./packages/permissions/node_modules

USER taskflow

EXPOSE 3001

CMD ["sh", "-c", "pnpm --filter @repo/database migrate:deploy && node apps/api/dist/index.js"]

