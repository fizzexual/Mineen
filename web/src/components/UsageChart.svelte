<script>
  // A dependency-free, interactive line chart. Hovering shows a tooltip with the
  // sample value + a subtitle, plus a vertical guide and an emphasized point.
  let {
    data = [],
    max = 100,
    color = 'var(--chart)',
    label = 'Usage',
    sub = '',
    fmtValue = (v) => `${Math.round(v)}`,
    fmtAxis = (v) => `${Math.round(v)}`,
    sampleMs = 2000
  } = $props();

  const W = 760, H = 230, PL = 44, PR = 14, PT = 16, PB = 30;
  const plotW = W - PL - PR, plotH = H - PT - PB;

  let wrap = $state(null);
  let hoverIdx = $state(-1);

  const n = $derived(data.length);
  const pts = $derived.by(() => {
    if (n < 2) return [];
    return data.map((v, i) => ({
      x: PL + (i / (n - 1)) * plotW,
      y: PT + plotH - Math.max(0, Math.min(1, v / (max || 1))) * plotH,
      v
    }));
  });
  const line = $derived(pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));
  const area = $derived(pts.length ? `${line} L${(PL + plotW).toFixed(1)} ${(PT + plotH).toFixed(1)} L${PL.toFixed(1)} ${(PT + plotH).toFixed(1)} Z` : '');

  const ySteps = 5;
  const yTicks = $derived(Array.from({ length: ySteps + 1 }, (_, i) => ({
    y: PT + plotH - (i / ySteps) * plotH,
    label: fmtAxis((max / ySteps) * i)
  })));

  const xTicks = $derived.by(() => {
    if (n < 2) return [];
    const count = Math.min(8, n);
    const now = Date.now();
    return Array.from({ length: count }, (_, k) => {
      const i = Math.round((k / (count - 1)) * (n - 1));
      const t = new Date(now - (n - 1 - i) * sampleMs);
      return { x: PL + (i / (n - 1)) * plotW, label: t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
    });
  });

  const hp = $derived(hoverIdx >= 0 && pts[hoverIdx] ? pts[hoverIdx] : null);

  function onMove(e) {
    if (!wrap || n < 2) return;
    const r = wrap.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const frac = Math.max(0, Math.min(1, (vx - PL) / plotW));
    hoverIdx = Math.round(frac * (n - 1));
  }
</script>

<div class="chart" bind:this={wrap}>
  <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" role="img" aria-label="{label} over time" onmousemove={onMove} onmouseleave={() => (hoverIdx = -1)}>
    {#each yTicks as t}
      <line class="grid" x1={PL} y1={t.y} x2={W - PR} y2={t.y} />
      <text class="ylab" x={PL - 10} y={t.y + 3.5} text-anchor="end">{t.label}</text>
    {/each}
    {#if pts.length}
      <path class="area" d={area} fill={color} />
      <path class="line" d={line} stroke={color} />
    {/if}
    {#each xTicks as t}
      <text class="xlab" x={t.x} y={H - 10} text-anchor="middle">{t.label}</text>
    {/each}
    {#if hp}
      <line class="guide" x1={hp.x} y1={PT} x2={hp.x} y2={PT + plotH} />
      <circle class="pt-ring" cx={hp.x} cy={hp.y} r="6" />
      <circle class="pt" cx={hp.x} cy={hp.y} r="3.5" fill={color} />
    {/if}
  </svg>

  {#if hp}
    <div class="tip" style="left:{(hp.x / W) * 100}%; top:{(hp.y / H) * 100}%">
      <span class="tip-label">{label}</span>
      <strong>{fmtValue(hp.v)}</strong>
      {#if sub}<span class="tip-sub">{sub}</span>{/if}
    </div>
  {/if}
</div>

<style>
  .chart { position: relative; width: 100%; }
  svg { width: 100%; height: 230px; display: block; overflow: visible; }
  .grid { stroke: var(--border-soft); stroke-width: 1; }
  .ylab, .xlab { fill: var(--text-mut); font-size: 11px; font-family: var(--font); }
  .area { opacity: 0.14; }
  .line { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; }
  .guide { stroke: var(--text-mut); stroke-width: 1; stroke-dasharray: 3 3; }
  .pt-ring { fill: var(--surface-1); stroke: var(--chart); stroke-width: 1.5; }
  .tip { position: absolute; transform: translate(-50%, calc(-100% - 12px)); background: var(--surface-3); border: 1px solid var(--border); border-radius: 9px; box-shadow: var(--shadow); padding: 9px 12px; pointer-events: none; display: flex; flex-direction: column; gap: 1px; white-space: nowrap; z-index: 5; }
  .tip-label { font-size: 11px; color: var(--text-dim); }
  .tip strong { font-size: 17px; font-weight: 700; }
  .tip-sub { font-size: 11px; color: var(--text-mut); }
</style>
