export function createSocket(onMessage, onOpen) {
  let ws;
  let closed = false;
  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => onOpen && onOpen();
    ws.onmessage = (ev) => {
      try { onMessage(JSON.parse(ev.data)); } catch { /* ignore malformed */ }
    };
    ws.onclose = () => { if (!closed) setTimeout(open, 1500); };
    ws.onerror = () => ws.close();
  };
  open();
  return {
    send: (obj) => { try { if (ws?.readyState === 1) ws.send(JSON.stringify(obj)); } catch { /* not open */ } },
    close: () => { closed = true; ws?.close(); }
  };
}
