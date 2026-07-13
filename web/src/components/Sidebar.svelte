<script>
  import { activeState } from '../stores/active.js';

  let { view = 'dashboard', onnavigate } = $props();

  const menu = [
    { id: 'servers', label: 'My Servers', icon: 'servers' },
    { id: 'support', label: 'Support', icon: 'support' },
    { id: 'panel', label: 'Panel Settings', icon: 'settings' }
  ];
  const server = [
    { id: 'dashboard', label: 'Overview', icon: 'overview' },
    { id: 'console', label: 'Console', icon: 'console' },
    { id: 'files', label: 'Files', icon: 'files' },
    { id: 'properties', label: 'Config', icon: 'config' },
    { id: 'players', label: 'Players', icon: 'players' },
    { id: 'schedules', label: 'Automation', icon: 'automation' },
    { id: 'sharing', label: 'Sharing', icon: 'sharing' },
    { id: 'backups', label: 'Backups', icon: 'backups' }
  ];
</script>

{#snippet icon(name)}
  <svg class="ico" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {#if name === 'overview'}
      <rect x="3" y="3" width="8" height="8" rx="1.6" /><rect x="13" y="3" width="8" height="8" rx="1.6" /><rect x="3" y="13" width="8" height="8" rx="1.6" /><rect x="13" y="13" width="8" height="8" rx="1.6" />
    {:else if name === 'console'}
      <rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3" /><line x1="13" y1="15" x2="17" y2="15" />
    {:else if name === 'files'}
      <path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    {:else if name === 'config'}
      <line x1="4" y1="8" x2="20" y2="8" /><circle cx="9" cy="8" r="2.1" /><line x1="4" y1="16" x2="20" y2="16" /><circle cx="15" cy="16" r="2.1" />
    {:else if name === 'players'}
      <circle cx="9" cy="8" r="3" /><path d="M4 19.5a5 5 0 0 1 10 0" /><path d="M16 5.4a3 3 0 0 1 0 5.9" /><path d="M18.5 19.5a5 5 0 0 0-3-4.5" />
    {:else if name === 'automation'}
      <circle cx="12" cy="12" r="8.2" /><path d="M12 7.5V12l3 1.8" />
    {:else if name === 'sharing'}
      <circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><line x1="8.2" y1="10.9" x2="14.8" y2="7.1" /><line x1="8.2" y1="13.1" x2="14.8" y2="16.9" />
    {:else if name === 'backups'}
      <rect x="3" y="4" width="18" height="5" rx="1.2" /><path d="M5 9v10h14V9" /><line x1="10" y1="13" x2="14" y2="13" />
    {:else if name === 'servers'}
      <path d="M7 18.5a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.7 1.2A3.6 3.6 0 0 1 17 18.5Z" />
    {:else if name === 'support'}
      <circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="3.3" /><line x1="14.4" y1="9.6" x2="17.5" y2="6.5" /><line x1="6.5" y1="17.5" x2="9.6" y2="14.4" /><line x1="14.4" y1="14.4" x2="17.5" y2="17.5" /><line x1="6.5" y1="6.5" x2="9.6" y2="9.6" />
    {:else if name === 'settings'}
      <circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.8 5.8l2.1 2.1M16.1 16.1l2.1 2.1M18.2 5.8l-2.1 2.1M7.9 16.1l-2.1 2.1" />
    {/if}
  </svg>
{/snippet}

<aside class="sidebar">
  <div class="brand">
    <span class="mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" /></svg>
    </span>
    <span class="word">Mine<b>EN</b></span>
  </div>

  <nav>
    <span class="cap">Menu</span>
    {#each menu as it (it.id)}
      <button class="item {view === it.id ? 'active' : ''}" onclick={() => onnavigate?.(it.id)}>{@render icon(it.icon)}<span>{it.label}</span></button>
    {/each}

    <span class="cap">Server Settings</span>
    {#each server as it (it.id)}
      <button class="item {view === it.id ? 'active' : ''}" onclick={() => onnavigate?.(it.id)}>{@render icon(it.icon)}<span>{it.label}</span></button>
    {/each}
  </nav>

  <div class="foot">
    <span class="cap">System</span>
    <div class="sys">
      <span class="sys-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" /></svg>
      </span>
      <span class="sys-meta">
        <b>MineEN</b>
        <span>v2.0 · self-hosted</span>
      </span>
    </div>

    <div class="user">
      <span class="av">{($activeState.name ?? 'S').slice(0, 1).toUpperCase()}</span>
      <span class="u-meta">
        <b>Server Owner</b>
        <span>{$activeState.address ?? 'localhost'}</span>
      </span>
    </div>
  </div>
</aside>

<style>
  .sidebar { width: 236px; flex: 0 0 236px; background: var(--sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 18px 14px 14px; }
  .brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 20px; }
  .mark { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: linear-gradient(150deg, var(--accent), #2563eb); color: #fff; box-shadow: 0 6px 16px -6px var(--accent); }
  .word { font-weight: 750; font-size: 18px; letter-spacing: -.02em; }
  .word b { color: var(--accent); font-weight: 750; }

  nav { display: flex; flex-direction: column; gap: 2px; flex: 1; overflow-y: auto; }
  .cap { font-size: 10.5px; font-weight: 600; letter-spacing: .10em; text-transform: uppercase; color: var(--text-mut); padding: 16px 10px 7px; }
  .item { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: transparent; border: 0; padding: 9px 11px; border-radius: var(--r-sm); color: var(--text-dim); font-size: 13.5px; font-weight: 500; }
  .item .ico { color: var(--text-mut); flex: 0 0 auto; }
  .item:hover { background: var(--surface-2); color: var(--text); }
  .item:hover .ico { color: var(--text-dim); }
  .item.active { background: var(--accent-dim); color: #cfe0fb; }
  .item.active .ico { color: var(--accent); }

  .foot { display: flex; flex-direction: column; gap: 4px; }
  .sys { display: flex; align-items: center; gap: 10px; background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-md); padding: 10px 11px; }
  .sys-ico { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; background: var(--surface-2); color: var(--accent); }
  .sys-meta { display: flex; flex-direction: column; line-height: 1.3; }
  .sys-meta b { font-size: 12.5px; }
  .sys-meta span { font-size: 11px; color: var(--text-mut); }

  .user { display: flex; align-items: center; gap: 10px; padding: 12px 6px 2px; margin-top: 6px; border-top: 1px solid var(--border-soft); }
  .av { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(150deg, #4c8ef8, #7c3aed); color: #fff; font-size: 13px; font-weight: 600; }
  .u-meta { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; }
  .u-meta b { font-size: 12.5px; }
  .u-meta span { font-size: 11px; color: var(--text-mut); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }

  @media (max-width: 860px) {
    .sidebar { width: 68px; flex-basis: 68px; padding: 18px 10px; }
    .word, .cap, .item span, .sys-meta, .u-meta { display: none; }
    .item { justify-content: center; }
    .sys, .user { justify-content: center; }
  }
</style>
