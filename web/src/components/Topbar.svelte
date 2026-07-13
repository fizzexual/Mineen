<script>
  import ServerSwitcher from './ServerSwitcher.svelte';
  import PowerControls from './PowerControls.svelte';
  import { activeState } from '../stores/active.js';
  import { openPalette } from '../stores/palette.js';
  import { toast } from '../stores/toast.js';

  let { onadd, onneedsEula } = $props();
  const isMac = navigator.platform.toLowerCase().includes('mac');

  function copyAddress() {
    const a = $activeState.address;
    if (a) navigator.clipboard?.writeText(a).then(() => toast('Address copied', 'ok'));
  }
</script>

<header class="topbar">
  <ServerSwitcher {onadd} />
  <div class="tb-right">
    {#if $activeState.address}
      <button class="addr mono" onclick={copyAddress} title="Copy address">{$activeState.address}</button>
    {/if}
    <button class="cmdk" onclick={openPalette}>{isMac ? '⌘' : 'Ctrl'} K</button>
    <PowerControls {onneedsEula} />
  </div>
</header>

<style>
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; border-bottom: 1px solid var(--border); background: var(--surface-1); }
  .tb-right { display: flex; align-items: center; gap: 12px; }
  .addr { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim); padding: 6px 10px; border-radius: var(--r-sm); font-size: 12.5px; }
  .cmdk { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-mut); padding: 6px 9px; border-radius: var(--r-sm); font-size: 12px; }
</style>
