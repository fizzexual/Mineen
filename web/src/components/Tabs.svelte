<script>
  let { active = 'dashboard', ontab } = $props();
  const tabs = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'console', label: 'Console' },
    { id: 'files', label: 'Files' },
    { id: 'properties', label: 'Config' }
  ];
</script>

<div class="tabs">
  <div class="left">
    {#each tabs as t (t.id)}
      <button class="tab {active === t.id ? 'active' : ''}" onclick={() => ontab?.(t.id)}>{t.label}</button>
    {/each}
  </div>
  <div class="right">
    <button class="act" onclick={() => ontab?.('properties')}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
      Edit Server
    </button>
    <button class="act" onclick={() => ontab?.('sharing')}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /></svg>
      Invite People
    </button>
  </div>
</div>

<style>
  .tabs { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--border); padding-bottom: 2px; }
  .left { display: flex; gap: 4px; }
  .tab { background: transparent; border: 0; color: var(--text-dim); font-size: 14px; font-weight: 500; padding: 10px 16px; border-radius: var(--r-sm); position: relative; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); background: var(--accent-dim); }
  .right { display: flex; gap: 6px; }
  .act { display: inline-flex; align-items: center; gap: 7px; background: transparent; border: 0; color: var(--text-dim); font-size: 13px; font-weight: 500; padding: 8px 12px; border-radius: var(--r-sm); }
  .act:hover { color: var(--accent); }
  @media (max-width: 720px) { .right .act { font-size: 0; } .act svg { width: 17px; height: 17px; } }
</style>
