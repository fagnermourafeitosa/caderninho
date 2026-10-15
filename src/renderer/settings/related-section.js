/* Ajustes > Notas relacionadas (spec 011): shows the main-process settings and sends changes; rules stay in main. */
const RELATED_SENSITIVITY = [['broad', 'Ampla'], ['balanced', 'Equilibrada'], ['strict', 'Estrita']];
const RELATED_MODEL_STATE = { downloaded: 'Baixado', downloading: 'Baixando…', absent: 'Não baixado' };
let relatedSettingsView = null;

function relatedBytes(bytes) {
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}
function relatedSectionMarkup({ preferences, model }) {
  const limits = Array.from({ length: 10 }, (_, i) => [String(i + 3), String(i + 3)]);
  return `<h2 id="settings-related-title">Notas relacionadas</h2>
    <label class="settings-row settings-check"><input id="settings-related-enabled" type="checkbox"${preferences.enabled ? ' checked' : ''}><span>Ativar notas relacionadas</span></label>
    <p class="settings-hint">Desligadas, o modelo não é baixado e nada é calculado. O que já foi calculado fica guardado.</p>
    <label class="settings-row"><span>Quantidade de notas</span><select id="settings-related-limit">${settingsOptions(limits, String(preferences.limit))}</select></label>
    <label class="settings-row"><span>Sensibilidade</span><select id="settings-related-sensitivity">${settingsOptions(RELATED_SENSITIVITY, preferences.sensitivity)}</select></label>
    <div class="settings-row settings-actions"><span></span><button id="settings-related-reset" type="button">${icon('restore')}<span>Restaurar padrão</span></button></div>
    <h3 class="settings-subheading">Modelo</h3>
    <dl class="settings-model">
      <dt>Modelo</dt><dd>${escape(model.name)}</dd>
      <dt>Revisão</dt><dd>${escape(model.revision)}</dd>
      <dt>Quantização</dt><dd>${escape(model.quantization)}</dd>
      <dt>Origem</dt><dd><button id="settings-related-source" type="button" class="settings-link">Hugging Face ${icon('open')}</button></dd>
      <dt>Espaço em disco</dt><dd id="settings-related-bytes">${relatedBytes(model.bytes)}</dd>
      <dt>Estado</dt><dd id="settings-related-state">${RELATED_MODEL_STATE[model.state]}</dd>
    </dl>
    <div class="settings-row settings-actions"><span></span><button id="settings-related-clear" type="button">${icon('trash')}<span>Apagar cache e recalcular</span></button></div>`;
}
// Values change in place, so the focused control stays put.
function syncRelatedSection() {
  if (!$('#settings-related-enabled') || !relatedSettingsView) return;
  const { preferences, model } = relatedSettingsView;
  $('#settings-related-enabled').checked = preferences.enabled;
  $('#settings-related-limit').value = String(preferences.limit);
  $('#settings-related-sensitivity').value = preferences.sensitivity;
  $('#settings-related-bytes').textContent = relatedBytes(model.bytes);
  $('#settings-related-state').textContent = RELATED_MODEL_STATE[model.state];
}
// After a failure the controls go back to the stored values.
async function relatedSettingsCall(call) {
  try { relatedSettingsView = await call(); }
  catch { toast('Não foi possível salvar este ajuste.'); }
  syncRelatedSection();
}
// The main process validates the address; a refusal or failure becomes a notice.
function openRelatedSource(url = relatedSettingsView.model.sourceUrl) {
  return window.notebook.openLink(url).catch(() => toast('Não foi possível abrir o link.'));
}
async function renderRelatedSection() {
  const host = $('#settings-related');
  if (!host) return;
  relatedSettingsView = await window.notebook.relatedSettings();
  if (!host.isConnected) return;
  host.innerHTML = relatedSectionMarkup(relatedSettingsView);
  $('#settings-related-enabled').onchange = event => relatedSettingsCall(() => window.notebook.updateRelatedSettings({ enabled: event.target.checked }));
  $('#settings-related-limit').onchange = event => relatedSettingsCall(() => window.notebook.updateRelatedSettings({ limit: Number(event.target.value) }));
  $('#settings-related-sensitivity').onchange = event => relatedSettingsCall(() => window.notebook.updateRelatedSettings({ sensitivity: event.target.value }));
  $('#settings-related-reset').onclick = () => relatedSettingsCall(() => window.notebook.resetRelatedRanking());
  $('#settings-related-source').onclick = () => openRelatedSource();
  $('#settings-related-clear').onclick = () => $('#related-clear-dialog').showModal();
}
document.addEventListener('DOMContentLoaded', () => {
  const dialog = $('#related-clear-dialog');
  $('#related-clear-cancel').onclick = () => dialog.close();
  $('#related-clear-confirm').onclick = async () => {
    dialog.close();
    try { relatedSettingsView = await window.notebook.clearRelatedCache(); syncRelatedSection(); }
    catch { toast('Não foi possível apagar o cache do modelo.'); }
  };
  // Model size and state change while it downloads and indexes.
  window.notebook.onRelatedUpdated(async () => {
    if (view !== 'settings' || !$('#settings-related-enabled')) return;
    relatedSettingsView = await window.notebook.relatedSettings();
    syncRelatedSection();
  });
});
