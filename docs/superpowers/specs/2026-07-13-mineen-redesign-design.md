# MineEN Redesign — Design Spec

- **Date:** 2026-07-13
- **Status:** Approved (design) — pending spec review
- **Owner:** fizzexual
- **Supersedes:** the current "ZeroCloud.id" branded panel (`v1.0.0`)

---

## 1. Product thesis

**MineEN is the "it just works" Minecraft server, running on your own PC.**

The everyday tools people actually love — Aternos, exaroton — win purely on frictionless UX, but they are cloud-only: not your hardware, not your files. The self-hosted panels — Pterodactyl/Pelican, Crafty, AMP — are either built for hosting companies (Docker, split daemon, Linux-only, 1.5–2 GB idle), paid and complex, or leave the two hardest steps (sharing and mods) as manual chores.

MineEN owns the empty middle:

> **The Aternos-grade "it just works" experience — self-hosted on your own machine — that makes the two things beginners fear most, _port-forwarding_ and _crashes_, simply disappear.**

Runs with one command. Docker-free. Cross-platform (Windows-first, since that's where home hosts live). Light enough for a gaming PC.

### Target user (north star)
The **non-technical person hosting Minecraft for their friends.** Every trade-off bends toward them. Power features exist but stay tucked away ("sane defaults, power on tap").

### Success criteria
1. A first-time user goes from launch to a running server their friends can join in **under 5 minutes, with zero terminal use and zero router config.**
2. Installing a mod, plugin, or full modpack is a **search-and-click**, never a file upload.
3. When a server crashes, the user is **told what broke and how to fix it** — they never paste a log into a stranger's website.
4. The product visibly reads as a **polished, modern, original** app — not a Pterodactyl reskin.

---

## 2. Key decisions (with rationale)

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Positioning | **Beginner-first, "it just works" for friends** | Research shows this is the unclaimed whitespace; incumbents are strong on power-user/multi-node and weak here. |
| D2 | v1 scope | **Ambitious, phased** | User wants feature-rich; phasing keeps each stage shippable and great. |
| D3 | Share with Friends | **UPnP auto-forward first → playit.gg tunnel fallback** | UPnP uses the user's own IP with no third party; playit guarantees it works for *everyone*, including CGNAT. Robust and matches "it just works." |
| D4 | Server types | **Full Java multi-loader + Geyser cross-play** | Vanilla/Paper/Purpur (plugins) + Fabric/Forge/NeoForge (mods/modpacks) covers every modpack ecosystem; Geyser lets Bedrock (phone/console) friends join without a second server. |
| D5 | Backend | **Keep & refactor the existing Node engine** | The current process manager, WS console, telemetry, file manager, and backups are already the right shape for a lightweight Docker-free panel. Rewriting earns nothing. |
| D6 | Frontend | **Svelte + Vite, compiled to static assets served by Express** | The UI is large and real-time; a compile-away framework keeps it polished and maintainable with a tiny runtime. The build step is dev-only — end users still run one command. |

### Non-goals (v1)
- Multi-node / distributed daemons (MCSManager/AMP territory).
- Docker-per-server isolation (revisit later; keep the lightweight single-process model).
- Native Bedrock Dedicated Server instances (cross-play via Geyser instead).
- A hosted cloud service or billing. MineEN is self-hosted software.
- Reselling / multi-tenant customer accounts.

---

## 3. Architecture

### 3.1 Shape
One Node process — **MineEN Core** — serves a compiled Svelte single-page app plus a JSON/WebSocket API. It runs on the user's machine and spawns Java server processes directly (no Docker).

- **Live data** (console output, telemetry, player list, install/download progress, tunnel status, crash events) streams over **WebSocket**.
- **Actions & CRUD** (power controls, settings, file ops, content installs, backups) are **REST**.
- **Persistence** is on-disk JSON for the server registry + panel config (as today). A small embedded store (e.g. SQLite via `better-sqlite3`) is a *later* option if analytics/history grows; not required for v1.

### 3.2 Backend modules

**Kept & refactored (existing):**
- `manager` — server-instance lifecycle: spawn/stop/restart/kill, state machine, auto-restart-on-crash, descriptor persistence.
- `console`/`logs` — stdin/stdout bridge, ring buffer, WS streaming, internal (silent) command channel for polling.
- `telemetry` — CPU / memory / TPS / latency / storage sampling and history.
- `files` — sandboxed (path-jailed) file manager: list, read, write, mkdir, rename, delete, upload, download.
- `backups` — zip snapshots (to be upgraded — see `backups+`).
- `properties` — `server.properties` read/write (to be upgraded to schema-driven — see `settings+`).

**New modules:**
- `provisioner` — installs and version-lists **Vanilla** (Mojang manifest), **Paper**/**Purpur** (their build APIs), **Fabric** (Fabric meta + server launcher), **Forge** / **NeoForge** (installer jars, run headless). Normalizes "server type + MC version + loader version → runnable jar/launch command."
- `java` — detect installed JREs and their versions; map each MC version to its required Java (8 / 17 / 21); if missing, offer to download a bundled **Temurin** JRE and pin it per server. Eliminates the #1 silent-crash cause.
- `content` — **Modrinth**-first mod/plugin/modpack integration: search (faceted by loader + game version), version resolution, **automatic dependency resolution**, hash-verified download into `mods/` or `plugins/`, and `.mrpack` modpack install (parse `modrinth.index.json`, apply `overrides/` + `server-overrides/`, auto-select loader). **CurseForge** as a secondary source (gated API key, handles download-disabled mods gracefully by prompting manual placement).
- `network` — **UPnP** (IGD) port mapping; a **reachability probe** that verifies the port is actually reachable from outside before declaring success; and the **playit.gg** agent lifecycle (download the official signed binary, verify checksum, run, parse the assigned public address) used as automatic fallback. Produces the shareable join link + QR and drives the status page.
- `doctor` — crash/log analyzer. A rule set maps common failure signatures → plain-language diagnosis + a one-click fix: Java version mismatch, port already in use, missing/incompatible mod dependency, out-of-memory, corrupted world/region, EULA not accepted, wrong loader. Runs automatically on unexpected exit and is available on-demand over any log.
- `optimize` — apply **Aikar's flags** and right-size `-Xmx`/`-Xms` from detected system memory (leaving OS + JVM headroom), with a plain-language "here's what changed and why."

**Phase modules (later phases):**
- `settings+` — schema-driven, plain-English `server.properties` editor with validation and inline help.
- `backups+` — rotation, per-server storage caps, `save-off` before snapshot, one-click restore, optional off-site (S3/B2) target, world versioning.
- `world` — world manager: swap / upload / download / reset / seed preview.
- `identity` — visual MOTD editor (live preview, hex gradients), drag-drop server-icon upload with auto-resize to 64×64, live player-head avatars (Crafatar/Minotar/mc-heads).
- `map` — BlueMap (3D) / Dynmap integration surfaced/embedded in-panel and shareable.
- `discord` — zero-config bridge: chat sync + join/leave + start/stop/crash notifications via webhook/bot.
- `status` — tokenized, read-only public status page (online/offline, players, MOTD, uptime).
- `profiler` — bundle **spark**, trigger a profile, surface the shareable flame-graph report.

### 3.3 Frontend (Svelte + Vite)
Compiled to static files served by Express. App shell features:
- **Command palette (⌘K)** — jump to any server/view/setting, run console commands.
- **Real-time stores** fed by the WS connection (console, stats, players, progress).
- **Premium dark design system** — original MineEN identity (near-black surfaces, one "healthy" accent, terminal-flavored type), theme tokens, light mode secondary.
- **Mobile-responsive / PWA-ready** so a host can start/stop and check status from a phone.
- **Instructional empty states** and a **setup checklist with progress** (Create server ▸ Optimize ▸ Invite a friend ▸ First backup).

**Views:** Dashboard · Console · Content (mods/plugins/modpacks) · Players · World · Files · Backups · Share · Automation · Settings — plus the onboarding **wizard** and the **crash-doctor** surface.

---

## 4. Feature set (v1, full)

Onboarding wizard · multi-loader provisioning · Java auto-management · Aikar/RAM optimize · **Share-with-Friends** (UPnP + playit + QR + status page) · **Modrinth mods/plugins browser** · **one-click modpacks** · **Geyser cross-play** · **crash-doctor** · backups with rotation + one-click restore · world manager (swap/upload/reset) · visual **MOTD + icon editor** · live **player-head avatars** · plain-English settings editor · automation/scheduler · **Discord bridge** · **BlueMap** world map · **spark** profiling · command-palette premium real-time shell.

---

## 5. Build phases

Each phase is independently shippable and leaves the product visibly better.

- **P0 — Foundation & identity.** Refactor the engine into the clean module boundaries above. Stand up the Svelte + Vite shell served by Express, with the MineEN design system, command palette, and real-time plumbing. Port every existing feature (console, files, properties, backups, players, schedules, telemetry) into the new shell. **Remove all ZeroCloud branding and placeholder copy.** → Already a better product than today.
- **P1 — The magic front door.** Onboarding wizard + `provisioner` (multi-loader) + `java` manager + `optimize`. Time-to-first-server < 2 minutes, no terminal.
- **P2 — Share with Friends.** `network`: UPnP → reachability probe → playit fallback → join link/QR + `status` page.
- **P3 — Content.** `content`: Modrinth browser, one-click install with dependency resolution, one-click `.mrpack` modpacks, Geyser cross-play toggle.
- **P4 — Reliability.** `doctor` (crash diagnosis) + `backups+` (rotation/restore/off-site) + `world` manager.
- **P5 — Delight & social.** `identity` (MOTD/icon/heads) + `map` (BlueMap) + `discord` bridge + `profiler` (spark) + PWA polish.

---

## 6. Data flow, errors, testing

### Data flow
Svelte stores subscribe to the WS connection for all live state; REST endpoints handle CRUD and actions. Long-running operations (jar download, loader install, modpack resolve, backup, tunnel bring-up) **stream progress events** and **roll back cleanly on failure** — extending the existing download-rollback pattern (half-made servers are removed on error).

### Error handling philosophy
- Failures become **guidance**, not stack traces — the `doctor` turns a crash into a named cause + fix.
- **Prevent, don't just report:** Java/loader/version mismatches are caught *before* launch; sharing is confirmed by the reachability probe before the UI says "you're live."
- Every destructive action (restore, world reset, delete) confirms and, where possible, snapshots first.

### Testing strategy
- **Unit:** the pure logic — version/loader resolution, `doctor` rule matching, `settings+` schema + validation, Aikar/RAM math, `.mrpack` parsing, path-jail safety in `files`.
- **Integration:** the `manager` lifecycle against a fake/echo "server" process (start → log → stop → crash → auto-restart); backup create/restore round-trip.
- **API smoke tests** across the REST surface.
- **End-to-end:** the `verify` skill drives the real app for previewable changes. Note: the host already runs a real Minecraft server on port 25565, so MineEN test servers must use a different port (e.g. 25566).

---

## 7. Risks & open questions

- **playit.gg dependency.** Fallback path relies on a third party's relay + binary. Mitigation: it's opt-in (only when UPnP fails), we verify the official signed binary, and UPnP/manual remains available. Their free tier gives a random `*.joinmc.link` subdomain — acceptable for v1.
- **Reachability probe.** A true "reachable from the internet" check requires something outside the LAN. Options to resolve in planning: a tiny hosted check endpoint, a public port-check service, or inferring success from the tunnel. Lowest-dependency option wins.
- **CurseForge API key.** Gated, non-distributable, and some mods are download-disabled. Lead with Modrinth; treat CurseForge as best-effort with graceful manual-placement prompts.
- **Bundled JRE size.** Shipping/downloading a Temurin JRE adds weight. Mitigation: download on demand, per required major version, cached and shared across servers.
- **Forge/NeoForge headless install** can be finicky across versions. Budget integration testing per loader.
- **Single-process model** means one misbehaving server shares the host with others. Acceptable for the target user in v1; Docker isolation is a documented future option.

---

## 8. Research appendix (evidence behind the decisions)

Three parallel research streams (~60 sources) converged on the same conclusions:

- **The gap:** incumbents serve hosts and power users; the solo-home-for-friends persona is punished by Docker, the Panel/Wings split, high idle RAM, port-forwarding/CGNAT, weak backups, paid-addon-gated mods/modpacks/worlds, and no built-in sharing. Even Pterodactyl advocates say to use something else for hosting with friends.
- **#1 unmet need:** sharing without port-forwarding. No self-hosted panel bundles a tunnel; the entire Aternos/Realms/playit ecosystem exists to paper over this. (playit.gg: outbound agent, global anycast relay, TCP+UDP, works behind CGNAT.)
- **#2:** one-click mods/plugins/modpacks. Modrinth's API is open, keyless, CORS-enabled, and hash-verified — ideal for a self-hosted panel; `.mrpack` carries `server-overrides/`. CurseForge is gated/secondary. Modrinth Servers (paid cloud) is the UX bar to match.
- **#3:** trustworthy backups (rotation/caps/off-site/one-click restore) — every incumbent fails at some of this.
- **Beginner friction, in order:** port-forwarding/CGNAT, `server-ip` confusion, wrong Java, choosing server software, the `server.properties` wall, RAM/JVM flags, two-sided modpack setup, update tax.
- **Delighters that create "wow":** auto crash-diagnosis, one-click Aikar optimize, live player heads, visual MOTD/icon editor, embedded 3D world map, auto status page, zero-config Discord bridge, spark profiling.
- **Premium-feel UX patterns:** command palette, real-time-everything over WS, true dark mode via tokens, <2-min guided onboarding, setup checklist with progress, instructional empty states, mobile/PWA, single-command install.

Full sourced reports are retained in the research notes for this project.
