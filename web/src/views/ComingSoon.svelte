<script>
  let { view = '' } = $props();
  const label = $derived(view ? view.charAt(0).toUpperCase() + view.slice(1) : 'This section');
</script>
<section class="soon">
  <div class="glyph">◔</div>
  <h2>{label} is coming soon</h2>
  <p>This part of MineEN isn't built yet — it's on the roadmap for an upcoming update. Console and Dashboard are live now.</p>
</section>
<style>
  .soon { max-width: 440px; margin: 14vh auto 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .glyph { font-size: 44px; color: var(--text-mut); }
  h2 { margin: 0; }
  p { color: var(--text-dim); margin: 0; }
</style>
