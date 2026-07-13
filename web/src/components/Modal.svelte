<script>
  let { title, onclose, children } = $props();
</script>

<div class="overlay" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }} role="presentation">
  <div class="modal" role="dialog" aria-label={title}>
    <div class="head"><h3>{title}</h3><button class="x" onclick={onclose}>✕</button></div>
    <div class="body">{@render children?.()}</div>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 150; padding: 20px; }
  .modal { width: min(480px, 96vw); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); }
  .head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .head h3 { margin: 0; font-size: 15px; }
  .x { background: transparent; border: 0; color: var(--text-mut); font-size: 15px; }
  .body { padding: 20px; }
</style>
