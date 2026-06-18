// Shared namespace for the whole panel.
const Panel = (window.Panel = window.Panel || {});

// ---- REST helpers ----------------------------------------------------------
Panel.api = {
  async req(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
  get: (u) => Panel.api.req('GET', u),
  post: (u, b) => Panel.api.req('POST', u, b),
  del: (u) => Panel.api.req('DELETE', u)
};

// ---- WebSocket (auto-reconnecting) -----------------------------------------
Panel.connectWS = function (onMessage) {
  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    Panel.ws = ws;
    ws.onmessage = (ev) => {
      try { onMessage(JSON.parse(ev.data)); } catch { /* ignore */ }
    };
    ws.onclose = () => { if (!Panel._wsPaused) setTimeout(open, 1500); };
    ws.onerror = () => ws.close();
  };
  open();
};

// ---- Small utilities -------------------------------------------------------
Panel.toast = function (msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.hidden = false;
  clearTimeout(Panel._toastTimer);
  Panel._toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
};

Panel.fmtBytes = function (bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + u[i];
};

Panel.fmtUptime = function (ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${sec}s`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
};

Panel.fmtTime = function (ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
};

Panel.esc = function (s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};

Panel.$ = (id) => document.getElementById(id);

// Build a URL scoped to the currently-active server.
Panel.sUrl = (suffix) => `/api/servers/${Panel.activeId}${suffix}`;
