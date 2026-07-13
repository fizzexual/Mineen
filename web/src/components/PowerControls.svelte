<script>
  import { activeId, activeState } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let { onneedsEula } = $props();

  const can = $derived.by(() => {
    const s = $activeState;
    const c = { start: false, stop: false, restart: false, kill: false };
    if (!s.installed) return c;
    if (s.state === 'offline') c.start = true;
    else if (s.state === 'online') { c.stop = c.restart = c.kill = true; }
    else if (s.state === 'starting') { c.stop = c.kill = true; }
    else if (s.state === 'stopping') { c.kill = true; }
    return c;
  });

  async function power(action) {
    const s = $activeState;
    if (action === 'start' && s.installed && !s.eulaAccepted) { onneedsEula?.(); return; }
    if (action === 'kill' && !confirm('Force-kill the server process? Unsaved progress may be lost.')) return;
    try { await api.post(sUrl($activeId, '/power'), { action }); }
    catch (e) { toast(e.message, 'err'); }
  }
</script>

<div class="power">
  <button class="pw start" disabled={!can.start} onclick={() => power('start')} title="Start">▶</button>
  <button class="pw restart" disabled={!can.restart} onclick={() => power('restart')} title="Restart">⟳</button>
  <button class="pw stop" disabled={!can.stop} onclick={() => power('stop')} title="Stop">■</button>
  <button class="pw kill" disabled={!can.kill} onclick={() => power('kill')} title="Force kill">✕</button>
</div>

<style>
  .power { display: flex; gap: 6px; }
  .pw { width: 36px; height: 36px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--surface-2); color: var(--text-dim); font-size: 14px; }
  .pw:not(:disabled):hover { color: var(--text); border-color: var(--text-mut); }
  .pw:disabled { opacity: .35; cursor: not-allowed; }
  .pw.start:not(:disabled) { color: var(--ok); }
  .pw.stop:not(:disabled), .pw.kill:not(:disabled) { color: var(--bad); }
</style>
