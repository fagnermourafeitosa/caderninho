const calendarDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
let calendarMonth, calendarDay;
function resetReminderCalendar() {
  const today = new Date();
  calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  calendarDay = calendarDateKey(today);
}
resetReminderCalendar();

function calendarReminders() {
  return state.notes.filter(note => !note.trashed && note.notebookId===state.activeNotebook && note.scheduledAt && (note.enabled || note.fired))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}
function reminderCalendarRows(notes) {
  return notes.map(note => `<button class="calendar-reminder" data-calendar-note="${escape(note.id)}"><time>${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(note.scheduledAt))}</time><span><strong>${escape(note.title || 'Sem título')}</strong><small>${note.fired ? '✓ Alerta disparado' : '◷ Agendado'}${note.type === 'notes' ? ' · Na nota' : ''}</small></span><span aria-hidden="true">↗</span></button>`).join('');
}
function renderReminderCalendar() {
  const events = calendarReminders(), today = calendarDateKey(new Date());
  const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
  const first = new Date(year, month, 1, 12), start = new Date(year, month, 1 - first.getDay(), 12);
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarMonth);
  const byDay = new Map();
  for (const note of events) {
    const key = calendarDateKey(new Date(note.scheduledAt));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(note);
  }
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12);
    const day = calendarDateKey(date), reminders = byDay.get(day) || [], selected = day === calendarDay;
    return `<button class="calendar-day ${date.getMonth() !== month ? 'outside-month' : ''} ${day === today ? 'is-today' : ''} ${selected ? 'selected' : ''}" data-calendar-day="${day}" aria-pressed="${selected}" ${day === today ? 'aria-current="date"' : ''} aria-label="${escape(dayLabel(day))}, ${reminders.length} ${reminders.length === 1 ? 'lembrete' : 'lembretes'}"><span class="calendar-number">${date.getDate()}</span><span class="calendar-dots" aria-hidden="true">${reminders.slice(0, 4).map(note => `<i class="${note.fired ? 'fired' : ''}"></i>`).join('')}${reminders.length > 4 ? `<small>+${reminders.length - 4}</small>` : ''}</span>${reminders.length ? `<small class="calendar-count">${reminders.length} ${reminders.length === 1 ? 'lembrete' : 'lembretes'}</small>` : ''}</button>`;
  }).join('');
  const selected = byDay.get(calendarDay) || [];
  const drafts = state.notes.filter(note => note.type === 'reminders' && !note.trashed && note.notebookId===state.activeNotebook && !note.enabled && !note.fired);
  $('#page-content').innerHTML = `<div class="view-toolbar"><button id="notes-open">☰ Seus lembretes</button><button id="new-note" class="add-note">+ Novo lembrete</button></div><div class="calendar-heading"><div><h1>Lembretes</h1><p>Escolha um dia para ver seus alertas.</p></div><div class="calendar-navigation"><button id="calendar-prev" aria-label="Mês anterior">‹</button><h2 id="calendar-month">${escape(monthLabel)}</h2><button id="calendar-next" aria-label="Próximo mês">›</button><button id="calendar-today">Hoje</button></div></div><div class="calendar-scroll scroll-list"><div class="calendar-weekdays" aria-hidden="true">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid" role="group" aria-label="Calendário de ${escape(monthLabel)}">${cells}</div><section class="calendar-agenda"><div class="daily-section-heading"><h2>${escape(dayLabel(calendarDay, true))}</h2><span>${selected.length} ${selected.length === 1 ? 'lembrete' : 'lembretes'}</span></div>${selected.length ? reminderCalendarRows(selected) : '<p class="daily-empty">Nenhum alerta neste dia. Use + Novo lembrete para agendar.</p>'}</section>${drafts.length ? `<section class="calendar-drafts"><div class="daily-section-heading"><h2>Sem agendamento</h2><span>${drafts.length}</span></div>${drafts.map(note => `<button class="calendar-draft" data-calendar-note="${escape(note.id)}"><strong>${escape(note.title || 'Sem título')}</strong><span>Escolher horário ↗</span></button>`).join('')}</section>` : ''}</div>`;
  $('#notes-open').onclick = openDrawer;
  $('#new-note').onclick = createNote;
  const shift = delta => {
    calendarMonth = new Date(year, month + delta, 1, 12);
    calendarDay = calendarDateKey(calendarMonth); renderReminderCalendar();
  };
  $('#calendar-prev').onclick = () => shift(-1);
  $('#calendar-next').onclick = () => shift(1);
  $('#calendar-today').onclick = () => { resetReminderCalendar(); renderReminderCalendar(); };
  document.querySelectorAll('[data-calendar-day]').forEach(button => button.onclick = () => {
    calendarDay = button.dataset.calendarDay;
    const date = new Date(calendarDay + 'T12:00:00');
    calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    renderReminderCalendar();
  });
  document.querySelectorAll('[data-calendar-note]').forEach(button => button.onclick = () => turn('note:select', { id: button.dataset.calendarNote }));
}
