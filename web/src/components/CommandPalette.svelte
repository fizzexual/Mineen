<script>
  import { paletteOpen, commands, closePalette } from '../stores/palette.js';
  import { filterCommands } from '../lib/palette.js';

  let query = $state('');
  let selected = $state(0);
  let inputEl = $state(null);

  const results = $derived(filterCommands($commands, query));

  $effect(() => { if ($paletteOpen) { query = ''; selected = 0; inputEl?.focus(); } });
  $effect(() => { if (selected >= results.length) selected = 0; });

  function onKey(e) {
    if (!$paletteOpen) return;
    if (e.key === 'Escape') { closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(selected + 1, results.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(selected - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[selected]); }
  }
  function run(cmd) { if (!cmd) return; closePalette(); cmd.run(); }
</script>

<svelte:window onkeydown={onKey} />

{#if $paletteOpen}
  <div class="cp-overlay" onclick={(e) => { if (e.target === e.currentTarget) closePalette(); }} role="presentation">
    <div class="cp" role="dialog" aria-label="Command palette">
      <input class="cp-input" placeholder="Type a command…" bind:value={query} bind:this={inputEl} />
      <div class="cp-list">
        {#each results as cmd, i (cmd.id)}
          <button class="cp-item {i === selected ? 'sel' : ''}" onmouseenter={() => (selected = i)} onclick={() => run(cmd)}>
            <span>{cmd.label}</span>
            {#if cmd.group}<span class="cp-group">{cmd.group}</span>{/if}
          </button>
        {:else}
          <div class="cp-empty">No matching commands</div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .cp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; justify-content: center; align-items: flex-start; padding-top: 14vh; z-index: 200; }
  .cp { width: min(560px, 92vw); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); overflow: hidden; }
  .cp-input { width: 100%; border: 0; background: transparent; color: var(--text); padding: 16px 18px; font-size: 15px; outline: none; border-bottom: 1px solid var(--border); }
  .cp-list { max-height: 340px; overflow-y: auto; padding: 6px; }
  .cp-item { display: flex; justify-content: space-between; align-items: center; width: 100%; text-align: left; background: transparent; border: 0; padding: 10px 12px; border-radius: var(--r-sm); color: var(--text); }
  .cp-item.sel { background: var(--accent-dim); }
  .cp-group { font-size: 11px; color: var(--text-mut); text-transform: uppercase; letter-spacing: .04em; }
  .cp-empty { padding: 18px; text-align: center; color: var(--text-mut); }
</style>
