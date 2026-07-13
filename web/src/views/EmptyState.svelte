<script>
  let { onadd } = $props();
</script>

<section class="empty">
  <div class="glyph">◧</div>
  <h2>No servers yet</h2>
  <p>Spin up a fresh Minecraft server or point MineEN at a folder you already have. You'll be online in a couple of minutes.</p>
  <button class="cta" onclick={onadd}>＋ Add your first server</button>
</section>

<style>
  .empty { max-width: 440px; margin: 14vh auto 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .glyph { font-size: 44px; color: var(--accent); }
  h2 { margin: 0; }
  p { color: var(--text-dim); margin: 0; }
  .cta { margin-top: 8px; background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-md); padding: 12px 20px; font-weight: 600; font-size: 14px; }
</style>
