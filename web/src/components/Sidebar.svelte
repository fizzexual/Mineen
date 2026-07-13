<script>
  let { view = 'console', onnavigate } = $props();
  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'console', label: 'Console' },
    { id: 'files', label: 'Files' },
    { id: 'properties', label: 'Settings' },
    { id: 'players', label: 'Players' },
    { id: 'backups', label: 'Backups' },
    { id: 'schedules', label: 'Automation' }
  ];
</script>

<aside class="sidebar">
  <div class="brand"><span class="brand-mark">◧</span><span class="brand-name">MineEN</span></div>
  <nav>
    {#each items as it (it.id)}
      <button class="nav-item {view === it.id ? 'active' : ''}" onclick={() => onnavigate?.(it.id)}>{it.label}</button>
    {/each}
  </nav>
</aside>

<style>
  .sidebar { width: 220px; flex: 0 0 220px; background: var(--surface-1); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px 12px; }
  .brand { display: flex; align-items: center; gap: 10px; padding: 8px 10px 18px; font-weight: 700; font-size: 17px; letter-spacing: -.01em; }
  .brand-mark { color: var(--accent); font-size: 20px; }
  nav { display: flex; flex-direction: column; gap: 2px; }
  .nav-item { text-align: left; background: transparent; border: 0; padding: 9px 12px; border-radius: var(--r-sm); color: var(--text-dim); font-size: 13.5px; }
  .nav-item:hover { color: var(--text); background: var(--surface-2); }
  .nav-item.active { color: var(--text); background: var(--surface-3); }
  @media (max-width: 720px) { .sidebar { width: 64px; flex-basis: 64px; } .brand-name, .nav-item { font-size: 0; } }
</style>
