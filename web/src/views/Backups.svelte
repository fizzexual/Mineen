<script>
  import { get } from 'svelte/store';
  import { activeId, activeState } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';
  import { fmtBytes, fmtTime } from '../lib/format.js';

  let backups = $state([]);
  let loading = $state(true);
  let busy = $state(false);

  $effect(() => { $activeId; load(); });

  async function load() {
    loading = true;
    try { const r = await api.get(sUrl(get(activeId), '/backups')); backups = r.backups ?? []; }
    catch (e) { toast(e.message, 'err'); }
    finally { loading = false; }
  }
  async function create() {
    busy = true;
    try { toast('Creating backup…'); await api.post(sUrl(get(activeId), '/backups'), {}); toast('Backup created', 'ok'); load(); }
    catch (e) { toast(e.message, 'err'); }
    finally { busy = false; }
  }
  async function restore(b) {
    if ($activeState.state !== 'offline') { toast('Stop the server before restoring', 'err'); return; }
    if (!confirm(`Restore "${b.name}"? This overwrites the current server files.`)) return;
    try { await api.post(sUrl(get(activeId), '/backups/restore'), { name: b.name }); toast('Backup restored', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }
  function download(b) { window.open(sUrl(get(activeId), '/backups/download?name=' + encodeURIComponent(b.name)), '_blank'); }
  async function remove(b) {
    if (!confirm(`Delete backup "${b.name}"?`)) return;
    try { await api.del(sUrl(get(activeId), '/backups?name=' + encodeURIComponent(b.name))); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
</script>

<section class="card">
  <div class="head">
    <div><h3>Backups</h3><p class="sub">Zipped snapshots of the whole server folder. Restore needs the server stopped.</p></div>
    <button class="create" onclick={create} disabled={busy}>{busy ? 'Creating…' : '+ Create backup'}</button>
  </div>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else if !backups.length}
    <p class="muted empty">No backups yet — create one to snapshot your world.</p>
  {:else}
    <ul class="blist">
      {#each backups as b (b.name)}
        <li>
          <span class="b-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1.2" /><path d="M5 9v10h14V9" /><line x1="10" y1="13" x2="14" y2="13" /></svg>
          </span>
          <span class="b-meta"><b>{b.name}</b><span>{fmtBytes(b.size)} · {fmtTime(b.mtime)}</span></span>
          <span class="acts">
            <button onclick={() => restore(b)}>Restore</button>
            <button onclick={() => download(b)}>Download</button>
            <button class="danger" onclick={() => remove(b)}>Delete</button>
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
  .head h3 { margin: 0; font-size: 15px; font-weight: 650; }
  .sub { color: var(--text-mut); font-size: 12.5px; margin: 4px 0 0; max-width: 48ch; }
  .create { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 9px 16px; font-weight: 600; font-size: 13px; white-space: nowrap; }
  .create:hover { background: var(--accent-hover); }
  .create:disabled { opacity: .6; }
  .blist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .blist li { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border-soft); }
  .blist li:last-child { border-bottom: 0; }
  .b-ico { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; background: var(--surface-2); color: var(--accent); flex: 0 0 auto; }
  .b-meta { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .b-meta b { font-size: 13px; font-family: var(--mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .b-meta span { font-size: 12px; color: var(--text-mut); }
  .acts { display: flex; gap: 5px; }
  .acts button { background: var(--surface-3); border: 1px solid var(--border); color: var(--text-dim); border-radius: 6px; padding: 5px 11px; font-size: 12px; }
  .acts button:hover { color: var(--text); }
  .acts button.danger:hover { color: var(--bad); border-color: var(--bad); }
  .muted { color: var(--text-mut); }
  .empty { padding: 24px 0; text-align: center; }
</style>
