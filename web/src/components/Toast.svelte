<script>
  import { toasts } from '../stores/toast.js';
</script>

<div class="toast-wrap">
  {#each $toasts as t (t.id)}
    <div class="toast {t.type}">{t.msg}</div>
  {/each}
</div>

<style>
  .toast-wrap { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 100; }
  .toast {
    background: var(--surface-3); border: 1px solid var(--border); color: var(--text);
    padding: 10px 14px; border-radius: var(--r-md); box-shadow: var(--shadow);
    font-size: 13px; max-width: 320px; animation: slide .18s ease;
  }
  .toast.ok { border-color: var(--ok); }
  .toast.err { border-color: var(--bad); }
  @keyframes slide { from { opacity: 0; transform: translateY(6px); } }
</style>
