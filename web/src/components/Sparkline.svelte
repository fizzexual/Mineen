<script>
  let { data = [], max = 100, color = 'var(--accent)' } = $props();
  const W = 120, H = 36;
  const pts = $derived(
    (data && data.length >= 2)
      ? data.map((v, i) => {
          const x = (i / (data.length - 1)) * W;
          const y = H - Math.max(0, Math.min(1, v / (max || 1))) * H;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ')
      : ''
  );
</script>

<svg class="spark" viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">
  {#if pts}
    <polygon points="0,{H} {pts} {W},{H}" fill={color} opacity="0.12" />
    <polyline points={pts} fill="none" stroke={color} stroke-width="1.6" />
  {/if}
</svg>

<style>
  .spark { width: 100%; height: 36px; display: block; }
</style>
