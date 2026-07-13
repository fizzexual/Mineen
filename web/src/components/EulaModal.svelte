<script>
  import Modal from './Modal.svelte';
  let { open, onaccept, onclose } = $props();
  let checked = $state(false);
  $effect(() => { if (open) checked = false; });
</script>

{#if open}
  <Modal title="Minecraft EULA" {onclose}>
    <p>To run a Minecraft server you must accept the
      <a href="https://aka.ms/MinecraftEULA" target="_blank" rel="noopener">Minecraft End User License Agreement</a>.</p>
    <label class="check"><input type="checkbox" bind:checked /> I agree to the Minecraft EULA</label>
    <div class="foot"><button class="go" disabled={!checked} onclick={onaccept}>Accept & Continue</button></div>
  </Modal>
{/if}

<style>
  .check { display: flex; align-items: center; gap: 8px; margin: 16px 0; color: var(--text-dim); }
  .foot { display: flex; justify-content: flex-end; }
  .go { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 9px 16px; font-weight: 600; }
  .go:disabled { opacity: .4; }
</style>
