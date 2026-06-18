(function () {
  const $ = Panel.$;
  Panel.activeId = null;
  Panel.servers = [];
  Panel.state = {};
  Panel.tel = { cpu: [], mem: [], memMax: 6144 };
  let autoScroll = true;
  let versionsLoaded = false;
  let addOpen = false;
  Panel.consoleFilter = '';

  const consoleEl = () => $('console');
  const sUrl = (s) => `/api/servers/${Panel.activeId}${s}`;

  // ---- Console ------------------------------------------------------------
  function parseLine(line) {
    let m = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*\[[^\]]*\/(INFO|WARN|WARNING|ERROR|SEVERE|DEBUG|TRACE)\]:?\s?(.*)$/);
    if (!m) m = line.match(/^\[(\d{2}:\d{2}:\d{2})\s+(INFO|WARN|WARNING|ERROR|SEVERE|DEBUG|TRACE)\]:?\s?(.*)$/);
    return m ? { time: m[1], level: m[2], msg: m[3] } : null;
  }
  function applyFilter(div) {
    if (!Panel.consoleFilter) { div.classList.remove('hide'); return; }
    div.classList.toggle('hide', !div.textContent.toLowerCase().includes(Panel.consoleFilter));
  }
  function appendLog(line) {
    const c = consoleEl();
    const div = document.createElement('div');
    div.className = 'log-line';
    const span = (cls, txt) => { const s = document.createElement('span'); s.className = cls; s.textContent = txt; return s; };
    if (line.startsWith('[panel]')) { div.classList.add('panel'); div.append(span('log-msg', line)); }
    else if (line.startsWith('> ')) { div.classList.add('cmd'); div.append(span('log-msg', line)); }
    else {
      const p = parseLine(line);
      if (p) {
        const lvl = /WARN/.test(p.level) ? 'warn' : (/ERROR|SEVERE/.test(p.level) ? 'error' : 'info');
        div.classList.add(lvl);
        div.append(span('lvl lvl-' + lvl, lvl.toUpperCase()), span('log-time', p.time), span('log-msg', p.msg));
      } else div.append(span('log-msg', line));
    }
    applyFilter(div);
    c.appendChild(div);
    while (c.childNodes.length > 1000) c.removeChild(c.firstChild);
    if (autoScroll) c.scrollTop = c.scrollHeight;
  }
  function trackScroll() {
    const c = consoleEl();
    c.addEventListener('scroll', () => { autoScroll = c.scrollHeight - c.scrollTop - c.clientHeight < 40; });
  }

  // ---- Sparklines ---------------------------------------------------------
  function drawSpark(lineId, areaId, data, max) {
    const line = $(lineId), area = $(areaId);
    if (!data || data.length < 2) { line.setAttribute('points', ''); area.setAttribute('points', ''); return; }
    const W = 120, H = 36;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - Math.max(0, Math.min(1, v / (max || 1))) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    line.setAttribute('points', pts.join(' '));
    area.setAttribute('points', `0,${H} ${pts.join(' ')} ${W},${H}`);
  }
  function redrawSparks() {
    drawSpark('cpu-line', 'cpu-area', Panel.tel.cpu, 100);
    drawSpark('mem-line', 'mem-area', Panel.tel.mem, Panel.tel.memMax);
  }

  // ---- Status helpers -----------------------------------------------------
  function setPill(pillEl, textEl, state) {
    const map = { online: ['Online', ''], offline: ['Offline', 'is-offline'], starting: ['Starting…', 'is-busy'], stopping: ['Stopping…', 'is-busy'] };
    const [label, cls] = map[state] || map.offline;
    pillEl.className = 'status-pill' + (cls ? ' ' + cls : '');
    textEl.textContent = label;
  }
  function setPower(state, installed) {
    const can = { start: false, stop: false, restart: false, kill: false };
    if (installed) {
      if (state === 'offline') can.start = true;
      else if (state === 'online') { can.stop = can.restart = can.kill = true; }
      else if (state === 'starting') { can.stop = true; can.kill = true; }
      else if (state === 'stopping') { can.kill = true; }
    }
    $('btn-start').disabled = !can.start;
    $('btn-stop').disabled = !can.stop;
    $('btn-restart').disabled = !can.restart;
    $('btn-kill').disabled = !can.kill;
  }
  function dotClass(state) { return state === 'online' ? 'online' : (state === 'starting' || state === 'stopping' ? 'busy' : ''); }

  // ---- Sidebar / server switcher ------------------------------------------
  function showServerUI(on) {
    $('sidebar').hidden = !on;
    $('topbar-server').hidden = !on;
    $('empty-state').hidden = on;
  }
  function renderServers(list) {
    Panel.servers = list;
    const online = list.filter((s) => s.state === 'online').length;
    $('tb-systems').querySelector('span:last-child').textContent = `${online} / ${list.length} online`;
    if (!list.length) { showServerUI(false); document.querySelectorAll('.view').forEach((v) => (v.hidden = true)); Panel.activeId = null; return; }
    showServerUI(true);
    // switcher dropdown
    $('switch-menu').innerHTML = list.map((s) =>
      `<div class="switch-item ${s.id === Panel.activeId ? 'active' : ''}" data-id="${s.id}"><span class="s-dot ${dotClass(s.state)}"></span><span class="sw-meta"><span class="sw-name">${Panel.esc(s.name)}</span><span class="sw-sub">${Panel.esc(s.versionLabel)}</span></span></div>`
    ).join('');
    $('switch-menu').querySelectorAll('.switch-item').forEach((el) => el.addEventListener('click', () => { $('switch-menu').hidden = true; setActive(el.dataset.id); }));
    if (!Panel.activeId || !list.find((s) => s.id === Panel.activeId)) setActive(list[0].id);
    else updateSwitcher();
  }
  function updateSwitcher() {
    const s = Panel.servers.find((x) => x.id === Panel.activeId);
    if (!s) return;
    $('sw-name').textContent = s.name;
    $('sw-sub').textContent = s.versionLabel;
    $('sw-dot').className = 's-dot ' + dotClass(s.state);
  }

  async function setActive(id) {
    Panel.activeId = id;
    Panel.tel = { cpu: [], mem: [], memMax: Panel.tel.memMax };
    updateSwitcher();
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
  function renderState(s) {
    Panel.state = s;
    Panel.tel.memMax = (s.memoryMB || 6144);
    // top bar
    setPill($('tb-status'), $('tb-status-text'), s.state);
    $('tb-name').textContent = s.name;
    $('tb-address').textContent = s.address;
    // info card
    $('i-name').textContent = s.name;
    $('i-version').textContent = s.versionLabel;
    $('i-address').textContent = s.address;
    $('i-ram').textContent = `${(s.memoryMB / 1024).toFixed(s.memoryMB % 1024 ? 1 : 0)} GB`;
    $('i-autorestart').textContent = s.autoRestart ? 'On' : 'Off';
    // health placeholders
    $('players-val').textContent = `${s.playerCount ?? 0} / ${s.maxPlayers ?? 20}`;
    if (s.state !== 'online') { setTps(s.tps ?? null); $('latency-val').textContent = '—'; }
    setPower(s.state, s.installed);
    updateUptime();
    updateSwitcher();
    if (!$('view-players').hidden) Panel.Players.load();
  }

  function setTps(tps) {
    const tag = $('tps-tag');
    if (tps == null) { $('tps-val').textContent = '—'; tag.className = 'tag'; tag.textContent = '—'; return; }
    $('tps-val').textContent = tps.toFixed(2);
    if (tps >= 19) { tag.className = 'tag good'; tag.textContent = 'STABLE'; }
    else if (tps >= 15) { tag.className = 'tag warn'; tag.textContent = 'BUSY'; }
    else { tag.className = 'tag bad'; tag.textContent = 'LAGGING'; }
  }

  function renderStats(d) {
    $('cpu-val').textContent = `${d.cpu}%`;
    const gb = (mb) => (mb / 1024).toFixed(2);
    $('mem-val').textContent = `${gb(d.memUsedMB)} / ${gb(d.memMaxMB)} GB`;
    $('storage-val').textContent = d.storageMB >= 1024 ? `${gb(d.storageMB)} GB` : `${d.storageMB} MB`;
    Panel.tel.memMax = d.memMaxMB;
    Panel.tel.cpu.push(d.cpu); Panel.tel.mem.push(d.memUsedMB);
    if (Panel.tel.cpu.length > 60) { Panel.tel.cpu.shift(); Panel.tel.mem.shift(); }
    redrawSparks();
    setTps(d.tps);
    $('players-val').textContent = `${d.playerCount ?? 0} / ${d.maxPlayers ?? 20}`;
    $('latency-val').textContent = d.latency == null ? '—' : `${d.latency} ms`;
  }

  function updateUptime() {
    const s = Panel.state;
    const up = (s.state !== 'offline' && s.startedAt) ? Panel.fmtUptime(Date.now() - s.startedAt) : '—';
    $('uptime-val').textContent = up;
    $('tb-uptime').textContent = s.state === 'online' ? up : (s.state === 'offline' ? 'Offline' : s.state);
  }

  // ---- WebSocket ----------------------------------------------------------
  function handleWS(msg) {
    switch (msg.type) {
      case 'servers': renderServers(msg.servers); break;
      case 'history':
        if (msg.serverId === Panel.activeId) {
          consoleEl().innerHTML = ''; msg.lines.forEach(appendLog);
          if (msg.telemetry) { Panel.tel.cpu = (msg.telemetry.cpu || []).slice(-60); Panel.tel.mem = (msg.telemetry.mem || []).slice(-60); redrawSparks(); }
        }
        break;
      case 'log': if (msg.serverId === Panel.activeId) appendLog(msg.line); break;
      case 'state': if (msg.serverId === Panel.activeId) renderState(msg.state); updateSwitcher(); break;
      case 'players':
        if (msg.serverId === Panel.activeId) {
          Panel.state.players = msg.players; Panel.state.playerCount = msg.playerCount;
          $('players-val').textContent = `${msg.playerCount ?? 0} / ${Panel.state.maxPlayers ?? 20}`;
          if (!$('view-players').hidden) Panel.Players.load();
        }
        break;
      case 'stats': if (msg.serverId === Panel.activeId) renderStats(msg); break;
      case 'install': handleInstall(msg); break;
    }
  }

  // ---- Power & commands ---------------------------------------------------
  async function power(action) {
    try {
      if (action === 'start' && Panel.state.installed && !Panel.state.eulaAccepted) { openEula(); return; }
      if (action === 'kill' && !confirm('Force-kill the server process? Unsaved progress may be lost.')) return;
      await Panel.api.post(sUrl('/power'), { action });
    } catch (e) { Panel.toast(e.message, 'err'); }
  }

  // ---- Add server ---------------------------------------------------------
  function openAdd() {
    addOpen = true;
    $('add-name').value = ''; $('existing-path').value = ''; Panel._existingIsServer = false;
    setExistingHint('', false); $('add-progress').hidden = true; $('add-create').disabled = false;
    setMode('download'); $('add-modal').hidden = false;
    if (!versionsLoaded) loadVersions();
  }
  function closeAdd() { addOpen = false; $('add-modal').hidden = true; }
  function setMode(mode) {
    document.querySelectorAll('#add-mode .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    $('mode-download').hidden = mode !== 'download';
    $('mode-existing').hidden = mode !== 'existing';
    Panel.addMode = mode; updateCreateBtn();
  }
  function updateCreateBtn() {
    $('add-create').disabled = Panel.addMode === 'existing' ? !($('existing-path').value.trim() && Panel._existingIsServer) : false;
  }
  async function loadVersions() {
    const sel = $('version-select');
    try { const { versions } = await Panel.api.get('/api/versions'); sel.innerHTML = versions.map((v) => `<option value="${v}">${v}</option>`).join(''); versionsLoaded = true; }
    catch (e) { sel.innerHTML = '<option>Failed to load</option>'; Panel.toast('Paper API error: ' + e.message, 'err'); }
  }
  async function pickFolder() {
    const btn = $('browse-native'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Opening…';
    try {
      const r = await Panel.api.post('/api/pick-folder', {});
      if (!r.cancelled && r.path) { $('existing-path').value = r.path; setExistingHint(r.path, r.isServer, r.jar); updateCreateBtn(); }
    } catch (e) { Panel.toast(e.message || 'Could not open the folder picker — type the path instead.', 'err'); }
    finally { btn.disabled = false; btn.textContent = label; }
  }
  let validateTimer;
  function onExistingInput() { clearTimeout(validateTimer); validateTimer = setTimeout(validateExisting, 350); updateCreateBtn(); }
  async function validateExisting() {
    const p = $('existing-path').value.trim();
    if (!p) return setExistingHint('', false);
    try { const d = await Panel.api.get('/api/browse?path=' + encodeURIComponent(p)); setExistingHint(p, d.isServer, d.jar); }
    catch { setExistingHint(p, false); }
    updateCreateBtn();
  }
  function setExistingHint(pathStr, isServer, jar) {
    const h = $('existing-hint'); Panel._existingIsServer = !!isServer;
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
      try { const { id } = await Panel.api.post('/api/servers', { mode: 'existing', name, path: folder }); closeAdd(); await setActive(id); Panel.toast('Server added', 'ok'); }
      catch (e) { Panel.toast(e.message, 'err'); }
    } else {
      const version = $('version-select').value;
      $('add-create').disabled = true; $('add-progress').hidden = false; $('add-label').textContent = 'Starting download…';
      try { const { id } = await Panel.api.post('/api/servers', { mode: 'download', name, version }); closeAdd(); await setActive(id); openEula(); }
      catch (e) { Panel.toast(e.message, 'err'); $('add-create').disabled = false; }
    }
  }

  // ---- EULA ---------------------------------------------------------------
  function openEula() {
    if (Panel.state.eulaAccepted) return;
    $('eula-modal').hidden = false; $('eula-check').checked = false; $('eula-accept').disabled = true;
  }

  // ---- Settings -----------------------------------------------------------
  async function loadSettings() {
    try {
      const { settings } = await Panel.api.get(sUrl('/settings'));
      $('set-name').value = settings.name; $('set-maxmem').value = settings.memoryMB;
      $('set-minmem').value = settings.minMemoryMB; $('set-autorestart').checked = !!settings.autoRestart;
    } catch (e) { Panel.toast(e.message, 'err'); }
  }
  async function saveSettings() {
    try {
      await Panel.api.post(sUrl('/settings'), {
        name: $('set-name').value, memoryMB: Number($('set-maxmem').value),
        minMemoryMB: Number($('set-minmem').value), autoRestart: $('set-autorestart').checked
      });
      Panel.toast('Settings saved', 'ok');
    } catch (e) { Panel.toast(e.message, 'err'); }
  }
  async function removeServer() {
    if (!confirm(`Remove "${Panel.state.name}" from the panel? Files on disk are kept.`)) return;
    try { const id = Panel.activeId; Panel.activeId = null; await Panel.api.del(`/api/servers/${id}`); Panel.toast('Server removed', 'ok'); }
    catch (e) { Panel.toast(e.message, 'err'); }
  }

  // ---- Views --------------------------------------------------------------
  function switchView(view) {
    document.querySelectorAll('.nav-item').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== `view-${view}`));
    if (view === 'files') Panel.Files.open();
    if (view === 'properties') Panel.Props.load();
    if (view === 'players') Panel.Players.load();
    if (view === 'backups') Panel.Backups.load();
    if (view === 'schedules') Panel.Schedules.load();
    if (view === 'settings') loadSettings();
  }

  // ---- Init ---------------------------------------------------------------
  function init() {
    trackScroll();
    Panel.connectWS(handleWS);

    $('btn-start').addEventListener('click', () => power('start'));
    $('btn-stop').addEventListener('click', () => power('stop'));
    $('btn-restart').addEventListener('click', () => power('restart'));
    $('btn-kill').addEventListener('click', () => power('kill'));

    $('command-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('command-input'); const cmd = input.value.trim(); if (!cmd) return;
      try { await Panel.api.post(sUrl('/command'), { command: cmd }); input.value = ''; } catch (err) { Panel.toast(err.message, 'err'); }
    });
    $('console-clear').addEventListener('click', () => (consoleEl().innerHTML = ''));
    $('console-filter').addEventListener('input', (e) => { Panel.consoleFilter = e.target.value.toLowerCase(); consoleEl().querySelectorAll('.log-line').forEach(applyFilter); });
    $('console-download').addEventListener('click', () => {
      const text = [...consoleEl().querySelectorAll('.log-line')].map((l) => l.textContent).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = `${Panel.state.name || 'server'}-console.log`; a.click(); URL.revokeObjectURL(a.href);
    });
    $('copy-address').addEventListener('click', () => navigator.clipboard?.writeText(Panel.state.address).then(() => Panel.toast('Address copied', 'ok')));

    // sidebar nav + switcher
    document.querySelectorAll('.nav-item').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
    $('server-switch').addEventListener('click', (e) => { e.stopPropagation(); $('switch-menu').hidden = !$('switch-menu').hidden; });
    document.addEventListener('click', () => ($('switch-menu').hidden = true));

    // add-server
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

    // settings + editor + players refresh
    $('settings-save').addEventListener('click', saveSettings);
    $('settings-remove').addEventListener('click', removeServer);
    $('editor-close').addEventListener('click', () => ($('editor-modal').hidden = true));
    $('editor-cancel').addEventListener('click', () => ($('editor-modal').hidden = true));
    $('players-refresh').addEventListener('click', () => Panel.Players.load());

    setInterval(updateUptime, 1000);
    Panel.api.get('/api/servers').then((d) => renderServers(d.servers)).catch(() => {});
  }

  Panel.switchView = switchView;
  Panel.appendLog = appendLog;
  document.addEventListener('DOMContentLoaded', init);
})();
