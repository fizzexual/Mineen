(function () {
  const $ = Panel.$;
  const Players = (Panel.Players = {});

  Players.load = function () {
    const box = $('players-list');
    const list = Panel.state.players || [];
    const max = Panel.state.maxPlayers ?? 20;
    $('players-head-count').textContent = `(${list.length}/${max})`;
    if (Panel.state.state !== 'online') {
      box.innerHTML = '<div class="empty-line">Server is offline — start it to manage players.</div>';
      return;
    }
    if (!list.length) { box.innerHTML = '<div class="empty-line">No players online.</div>'; return; }
    box.innerHTML = list.map((p) => {
      const e = Panel.esc(p);
      return `<div class="player-row">
        <img class="av-head" src="https://mc-heads.net/avatar/${encodeURIComponent(p)}/40" alt="" loading="lazy"
             onerror="this.src='https://mc-heads.net/avatar/MHF_Steve/40'">
        <span class="p-name">${e}</span>
        <span class="p-online"><span class="status-dot"></span>online</span>
        <div class="p-actions">
          <button class="btn btn-sm" data-act="op" data-p="${e}">OP</button>
          <button class="btn btn-sm" data-act="deop" data-p="${e}">De-OP</button>
          <button class="btn btn-sm" data-act="kick" data-p="${e}">Kick</button>
          <button class="btn btn-sm btn-kill" data-act="ban" data-p="${e}">Ban</button>
        </div></div>`;
    }).join('');
    box.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => action(b.dataset.act, b.dataset.p)));
  };

  async function action(act, player) {
    if ((act === 'kick' || act === 'ban') && !confirm(`${act} ${player}?`)) return;
    try {
      await Panel.api.post(`/api/servers/${Panel.activeId}/players/${act}`, { player });
      Panel.toast(`${act}: ${player}`, 'ok');
    } catch (e) { Panel.toast(e.message, 'err'); }
  }
})();
