# ------ Build Stage ------
FROM oven/bun:1 AS builder
WORKDIR /app

COPY bun.lock* package.json ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# ------ Runtime ------
FROM oven/bun:1-slim
WORKDIR /app

# Copy only built dist/ and server.ts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock* ./

# Install runtime dependencies
RUN bun install --production

EXPOSE 3000
CMD ["bun", "run", "server.ts"]