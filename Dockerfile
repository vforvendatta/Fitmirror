# ── Next.js app (FitMirror) ─────────────────────────────────────
# Uses npm (not bun) inside Docker for reliable tarball downloads.
# Runtime is plain `node server.js` (Next.js standalone output).
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
# Resilient npm install: more retries + longer timeouts + a retry loop,
# so a transient network drop (common on Windows + Docker Desktop) doesn't
# kill the whole build.
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000 \
    && (npm ci --legacy-peer-deps || npm install --legacy-peer-deps)

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client + build the standalone Next.js output
RUN npx prisma generate && npm run build

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
# Also copy the prisma client + sharp (needed at runtime for image processing)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/@img ./node_modules/@img

# Ensure the db + uploads dirs exist
RUN mkdir -p /app/db /app/public/uploads

EXPOSE 3000
# Push the schema then start the standalone server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
