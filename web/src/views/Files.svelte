<script>
  import { get } from 'svelte/store';
  import { activeId } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';
  import { fmtBytes, fmtTime } from '../lib/format.js';

  let path = $state('');
  let items = $state([]);
  let loading = $state(true);
  let editing = $state(null); // { path, content }
  let saving = $state(false);
  let fileInput = $state(null);

  const crumbs = $derived(path.split('/').filter(Boolean));
  const join = (a, b) => (a ? a + '/' + b : b);

  // Load (and reset to root) whenever the active server changes.
  $effect(() => { $activeId; load(''); });

  async function load(p = path) {
    loading = true;
    try {
      const r = await api.get(sUrl(get(activeId), '/files?path=' + encodeURIComponent(p)));
      path = r.path; items = r.items;
    } catch (e) { toast(e.message, 'err'); }
    finally { loading = false; }
  }

  function open(item) {
    if (item.dir) load(join(path, item.name));
    else if (item.editable) edit(join(path, item.name));
    else download(join(path, item.name));
  }
  function goCrumb(i) { load(crumbs.slice(0, i + 1).join('/')); }

  async function edit(p) {
    try { const r = await api.get(sUrl(get(activeId), '/files/content?path=' + encodeURIComponent(p))); editing = { path: p, content: r.content }; }
    catch (e) { toast(e.message, 'err'); }
  }
  async function saveFile() {
    saving = true;
    try { await api.post(sUrl(get(activeId), '/files/content'), { path: editing.path, content: editing.content }); toast('Saved', 'ok'); editing = null; }
    catch (e) { toast(e.message, 'err'); }
    finally { saving = false; }
  }
  async function newFolder() {
    const name = prompt('New folder name'); if (!name) return;
    try { await api.post(sUrl(get(activeId), '/files/mkdir'), { path: join(path, name) }); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function rename(item) {
    const name = prompt('Rename to', item.name); if (!name || name === item.name) return;
    try { await api.post(sUrl(get(activeId), '/files/rename'), { path: join(path, item.name), newName: name }); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function remove(item) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try { await api.del(sUrl(get(activeId), '/files?path=' + encodeURIComponent(join(path, item.name)))); load(); }
    catch (e) { toast(e.message, 'err'); }
  }
  function download(p) { window.open(sUrl(get(activeId), '/files/download?path=' + encodeURIComponent(p)), '_blank'); }
  async function upload(e) {
    const files = [...(e.target.files || [])]; if (!files.length) return;
    const fd = new FormData(); for (const f of files) fd.append('files', f);
    try {
      const res = await fetch(sUrl(get(activeId), '/files/upload?path=' + encodeURIComponent(path)), { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed'); toast('Uploaded', 'ok'); load();
    } catch (err) { toast(err.message, 'err'); }
    finally { e.target.value = ''; }
  }
</script>

<section class="card">
  <div class="head">
    <div class="crumbs">
      <button class="crumb" onclick={() => load('')}>server</button>
      {#each crumbs as part, i}
        <span class="sep">/</span><button class="crumb" onclick={() => goCrumb(i)}>{part}</button>
      {/each}
    </div>
    <div class="tools">
      {#if path}<button class="tbtn" onclick={() => load(crumbs.slice(0, -1).join('/'))}>↑ Up</button>{/if}
      <button class="tbtn" onclick={() => load()}>Refresh</button>
      <button class="tbtn" onclick={newFolder}>New folder</button>
      <button class="tbtn accent" onclick={() => fileInput?.click()}>Upload</button>
      <input type="file" multiple hidden bind:this={fileInput} onchange={upload} />
    </div>
  </div>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else}
    <table class="files">
      <thead><tr><th>Name</th><th class="c-size">Size</th><th class="c-mod">Modified</th><th class="c-act"></th></tr></thead>
      <tbody>
        {#each items as it (it.name)}
          <tr>
            <td class="name">
              <button class="open" onclick={() => open(it)}>
                <span class="fi {it.dir ? 'dir' : ''}" aria-hidden="true">
                  {#if it.dir}
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>
                  {:else}
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /></svg>
                  {/if}
                </span>{it.name}
              </button>
            </td>
            <td class="c-size mono">{it.dir ? '—' : fmtBytes(it.size)}</td>
            <td class="c-mod">{it.mtime ? fmtTime(it.mtime) : '—'}</td>
            <td class="c-act">
              <div class="acts">
                {#if it.editable}<button onclick={() => edit(join(path, it.name))} title="Edit">Edit</button>{/if}
                {#if !it.dir}<button onclick={() => download(join(path, it.name))} title="Download">↓</button>{/if}
                <button onclick={() => rename(it)} title="Rename">Rename</button>
                <button class="danger" onclick={() => remove(it)} title="Delete">Delete</button>
              </div>
            </td>
          </tr>
        {:else}
          <tr><td colspan="4" class="muted empty">This folder is empty.</td></tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

{#if editing}
  <div class="ov" onclick={(e) => { if (e.target === e.currentTarget) (editing = null); }} role="presentation">
    <div class="ed" role="dialog" aria-label="Edit file">
      <div class="ed-head"><span class="mono">{editing.path}</span><button class="x" onclick={() => (editing = null)} aria-label="Close">✕</button></div>
      <textarea class="ed-txt mono" bind:value={editing.content} spellcheck="false"></textarea>
      <div class="ed-foot"><button onclick={() => (editing = null)}>Cancel</button><button class="save" onclick={saveFile} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
    </div>
  </div>
{/if}

<style>
  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .crumbs { display: flex; align-items: center; gap: 4px; font-size: 13px; flex-wrap: wrap; }
  .crumb { background: transparent; border: 0; color: var(--text-dim); padding: 3px 5px; border-radius: 5px; }
  .crumb:last-child { color: var(--text); }
  .crumb:hover { color: var(--accent); }
  .sep { color: var(--text-mut); }
  .tools { display: flex; gap: 6px; }
  .tbtn { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim); border-radius: var(--r-sm); padding: 7px 12px; font-size: 12.5px; }
  .tbtn:hover { color: var(--text); }
  .tbtn.accent { background: var(--accent); color: var(--accent-ink); border-color: transparent; }
  .tbtn.accent:hover { background: var(--accent-hover); }

  .files { width: 100%; border-collapse: collapse; font-size: 13px; }
  .files th { text-align: left; color: var(--text-mut); font-weight: 500; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; padding: 8px 10px; border-bottom: 1px solid var(--border); }
  .files td { padding: 4px 10px; border-bottom: 1px solid var(--border-soft); }
  .files tr:hover td { background: var(--surface-2); }
  .c-size, .c-mod { color: var(--text-dim); white-space: nowrap; }
  .c-size { width: 110px; } .c-mod { width: 190px; } .c-act { width: 1%; }
  .open { display: flex; align-items: center; gap: 10px; background: transparent; border: 0; color: var(--text); padding: 7px 0; width: 100%; text-align: left; }
  .fi { color: var(--text-mut); display: inline-flex; }
  .fi.dir { color: var(--accent); }
  .open:hover { color: var(--accent); }
  .acts { display: flex; gap: 4px; justify-content: flex-end; opacity: 0; transition: opacity .12s; }
  tr:hover .acts { opacity: 1; }
  .acts button { background: var(--surface-3); border: 1px solid var(--border); color: var(--text-dim); border-radius: 6px; padding: 4px 9px; font-size: 11.5px; }
  .acts button:hover { color: var(--text); }
  .acts button.danger:hover { color: var(--bad); border-color: var(--bad); }
  .empty { text-align: center; padding: 30px; }
  .muted { color: var(--text-mut); }

  .ov { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 150; padding: 24px; }
  .ed { width: min(860px, 96vw); height: min(80vh, 700px); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); display: flex; flex-direction: column; }
  .ed-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text-dim); }
  .x { background: transparent; border: 0; color: var(--text-mut); font-size: 15px; }
  .ed-txt { flex: 1; resize: none; background: #0d0f14; color: var(--text); border: 0; padding: 16px 18px; font-size: 12.5px; line-height: 1.6; outline: none; }
  .ed-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--border); }
  .ed-foot button { border: 1px solid var(--border); background: var(--surface-1); color: var(--text); border-radius: var(--r-sm); padding: 9px 18px; font-size: 13px; }
  .ed-foot .save { background: var(--accent); color: var(--accent-ink); border-color: transparent; font-weight: 600; }
  .ed-foot .save:hover { background: var(--accent-hover); }
</style>
