(function () {
  const $ = Panel.$;
  const Players = (Panel.Players = {});

  Players.load = function () {
    const box = $('players-list');
    const list = Panel.state.players || [];
    $('players-head-count').textContent = `(${list.length}/${Panel.state.maxPlayers || 20})`;
    if (Panel.state.state !== 'online') {
      box.innerHTML = '<div class="empty-line">Server is offline — start it to manage players.</div>';
      return;
    }
    if (!list.length) { box.innerHTML = '<div class="empty-line">No players online.</div>'; return; }
    box.innerHTML = list.map((p) => {
      const e = Panel.esc(p);
      return `<div class="player-row"><span class="av"></span><span class="p-name">${e}</span>
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
