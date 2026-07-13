<script>
  import { activeState, activeId } from '../stores/active.js';
  import { telemetry } from '../stores/telemetry.js';
  import { logLines } from '../stores/consoleLog.js';
  import { classify } from '../lib/console.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';
  import UsageChart from '../components/UsageChart.svelte';

  let { onfulllog, onneedsEula } = $props();

  const s = $derived($activeState);
  const online = $derived(s.state === 'online');
  const gb = (mb) => (mb / 1024).toFixed(1);

  // ---- power / quick tasks ----
  async function power(action) {
    if (action === 'start' && s.installed && !s.eulaAccepted) { onneedsEula?.(); return; }
    if (action === 'kill' && !confirm('Force-kill the server process?')) return;
    try { await api.post(sUrl($activeId, '/power'), { action }); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function backup() {
    try { toast('Creating backup…'); await api.post(sUrl($activeId, '/backups'), {}); toast('Backup created', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }
  const tasks = [
    { id: 'start', title: 'Start', icon: 'M8 5v14l11-7z', run: () => power('start') },
    { id: 'stop', title: 'Stop', icon: 'M7 7h10v10H7z', run: () => power('stop') },
    { id: 'restart', title: 'Restart', icon: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5', run: () => power('restart') },
    { id: 'backup', title: 'Backup', icon: 'M4 5h16v4H4zM6 9v10h12V9M10 13h4', run: backup },
    { id: 'optimize', title: 'Optimize (soon)', icon: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z', run: () => toast('One-click optimize lands in P1') },
    { id: 'kill', title: 'Force kill', icon: 'M6 6l12 12M18 6 6 18', run: () => power('kill') }
  ];

  function copyAddr() {
    if (s.address) navigator.clipboard?.writeText(s.address).then(() => toast('Address copied', 'ok'));
  }

  // ---- players ----
  const players = $derived(s.players ?? []);
  function hue(name) { return [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360; }

  // ---- console preview ----
  const rows = $derived($logLines.slice(-9).map((line) => ({ line, ...classify(line) })));
  const errorCount = $derived($logLines.reduce((a, l) => a + (classify(l).level === 'error' ? 1 : 0), 0));
  let command = $state('');
  async function sendCmd(e) {
    e.preventDefault();
    const c = command.trim(); if (!c) return;
    try { await api.post(sUrl($activeId, '/command'), { command: c }); command = ''; }
    catch (err) { toast(err.message, 'err'); }
  }

  // ---- usage ----
  const metrics = ['CPU', 'RAM', 'Storage'];
  let metric = $state('CPU');
  const t = $derived($telemetry);
  const storageSeries = $derived.by(() => {
    const len = Math.max(t.cpu.length, 2);
    const v = t.last.storageMB ?? 0;
    return Array.from({ length: len }, () => v);
  });
  const chart = $derived.by(() => {
    if (metric === 'RAM') return { data: t.mem, max: t.memMax || 2048, color: 'var(--chart)', label: 'RAM Usage', sub: `of ${gb(t.memMax || 2048)} GB`, fmtValue: (v) => `${gb(v)} GB`, fmtAxis: (v) => `${Math.round(v / 1024)}` };
    if (metric === 'Storage') { const mx = Math.max(1024, (t.last.storageMB ?? 0) * 1.3); return { data: storageSeries, max: mx, color: '#4c8ef8', label: 'Storage', sub: `of ${gb(mx)} GB`, fmtValue: (v) => `${gb(v)} GB`, fmtAxis: (v) => `${Math.round(v / 1024)}` }; }
    return { data: t.cpu, max: 100, color: 'var(--chart)', label: 'CPU Usage', sub: 'of host cores', fmtValue: (v) => `${Math.round(v)}%`, fmtAxis: (v) => `${Math.round(v)}` };
  });
</script>

<div class="overview">
  <!-- ============ LEFT ============ -->
  <div class="col">
    <section class="card">
      <h3>Server</h3>
      <div class="game">
        <span class="game-ico" aria-hidden="true">🟩</span>
        <div class="game-meta">
          <b>Minecraft</b>
          <span class="state {online ? 'on' : 'off'}">{online ? 'ONLINE' : (s.state ?? 'offline').toUpperCase()}</span>
        </div>
        <button class="join" onclick={copyAddr}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>Join
        </button>
      </div>
      <div class="rows">
        <div class="row"><span>Server Name</span><b>{s.name ?? '—'}</b></div>
        <div class="row"><span>Players</span><b>{s.playerCount ?? 0}/{s.maxPlayers ?? 20} players online</b></div>
        <div class="row"><span>IP Address</span><b class="addr mono">{s.address ?? '—'}<button class="copy" onclick={copyAddr}>Copy</button></b></div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Active Instance</h3></div>
      <div class="instance">
        <span class="inst-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /></svg>
        </span>
        <div class="inst-meta"><b>{s.name ?? 'Server'}</b><span>{s.versionLabel ?? '—'}</span></div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Quick Tasks</h3></div>
      <div class="tasks">
        {#each tasks as task (task.id)}
          <button class="task" title={task.title} onclick={task.run} aria-label={task.title}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={task.icon} /></svg>
          </button>
        {/each}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Active Players <span class="mut">{s.playerCount ?? 0}/{s.maxPlayers ?? 20}</span></h3></div>
      {#if players.length}
        <ul class="players">
          {#each players as p (p)}
            <li><span class="head" style="background:hsl({hue(p)} 42% 42%)"></span><span class="pn">{p}</span></li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No players online right now.</p>
      {/if}
    </section>
  </div>

  <!-- ============ RIGHT ============ -->
  <div class="col wide">
    <section class="card">
      <div class="card-head">
        <h3>Console {#if errorCount}<span class="err-badge">{errorCount} errors</span>{/if}</h3>
        <button class="link" onclick={() => onfulllog?.()}>Full Server Log</button>
      </div>
      <div class="term">
        {#each rows as r}
          <div class="ln {r.kind} {r.level}">{r.line}</div>
        {:else}
          <div class="ln muted">Waiting for server output…</div>
        {/each}
      </div>
      <form class="cmd" onsubmit={sendCmd}>
        <input class="mono" placeholder="Enter a command…" bind:value={command} spellcheck="false" autocomplete="off" />
      </form>
    </section>

    <section class="card">
      <div class="card-head usage-head">
        <div class="uh-left"><h3>Usage</h3>
          <div class="mtabs">
            {#each metrics as m}
              <button class="mtab {metric === m ? 'active' : ''}" onclick={() => (metric = m)}>{m}</button>
            {/each}
          </div>
        </div>
      </div>
      <UsageChart data={chart.data} max={chart.max} color={chart.color} label={chart.label} sub={chart.sub} fmtValue={chart.fmtValue} fmtAxis={chart.fmtAxis} />
    </section>
  </div>
</div>

<style>
  .overview { display: grid; grid-template-columns: minmax(300px, 360px) 1fr; gap: 18px; align-items: start; }
  .col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }

  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; }
  .card > h3, .card-head h3 { margin: 0; font-size: 15px; font-weight: 650; display: flex; align-items: center; gap: 8px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .mut { color: var(--text-mut); font-weight: 500; font-size: 13px; }
  .link { background: transparent; border: 0; color: var(--accent); font-size: 13px; font-weight: 500; }
  .link:hover { color: var(--accent-hover); }

  /* server card */
  .game { display: flex; align-items: center; gap: 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px 14px; margin: 14px 0 4px; }
  .game-ico { font-size: 26px; line-height: 1; }
  .game-meta { display: flex; flex-direction: column; gap: 3px; flex: 1; }
  .game-meta b { font-size: 14px; }
  .state { font-size: 10.5px; font-weight: 700; letter-spacing: .06em; }
  .state.on { color: var(--ok); }
  .state.off { color: var(--text-mut); }
  .join { display: inline-flex; align-items: center; gap: 6px; background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 8px 16px; font-weight: 600; font-size: 13px; }
  .join:hover { background: var(--accent-hover); }
  .rows { display: flex; flex-direction: column; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-soft); font-size: 13px; }
  .row:last-child { border-bottom: 0; }
  .row > span { color: var(--text-dim); }
  .row b { font-weight: 600; display: inline-flex; align-items: center; gap: 8px; }
  .addr { font-size: 12.5px; }
  .copy { background: var(--surface-3); border: 1px solid var(--border); color: var(--text-dim); border-radius: 6px; padding: 3px 9px; font-size: 11px; font-family: var(--font); }
  .copy:hover { color: var(--text); }

  /* instance */
  .instance { display: flex; align-items: center; gap: 12px; }
  .inst-ico { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-2); color: var(--accent); }
  .inst-meta { display: flex; flex-direction: column; gap: 2px; }
  .inst-meta b { font-size: 14px; }
  .inst-meta span { font-size: 12px; color: var(--text-mut); }

  /* quick tasks */
  .tasks { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
  .task { aspect-ratio: 1; display: grid; place-items: center; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); color: var(--text-dim); }
  .task:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-dim); }

  /* players */
  .players { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .players li { display: flex; align-items: center; gap: 11px; }
  .head { width: 26px; height: 26px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.3), inset -6px -6px 0 rgba(0,0,0,.12); }
  .pn { font-size: 13.5px; }
  .empty { color: var(--text-mut); font-size: 13px; margin: 0; }

  /* console */
  .err-badge { font-size: 11px; font-weight: 600; color: var(--bad); background: var(--bad-weak); border-radius: 20px; padding: 2px 9px; display: inline-flex; align-items: center; gap: 5px; }
  .term { background: #0d0f14; border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px 14px; font-family: var(--mono); font-size: 12px; line-height: 1.75; height: 224px; overflow: auto; display: flex; flex-direction: column; }
  .ln { white-space: pre-wrap; word-break: break-word; color: var(--text-dim); }
  .ln.warn { color: var(--warn); }
  .ln.error { color: var(--bad); background: var(--bad-weak); margin: 0 -14px; padding: 0 14px; }
  .ln.panel { color: var(--accent); }
  .ln.command { color: var(--info); }
  .ln.muted { color: var(--text-mut); }
  .cmd { margin-top: 12px; }
  .cmd input { width: 100%; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 11px 14px; font-size: 12.5px; }
  .cmd input:focus { border-color: var(--accent); outline: none; }

  /* usage */
  .usage-head { align-items: flex-start; }
  .uh-left { display: flex; align-items: center; gap: 16px; }
  .mtabs { display: flex; gap: 4px; }
  .mtab { background: transparent; border: 0; color: var(--text-mut); font-size: 12.5px; font-weight: 500; padding: 5px 11px; border-radius: 7px; }
  .mtab:hover { color: var(--text-dim); }
  .mtab.active { color: var(--accent); background: var(--accent-dim); }

  @media (max-width: 1040px) { .overview { grid-template-columns: 1fr; } }
</style>
