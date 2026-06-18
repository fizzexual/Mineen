(function () {
  const $ = Panel.$;
  const Schedules = (Panel.Schedules = {});

  Schedules.load = async function () {
    const box = $('schedules-list');
    box.innerHTML = '<div class="empty-line">Loading…</div>';
    try {
      const { schedules } = await Panel.api.get(`/api/servers/${Panel.activeId}/schedules`);
      if (!schedules.length) { box.innerHTML = '<div class="empty-line">No schedules yet. Add one below.</div>'; return; }
      box.innerHTML = schedules.map((s) => `<div class="sched-row ${s.enabled ? '' : 'off'}">
        <span class="sched-icon ${s.action}">${s.action === 'restart' ? '⟳' : '🗄'}</span>
        <div class="sched-meta"><strong>${s.action === 'restart' ? 'Auto-restart' : 'Auto-backup'}</strong><span class="muted">every ${s.everyMinutes} min</span></div>
        <label class="toggle sm"><input type="checkbox" ${s.enabled ? 'checked' : ''} data-act="toggle" data-id="${s.id}"><span class="slider"></span></label>
        <button class="btn btn-sm btn-kill" data-act="delete" data-id="${s.id}">Delete</button>
      </div>`).join('');
      box.querySelectorAll('[data-act]').forEach((el) =>
        el.addEventListener(el.dataset.act === 'toggle' ? 'change' : 'click', () => action(el.dataset.act, el.dataset.id)));
    } catch (e) { box.innerHTML = `<div class="empty-line">${Panel.esc(e.message)}</div>`; }
  };

  async function add() {
    const action = $('sched-action').value;
    const everyMinutes = Number($('sched-interval').value) || 60;
    try { await Panel.api.post(`/api/servers/${Panel.activeId}/schedules`, { action, everyMinutes }); Schedules.load(); Panel.toast('Schedule added', 'ok'); }
    catch (e) { Panel.toast(e.message, 'err'); }
  }
  async function action(act, id) {
    try {
      if (act === 'toggle') await Panel.api.post(`/api/servers/${Panel.activeId}/schedules/${id}/toggle`, {});
      else await Panel.api.del(`/api/servers/${Panel.activeId}/schedules/${id}`);
      Schedules.load();
    } catch (e) { Panel.toast(e.message, 'err'); }
  }

  document.addEventListener('DOMContentLoaded', () => $('sched-add').addEventListener('click', add));
})();
