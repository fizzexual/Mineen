<script>
  import { telemetry } from '../stores/telemetry.js';
  import { activeState } from '../stores/active.js';
  import Sparkline from '../components/Sparkline.svelte';
  import { fmtUptime } from '../lib/format.js';

  const gb = (mb) => (mb / 1024).toFixed(2);
  const last = $derived($telemetry.last);
  const tps = $derived(last.tps);
  const tpsTag = $derived(tps == null ? ['—', ''] : tps >= 19 ? ['STABLE', 'ok'] : tps >= 15 ? ['BUSY', 'warn'] : ['LAGGING', 'bad']);
</script>

<section class="dash">
  <div class="tiles">
    <div class="tile">
      <div class="t-label">CPU</div>
      <div class="t-val">{last.cpu ?? 0}%</div>
      <Sparkline data={$telemetry.cpu} max={100} color="var(--info)" />
    </div>
    <div class="tile">
      <div class="t-label">Memory</div>
      <div class="t-val">{gb(last.memUsedMB ?? 0)} / {gb(last.memMaxMB ?? $telemetry.memMax)} GB</div>
      <Sparkline data={$telemetry.mem} max={$telemetry.memMax} color="var(--accent)" />
    </div>
    <div class="tile">
      <div class="t-label">Storage</div>
      <div class="t-val">{(last.storageMB ?? 0) >= 1024 ? gb(last.storageMB) + ' GB' : (last.storageMB ?? 0) + ' MB'}</div>
    </div>
  </div>

  <div class="health">
    <div class="h-card"><span>TPS</span><strong>{tps == null ? '—' : tps.toFixed(2)}</strong><em class="tag {tpsTag[1]}">{tpsTag[0]}</em></div>
    <div class="h-card"><span>Uptime</span><strong class="mono">{fmtUptime($activeState.uptimeMs)}</strong></div>
    <div class="h-card"><span>Players</span><strong>{last.playerCount ?? $activeState.playerCount ?? 0} / {last.maxPlayers ?? $activeState.maxPlayers ?? 20}</strong></div>
    <div class="h-card"><span>Latency</span><strong>{last.latency == null ? '—' : last.latency + ' ms'}</strong></div>
  </div>

  <div class="card">
    <h3>Server</h3>
    <div class="info">
      <div class="row"><span>Name</span><strong>{$activeState.name ?? '—'}</strong></div>
      <div class="row"><span>Version</span><strong>{$activeState.versionLabel ?? '—'}</strong></div>
      <div class="row"><span>Address</span><strong class="mono">{$activeState.address ?? '—'}</strong></div>
      <div class="row"><span>Memory</span><strong>{$activeState.memoryMB ? gb($activeState.memoryMB) + ' GB' : '—'}</strong></div>
    </div>
  </div>
</section>

<style>
  .dash { display: flex; flex-direction: column; gap: 16px; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .tile, .card, .h-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-md); padding: 16px; }
  .t-label { color: var(--text-mut); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
  .t-val { font-size: 22px; font-weight: 650; margin: 6px 0 10px; }
  .health { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .h-card { display: flex; flex-direction: column; gap: 4px; }
  .h-card span { color: var(--text-mut); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
  .h-card strong { font-size: 20px; }
  .tag { font-size: 11px; font-style: normal; padding: 2px 6px; border-radius: 5px; width: fit-content; }
  .tag.ok { color: var(--ok); background: var(--accent-dim); }
  .tag.warn { color: var(--warn); }
  .tag.bad { color: var(--bad); }
  .card h3 { margin: 0 0 12px; font-size: 14px; }
  .info { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .row span { color: var(--text-dim); }
  @media (max-width: 720px) { .tiles, .health { grid-template-columns: 1fr 1fr; } }
</style>
