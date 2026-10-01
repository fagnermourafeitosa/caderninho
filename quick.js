function quickDates(draft) {
  const date = value => new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
  $('#quick-dates').textContent = draft.created || draft.updated ? `Criado: ${draft.created ? date(draft.created) : 'não registrado'} · Atualizado: ${draft.updated ? date(draft.updated) : 'não registrado'}` : '';
}
const $ = selector => document.querySelector(selector);
let writes = Promise.resolve(), saving = false, savedId;
window.quickErrors = [];
window.addEventListener('error', event => window.quickErrors.push(event.message));
window.addEventListener('unhandledrejection', event => window.quickErrors.push(String(event.reason)));
function message(text, failed = false) { $('#quick-status').textContent = text; $('#quick-status').classList.toggle('failed', failed); }
function values() { return { title: $('#quick-title').value, body: $('#quick-body').value, targetId: $('#quick-target').value }; }
function persist() {
  const input = values();
  message('Salvando automaticamente…');
  writes = writes.catch(() => {}).then(() => window.quick.write(input));
  const currentWrite = writes;
  return currentWrite.then(draft => { if (writes === currentWrite) { message('Rascunho salvo neste Mac'); quickDates(draft); } }, error => { message('Não foi salvo. ' + error.message, true); throw error; });
}
async function refresh() {
  await writes.catch(() => {});
  const state = await window.quick.state();
  $('#quick-title').value = state.draft.title;
  $('#quick-body').value = state.draft.body;
  const select = $('#quick-target'); select.replaceChildren(new Option('Nova nota', ''));
  state.notes.forEach(note => select.add(new Option(note.title || 'Sem título', note.id)));
  if (state.draft.targetId && !state.notes.some(note => note.id === state.draft.targetId)) select.add(new Option('Nota indisponível — escolha outra', state.draft.targetId));
  select.value = state.draft.targetId;
  $('#quick-shortcut').textContent = state.shortcutAvailable ? state.shortcut : 'Atalho indisponível; use o botão Rascunho';
  $('#quick-reveal').hidden = true;
  message('Rascunho salvo neste Mac'); quickDates(state.draft);
  $('#quick-body').focus();
}
for (const selector of ['#quick-title', '#quick-body', '#quick-target']) $(selector).addEventListener('input', () => {
  $('#quick-reveal').hidden = true;
  persist().catch(() => {});
});
$('#quick-form').onsubmit = async event => {
  event.preventDefault(); if (saving) return;
  if (!$('#quick-body').value.trim()) { message('Escreva algo para guardar.'); $('#quick-body').focus(); return; }
  saving = true;
  const controls = [...document.querySelectorAll('#quick-form input, #quick-form textarea, #quick-form select, #quick-form button')];
  controls.forEach(control => control.disabled = true);
  try {
    await persist();
    const result = await window.quick.commit(); savedId = result.id;
    await refresh();
    message('Guardado no caderno.'); $('#quick-reveal').hidden = false;
  } catch (error) { message('Não foi guardado. ' + error.message, true); }
  finally { controls.forEach(control => control.disabled = false); saving = false; $('#quick-body').focus(); }
};
async function hide() {
  if (saving) return;
  try { await persist(); await window.quick.hide(); } catch {}
}
$('#quick-close').onclick = hide;
$('#quick-reveal').onclick = () => window.quick.reveal(savedId).catch(error => message(error.message, true));
document.addEventListener('keydown', event => {
  if (event.ctrlKey && !event.altKey && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); document.execCommand(event.shiftKey || event.key.toLowerCase() === 'y' ? 'redo' : 'undo'); }
  if (event.key === 'Escape') { event.preventDefault(); hide(); }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); $('#quick-form').requestSubmit(); }
});
window.quick.onRefresh(() => refresh().catch(error => message(error.message, true)));
refresh().catch(error => message(error.message, true));
