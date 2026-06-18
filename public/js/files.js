(function () {
  const $ = Panel.$;
  const FOLDER = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#e0c884" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/></svg>`;
  const FILE = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#9aa" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;

  let cwd = '';
  let editingPath = null;

  const Files = (Panel.Files = {});

  Files.open = function () { Files.load(cwd); };

  Files.load = async function (path) {
    try {
      const data = await Panel.api.get(Panel.sUrl('/files?path=' + encodeURIComponent(path)));
      cwd = data.path;
      render(data);
    } catch (e) { Panel.toast(e.message, 'err'); }
  };

  function fmtDate(ms) {
    if (!ms) return '—';
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function renderCrumb() {
    const parts = cwd ? cwd.split('/') : [];
    let acc = '';
    const links = [`<a data-path="">server</a>`];
    for (const p of parts) {
      acc = acc ? acc + '/' + p : p;
      links.push(`<span>/</span><a data-path="${Panel.esc(acc)}">${Panel.esc(p)}</a>`);
    }
    const bc = $('breadcrumb');
    bc.innerHTML = links.join('');
    bc.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => Files.load(a.dataset.path)));
  }

  function render(data) {
    renderCrumb();
    const body = $('files-body');
    if (!data.items.length) {
      body.innerHTML = `<tr><td colspan="4" class="muted" style="padding:18px 10px">This folder is empty.</td></tr>`;
      return;
    }
    body.innerHTML = data.items.map((it) => {
      const full = (cwd ? cwd + '/' : '') + it.name;
      const fp = Panel.esc(full);
      const icon = it.dir ? FOLDER : FILE;
      const actions = [];
      if (it.editable) actions.push(`<button class="icon-btn" data-act="edit" data-p="${fp}" title="Edit">✎</button>`);
      if (!it.dir) actions.push(`<a class="icon-btn" href="${Panel.sUrl('/files/download?path=' + encodeURIComponent(full))}" title="Download">⤓</a>`);
      actions.push(`<button class="icon-btn" data-act="rename" data-p="${fp}" data-n="${Panel.esc(it.name)}" title="Rename">⤷</button>`);
      actions.push(`<button class="icon-btn" data-act="delete" data-p="${fp}" data-n="${Panel.esc(it.name)}" title="Delete">🗑</button>`);
      return `<tr>
        <td><span class="fname ${it.dir ? 'dir' : ''}" data-dir="${it.dir}" data-p="${fp}">${icon}${Panel.esc(it.name)}</span></td>
        <td class="col-size">${it.dir ? '' : Panel.fmtBytes(it.size)}</td>
        <td class="col-modified">${fmtDate(it.mtime)}</td>
        <td class="col-actions"><div class="row-actions">${actions.join('')}</div></td>
      </tr>`;
    }).join('');

    body.querySelectorAll('.fname').forEach((el) => el.addEventListener('click', () => {
      if (el.dataset.dir === 'true') Files.load(el.dataset.p);
      else if (data.items.find((i) => (cwd ? cwd + '/' : '') + i.name === el.dataset.p)?.editable) openEditor(el.dataset.p);
    }));
    body.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => action(b.dataset.act, b.dataset.p, b.dataset.n)));
  }

  async function action(act, path, name) {
    try {
      if (act === 'edit') return openEditor(path);
      if (act === 'rename') {
        const nn = prompt('Rename to:', name);
        if (nn && nn !== name) { await Panel.api.post(Panel.sUrl('/files/rename'), { path, newName: nn }); Files.load(cwd); }
      }
      if (act === 'delete') {
        if (confirm(`Delete "${name}"? This cannot be undone.`)) {
          await Panel.api.del(Panel.sUrl('/files?path=' + encodeURIComponent(path)));
          Files.load(cwd);
        }
      }
    } catch (e) { Panel.toast(e.message, 'err'); }
  }

  async function openEditor(path) {
    try {
      const { content } = await Panel.api.get(Panel.sUrl('/files/content?path=' + encodeURIComponent(path)));
      editingPath = path;
      $('editor-title').textContent = path;
      $('editor-text').value = content;
      $('editor-modal').hidden = false;
    } catch (e) { Panel.toast(e.message, 'err'); }
  }

  function goUp() {
    if (!cwd) return;
    const parts = cwd.split('/');
    parts.pop();
    Files.load(parts.join('/'));
  }

  function init() {
    $('file-up').addEventListener('click', goUp);
    $('file-refresh').addEventListener('click', () => Files.load(cwd));
    $('file-newfolder').addEventListener('click', async () => {
      const name = prompt('New folder name:');
      if (!name) return;
      try { await Panel.api.post(Panel.sUrl('/files/mkdir'), { path: (cwd ? cwd + '/' : '') + name }); Files.load(cwd); }
      catch (e) { Panel.toast(e.message, 'err'); }
    });
    $('file-upload').addEventListener('change', async (e) => {
      const fd = new FormData();
      for (const f of e.target.files) fd.append('files', f);
      try {
        const res = await fetch(Panel.sUrl('/files/upload?path=' + encodeURIComponent(cwd)), { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        Panel.toast('Uploaded', 'ok');
        Files.load(cwd);
      } catch (err) { Panel.toast(err.message, 'err'); }
      e.target.value = '';
    });
    $('editor-save').addEventListener('click', async () => {
      try {
        await Panel.api.post(Panel.sUrl('/files/content'), { path: editingPath, content: $('editor-text').value });
        $('editor-modal').hidden = true;
        Panel.toast('Saved', 'ok');
        Files.load(cwd);
      } catch (e) { Panel.toast(e.message, 'err'); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
