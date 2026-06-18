# MineEN Panel runs the web UI (Node.js) AND spawns Minecraft servers (Java),
# so the image needs both a JRE and Node.js. Start from a Java 21 runtime
# (covers modern Minecraft, e.g. 1.20.5+ / Purpur 1.21) and add Node.js.
FROM eclipse-temurin:21-jre-jammy

LABEL org.opencontainers.image.source="https://github.com/fizzexual/Mineen" \
      org.opencontainers.image.description="Self-hosted Minecraft server control panel (PaperMC)" \
      org.opencontainers.image.licenses="MIT"

# Node.js (runs the panel) + procps (the panel reads JVM CPU/memory via `ps`).
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates gnupg procps \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better build-cache reuse.
COPY package*.json ./
RUN npm ci --omit=dev

# Application source.
COPY . .

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
