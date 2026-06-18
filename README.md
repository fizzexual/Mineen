# 🧊 MineEN Panel

A self-hosted, web-based control panel for managing a **PaperMC** Minecraft server on your own machine — inspired by hosting panels like Minefort, but it runs locally and controls a real server process.

![status](https://img.shields.io/badge/status-ready-22c55e)
[![Docker image](https://img.shields.io/badge/ghcr.io-fizzexual%2Fmineen-2496ed?logo=docker&logoColor=white)](https://github.com/fizzexual/Mineen/pkgs/container/mineen)

## Features

- **Manage multiple servers** — a sidebar lists every server you've added, with live status dots (online / starting / offline). Click one to manage it; switch freely between them.
- **Add existing servers** — point the panel at a folder you already have using the built-in filesystem browser. It auto-detects the server jar and version. No need to move your files.
- **One-click server install** — or pick a Minecraft version and the panel downloads the matching PaperMC build into a fresh folder for you.
- **Live console** — real-time, color-coded log streaming over WebSocket, plus a command input to run console commands.
- **Power controls** — Start / Stop / Restart the server with graceful shutdown (and a force-kill fallback).
- **Real usage stats** — live CPU %, memory (used / allocated), and storage, sampled from the actual JVM process.
- **File manager** — browse, edit text files in-browser, upload, download, rename, create folders, and delete — all sandboxed to the server directory.
- **Properties editor** — friendly form for `server.properties` (gamemode, difficulty, MOTD, max-players, …).
- **Player tracking** — online player count and list parsed live from the server log.

## Requirements

- **Node.js 18+** (tested on Node 25)
- **Java 17+** on your `PATH` (Java 21 recommended; required for Minecraft 1.20.5+)

## Getting started

```bash
npm install
npm start
```

Then open **http://localhost:9999** in your browser.

1. Click **＋ Add Server** in the sidebar.
2. Either:
   - **Download new** — choose a Minecraft version; the panel downloads PaperMC into a new folder, or
   - **Use existing folder** — browse to a folder that already has a server (it auto-detects the jar).
3. Accept the **Minecraft EULA** when prompted (downloaded servers).
4. Pick the server in the sidebar and click **Start** — watch it boot in the console.
5. Connect from Minecraft to the address shown in the panel (e.g. `localhost:25565`, or your LAN IP).

Servers you add are remembered in `servers.json`. Auto-downloaded servers live under `servers/<id>/`; existing servers stay wherever they already are on disk.

## Run with Docker

The published image bundles Node.js **and** a Java 21 runtime, so you don't need either installed — just Docker.

**Quick start:**

```bash
docker run -d --name mineen \
  -p 9999:9999 -p 25565:25565 \
  -v mineen-data:/data \
  ghcr.io/fizzexual/mineen:latest
```

**Or with Docker Compose** (a [`docker-compose.yml`](docker-compose.yml) is included):

```bash
docker compose up -d
```

Then open **http://localhost:9999**.

- **Data persistence** — everything (server registry, config, downloaded worlds) is stored in `/data`. Mount a named volume or a host folder there so it survives restarts/updates.
- **Ports** — `9999` is the panel UI. Each Minecraft server runs inside the container, so publish a host port for each one (e.g. `-p 25565:25565`) and set that server's `server-port` to match in the **Properties** tab.
- **Updating** — `docker compose pull && docker compose up -d` (or `docker pull` + recreate).
- **Note** — inside a container the "Use existing folder → Browse…" native picker isn't available (there's no desktop). Either let the panel **download** servers, or **mount** an existing server into the container (e.g. `-v /path/to/myserver:/data/servers/myserver`) and add it by typing that in-container path.

## Configuration

Settings live in `panel-config.json` (created automatically). You can also change the
display name and memory limits from the **⋯ Settings** menu in the UI.

| Key            | Default     | Description                                  |
|----------------|-------------|----------------------------------------------|
| `panelPort`    | `9999`      | Port the panel UI listens on                 |
| `host`         | `0.0.0.0`   | Bind address for the panel                   |
| `memoryMB`     | `2048`      | Max JVM heap (`-Xmx`)                         |
| `minMemoryMB`  | `1024`      | Min JVM heap (`-Xms`)                         |

The Minecraft server itself lives in the `server/` folder.

## ⚠️ Security note

This panel has **no authentication** and can control a server process and edit files in
`server/`. By default it binds to `0.0.0.0`, so anything on your network can reach it.
Run it only on a trusted network, or set `"host": "127.0.0.1"` in `panel-config.json`
to restrict it to this machine. Do **not** expose it directly to the public internet.

## Tech

Node.js · Express · `ws` (WebSocket) · vanilla JS frontend (no build step) · PaperMC API.
