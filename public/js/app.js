(function () {
  const $ = Panel.$;
  Panel.activeId = null;
  Panel.servers = [];
  Panel.state = {};
  let autoScroll = true;
  let versionsLoaded = false;
  let addOpen = false;

  const consoleEl = () => $('console');
  const sUrl = (suffix) => `/api/servers/${Panel.activeId}${suffix}`;

  // ---- Console ------------------------------------------------------------
  function classify(line) {
    if (line.startsWith('[panel]')) return 'panel';
    if (line.startsWith('> ')) return 'cmd';
    if (/\/ERROR\]|ERROR|Exception|SEVERE/.test(line)) return 'error';
    if (/\/WARN\]|WARN/.test(line)) return 'warn';
    return '';
  }
  function appendLog(line) {
    const c = consoleEl();
    const div = document.createElement('div');
    div.className = 'console-line ' + classify(line);
    div.textContent = line;
    c.appendChild(div);
    while (c.childNodes.length > 800) c.removeChild(c.firstChild);
    if (autoScroll) c.scrollTop = c.scrollHeight;
  }
  function trackScroll() {
    const c = consoleEl();
    c.addEventListener('scroll', () => { autoScroll = c.scrollHeight - c.scrollTop - c.clientHeight < 40; });
  }

  // ---- Status helpers -----------------------------------------------------
  function setPill(pillEl, textEl, state) {
    const map = { online: ['Online', ''], offline: ['Offline', 'is-offline'], starting: ['Starting…', 'is-busy'], stopping: ['Stopping…', 'is-busy'] };
    const [label, cls] = map[state] || map.offline;
    pillEl.className = 'status-pill' + (pillEl.classList.contains('sm') ? ' sm' : '') + (cls ? ' ' + cls : '');
    textEl.textContent = label;
  }
  function setPower(state, installed) {
    const start = $('btn-start'), stop = $('btn-stop'), restart = $('btn-restart');
    const show = (el, on) => { el.style.display = on ? '' : 'none'; };
    if (!installed) { show(start, false); show(stop, false); show(restart, false); return; }
    if (state === 'offline') { show(start, true); show(stop, false); show(restart, false); start.disabled = false; }
    else if (state === 'starting') { show(start, false); show(stop, true); show(restart, true); stop.disabled = false; restart.disabled = true; }
    else if (state === 'online') { show(start, false); show(stop, true); show(restart, true); stop.disabled = false; restart.disabled = false; }
    else { show(start, false); show(stop, true); show(restart, true); stop.disabled = true; restart.disabled = true; }
  }

  // ---- Sidebar ------------------------------------------------------------
  function renderServers(list) {
    Panel.servers = list;
    const wrap = $('server-list');
    if (!list.length) {
      wrap.innerHTML = '';
      $('panel').hidden = true;
      $('empty-state').hidden = false;
      Panel.activeId = null;
      return;
    }
    $('empty-state').hidden = true;
    wrap.innerHTML = list.map((s) => {
      const cls = s.state === 'online' ? 'online' : (s.state === 'starting' || s.state === 'stopping' ? 'busy' : '');
      const sub = s.state === 'online' ? `${s.playerCount} online` : (s.state === 'offline' ? s.versionLabel : s.state);
      return `<div class="server-item ${cls} ${s.id === Panel.activeId ? 'active' : ''}" data-id="${s.id}">
        <span class="s-dot"></span>
        <div class="s-meta"><div class="s-name">${Panel.esc(s.name)}</div><div class="s-sub">${Panel.esc(sub)}</div></div>
      </div>`;
    }).join('');
    wrap.querySelectorAll('.server-item').forEach((el) => el.addEventListener('click', () => setActive(el.dataset.id)));
    if (!Panel.activeId || !list.find((s) => s.id === Panel.activeId)) setActive(list[0].id);
    else $('panel').hidden = false;
  }

  async function setActive(id) {
    Panel.activeId = id;
    document.querySelectorAll('.server-item').forEach((el) => el.classList.toggle('active', el.dataset.id === id));
    $('panel').hidden = false;
    $('empty-state').hidden = true;
    switchView('overview');
    try { if (Panel.ws?.readyState === 1) Panel.ws.send(JSON.stringify({ type: 'select', serverId: id })); } catch { /* ignore */ }
    try {
      const [a, b] = await Promise.all([Panel.api.get(sUrl('/state')), Panel.api.get(sUrl('/logs'))]);
      renderState(a.state);
      consoleEl().innerHTML = '';
      b.lines.forEach(appendLog);
    } catch (e) { Panel.toast(e.message, 'err'); }
  }

  // ---- Rendering ----------------------------------------------------------
  function updateSummary() {
    $('players-summary').textContent = `${Panel.state.playerCount}/${Panel.state.maxPlayers} players`;
    $('ov-players').textContent = `${Panel.state.playerCount}/${Panel.state.maxPlayers}`;
  }
  function renderState(s) {
    Panel.state = s;
    $('server-name').textContent = s.name;
    $('address-text').textContent = s.address;
    $('version-text').textContent = s.versionLabel;
    setPill($('status-pill'), $('status-text'), s.state);
    $('ov-version').textContent = s.versionLabel;
    $('ov-address').textContent = s.address;
    setPill($('ov-status'), $('ov-status-text'), s.state);
    updateSummary();
    updateUptime();
    setPower(s.state, s.installed);
    renderPlayers(s.players || []);
  }
  function renderPlayers(players) {
    const box = $('players-box');
    box.innerHTML = players.length
      ? players.map((p) => `<span class="player-tag"><span class="av"></span>${Panel.esc(p)}</span>`).join('')
      : '<span class="muted">No players online.</span>';
  }
  function updateUptime() {
    const s = Panel.state;
    $('ov-uptime').textContent = (s.state !== 'offline' && s.startedAt) ? Panel.fmtUptime(Date.now() - s.startedAt) : '—';
  }
  function renderStats(d) {
    $('cpu-val').textContent = `${d.cpu}%`;
    $('cpu-bar').style.width = `${Math.min(100, d.cpu)}%`;
    $('mem-val').textContent = `${d.memUsedMB} / ${d.memMaxMB} MB`;
    $('mem-bar').style.width = `${Math.min(100, (d.memUsedMB / d.memMaxMB) * 100 || 0)}%`;
    $('storage-val').textContent = d.storageMB >= 1024 ? `${(d.storageMB / 1024).toFixed(2)} GB` : `${d.storageMB} MB`;
  }

  // ---- WebSocket ----------------------------------------------------------
  function handleWS(msg) {
    switch (msg.type) {
      case 'servers': renderServers(msg.servers); break;
      case 'history': if (msg.serverId === Panel.activeId) { consoleEl().innerHTML = ''; msg.lines.forEach(appendLog); } break;
      case 'log': if (msg.serverId === Panel.activeId) appendLog(msg.line); break;
      case 'state': if (msg.serverId === Panel.activeId) renderState(msg.state); break;
      case 'players':
        if (msg.serverId === Panel.activeId) { Panel.state.players = msg.players; Panel.state.playerCount = msg.playerCount; renderPlayers(msg.players); updateSummary(); }
        break;
      case 'stats': if (msg.serverId === Panel.activeId) renderStats(msg); break;
      case 'install': handleInstall(msg); break;
    }
  }

  // ---- Power & commands ---------------------------------------------------
  async function power(action) {
    try {
      if (action === 'start' && Panel.state.installed && !Panel.state.eulaAccepted) { openEula(); return; }
      await Panel.api.post(sUrl('/power'), { action });
    } catch (e) { Panel.toast(e.message, 'err'); }
  }

  // ---- Add server ---------------------------------------------------------
  function openAdd() {
    addOpen = true;
    $('add-name').value = '';
    $('existing-path').value = '';
    Panel._existingIsServer = false;
    setExistingHint('', false);
    $('add-progress').hidden = true;
    $('add-create').disabled = false;
    setMode('download');
    $('add-modal').hidden = false;
    if (!versionsLoaded) loadVersions();
  }
  function closeAdd() { addOpen = false; $('add-modal').hidden = true; }

  function setMode(mode) {
    document.querySelectorAll('#add-mode .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    $('mode-download').hidden = mode !== 'download';
    $('mode-existing').hidden = mode !== 'existing';
    Panel.addMode = mode;
    updateCreateBtn();
  }
  function updateCreateBtn() {
    if (Panel.addMode === 'existing') $('add-create').disabled = !($('existing-path').value.trim() && Panel._existingIsServer);
    else $('add-create').disabled = false;
  }

  async function loadVersions() {
    const sel = $('version-select');
    try {
      const { versions } = await Panel.api.get('/api/versions');
      sel.innerHTML = versions.map((v) => `<option value="${v}">${v}</option>`).join('');
      versionsLoaded = true;
    } catch (e) { sel.innerHTML = '<option>Failed to load</option>'; Panel.toast('Paper API error: ' + e.message, 'err'); }
  }

  // Native folder picker (opens a real OS dialog via the backend)
  async function pickFolder() {
    const btn = $('browse-native');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Opening…';
    try {
      const r = await Panel.api.post('/api/pick-folder', {});
      if (r.cancelled || !r.path) return;
      $('existing-path').value = r.path;
      setExistingHint(r.path, r.isServer, r.jar);
      updateCreateBtn();
    } catch (e) {
      Panel.toast(e.message || 'Could not open the folder picker — type or paste the path instead.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }
  let validateTimer;
  function onExistingInput() {
    clearTimeout(validateTimer);
    validateTimer = setTimeout(validateExisting, 350);
    updateCreateBtn();
  }
  async function validateExisting() {
    const p = $('existing-path').value.trim();
    if (!p) return setExistingHint('', false);
    try { const d = await Panel.api.get('/api/browse?path=' + encodeURIComponent(p)); setExistingHint(p, d.isServer, d.jar); }
    catch { setExistingHint(p, false); }
    updateCreateBtn();
  }
  function setExistingHint(pathStr, isServer, jar) {
    const h = $('existing-hint');
    Panel._existingIsServer = !!isServer;
    if (!pathStr) { h.className = 'browser-hint bad'; h.textContent = 'Click “Browse…” to choose your server folder, or paste its path above.'; }
    else if (isServer) { h.className = 'browser-hint good'; h.textContent = `✓ Minecraft server detected${jar ? ' (' + jar + ')' : ''}.`; }
    else { h.className = 'browser-hint bad'; h.textContent = 'No server jar / server.properties found in that folder.'; }
  }

  function handleInstall(msg) {
    if (!addOpen) return;
    if (msg.phase === 'downloading') { $('add-progress').hidden = false; $('add-fill').style.width = msg.percent + '%'; $('add-label').textContent = `Downloading… ${msg.percent}%`; }
    else if (msg.phase === 'done') { $('add-fill').style.width = '100%'; $('add-label').textContent = 'Installed!'; }
    else if (msg.phase === 'error') { $('add-progress').hidden = true; }
  }

  async function createServer() {
    const name = $('add-name').value.trim();
    if (Panel.addMode === 'existing') {
      const folder = $('existing-path').value.trim();
      if (!folder) return Panel.toast('Pick a folder first', 'err');
      try {
        const { id } = await Panel.api.post('/api/servers', { mode: 'existing', name, path: folder });
        closeAdd();
        await setActive(id);
        Panel.toast('Server added', 'ok');
      } catch (e) { Panel.toast(e.message, 'err'); }
    } else {
      const version = $('version-select').value;
      $('add-create').disabled = true;
      $('add-progress').hidden = false;
      $('add-label').textContent = 'Starting download…';
      try {
        const { id } = await Panel.api.post('/api/servers', { mode: 'download', name, version });
        closeAdd();
        await setActive(id);
        openEula();
      } catch (e) { Panel.toast(e.message, 'err'); $('add-create').disabled = false; }
    }
  }

  // ---- EULA ---------------------------------------------------------------
  function openEula() {
    if (Panel.state.eulaAccepted) return;
    $('eula-modal').hidden = false;
    $('eula-check').checked = false;
    $('eula-accept').disabled = true;
  }

  // ---- Settings -----------------------------------------------------------
  async function openSettings() {
    try {
      const { settings } = await Panel.api.get(sUrl('/settings'));
      $('set-name').value = settings.name;
      $('set-maxmem').value = settings.memoryMB;
      $('set-minmem').value = settings.minMemoryMB;
      $('settings-modal').hidden = false;
    } catch (e) { Panel.toast(e.message, 'err'); }
  }
  async function saveSettings() {
    try {
      await Panel.api.post(sUrl('/settings'), { name: $('set-name').value, memoryMB: Number($('set-maxmem').value), minMemoryMB: Number($('set-minmem').value) });
      $('settings-modal').hidden = true;
      Panel.toast('Saved', 'ok');
    } catch (e) { Panel.toast(e.message, 'err'); }
  }
  async function removeServer() {
    if (!confirm(`Remove "${Panel.state.name}" from the panel? Its files on disk will be kept.`)) return;
    try {
      const id = Panel.activeId;
      Panel.activeId = null;
      await Panel.api.del(`/api/servers/${id}`);
      $('settings-modal').hidden = true;
      Panel.toast('Server removed', 'ok');
    } catch (e) { Panel.toast(e.message, 'err'); }
  }

  // ---- Tabs ---------------------------------------------------------------
  function switchView(view) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== `view-${view}`));
    if (view === 'files') Panel.Files.open();
    if (view === 'properties') Panel.Props.load();
  }

  // ---- Wire up ------------------------------------------------------------
  function init() {
    trackScroll();
    Panel.connectWS(handleWS);

    $('btn-start').addEventListener('click', () => power('start'));
    $('btn-stop').addEventListener('click', () => power('stop'));
    $('btn-restart').addEventListener('click', () => power('restart'));
    $('btn-menu').addEventListener('click', openSettings);

    $('command-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('command-input');
      const cmd = input.value.trim();
      if (!cmd) return;
      try { await Panel.api.post(sUrl('/command'), { command: cmd }); input.value = ''; }
      catch (err) { Panel.toast(err.message, 'err'); }
    });
    $('console-clear').addEventListener('click', () => (consoleEl().innerHTML = ''));
    $('copy-address').addEventListener('click', () => navigator.clipboard?.writeText(Panel.state.address).then(() => Panel.toast('Address copied', 'ok')));

    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));

    // Add-server modal
    $('btn-add-server').addEventListener('click', openAdd);
    $('btn-add-first').addEventListener('click', openAdd);
    $('add-close').addEventListener('click', closeAdd);
    $('add-cancel').addEventListener('click', closeAdd);
    $('add-create').addEventListener('click', createServer);
    document.querySelectorAll('#add-mode .seg-btn').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('browse-native').addEventListener('click', pickFolder);
    $('existing-path').addEventListener('input', onExistingInput);

    // EULA
    $('eula-check').addEventListener('change', (e) => ($('eula-accept').disabled = !e.target.checked));
    $('eula-accept').addEventListener('click', async () => {
      try { await Panel.api.post(sUrl('/eula'), { accept: true }); $('eula-modal').hidden = true; Panel.toast('EULA accepted — you can start now', 'ok'); }
      catch (e) { Panel.toast(e.message, 'err'); }
    });

    // Settings + editor modals
    $('settings-close').addEventListener('click', () => ($('settings-modal').hidden = true));
    $('settings-cancel').addEventListener('click', () => ($('settings-modal').hidden = true));
    $('settings-save').addEventListener('click', saveSettings);
    $('settings-remove').addEventListener('click', removeServer);
    $('editor-close').addEventListener('click', () => ($('editor-modal').hidden = true));
    $('editor-cancel').addEventListener('click', () => ($('editor-modal').hidden = true));

    setInterval(updateUptime, 1000);

    // Initial paint
    Panel.api.get('/api/servers').then((d) => renderServers(d.servers)).catch(() => {});
  }

  Panel.switchView = switchView;
  document.addEventListener('DOMContentLoaded', init);
})();
