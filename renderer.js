const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = name => `<svg class="small-icon" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
const actionLabel = (name, label) => `${icon(name)}<span>${escape(label)}</span>`;
const labels = {
  notes: { singular: 'nota', plural: 'notas', create: 'Nova nota', heading: 'Suas notas' },
  tasks: { singular: 'lista', plural: 'listas', create: 'Nova lista', heading: 'Suas listas' },
  reminders: { singular: 'lembrete', plural: 'lembretes', create: 'Novo lembrete', heading: 'Seus lembretes' }
};
let state, view = 'home', trashType = 'notes', animationGeneration = 0, toastTimer, pending = 0;
let reminderEditor = false;
window.smokeErrors = [];
window.addEventListener('error', event => window.smokeErrors.push(event.message));
window.addEventListener('unhandledrejection', event => window.smokeErrors.push(String(event.reason)));
const visibleNotes = () => state.notes.filter(note => note.type === view && !note.trashed && note.notebookId===state.activeNotebook);
const currentNote = () => state.notes.find(note => note.id === state.selected[view] && !note.trashed);
const prettyDate = date => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(date));
const listDate = date => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
const localDate = time => { const date = new Date(time); return new Date(time - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
function toast(message, duration = 4000) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => $('#toast').hidden = true, duration); }
let saveLabelTimer, savingStarted = 0;
function beginSaving() { clearTimeout(saveLabelTimer); savingStarted=Date.now(); $('#save-state').textContent='Salvando automaticamente…'; $('#save-state').classList.remove('failed'); }
function saved() {
  if (pending) return;
  const at=new Date();
  clearTimeout(saveLabelTimer); saveLabelTimer=setTimeout(() => { if (!pending && !$('#save-state').classList.contains('failed')) { $('#save-state').textContent=`Salvo às ${at.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`; $('#save-state').title=`Salvamento automático confirmado em ${formatDateTime(at)} · ${state.storagePath}`; } },Math.max(0,300-(Date.now()-savingStarted)));
}
async function action(name, input = {}, options = {}) {
  if (name === 'note:update' && options.history !== false) rememberNoteEdit(input,options);
  pending++; beginSaving();
  try {
    state = await window.notebook.action(name, input);
    if (name === 'view:select' && input.view === 'reminders') { reminderEditor = false; resetReminderCalendar(); }
    if (['note:create', 'note:select', 'note:restore'].includes(name) && state.activeView === 'reminders') reminderEditor = true;
    if (name === 'note:trash' && view === 'reminders') reminderEditor = false;
    pending--; saved(); updateTemporalLabels(); renderCategoryBadges(); refreshRelatedSoon(); return true;
  } catch (error) {
    pending--; $('#save-state').textContent = 'Falha ao salvar'; $('#save-state').classList.add('failed');
    toast(error.message.replace(/^Error invoking remote method '[^']+': Error: /, ''), 8000); return false;
  }
}
function empty(title, body, name = 'notes', button = '') { return `<div class="empty">${icon(name)}<h2>${title}</h2><p>${body}</p>${button}</div>`; }
function renderSidebar() {
  const collapsed = Boolean(state.sidebarCollapsed);
  $('.app').classList.toggle('sidebar-collapsed', collapsed);
  $('#sidebar').inert = collapsed;
  $('#sidebar').setAttribute('aria-hidden', String(collapsed));
  $('#sidebar-toggle').setAttribute('aria-expanded', String(!collapsed));
  const label = collapsed ? 'Abrir menu lateral' : 'Recolher menu lateral';
  $('#sidebar-toggle').setAttribute('aria-label', label);
  $('#sidebar-toggle').title = label;
}
function render() {
  sourceDraft=null;
  hideEditorMenus();
  renderSidebar(); renderNotebookTabs();
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $('#footer-label').textContent = ''; delete $('#footer-label').dataset.connections;
  $('#page-number').textContent = '';
  renderProgress();
  if (view === 'notebooks') renderNotebooks(); else if (view === 'home') renderHome(); else if (view === 'archive') renderTrash(); else if (view === 'reminders' && !reminderEditor) renderReminderCalendar(); else renderPage();
  $('#save-state').title = `Salvamento automático em ${state.storagePath}`;
  refreshRelatedSoon();
}
function renderPage() {
  const notes = visibleNotes(), note = currentNote(), label = labels[view];
  const index = notes.findIndex(n => n.id === note?.id);
  const toolbar = `<div class="view-toolbar"><span class="toolbar-right">${view === 'reminders' ? `<button id="back-calendar">${actionLabel('calendar','Calendário')}</button>` : ''}<button id="notes-open" title="${label.heading}">${icon('list')}<span>${label.heading}</span><span class="subtle">(${notes.length})</span></button></span><span class="toolbar-right">${note ? '<button id="related-open" class="related-open" aria-label="Relacionados" title="Relacionados">'+relatedGraphIcon+'<span class="related-label">Relacionados</span></button>' : ''}${view === 'notes' && note ? '<button id="add-cut" class="add-note toolbar-action" aria-label="Adicionar mídia" title="Adicionar mídia">'+icon('media')+'<span class="toolbar-action-label">Adicionar mídia</span></button>' : ''}<button id="new-note" class="add-note toolbar-action" aria-label="${label.create}" title="${label.create}">${icon(view)}<span class="toolbar-action-label">${label.create}</span></button>${note ? '<button id="export-pdf" class="toolbar-action" aria-label="Exportar PDF" title="Exportar PDF">'+icon('export')+'<span class="toolbar-action-label">Exportar PDF</span></button>' : ''}${note ? '<span class="toolbar-separator" aria-hidden="true"></span><button id="trash-note" class="trash-toolbar" aria-label="Mover para a lixeira" title="Mover para a lixeira">'+icon('trash')+'</button>' : ''}</span></div>`;
  if (!note) {
    $('#page-content').innerHTML = toolbar + empty({ notes: 'Uma página nova?', tasks: 'Sua primeira lista?', reminders: 'Uma nota para lembrar?' }[view], { notes: 'Escreva e deixe o caderninho guardar.', tasks: 'Crie uma lista com quantos checkboxes precisar.', reminders: 'Escreva uma nota e agende seu alerta sonoro.' }[view], view, `<button id="empty-create" class="primary">${actionLabel(view,label.create)}</button>`);
    if(view==='tasks'&&(state.sourceActions||[]).some(item=>item.kind==='task'&&item.notebookId===state.activeNotebook)){ $('#page-content').innerHTML=toolbar+'<div id="source-task-only" class="scroll-list"></div>';renderSourceTasks();$('#new-note').onclick=createNote;$('#notes-open').onclick=openDrawer;return;}
    $('#empty-create').onclick = createNote; $('#new-note').onclick = createNote; $('#notes-open').onclick = openDrawer; return;
  }
  const bottom = `<div class="note-bottom"><span id="page-detail"></span><div class="note-pager"><button id="previous-note" aria-label="Página anterior" ${index <= 0 ? 'disabled' : ''}>${icon('chevron')}</button><span>${index + 1} / ${notes.length}</span><button id="next-note" aria-label="Próxima página" ${index >= notes.length - 1 ? 'disabled' : ''}>${icon('chevron')}</button></div></div>`;
  const title = `<input id="note-title" class="note-title" type="text" maxlength="160" aria-label="Título ${view === 'tasks' ? 'da lista' : 'da nota'}" placeholder="Sem título" value="${escape(note.title)}">`;
  const editor = view === 'tasks' ? `<div class="checklist-body"><div id="task-list" class="scroll-list"></div><form id="task-form" class="entry-form task-entry"><input id="task-input" placeholder="Escreva uma tarefa e pressione Enter…" aria-label="Nova tarefa" maxlength="500" required><button type="submit">${actionLabel('add','Adicionar')}</button></form></div>` : `${view === 'reminders' ? '<div id="schedule-panel" class="schedule-panel"></div><p class="reminder-help">O app precisa estar aberto, mesmo minimizado, para tocar o alerta.</p>' : ''}<textarea id="note-body" class="note-body ${view === 'reminders' ? 'reminder-body' : ''}" spellcheck="true" lang="pt-BR" maxlength="200000" aria-label="Texto da nota" placeholder="${view === 'reminders' ? 'Escreva o que você quer lembrar…' : 'Comece uma ideia…'}">${escape(note.body)}</textarea>`;
  const metadata = `${notebookAssociation(note)}<div id="category-badges" class="category-badges" aria-label="Categorias da página"></div><p id="note-dates" class="list-date">${noteDates(note)}</p>`;
  $('#page-content').innerHTML = toolbar + title + metadata + (view === 'notes' ? '<div id="smart-margin" class="smart-margin" hidden></div>' : '') + editor + bottom;
  $('#notes-open').onclick = openDrawer;
  if ($('#back-calendar')) $('#back-calendar').onclick = () => { reminderEditor = false; render(); };
  $('#new-note').onclick = createNote;
  $('#export-pdf').onclick=exportCurrentPDF;
  if ($('#add-cut')) $('#add-cut').onclick = openCutDialog;
  if($('#related-open')) $('#related-open').onclick=openRelated;
  $('#page-number').textContent = String(index + 1).padStart(2, '0');
  $('#note-title').oninput = () => action('note:update', { id: note.id, title: $('#note-title').value });
  if (view === 'tasks') {
    renderItems();
    $('#task-form').onsubmit = async event => {
      event.preventDefault();
      if (await action('item:create', { noteId: note.id, title: $('#task-input').value })) { $('#task-input').value = ''; renderItems(); $('#task-input').focus(); }
    };
  } else {
    $('#note-body').oninput = event => { if (view === 'notes') smartNoteInput(note.id, event); else { const editor=$('#note-body'),categoryCursor=categoryCursorFor(event,editor);unfinishedCategoryNote=categoryCursor!==null&&categoryText.tokens(editor.value).some(token=>categoryCursor>token.start&&categoryCursor<=token.end)?note.id:null;updateDetail(); action('note:update', { id: note.id, body: editor.value, categoryCursor }); } };
    if (view === 'reminders') renderSchedule();
    if (view === 'notes' && (note.editorDoc || note.cuts?.length || categoryText.tokens(note.body).length || note.body.split('\n').some(line => smartText.checkbox(line)))) mountCollage(note);
    if (view === 'notes') renderSmartMargin();
  }
  $('#trash-note').onclick = async () => { if (await turn('note:trash', { id: note.id })) toast('Página movida para a lixeira. Você pode restaurá-la.'); };
  $('#previous-note').onclick = () => turn('note:select', { id: notes[index - 1].id });
  $('#next-note').onclick = () => turn('note:select', { id: notes[index + 1].id });
  updateTemporalLabels();
  renderCategoryBadges(); wireNotebookAssociation(note);
  if(view==='notes') renderSourceMargin();
  if(view==='tasks') renderSourceTasks();
  ensurePageHistory(note);
  updateDetail();
}
function updateDetail() {
  if (!$('#page-detail')) return;
  if (view === 'tasks') {
    const items = currentNote()?.items || [];
    $('#page-detail').textContent = `${items.filter(item => item.done).length} / ${items.length} concluídas`;
    renderProgress();
  } else {
    const editor=$('#note-body');
    const text=editor?.dataset.structured==='true'?readEditorDocument().map(block=>block.type==='table'?block.rows.flat().map(pageDocument.runText).join(' '):pageDocument.runText(block.runs||[])).join(' '):editor?.value||'';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    $('#page-detail').textContent = `${words} ${words === 1 ? 'palavra' : 'palavras'}`;
  }
}
function renderProgress() {
  const progress = $('#list-progress'), note = currentNote();
  progress.hidden = view !== 'tasks' || !note;
  if (progress.hidden) return;
  const total = note.items.length, done = note.items.filter(item => item.done).length;
  const slots = Math.min(total, 12);
  progress.setAttribute('aria-label', `${done} de ${total} tarefas concluídas`);
  progress.innerHTML = `<span class="progress-squares" aria-hidden="true">${Array.from({ length: slots }, (_, index) => `<i class="${index < Math.floor(done / total * slots) ? 'filled' : ''}"></i>`).join('')}</span><span>${done} / ${total}</span>`;
}
function renderItems() {
  const note = currentNote(); if (!note || !$('#task-list')) return;
  $('#task-list').innerHTML = note.items.length ? note.items.map(item => `<div class="task-row ${item.done ? 'done' : ''}" data-item-row="${escape(item.id)}"><input class="task-check" type="checkbox" data-task-id="${escape(item.id)}" aria-label="Concluir: ${escape(item.title || 'Tarefa sem título')}" ${item.done ? 'checked' : ''}><input class="task-text" type="text" data-item-text="${escape(item.id)}" aria-label="Texto da tarefa" maxlength="500" placeholder="Tarefa sem título" value="${escape(item.title)}"><button class="row-delete" data-trash-item="${escape(item.id)}" aria-label="Mover tarefa para a lixeira">${icon('trash')}</button></div>`).join('') : empty('Uma lista em branco.', 'Adicione tarefas no campo abaixo.', 'tasks');
  document.querySelectorAll('[data-task-id]').forEach(input => input.onchange = async () => {
    if (await action('item:toggle', { id: input.dataset.taskId })) {
      const item = currentNote().items.find(n => n.id === input.dataset.taskId);
      input.checked = item.done;
      input.closest('.task-row').classList.toggle('done', item.done); updateDetail();
    } else input.checked = !input.checked;
  });
  document.querySelectorAll('[data-item-text]').forEach(input => {
    input.oninput=event=>{const cursor=categoryCursorFor(event,input);input.dataset.pendingCategory=String(cursor!==null&&categoryText.tokens(input.value).some(token=>cursor>token.start&&cursor<=token.end));action('item:update',{id:input.dataset.itemText,title:input.value,categoryCursor:cursor});};
    input.onblur=()=>{if(input.dataset.pendingCategory==='true'){input.dataset.pendingCategory='false';action('item:update',{id:input.dataset.itemText,title:input.value});}};
  });
  renderSourceTasks();
  document.querySelectorAll('[data-trash-item]').forEach(button => button.onclick = async () => {
    if (await action('item:trash', { id: button.dataset.trashItem })) { renderItems(); toast('Tarefa movida para a lixeira de tarefas.'); }
  });
  updateDetail();
}
function renderSchedule() {
  const note = currentNote(); if (!note || !$('#schedule-panel')) return;
  const status = note.enabled ? 'Alerta sonoro agendado.' : note.fired ? 'Alerta já disparado. Você pode agendar novamente.' : 'Escolha um horário e clique em Agendar.';
  $('#schedule-panel').innerHTML = `<form id="schedule-form" class="schedule-fields"><label>Dia e horário<input id="reminder-due" type="datetime-local" aria-label="Dia e horário do alerta" required min="${localDate(Date.now())}" value="${note.scheduledAt ? localDate(Date.parse(note.scheduledAt)) : ''}"></label><button class="primary" type="submit">${actionLabel('calendar',note.enabled ? 'Reagendar' : 'Agendar')}</button><button class="primary" id="test-sound" type="button">${actionLabel('sound','Testar som')}</button></form><div class="schedule-status"><span id="schedule-status">${status}</span>${note.enabled ? `<button id="cancel-schedule">${actionLabel('close','Cancelar alerta')}</button>` : ''}</div>`;
  $('#reminder-due').onchange = async () => {
    const raw = $('#reminder-due').value;
    const date = raw ? new Date(raw) : null;
    if (date && !Number.isFinite(date.getTime())) return;
    if (await action('schedule:draft', { id: note.id, due: date?.toISOString() || null })) {
      $('#schedule-status').textContent = 'Horário salvo. Clique em Agendar para ativar o alerta.';
      $('#cancel-schedule')?.remove();
    }
  };
  $('#schedule-form').onsubmit = async event => {
    event.preventDefault();
    const date = new Date($('#reminder-due').value);
    if (!Number.isFinite(date.getTime())) { toast('Escolha um dia e um horário válidos.'); return; }
    if (await action('schedule:activate', { id: note.id, due: date.toISOString() })) { renderSchedule(); toast('Alerta sonoro agendado.'); }
  };
  $('#test-sound').onclick = () => window.notebook.sound();
  if ($('#cancel-schedule')) $('#cancel-schedule').onclick = async () => { if (await action('schedule:cancel', { id: note.id })) renderSchedule(); };
}
function cancelTurn() {
  animationGeneration++; $('#flip-layer').replaceChildren(); $('.notebook').classList.remove('turning'); $('.notebook').removeAttribute('aria-busy');
}
async function turn(name, input = {}) {
  cancelTurn(); closeDrawer();
  const generation = animationGeneration;
  const original = $('#sheet'), clone = original.cloneNode(true);
  clone.classList.add('flipping-sheet'); clone.removeAttribute('id'); clone.inert = true;
  const originals = original.querySelectorAll('input,textarea');
  clone.querySelectorAll('input,textarea').forEach((field, index) => { field.value = originals[index].value; if (field.tagName === 'TEXTAREA') field.textContent = field.value; });
  clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  if (!await action(name, input) || generation !== animationGeneration) return false;
  view = state.activeView; render();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  $('.notebook').classList.add('turning'); $('.notebook').setAttribute('aria-busy', 'true'); $('#flip-layer').append(clone);
  await new Promise(resolve => setTimeout(resolve, 840));
  if (generation !== animationGeneration) return false;
  clone.remove(); $('.notebook').classList.remove('turning'); $('.notebook').removeAttribute('aria-busy'); return true;
}
async function createNote() {
  if(view==='notebooks') {openNotebookDialog();return;}
  const type = view === 'home' ? 'notes' : view === 'archive' ? trashType : view;
  const day = type === 'reminders' && !reminderEditor ? calendarDay : null;
  if (await turn('note:create', { type })) {
    if (day) {
      const due = new Date(day + 'T09:00:00');
      if (calendarDateKey(new Date()) === day && due.getTime() <= Date.now()) due.setTime(Date.now() + 60 * 60 * 1000);
      if (await action('schedule:draft', { id: currentNote().id, due: due.toISOString() })) renderSchedule();
    }
    $('#note-title')?.focus(); $('#note-title')?.select();
  }
}
function openDrawer() { if(view==='notebooks') {$('#notebook-new')?.focus();return;} if (view === 'home') { $('#daily-select')?.focus(); return; } renderDrawer(); $('#notes-drawer').hidden = false; $('#search').focus(); }
function closeDrawer() { $('#notes-drawer').hidden = true; $('#search').value = ''; }
function renderDrawer() {
  $('#drawer-title').textContent = labels[view].heading;
  const query = $('#search').value.toLocaleLowerCase('pt-BR');
  const notes = visibleNotes().filter(note => `${note.title} ${note.body} ${note.items.map(item => item.title).join(' ')}`.toLocaleLowerCase('pt-BR').includes(query));
  $('#notes-list').innerHTML = notes.length ? notes.map(note => `<button class="note-list-item ${note.id === state.selected[view] ? 'selected' : ''}" data-note-id="${escape(note.id)}"><strong>${escape(note.title || 'Sem título')}</strong><small>${note.type === 'tasks' ? `${listDate(note.created)} · ${note.items.filter(item => item.done).length} / ${note.items.length} concluídas` : `${prettyDate(note.updated)} · ${escape(note.body.replace(/\s+/g, ' ').slice(0, 90) || 'Página em branco')}`}</small></button>`).join('') : '<div class="empty"><p>Nenhuma página por aqui.</p></div>';
  $('#notes-list').querySelectorAll('[data-note-id]').forEach(button => button.onclick = () => {
    if (button.dataset.noteId === state.selected[view] && !(view === 'reminders' && !reminderEditor)) closeDrawer(); else turn('note:select', { id: button.dataset.noteId });
  });
}
function renderTrash() {
  const rows = state.notes.filter(note => note.trashed && note.type === trashType).map(note => ({ ...note, kind: 'note', detail: `${note.deletedAt ? 'Removida em '+formatDateTime(note.deletedAt) : 'Data da remoção não registrada'} · ${note.type === 'tasks' ? `${note.items.length} tarefas` : note.body.replace(/\s+/g, ' ').slice(0, 50)}` }));
  if (trashType === 'tasks') rows.push(...state.trashItems.map(item => ({ ...item, kind: 'item', detail: `Item da lista ${item.noteTitle || 'Sem título'}` })));
  if (trashType === 'notes') rows.push(...(state.trashCuts || []).map(cut => ({ ...cut, kind: 'cut', detail: `Mídia da nota ${state.notes.find(note => note.id === cut.noteId)?.title || 'Sem título'}` })));
  rows.push(...(state.trashSourceActions||[]).filter(item=>item.kind===(trashType==='tasks'?'task':trashType==='reminders'?'reminder':'none')).map(item=>({...item,kind:'source',detail:'Ação da nota '+item.noteTitle})));
  const count = type => (state.trashSourceActions||[]).filter(item=>item.kind===(type==='tasks'?'task':type==='reminders'?'reminder':'none')).length + state.notes.filter(note => note.trashed && note.type === type).length + (type === 'tasks' ? state.trashItems.length : type === 'notes' ? (state.trashCuts || []).length : 0);
  $('#page-content').innerHTML = `<div class="view-toolbar"><span class="toolbar-heading">${actionLabel('archive','Lixeira')}</span><span>${rows.length} ${rows.length === 1 ? 'item' : 'itens'}</span></div><h1>Guardado por tipo</h1><p class="view-description">Restaure uma página ou exclua definitivamente.</p><div class="trash-tabs">${Object.entries(labels).map(([type]) => `<button data-trash-type="${type}" class="${trashType === type ? 'active' : ''}" aria-pressed="${trashType === type}">${actionLabel(type,`${{ notes: 'Notas', tasks: 'Tarefas', reminders: 'Lembretes' }[type]} (${count(type)})`)}</button>`).join('')}</div><div class="scroll-list">${rows.length ? rows.map(row => `<div class="archive-row"><div class="row-copy"><strong>${escape(row.title || 'Sem título')}</strong><small>${escape(row.detail)}</small></div><div class="trash-actions"><button data-restore-id="${escape(row.id)}" data-kind="${row.kind}">${actionLabel('restore','Restaurar')}</button><button class="purge" data-purge-id="${escape(row.id)}" data-kind="${row.kind}">${actionLabel('trash','Excluir definitivamente')}</button></div></div>`).join('') : empty('Lixeira vazia por aqui.', `As ${trashType === 'tasks' ? 'listas e tarefas removidas' : trashType === 'reminders' ? 'notas de lembrete removidas' : 'notas removidas'} ficam nesta seção.`, 'archive')}</div>`;
  document.querySelectorAll('[data-trash-type]').forEach(button => button.onclick = () => { trashType = button.dataset.trashType; renderTrash(); });
  document.querySelectorAll('[data-restore-id]').forEach(button => button.onclick = async () => { if (await turn(button.dataset.kind + ':restore', { id: button.dataset.restoreId })) toast('De volta ao caderno.'); });
  document.querySelectorAll('[data-purge-id]').forEach(button => button.onclick = async () => {
    try {
      const result = await window.notebook.purge(button.dataset.kind, button.dataset.purgeId);
      if (result) { state = result; renderTrash(); saved(); toast('Item excluído definitivamente.'); }
    } catch (error) { toast(error.message); }
  });
}
$('.spiral').innerHTML = Array.from({ length: 7 }, () => '<svg viewBox="0 0 30 65"><ellipse cx="12" cy="50" rx="6" ry="5" fill="#292a22"/><path d="M12 48C27 45 25 5 14 5C4 5 5 23 10 26" fill="none" stroke="#292a22" stroke-width="7" stroke-linecap="round"/><path d="M14 9C20 13 21 36 14 42" fill="none" stroke="#8a8969" stroke-width="2" stroke-linecap="round"/></svg>').join('');
document.querySelectorAll('[data-view]').forEach(button => button.onclick = async () => {
  cancelTurn(); closeDrawer();
  if (await action('view:select', { view: button.dataset.view })) { view = state.activeView; render(); }
});
$('#sidebar-toggle').onclick = async () => {
  cancelTurn();
  if (await action('ui:sidebar', { collapsed: !state.sidebarCollapsed })) renderSidebar();
};
$('#search').oninput = renderDrawer;
$('#drawer-close').onclick = closeDrawer;
for (const name of ['close', 'minimize', 'maximize']) $(`#${name}`).onclick = () => window.notebook.window(name);
$('#sheet').addEventListener('dblclick', event => {
  if (event.target.closest('button,input,textarea,select,a,[contenteditable],[data-resize],#page-content,.book-footer')) return;
  const top = $('#sheet').getBoundingClientRect().top;
  if (event.clientY < top + 92) { event.preventDefault(); window.notebook.window('maximize'); }
});
document.querySelectorAll('[data-resize]').forEach(handle => {
  let active = false;
  handle.onpointerdown = event => {
    if (event.button !== 0) return;
    event.preventDefault(); active = true; handle.setPointerCapture(event.pointerId);
    window.notebook.resize('start', { edge: handle.dataset.resize, x: event.screenX, y: event.screenY });
  };
  handle.onpointermove = event => {
    if (active) window.notebook.resize('move', { x: event.screenX, y: event.screenY });
  };
  const end = () => { if (active) window.notebook.resize('end'); active = false; };
  handle.onpointerup = end; handle.onpointercancel = end; handle.onlostpointercapture = end;
});
window.notebook.onWindowState(info => {
  document.body.classList.toggle('vertical-expanded', info.expanded);
  $('#maximize').setAttribute('aria-label', info.expanded ? 'Restaurar tamanho' : 'Maximizar janela');
});
// Drag the stationery without turning controls or scrollbars into drag areas.
let movingPointer = null;
document.addEventListener('pointerdown', event => {
  const target = event.target;
  if (event.button !== 0 || !target.closest('.notebook, .sidebar')) return;
  if (target.closest('input, textarea, button, select, a, [contenteditable], [data-resize]')) return;
  const scroller = target.closest('.scroll-list, #notes-list');
  if (scroller && event.clientX >= scroller.getBoundingClientRect().left + scroller.clientWidth) return;
  event.preventDefault(); movingPointer = event.pointerId;
  target.setPointerCapture(event.pointerId);
  document.body.classList.add('moving-window');
  window.notebook.move('start');
});
document.addEventListener('pointermove', event => {
  if (movingPointer === event.pointerId) window.notebook.move('move');
});
function endMove(event) {
  if (movingPointer !== event.pointerId) return;
  window.notebook.move('end'); movingPointer = null;
  document.body.classList.remove('moving-window');
}
document.addEventListener('pointerup', endMove);
document.addEventListener('pointercancel', endMove);
document.addEventListener('lostpointercapture', endMove);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeDrawer();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); createNote(); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f' && view !== 'archive') { event.preventDefault(); openDrawer(); }
});
window.notebook.onSaveError(message => { $('#save-state').textContent = 'Falha ao salvar'; $('#save-state').classList.add('failed'); toast(message, 12000); });
window.notebook.onNavigate(next => { cancelTurn(); closeDrawer(); state = next; view = state.activeView; render(); });
window.notebook.onReminder(async reminders => {
  state = await window.notebook.state();
  if (view === 'reminders') { if (reminderEditor) renderSchedule(); else renderReminderCalendar(); }
  if (view === 'notes') {renderSmartMargin();renderSourceMargin();}
  if (view === 'home') refreshHomePanels();
  updateTemporalLabels();
  toast(`Lembrete: ${reminders.map(reminder => reminder.title || 'Sem título').join(' · ')}`, 12000);
});
document.addEventListener('DOMContentLoaded',()=>{window.notebook.state().then(next => { state = next; view = state.activeView; render(); });});

async function exportCurrentPDF(){
 const note=currentNote(),button=$('#export-pdf');if(!note||button.disabled)return;
 button.disabled=true;button.setAttribute('aria-busy','true');
 try{
  const editor=$('#note-body');
  if(!await action('note:update',{id:note.id,title:$('#note-title').value,...(editor?{body:editor.value,...(editor.dataset.structured==='true'?{editorDoc:readEditorDocument()}:{})}:{})},{history:false}))return;
  const result=await window.notebook.exportPDF(note.id);
  if(!result.canceled)toast('PDF exportado.');
 }catch(error){toast('Não foi possível exportar o PDF. '+error.message.replace(/^Error invoking remote method '[^']+': Error: /,''));}
 finally{button.disabled=false;button.removeAttribute('aria-busy');}
}
