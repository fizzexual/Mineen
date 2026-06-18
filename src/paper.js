import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const API = 'https://api.papermc.io/v2/projects/paper';

// Available Minecraft versions (newest first).
export async function listVersions() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`Paper API returned ${res.status}`);
  const data = await res.json();
  return [...(data.versions || [])].reverse();
}

export async function latestBuild(version) {
  const res = await fetch(`${API}/versions/${encodeURIComponent(version)}/builds`);
  if (!res.ok) throw new Error(`Paper API returned ${res.status} for version ${version}`);
  const builds = (await res.json()).builds || [];
  if (!builds.length) throw new Error(`No builds found for ${version}`);
  const stable = [...builds].reverse().find((b) => b.channel === 'default');
  return stable || builds[builds.length - 1];
}

// Download a Paper jar into destDir. onProgress(receivedBytes, totalBytes).
export async function downloadJar(version, destDir, onProgress) {
  const build = await latestBuild(version);
  const jarName = build.downloads.application.name;
  const url = `${API}/versions/${encodeURIComponent(version)}/builds/${build.build}/downloads/${jarName}`;

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Failed to download jar (${res.status})`);

  const total = Number(res.headers.get('content-length')) || 0;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, jarName);
  const tmp = `${dest}.part`;

  let received = 0;
  const source = Readable.fromWeb(res.body);
  source.on('data', (chunk) => { received += chunk.length; onProgress?.(received, total); });
  await pipeline(source, fs.createWriteStream(tmp));
  fs.renameSync(tmp, dest);

  return { jar: jarName, version, build: build.build };
}
