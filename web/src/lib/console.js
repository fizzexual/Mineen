function parse(line) {
  let m = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*\[[^\]]*\/(INFO|WARN|WARNING|ERROR|SEVERE|DEBUG|TRACE)\]:?\s?(.*)$/);
  if (!m) m = line.match(/^\[(\d{2}:\d{2}:\d{2})\s+(INFO|WARN|WARNING|ERROR|SEVERE|DEBUG|TRACE)\]:?\s?(.*)$/);
  return m ? { time: m[1], raw: m[2], msg: m[3] } : null;
}

export function classify(line) {
  if (line.startsWith('[panel]')) return { kind: 'panel', level: 'info', msg: line };
  if (line.startsWith('> ')) return { kind: 'command', level: 'info', msg: line };
  const p = parse(line);
  if (!p) return { kind: 'log', level: 'info', msg: line };
  const level = /WARN/.test(p.raw) ? 'warn' : (/ERROR|SEVERE/.test(p.raw) ? 'error' : 'info');
  return { kind: 'log', level, time: p.time, msg: p.msg };
}
