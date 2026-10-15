// Home: the day's reminders (today's reminders on the live page).
function homeRemindersSection() {
  const live = homeIsLive(), reminders = state.daily.overview.reminders;
  const body = `<div class="daily-items home-reminders">${reminders.length ? reminders.map(reminder => `<button class="daily-reminder" data-home-note="${escape(reminder.id)}" ${reminder.sourceActionId?`data-source-go="${escape(reminder.sourceActionId)}"`:''}><time>${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(reminder.due))}</time><span><strong>${escape(reminder.title || 'Sem título')}</strong><small>${reminder.expired?'Horário passou · Reagendar':reminder.fired ? '✓ Alerta disparado' : '◷ Agendado'}</small></span></button>`).join('') : '<p class="daily-empty">Nenhum alerta agendado.</p>'}</div>`;
  return homeStrip('reminders', { icon: 'reminders', label: live ? 'Lembretes de hoje' : 'Lembretes' }, live ? `<button class="daily-link" data-home-view="reminders">${actionLabel('open', 'Ver lembretes')}</button>` : '', body, 'daily-section home-card');
}
