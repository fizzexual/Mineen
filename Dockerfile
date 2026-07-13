# MineEN Panel serves a compiled Svelte UI (Node.js) AND spawns Minecraft
# servers (Java), so the runtime image needs both a JRE and Node.js. The web UI
# is built with Vite (a dev dependency) into web/dist, which is gitignored — so
# we compile it in a separate build stage and copy the result into the runtime.

# ---- Build stage: compile the Svelte + Vite frontend (needs dev deps) ----
FROM node:22-bookworm-slim AS webbuild
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime: Java 21 JRE (runs Minecraft) + Node.js (runs the panel) ----
FROM eclipse-temurin:21-jre-jammy

LABEL org.opencontainers.image.source="https://github.com/fizzexual/Mineen" \
      org.opencontainers.image.description="Self-hosted Minecraft server control panel" \
      org.opencontainers.image.licenses="MIT"

# Node.js (runs the panel) + procps (the panel reads JVM CPU/memory via `ps`).
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates gnupg procps \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install runtime dependencies first for better build-cache reuse.
COPY package*.json ./
RUN npm ci --omit=dev

# Application source (web/dist is gitignored, so it isn't copied here)...
COPY . .
# ...bring the compiled frontend in from the build stage.
COPY --from=webbuild /app/web/dist ./web/dist

# Persist the registry, panel config, and downloaded servers on a volume.
ENV DATA_DIR=/data \
    PORT=9999 \
    HOST=0.0.0.0 \
    NODE_ENV=production
RUN mkdir -p /data
VOLUME ["/data"]

# 9999 = panel UI. 25565 = default Minecraft port (publish one per server you run).
EXPOSE 9999 25565

CMD ["node", "server.js"]
