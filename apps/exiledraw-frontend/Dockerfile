FROM node:20-alpine

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps

RUN pnpm install --frozen-lockfile
RUN pnpm -F @repo/db prisma generate
RUN pnpm -F exiledraw-frontend build

EXPOSE 3000
CMD ["pnpm", "-F", "exiledraw-frontend", "start"]

