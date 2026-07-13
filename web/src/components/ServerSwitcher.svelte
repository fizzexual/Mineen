<script>
  import { servers } from '../stores/servers.js';
  import { activeId, activeServer } from '../stores/active.js';

  let { onadd } = $props();
  let open = $state(false);

  function dot(state) { return state === 'online' ? 'online' : (state === 'starting' || state === 'stopping' ? 'busy' : ''); }
  function pick(id) { activeId.set(id); open = false; }
</script>

<div class="switcher">
  <button class="sw-btn" onclick={() => (open = !open)}>
    <span class="s-dot {dot($activeServer?.state)}"></span>
    <span class="sw-name">{$activeServer?.name ?? 'Select a server'}</span>
    <span class="caret">▾</span>
  </button>
  {#if open}
    <div class="sw-menu">
      {#each $servers as s (s.id)}
        <button class="sw-item {s.id === $activeId ? 'active' : ''}" onclick={() => pick(s.id)}>
          <span class="s-dot {dot(s.state)}"></span>
          <span class="sw-meta"><span class="sw-name">{s.name}</span><span class="sw-sub">{s.versionLabel}</span></span>
        </button>
      {/each}
      <button class="sw-add" onclick={() => { open = false; onadd?.(); }}>＋ Add server</button>
    </div>
  {/if}
</div>

<style>
  .switcher { position: relative; }
  .sw-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 0; color: var(--text); font-size: 18px; font-weight: 600; }
  .caret { color: var(--text-mut); font-size: 12px; }
  .s-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--text-mut); }
  .s-dot.online { background: var(--ok); box-shadow: 0 0 8px var(--ok); }
  .s-dot.busy { background: var(--warn); }
  .sw-menu { position: absolute; top: calc(100% + 8px); left: 0; min-width: 240px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); box-shadow: var(--shadow); padding: 6px; z-index: 40; }
  .sw-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: transparent; border: 0; padding: 8px 10px; border-radius: var(--r-sm); color: var(--text); }
  .sw-item.active, .sw-item:hover { background: var(--surface-3); }
  .sw-meta { display: flex; flex-direction: column; }
  .sw-sub { font-size: 12px; color: var(--text-mut); }
  .sw-add { width: 100%; text-align: left; background: transparent; border: 0; border-top: 1px solid var(--border); margin-top: 4px; padding: 10px; color: var(--accent); }
</style>
