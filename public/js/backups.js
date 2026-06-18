(function () {
  const $ = Panel.$;
  const Backups = (Panel.Backups = {});

  Backups.load = async function () {
    const box = $('backups-list');
    box.innerHTML = '<div class="empty-line">Loading…</div>';
    try {
      const { backups } = await Panel.api.get(`/api/servers/${Panel.activeId}/backups`);
      if (!backups.length) { box.innerHTML = '<div class="empty-line">No backups yet. Click “Create backup”.</div>'; return; }
      box.innerHTML = backups.map((b) => {
        const n = Panel.esc(b.name);
        return `<div class="backup-row">
          <span class="b-name">${n}</span>
          <span class="b-meta">${Panel.fmtBytes(b.size)} · ${new Date(b.mtime).toLocaleString()}</span>
          <div class="b-actions">
            <a class="btn btn-sm" href="/api/servers/${Panel.activeId}/backups/download?name=${encodeURIComponent(b.name)}">Download</a>
            <button class="btn btn-sm" data-act="restore" data-n="${n}">Restore</button>
            <button class="btn btn-sm btn-kill" data-act="delete" data-n="${n}">Delete</button>
          </div></div>`;
      }).join('');
      box.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => action(b.dataset.act, b.dataset.n)));
    } catch (e) { box.innerHTML = `<div class="empty-line">${Panel.esc(e.message)}</div>`; }
  };

  async function create() {
    const btn = $('backup-create');
    btn.disabled = true; btn.textContent = 'Creating…';
    try { await Panel.api.post(`/api/servers/${Panel.activeId}/backups`, {}); Panel.toast('Backup created', 'ok'); Backups.load(); }
    catch (e) { Panel.toast(e.message, 'err'); }
    finally { btn.disabled = false; btn.textContent = '＋ Create backup'; }
  }

  async function action(act, name) {
    if (act === 'restore') {
      if (Panel.state.state !== 'offline') return Panel.toast('Stop the server before restoring', 'err');
      if (!confirm(`Restore "${name}"? This overwrites the current server files.`)) return;
      try { await Panel.api.post(`/api/servers/${Panel.activeId}/backups/restore`, { name }); Panel.toast('Backup restored', 'ok'); }
      catch (e) { Panel.toast(e.message, 'err'); }
    } else if (act === 'delete') {
      if (!confirm(`Delete "${name}"?`)) return;
      try { await Panel.api.del(`/api/servers/${Panel.activeId}/backups?name=${encodeURIComponent(name)}`); Backups.load(); }
      catch (e) { Panel.toast(e.message, 'err'); }
    }
  }

  document.addEventListener('DOMContentLoaded', () => $('backup-create').addEventListener('click', create));
})();
