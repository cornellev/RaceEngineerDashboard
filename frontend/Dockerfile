FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src

# Expose port (adjust if your app uses a different port)
EXPOSE 3000

# Start the application
CMD ["bun", "run", "start"]
