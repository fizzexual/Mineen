(function () {
  const $ = Panel.$;
  const Props = (Panel.Props = {});

  const ENUMS = {
    gamemode: ['survival', 'creative', 'adventure', 'spectator'],
    difficulty: ['peaceful', 'easy', 'normal', 'hard']
  };

  function control(key, value) {
    if (value === 'true' || value === 'false') {
      return `<select data-key="${Panel.esc(key)}">
        <option value="true"${value === 'true' ? ' selected' : ''}>true</option>
        <option value="false"${value === 'false' ? ' selected' : ''}>false</option></select>`;
    }
    if (ENUMS[key]) {
      return `<select data-key="${Panel.esc(key)}">` +
        ENUMS[key].map((o) => `<option${o === value ? ' selected' : ''}>${o}</option>`).join('') + `</select>`;
    }
    const isNum = value !== '' && !Number.isNaN(Number(value));
    const type = isNum ? 'number' : 'text';
    return `<input type="${type}" data-key="${Panel.esc(key)}" value="${Panel.esc(value)}" />`;
  }

  Props.load = async function () {
    try {
      const { entries } = await Panel.api.get(Panel.sUrl('/properties'));
      $('props-grid').innerHTML = entries.map((e) =>
        `<div class="prop"><label>${Panel.esc(e.key)}</label>${control(e.key, e.value)}</div>`
      ).join('');
    } catch (e) { Panel.toast(e.message, 'err'); }
  };

  async function save() {
    const entries = [...document.querySelectorAll('#props-grid [data-key]')].map((el) => ({
      key: el.dataset.key,
      value: el.value
    }));
    try {
      await Panel.api.post(Panel.sUrl('/properties'), { entries });
      Panel.toast('Properties saved' + (Panel.state.state === 'online' ? ' — restart to apply' : ''), 'ok');
    } catch (e) { Panel.toast(e.message, 'err'); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('props-save').addEventListener('click', save);
  });
})();
