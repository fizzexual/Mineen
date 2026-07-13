<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { activeId } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let entries = $state([]);
  let loading = $state(true);
  let saving = $state(false);
  let filter = $state('');

  const shown = $derived(entries.filter((e) => !filter || e.key.toLowerCase().includes(filter.toLowerCase())));

  async function load() {
    loading = true;
    try { const r = await api.get(sUrl(get(activeId), '/properties')); entries = r.entries ?? []; }
    catch (e) { toast(e.message, 'err'); }
    finally { loading = false; }
  }
  async function save() {
    saving = true;
    try { await api.post(sUrl(get(activeId), '/properties'), { entries }); toast('Config saved — restart to apply', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
    finally { saving = false; }
  }
  const isBool = (v) => v === 'true' || v === 'false';
  onMount(load);
</script>

<section class="card">
  <div class="head">
    <h3>Config <span class="sub mono">server.properties</span></h3>
    <div class="tools">
      <input class="filter" placeholder="Filter settings…" bind:value={filter} />
      <button class="save" onclick={save} disabled={saving || loading}>{saving ? 'Saving…' : 'Save changes'}</button>
    </div>
  </div>

  {#if loading}
    <p class="muted">Loading settings…</p>
  {:else if !entries.length}
    <p class="muted">No server.properties yet — it'll be created when the server first runs.</p>
  {:else}
    <div class="grid">
      {#each shown as e (e.key)}
        <label class="field">
          <span class="k">{e.key}</span>
          {#if isBool(e.value)}
            <select bind:value={e.value}><option value="true">true</option><option value="false">false</option></select>
          {:else}
            <input bind:value={e.value} spellcheck="false" autocomplete="off" />
          {/if}
        </label>
      {/each}
    </div>
    <p class="note">Changes take effect after a server restart.</p>
  {/if}
</section>

<style>
  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 20px; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
  .head h3 { margin: 0; font-size: 15px; font-weight: 650; display: flex; align-items: baseline; gap: 9px; }
  .sub { color: var(--text-mut); font-weight: 500; font-size: 12.5px; }
  .tools { display: flex; gap: 8px; }
  .filter { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 8px 12px; width: 220px; font-size: 13px; }
  .filter:focus { border-color: var(--accent); outline: none; }
  .save { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 9px 18px; font-weight: 600; font-size: 13px; }
  .save:hover { background: var(--accent-hover); }
  .save:disabled { opacity: .55; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .k { font-size: 12px; color: var(--text-dim); font-family: var(--mono); }
  .field input, .field select { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 9px 11px; font-size: 13px; }
  .field input:focus, .field select:focus { border-color: var(--accent); outline: none; }
  .muted { color: var(--text-mut); }
  .note { color: var(--text-mut); font-size: 12px; margin: 20px 0 0; }
</style>
