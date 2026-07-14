# ── Next.js app (FitMirror) — bun-based build ──────────────────
# Uses the official oven/bun:1-debian image (bun pre-installed, debian base
# so prisma/sharp native deps work). A bash retry loop handles transient
# network drops (ConnectionRefused) common on Windows + Docker Desktop.
FROM oven/bun:1-debian AS deps
WORKDIR /app
COPY package.json bun.lock* ./
# Retry loop: bun install can hit ConnectionRefused on flaky networks.
RUN for i in 1 2 3 4 5; do \
      bun install --frozen-lockfile && break; \
      echo "bun install attempt $i failed, retrying in 15s…"; \
      sleep 15; \
    done

FROM oven/bun:1-debian AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client + build the standalone Next.js output
RUN bun run db:generate && bun run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install openssl (Prisma needs it) + ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# prisma client + sharp (needed at runtime)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/@img ./node_modules/@img

RUN mkdir -p /app/db /app/public/uploads

EXPOSE 3000
# Push the schema then start the standalone server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
