function formatDateTime(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'não registrado';
  return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
}
function noteDates(note) { return `Criada em <time datetime="${escape(note.created)}">${escape(formatDateTime(note.created))}</time> · Atualizada em <time datetime="${escape(note.updated)}">${escape(formatDateTime(note.updated))}</time>`; }
function temporalDetails(item) {
  return [`Criado: ${formatDateTime(item.created)}`,`Atualizado: ${formatDateTime(item.updated)}`,item.checkedAt && `Marcado: ${formatDateTime(item.checkedAt)}`,item.uncheckedAt && `Desmarcado: ${formatDateTime(item.uncheckedAt)}`,item.deletedAt && `Removido: ${formatDateTime(item.deletedAt)}`].filter(Boolean).join('\n');
}
function updateTemporalLabels() {
  const note = currentNote();
  if ($('#note-dates') && note) $('#note-dates').innerHTML=noteDates(note);
  if (note) {
    document.querySelectorAll('[data-task-id]').forEach(input => { const item=note.items.find(item=>item.id===input.dataset.taskId); if(item) input.title=temporalDetails(item); });
    document.querySelectorAll('.inline-check').forEach(input => { const lines=[...$('#note-body').querySelectorAll('.writing-line')],item=note.inlineTasks.find(item=>item.lineIndex===lines.indexOf(input.closest('.writing-line'))); if(item) input.title=temporalDetails(item); });
    document.querySelectorAll('[data-cut-id]').forEach(card=>{ const cut=note.cuts.find(cut=>cut.id===card.dataset.cutId); if(cut) card.title=temporalDetails(cut); });
  }
  if ($('#daily-body')) $('#daily-body').title=`Criada: ${formatDateTime(state.daily.created)}\nAtualizada: ${formatDateTime(state.daily.updated)}`;
}
