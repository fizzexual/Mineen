<script>
  import { get } from 'svelte/store';
  import { activeState, activeId } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  const players = $derived($activeState.players ?? []);
  let name = $state('');
  const hue = (n) => [...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const valid = (p) => /^[A-Za-z0-9_]{1,16}$/.test(p);

  async function act(action, player) {
    const p = String(player ?? '').trim();
    if (!valid(p)) { toast('Enter a valid player name', 'err'); return; }
    try { await api.post(sUrl(get(activeId), '/players/' + action), { player: p }); toast(`${action} → ${p}`, 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }
  async function wl(sub) {
    const p = name.trim();
    if (!valid(p)) { toast('Enter a valid player name', 'err'); return; }
    try { await api.post(sUrl(get(activeId), '/command'), { command: `whitelist ${sub} ${p}` }); toast(`whitelist ${sub} → ${p}`, 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }
</script>

<div class="players-view">
  <section class="card">
    <div class="head"><h3>Online Players <span class="mut">{players.length}/{$activeState.maxPlayers ?? 20}</span></h3></div>
    {#if players.length}
      <ul class="plist">
        {#each players as p (p)}
          <li>
            <span class="av" style="background:hsl({hue(p)} 42% 42%)"></span>
            <span class="pn">{p}</span>
            <span class="acts">
              <button onclick={() => act('op', p)}>Op</button>
              <button onclick={() => act('kick', p)}>Kick</button>
              <button class="danger" onclick={() => act('ban', p)}>Ban</button>
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="muted empty">No players online right now.</p>
    {/if}
  </section>

  <section class="card">
    <div class="head"><h3>Manage by name</h3></div>
    <div class="by-name">
      <input placeholder="Player name" bind:value={name} spellcheck="false" autocomplete="off" />
      <div class="btns">
        <button onclick={() => act('op', name)}>Op</button>
        <button onclick={() => act('deop', name)}>Deop</button>
        <button onclick={() => wl('add')}>Whitelist +</button>
        <button onclick={() => wl('remove')}>Whitelist −</button>
        <button class="danger" onclick={() => act('ban', name)}>Ban</button>
        <button onclick={() => act('pardon', name)}>Pardon</button>
      </div>
    </div>
    <p class="note">Actions run as server console commands — the server must be online.</p>
  </section>
</div>

<style>
  .players-view { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; }
  .head { margin-bottom: 14px; }
  .head h3 { margin: 0; font-size: 15px; font-weight: 650; display: flex; align-items: center; gap: 8px; }
  .mut { color: var(--text-mut); font-weight: 500; font-size: 13px; }
  .plist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .plist li { display: flex; align-items: center; gap: 11px; padding: 9px 0; border-bottom: 1px solid var(--border-soft); }
  .plist li:last-child { border-bottom: 0; }
  .av { width: 28px; height: 28px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.3), inset -6px -6px 0 rgba(0,0,0,.12); flex: 0 0 auto; }
  .pn { flex: 1; font-size: 13.5px; }
  .acts { display: flex; gap: 5px; }
  .acts button { background: var(--surface-3); border: 1px solid var(--border); color: var(--text-dim); border-radius: 6px; padding: 5px 11px; font-size: 12px; }
  .acts button:hover { color: var(--text); }
  .acts button.danger:hover { color: var(--bad); border-color: var(--bad); }
  .by-name { display: flex; flex-direction: column; gap: 12px; }
  .by-name input { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 10px 12px; font-size: 13px; }
  .by-name input:focus { border-color: var(--accent); outline: none; }
  .btns { display: flex; flex-wrap: wrap; gap: 6px; }
  .btns button { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim); border-radius: var(--r-sm); padding: 8px 13px; font-size: 12.5px; }
  .btns button:hover { color: var(--text); }
  .btns button.danger:hover { color: var(--bad); border-color: var(--bad); }
  .muted { color: var(--text-mut); }
  .empty { padding: 20px 0; }
  .note { color: var(--text-mut); font-size: 12px; margin: 14px 0 0; }
  @media (max-width: 900px) { .players-view { grid-template-columns: 1fr; } }
</style>
