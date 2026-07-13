<script>
  import Modal from './Modal.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let { open, installProgress = null, oncreated, onclose } = $props();

  let mode = $state('download');
  let name = $state('');
  let version = $state('');
  let versions = $state([]);
  let path = $state('');
  let isServer = $state(false);
  let hint = $state('');
  let busy = $state(false);

  $effect(() => { if (open && !versions.length) loadVersions(); });

  async function loadVersions() {
    try { const r = await api.get('/api/versions'); versions = r.versions; version = versions[0] ?? ''; }
    catch (e) { toast('Paper API error: ' + e.message, 'err'); }
  }
  async function pick() {
    try {
      const r = await api.post('/api/pick-folder', {});
      if (!r.cancelled && r.path) { path = r.path; isServer = !!r.isServer; hint = r.isServer ? `✓ Server detected${r.jar ? ' (' + r.jar + ')' : ''}` : 'No server jar / server.properties found'; }
    } catch (e) { toast(e.message, 'err'); }
  }
  async function create() {
    busy = true;
    try {
      if (mode === 'existing') {
        if (!path.trim()) { toast('Pick a folder first', 'err'); busy = false; return; }
        const { id } = await api.post('/api/servers', { mode: 'existing', name, path });
        oncreated?.(id, 'existing');
      } else {
        const { id } = await api.post('/api/servers', { mode: 'download', name, version });
        oncreated?.(id, 'download');
      }
    } catch (e) { toast(e.message, 'err'); }
    finally { busy = false; }
  }
</script>

{#if open}
  <Modal title="Add Server" {onclose}>
    <div class="seg">
      <button class:active={mode === 'download'} onclick={() => (mode = 'download')}>Download new</button>
      <button class:active={mode === 'existing'} onclick={() => (mode = 'existing')}>Use existing folder</button>
    </div>
    <label class="field"><span>Server name</span><input bind:value={name} placeholder="My Server" /></label>
    {#if mode === 'download'}
      <label class="field"><span>Minecraft version</span>
        <select bind:value={version}>
          {#each versions as v}<option value={v}>{v}</option>{:else}<option>Loading…</option>{/each}
        </select>
      </label>
    {:else}
      <span class="lbl">Your server folder</span>
      <div class="pick"><input class="mono" bind:value={path} placeholder="C:\\path\\to\\server" /><button onclick={pick}>📁 Browse…</button></div>
      <div class="hint {isServer ? 'good' : 'bad'}">{hint || 'Choose your server folder, or paste its path.'}</div>
    {/if}
    {#if installProgress}
      <div class="prog"><div class="bar" style="width:{installProgress.percent ?? 0}%"></div></div>
      <span class="prog-label">{installProgress.label}</span>
    {/if}
    <div class="foot">
      <button onclick={onclose}>Cancel</button>
      <button class="go" disabled={busy || (mode === 'existing' && !isServer)} onclick={create}>Create</button>
    </div>
  </Modal>
{/if}

<style>
  .seg { display: flex; gap: 6px; background: var(--surface-3); padding: 4px; border-radius: var(--r-sm); margin-bottom: 16px; }
  .seg button { flex: 1; background: transparent; border: 0; color: var(--text-dim); padding: 8px; border-radius: var(--r-sm); }
  .seg button.active { background: var(--surface-1); color: var(--text); }
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .field span, .lbl { font-size: 12px; color: var(--text-dim); }
  .field input, .field select, .pick input { background: var(--surface-1); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 9px 11px; width: 100%; }
  .pick { display: flex; gap: 8px; }
  .pick button { background: var(--surface-3); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 0 12px; white-space: nowrap; }
  .hint { font-size: 12px; margin: 8px 0; }
  .hint.good { color: var(--ok); }
  .hint.bad { color: var(--text-mut); }
  .prog { height: 6px; background: var(--surface-3); border-radius: 3px; margin-top: 14px; overflow: hidden; }
  .bar { height: 100%; background: var(--accent); transition: width .2s; }
  .prog-label { font-size: 12px; color: var(--text-dim); }
  .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
  .foot .go { background: var(--accent); color: var(--accent-ink); border: 0; font-weight: 600; }
  .foot button { border: 1px solid var(--border); background: var(--surface-1); color: var(--text); border-radius: var(--r-sm); padding: 9px 16px; }
</style>
