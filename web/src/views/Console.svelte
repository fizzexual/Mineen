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
  const errorCount = $derived($logLines.reduce((a, l) => a + (classify(l).level === 'error' ? 1 : 0), 0));

  $effect(() => { rows.length; if (atBottom && box) box.scrollTop = box.scrollHeight; });
  function onScroll() { if (!box) return; atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40; }

  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([$logLines.join('\n')], { type: 'text/plain' }));
    a.download = 'console.log'; a.click(); URL.revokeObjectURL(a.href);
  }
  async function submit(e) {
    e.preventDefault();
    const cmd = command.trim(); if (!cmd) return;
    try { await api.post(sUrl($activeId, '/command'), { command: cmd }); command = ''; }
    catch (err) { toast(err.message, 'err'); }
  }
</script>

<section class="card console-view">
  <div class="head">
    <h3>Console {#if errorCount}<span class="err-badge">{errorCount} errors</span>{/if}</h3>
    <div class="tools">
      <input class="filter" placeholder="Filter…" bind:value={filter} />
      <button class="tbtn" onclick={download} title="Download log">Download</button>
    </div>
  </div>
  <div class="term" bind:this={box} onscroll={onScroll}>
    {#each rows as r}
      <div class="ln {r.kind} {r.level}">
        {#if r.time}<span class="tm">{r.time}</span>{/if}
        {#if r.kind === 'log'}<span class="lv {r.level}">{r.level}</span>{/if}
        <span class="msg">{r.msg}</span>
      </div>
    {:else}
      <div class="ln muted">No console output yet — start the server to see live logs.</div>
    {/each}
  </div>
  <form class="cmd" onsubmit={submit}>
    <input class="mono" placeholder="Enter a command…" bind:value={command} spellcheck="false" autocomplete="off" />
    <button type="submit">Send</button>
  </form>
</section>

<style>
  .console-view { display: flex; flex-direction: column; height: calc(100vh - 236px); min-height: 420px; padding: 18px; }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; }
  .head h3 { margin: 0; font-size: 15px; font-weight: 650; display: flex; align-items: center; gap: 9px; }
  .err-badge { font-size: 11px; font-weight: 600; color: var(--bad); background: var(--bad-weak); border-radius: 20px; padding: 2px 9px; }
  .tools { display: flex; gap: 8px; }
  .filter { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 7px 11px; width: 200px; font-size: 12.5px; }
  .filter:focus { border-color: var(--accent); outline: none; }
  .tbtn { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim); border-radius: var(--r-sm); padding: 7px 12px; font-size: 12.5px; }
  .tbtn:hover { color: var(--text); }
  .term { flex: 1; overflow: auto; background: #0d0f14; border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px 14px; font-family: var(--mono); font-size: 12.5px; line-height: 1.7; }
  .ln { display: flex; gap: 9px; white-space: pre-wrap; word-break: break-word; color: var(--text-dim); }
  .ln .msg { flex: 1; }
  .ln.panel .msg { color: var(--accent); }
  .ln.command .msg { color: var(--info); }
  .ln.warn .msg { color: var(--warn); }
  .ln.error { color: var(--bad); background: var(--bad-weak); margin: 0 -14px; padding: 0 14px; }
  .ln.error .msg { color: var(--bad); }
  .ln.muted { color: var(--text-mut); }
  .tm { color: var(--text-mut); }
  .lv { text-transform: uppercase; font-size: 9.5px; padding: 1px 5px; border-radius: 4px; align-self: center; background: rgba(255, 255, 255, 0.05); }
  .lv.info { color: var(--text-mut); }
  .lv.warn { color: var(--warn); background: rgba(240, 178, 62, 0.12); }
  .lv.error { color: var(--bad); background: var(--bad-weak); }
  .cmd { display: flex; gap: 8px; margin-top: 12px; }
  .cmd input { flex: 1; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 11px 14px; font-size: 12.5px; }
  .cmd input:focus { border-color: var(--accent); outline: none; }
  .cmd button { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 0 20px; font-weight: 600; }
  .cmd button:hover { background: var(--accent-hover); }
</style>
