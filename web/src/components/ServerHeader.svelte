<script>
  import { activeState, activeId } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let { onneedsEula } = $props();
  let menuOpen = $state(false);

  const dot = $derived(
    $activeState.state === 'online' ? 'online'
    : ($activeState.state === 'starting' || $activeState.state === 'stopping') ? 'busy'
    : 'off'
  );

  async function power(action) {
    const s = $activeState;
    menuOpen = false;
    if (action === 'start' && s.installed && !s.eulaAccepted) { onneedsEula?.(); return; }
    if (action === 'kill' && !confirm('Force-kill the server process? Unsaved progress may be lost.')) return;
    try { await api.post(sUrl($activeId, '/power'), { action }); }
    catch (e) { toast(e.message, 'err'); }
  }
</script>

<svelte:window onclick={() => (menuOpen = false)} />

<header class="sh">
  <button class="back" onclick={() => history.back()}>
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
    Go back
  </button>

  <div class="row">
    <div class="id">
      <h1><span class="dot {dot}"></span>{$activeState.name ?? 'Server'}</h1>
      <div class="meta">
        <span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="3" /><line x1="7" y1="12" x2="7" y2="12" /><line x1="11" y1="12" x2="11" y2="12" /><circle cx="16.5" cy="10.5" r="1" /><circle cx="18.5" cy="13.5" r="1" /></svg>Minecraft</span>
        <span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.4a3 3 0 0 1 0 5.9" /><path d="M19.5 19a5 5 0 0 0-3-4.5" /></svg>{$activeState.playerCount ?? 0} / {$activeState.maxPlayers ?? 20} players</span>
        <span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="m12 13v8" /></svg>{$activeState.version ?? '—'}</span>
      </div>
    </div>

    <div class="actions">
      <button class="icon-btn badge" title="Announcements" aria-label="Announcements">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="m3 11 14-6v14L3 13z" /><path d="M11.6 16.8 11 21H7l-.5-5" /></svg>
      </button>
      <button class="icon-btn badge" title="Notifications" aria-label="Notifications">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      </button>
      <button class="restart" onclick={() => power('restart')}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
        Restart
      </button>
      <div class="more" onclick={(e) => e.stopPropagation()} role="presentation">
        <button class="icon-btn" onclick={() => (menuOpen = !menuOpen)} aria-label="More actions">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
        {#if menuOpen}
          <div class="menu">
            <button onclick={() => power('start')}>Start</button>
            <button onclick={() => power('stop')}>Stop</button>
            <button onclick={() => power('restart')}>Restart</button>
            <button class="danger" onclick={() => power('kill')}>Force kill</button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>

<style>
  .sh { display: flex; flex-direction: column; gap: 16px; }
  .back { display: inline-flex; align-items: center; gap: 7px; background: transparent; border: 0; color: var(--text-dim); font-size: 13px; padding: 0; width: fit-content; }
  .back:hover { color: var(--text); }
  .row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .id h1 { margin: 0; font-size: 28px; font-weight: 750; letter-spacing: -.02em; display: flex; align-items: center; gap: 11px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: var(--text-mut); }
  .dot.online { background: var(--ok); box-shadow: 0 0 0 4px var(--ok-weak); }
  .dot.busy { background: var(--warn); }
  .meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 9px; color: var(--text-dim); font-size: 13px; }
  .meta span { display: inline-flex; align-items: center; gap: 7px; }
  .meta svg { color: var(--text-mut); }

  .actions { display: flex; align-items: center; gap: 8px; }
  .icon-btn { width: 38px; height: 38px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--surface-1); color: var(--text-dim); display: grid; place-items: center; position: relative; }
  .icon-btn:hover { color: var(--text); border-color: var(--text-mut); }
  .badge::after { content: ''; position: absolute; top: 7px; right: 8px; width: 7px; height: 7px; border-radius: 50%; background: var(--bad); border: 2px solid var(--surface-1); }
  .restart { display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 0 18px; height: 38px; font-weight: 600; font-size: 13.5px; }
  .restart:hover { background: var(--accent-hover); }
  .more { position: relative; }
  .menu { position: absolute; top: calc(100% + 6px); right: 0; min-width: 150px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); box-shadow: var(--shadow); padding: 5px; z-index: 40; display: flex; flex-direction: column; }
  .menu button { text-align: left; background: transparent; border: 0; color: var(--text); padding: 8px 10px; border-radius: 6px; font-size: 13px; }
  .menu button:hover { background: var(--surface-3); }
  .menu button.danger { color: var(--bad); }
</style>
