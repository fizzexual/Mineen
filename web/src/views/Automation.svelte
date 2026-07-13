<script>
  import { get } from 'svelte/store';
  import { activeId } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let schedules = $state([]);
  let loading = $state(true);
  let action = $state('restart');
  let everyMinutes = $state(360);

  $effect(() => { $activeId; load(); });

  async function load() {
    loading = true;
    try { const r = await api.get(sUrl(get(activeId), '/schedules')); schedules = r.schedules ?? []; }
    catch (e) { toast(e.message, 'err'); }
    finally { loading = false; }
  }
  async function add() {
    try { await api.post(sUrl(get(activeId), '/schedules'), { action, everyMinutes: Number(everyMinutes) }); toast('Schedule added', 'ok'); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function toggle(s) {
    try { await api.post(sUrl(get(activeId), `/schedules/${s.id}/toggle`), {}); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function remove(s) {
    try { await api.del(sUrl(get(activeId), `/schedules/${s.id}`)); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  const fmtEvery = (m) => (m % 60 === 0 ? `${m / 60}h` : `${m}m`);
</script>

<section class="card">
  <div class="head"><div><h3>Automation</h3><p class="sub">Auto-restart or auto-backup the server on a repeating interval.</p></div></div>

  <div class="add">
    <select bind:value={action}>
      <option value="restart">Auto-restart</option>
      <option value="backup">Auto-backup</option>
    </select>
    <span class="lbl">every</span>
    <input type="number" min="5" step="5" bind:value={everyMinutes} />
    <span class="lbl">minutes</span>
    <button class="go" onclick={add}>+ Add schedule</button>
  </div>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else if !schedules.length}
    <p class="muted empty">No schedules yet — add one above.</p>
  {:else}
    <ul class="slist">
      {#each schedules as s (s.id)}
        <li>
          <span class="s-ico" aria-hidden="true">
            {#if s.action === 'restart'}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
            {:else}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1.2" /><path d="M5 9v10h14V9" /><line x1="10" y1="13" x2="14" y2="13" /></svg>
            {/if}
          </span>
          <span class="s-meta"><b>{s.action === 'restart' ? 'Auto-restart' : 'Auto-backup'}</b><span>every {fmtEvery(s.everyMinutes)}</span></span>
          <label class="tog"><input type="checkbox" checked={s.enabled} onchange={() => toggle(s)} /><span class="slider"></span></label>
          <button class="del" onclick={() => remove(s)} aria-label="Delete schedule">✕</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; }
  .head h3 { margin: 0; font-size: 15px; font-weight: 650; }
  .sub { color: var(--text-mut); font-size: 12.5px; margin: 4px 0 16px; }
  .add { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px 14px; margin-bottom: 16px; }
  .add select, .add input { background: var(--surface-1); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 8px 11px; font-size: 13px; }
  .add input { width: 80px; }
  .lbl { color: var(--text-dim); font-size: 13px; }
  .go { margin-left: auto; background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 8px 15px; font-weight: 600; font-size: 13px; }
  .go:hover { background: var(--accent-hover); }
  .slist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .slist li { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border-soft); }
  .slist li:last-child { border-bottom: 0; }
  .s-ico { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; background: var(--surface-2); color: var(--accent); }
  .s-meta { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .s-meta b { font-size: 13.5px; }
  .s-meta span { font-size: 12px; color: var(--text-mut); }
  .tog { position: relative; width: 40px; height: 22px; flex: 0 0 auto; }
  .tog input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; inset: 0; background: var(--surface-3); border: 1px solid var(--border); border-radius: 20px; transition: .15s; }
  .slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; top: 2px; background: var(--text-mut); border-radius: 50%; transition: .15s; }
  .tog input:checked + .slider { background: var(--accent-dim); border-color: var(--accent); }
  .tog input:checked + .slider::before { transform: translateX(18px); background: var(--accent); }
  .del { background: transparent; border: 0; color: var(--text-mut); font-size: 14px; padding: 6px 8px; border-radius: 6px; }
  .del:hover { color: var(--bad); background: var(--bad-weak); }
  .muted { color: var(--text-mut); }
  .empty { padding: 20px 0; text-align: center; }
</style>
