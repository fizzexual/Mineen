<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Sidebar from './components/Sidebar.svelte';
  import Topbar from './components/Topbar.svelte';
  import Toast from './components/Toast.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import AddServerModal from './components/AddServerModal.svelte';
  import EulaModal from './components/EulaModal.svelte';
  import EmptyState from './views/EmptyState.svelte';
  import Console from './views/Console.svelte';
  import Dashboard from './views/Dashboard.svelte';

  import { createSocket } from './lib/ws.js';
  import { api, sUrl } from './lib/api.js';
  import { servers, reduceServers } from './stores/servers.js';
  import { activeId, activeState, ensureActive } from './stores/active.js';
  import { pushStats, seedTelemetry, resetTelemetry } from './stores/telemetry.js';
  import { setLog, appendLog } from './stores/consoleLog.js';
  import { toast } from './stores/toast.js';
  import { openPalette, closePalette, setCommands } from './stores/palette.js';

  let view = $state('console');
  let socket;
  let addOpen = $state(false);
  let eulaOpen = $state(false);
  let installProgress = $state(null);

  const views = { console: Console, dashboard: Dashboard };
  const Current = $derived(views[view] ?? Console);

  // Re-select on the socket whenever the active server changes.
  let lastSelected = null;
  $effect(() => {
    const id = $activeId;
    if (id && id !== lastSelected) {
      lastSelected = id;
      resetTelemetry();
      socket?.send({ type: 'select', serverId: id });
      loadActive(id);
    }
  });

  async function loadActive(id) {
    try {
      const [a, b] = await Promise.all([api.get(sUrl(id, '/state')), api.get(sUrl(id, '/logs'))]);
      activeState.set(a.state);
      setLog(b.lines);
    } catch (e) { toast(e.message, 'err'); }
  }

  function dispatch(msg) {
    switch (msg.type) {
      case 'servers':
        servers.set(reduceServers(msg.servers));
        ensureActive();
        break;
      case 'history':
        if (msg.serverId === get(activeId)) { setLog(msg.lines); seedTelemetry(msg.telemetry); }
        break;
      case 'log':
        if (msg.serverId === get(activeId)) appendLog(msg.line);
        break;
      case 'state':
        if (msg.serverId === get(activeId)) activeState.set(msg.state);
        break;
      case 'players':
        if (msg.serverId === get(activeId)) activeState.update((s) => ({ ...s, players: msg.players, playerCount: msg.playerCount }));
        break;
      case 'stats':
        if (msg.serverId === get(activeId)) pushStats(msg);
        break;
      case 'install':
        handleInstall(msg);
        break;
    }
  }

  function handleInstall(msg) {
    if (msg.phase === 'downloading') installProgress = { percent: msg.percent, label: `Downloading… ${msg.percent}%` };
    else if (msg.phase === 'done') installProgress = { percent: 100, label: 'Installed!' };
    else if (msg.phase === 'error') { installProgress = null; toast(msg.message || 'Install failed', 'err'); }
  }

  function onCreated(id, mode) {
    addOpen = false;
    installProgress = null;
    activeId.set(id);
    if (mode === 'download') eulaOpen = true;
    else toast('Server added', 'ok');
  }

  async function acceptEula() {
    try { await api.post(sUrl(get(activeId), '/eula'), { accept: true }); eulaOpen = false; toast('EULA accepted — you can start now', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }

  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  }

  // Command palette registry (rebuilds when the view/servers change).
  $effect(() => {
    setCommands([
      { id: 'nav-dashboard', label: 'Go to Dashboard', group: 'Navigate', run: () => (view = 'dashboard') },
      { id: 'nav-console', label: 'Go to Console', group: 'Navigate', run: () => (view = 'console') },
      { id: 'add', label: 'Add a server', group: 'Server', run: () => (addOpen = true) }
    ]);
  });

  onMount(() => {
    socket = createSocket(dispatch, () => { const id = get(activeId); if (id) socket.send({ type: 'select', serverId: id }); });
    api.get('/api/servers').then((d) => { servers.set(reduceServers(d.servers)); ensureActive(); }).catch(() => {});
    return () => socket?.close();
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="shell">
  <Sidebar {view} onnavigate={(v) => (view = v)} />
  <div class="main">
    <Topbar onadd={() => (addOpen = true)} onneedsEula={() => (eulaOpen = true)} />
    <div class="content">
      {#if $servers.length === 0}
        <EmptyState onadd={() => (addOpen = true)} />
      {:else}
        <Current onneedsEula={() => (eulaOpen = true)} />
      {/if}
    </div>
  </div>
</div>

<AddServerModal open={addOpen} {installProgress} oncreated={onCreated} onclose={() => (addOpen = false)} />
<EulaModal open={eulaOpen} onaccept={acceptEula} onclose={() => (eulaOpen = false)} />
<CommandPalette />
<Toast />

<style>
  .shell { display: flex; height: 100vh; }
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .content { flex: 1; overflow-y: auto; padding: 22px; }
</style>
