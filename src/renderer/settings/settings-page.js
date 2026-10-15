/* Ajustes (spec 010): the page only shows the main-process settings and sends changes; rules and storage stay in main. */
const SETTINGS_MODES = [['sound-and-notification', 'Som e notificação'], ['sound', 'Só som'], ['notification', 'Só notificação']];
let settingsView = null;

function settingsOptions(options, selected) {
  return options.map(([value, label]) => `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(label)}</option>`).join('');
}
function settingsMarkup({ preferences, sounds }) {
  const silent = preferences.alertMode === 'notification';
  return `<div class="view-toolbar"><span class="toolbar-left"></span></div>
  <div id="settings-page" class="settings-page">
    <h1>Ajustes</h1>
    <section class="settings-section" aria-labelledby="settings-alerts">
      <h2 id="settings-alerts">Alertas</h2>
      <label class="settings-row"><span>Modo</span><select id="settings-alert-mode">${settingsOptions(SETTINGS_MODES, preferences.alertMode)}</select></label>
      <label class="settings-row"><span>Som</span><select id="settings-alert-sound"${silent ? ' disabled' : ''}>${settingsOptions(sounds.map(sound => [sound.id, sound.label]), preferences.alertSound)}</select></label>
      <label class="settings-row"><span>Volume</span><span class="settings-volume"><input id="settings-alert-volume" type="range" min="10" max="100" step="5" value="${preferences.alertVolume}"${silent ? ' disabled' : ''}><output id="settings-alert-volume-value">${preferences.alertVolume}%</output></span></label>
      <div class="settings-row settings-actions"><span></span><button id="settings-test-sound" type="button"${silent ? ' disabled' : ''}>${icon('sound')}<span>Testar som</span></button></div>
      <div class="settings-row settings-actions"><span>Notificações do macOS</span><span class="settings-hint-group"><span class="settings-buttons"><button id="settings-test-notification" type="button"${preferences.alertMode === 'sound' ? ' disabled' : ''}>${icon('reminders')}<span>Enviar notificação de teste</span></button><button id="settings-open-notifications" type="button">${icon('open')}<span>Abrir ajustes de notificação</span></button></span><small class="settings-hint">Se os avisos não aparecerem, envie uma notificação de teste e permita as notificações do Caderninho.</small></span></div>
    </section>
    <section class="settings-section" aria-labelledby="settings-window">
      <h2 id="settings-window">Janela</h2>
      <label class="settings-row settings-check"><input id="settings-keep-on-top" type="checkbox"${preferences.keepOnTop ? ' checked' : ''}><span>Manter janela na frente</span></label>
      <p class="settings-hint">Fica acima das outras janelas, mas não de apps em tela cheia. Também no menu Janela.</p>
    </section>
    <section class="settings-section" id="settings-related" aria-labelledby="settings-related-title"></section>
  </div>`;
}
async function saveSetting(changes) {
  try { settingsView = await window.notebook.updateSettings(changes); }
  catch { toast('Não foi possível salvar este ajuste.'); }
  if (view === 'settings') syncSettings();
}
// Updates values and enabled states in place, so the focused control stays put.
function syncSettings() {
  if (!$('#settings-page')) return;
  const { preferences } = settingsView, silent = preferences.alertMode === 'notification';
  $('#settings-alert-mode').value = preferences.alertMode;
  $('#settings-alert-sound').value = preferences.alertSound;
  $('#settings-alert-volume').value = String(preferences.alertVolume);
  $('#settings-alert-volume-value').textContent = `${preferences.alertVolume}%`;
  $('#settings-keep-on-top').checked = preferences.keepOnTop;
  for (const id of ['#settings-alert-sound', '#settings-alert-volume', '#settings-test-sound']) $(id).disabled = silent;
  $('#settings-test-notification').disabled = preferences.alertMode === 'sound';
}
function paintSettings() {
  $('#page-content').innerHTML = settingsMarkup(settingsView);
  $('#settings-alert-mode').onchange = event => saveSetting({ alertMode: event.target.value });
  $('#settings-alert-sound').onchange = event => saveSetting({ alertSound: event.target.value });
  $('#settings-alert-volume').oninput = event => { $('#settings-alert-volume-value').textContent = `${event.target.value}%`; };
  $('#settings-alert-volume').onchange = event => saveSetting({ alertVolume: Number(event.target.value) });
  $('#settings-keep-on-top').onchange = event => saveSetting({ keepOnTop: event.target.checked });
  $('#settings-test-sound').onclick = () => window.notebook.testSound();
  $('#settings-test-notification').onclick = () => window.notebook.testNotification().catch(() => toast('Notificações não estão disponíveis neste Mac.'));
  $('#settings-open-notifications').onclick = () => window.notebook.openNotificationSettings().catch(() => toast('Não foi possível abrir os Ajustes do Sistema.'));
  renderRelatedSection();
}
async function renderSettings() {
  $('#list-progress').hidden = true;
  settingsView = await window.notebook.settings();
  if (view === 'settings') paintSettings();
}
async function openSettings() {
  if (await action('view:select', { view: 'settings' })) { view = state.activeView; render(); }
}
// Changes made elsewhere (the Window menu) repaint an open page.
window.notebook.onSettingsUpdated(next => { settingsView = next; if (view === 'settings') syncSettings(); });
window.notebook.onCommand(command => { if (command === 'open-settings') openSettings(); });
