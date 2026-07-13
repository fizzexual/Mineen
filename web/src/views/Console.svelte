<script>
  import { logLines } from '../stores/consoleLog.js';
  import { classify } from '../lib/console.js';
  import { activeId } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let filter = $state('');
  let command = $state('');
  let atBottom = $state(true);
  let box = $state(null);

  const rows = $derived(
    $logLines
      .map((line) => ({ line, ...classify(line) }))
      .filter((r) => !filter || r.line.toLowerCase().includes(filter.toLowerCase()))
  );

  $effect(() => {
    // re-run when rows change; stick to bottom if we were at the bottom
    rows.length;
    if (atBottom && box) box.scrollTop = box.scrollHeight;
  });

  function onScroll() {
    if (!box) return;
    atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  }

  async function submit(e) {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;
    try { await api.post(sUrl($activeId, '/command'), { command: cmd }); command = ''; }
    catch (err) { toast(err.message, 'err'); }
  }
</script>

<section class="console-view">
  <div class="console-tools">
    <input class="filter" placeholder="Filter log…" bind:value={filter} />
  </div>
  <div class="console" bind:this={box} onscroll={onScroll}>
    {#each rows as r}
      <div class="line {r.kind} {r.level}">
        {#if r.time}<span class="time mono">{r.time}</span>{/if}
        {#if r.kind === 'log'}<span class="lvl {r.level}">{r.level}</span>{/if}
        <span class="msg">{r.msg}</span>
      </div>
    {/each}
  </div>
  <form class="cmd" onsubmit={submit}>
    <input class="mono" placeholder="Type a server command…" bind:value={command} spellcheck="false" autocomplete="off" />
    <button type="submit">Send</button>
  </form>
</section>

<style>
  .console-view { display: flex; flex-direction: column; height: 100%; gap: 10px; }
  .console-tools { display: flex; }
  .filter { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 7px 10px; width: 240px; }
  .console { flex: 1; overflow-y: auto; background: #05060a; border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px; font-family: var(--mono); font-size: 12.5px; line-height: 1.55; }
  .line { display: flex; gap: 8px; white-space: pre-wrap; word-break: break-word; }
  .line.panel .msg { color: var(--accent); }
  .line.command .msg { color: var(--info); }
  .line.warn .msg { color: var(--warn); }
  .line.error .msg { color: var(--bad); }
  .time { color: var(--text-mut); }
  .lvl { text-transform: uppercase; font-size: 10px; padding: 0 5px; border-radius: 4px; align-self: center; }
  .lvl.info { color: var(--text-mut); }
  .lvl.warn { color: var(--warn); }
  .lvl.error { color: var(--bad); }
  .cmd { display: flex; gap: 8px; }
  .cmd input { flex: 1; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 9px 12px; }
  .cmd button { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 0 16px; font-weight: 600; }
</style>
