# ── Next.js app (FitMirror) ─────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
RUN npm install -g bun
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

FROM node:20-slim AS builder
WORKDIR /app
RUN npm install -g bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the standalone Next.js output
RUN bun run db:generate && bun run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install sqlite for prisma + pocketbase download handled in compose
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget unzip && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Ensure the db + uploads dirs exist
RUN mkdir -p /app/db /app/public/uploads

EXPOSE 3000
CMD ["sh", "-c", "bun run db:push && node server.js"]
