// Settings scenario (spec 010): entry points, alert modes reaching the reminder check, keep on top in sync with the Window menu.
const { Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (condition, label) => { if (!condition) throw new Error(label); };
const menuItem = label => Menu.getApplicationMenu().items.flatMap(item => item.submenu?.items || []).find(item => item.label === label);

async function runSettingsSmoke(win, { configure, store, related }) {
  const run = script => win.webContents.executeJavaScript(script);
  const sounds = [];
  let notificationAsks = 0;
  configure({ playSound: input => sounds.push(input), notifications: () => { notificationAsks++; return false; } });
  const onSettings = () => run("Boolean(document.querySelector('#settings-page')) && view === 'settings'");
  const home = () => run("(async()=>{state=await window.notebook.action('view:select',{view:'home'});view='home';render();})()");
  const choose = (selector, value) => run(`(()=>{const field=document.querySelector(${JSON.stringify(selector)});field.value=${JSON.stringify(value)};field.dispatchEvent(new Event('change',{bubbles:true}));})()`);

  // Entry points: sidebar item below a separator, the menu command and the app menu item.
  check(await run("(()=>{const item=document.querySelector('.sidebar-footer [data-view=\"settings\"]');return Boolean(item)&&item.textContent.trim()==='Ajustes';})()"), 'Item Ajustes no rodapé do menu lateral');
  await run("document.querySelector('[data-view=\"settings\"]').click()"); await wait(300);
  check(await onSettings(), 'Menu lateral abre os Ajustes');
  await home(); await wait(100);
  win.webContents.send('notebook:command', 'open-settings'); await wait(300);
  check(await onSettings(), 'Comando open-settings abre os Ajustes');
  if (process.platform === 'darwin') {
    const item = menuItem('Ajustes…');
    check(item && item.accelerator === 'CommandOrControl+,', 'Ajustes… com Cmd+, no menu do app');
    await home(); await wait(100); item.click(); await wait(300);
    check(await onSettings(), 'Menu Ajustes… abre os Ajustes');
  }

  // Nota > Nova nota on the settings page creates a plain note instead of failing.
  const notesBefore = store.snapshot().notes.filter(note => note.type === 'notes').length;
  win.webContents.send('notebook:command', 'new-note'); await wait(1200);
  check(store.snapshot().notes.filter(note => note.type === 'notes').length === notesBefore + 1 && await run("view === 'notes' && document.querySelector('#toast').hidden"), 'Nova nota nos Ajustes cria uma nota sem erro');
  win.webContents.send('notebook:command', 'open-settings'); await wait(300);
  check(await onSettings(), 'Ajustes reabre depois da nova nota');

  // Keyboard: a change keeps the focused control in place, so arrows keep moving the volume.
  const kept = await run("(async()=>{const field=document.querySelector('#settings-alert-volume');field.focus();field.value='70';field.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,300));return field.isConnected&&document.activeElement===field;})()");
  check(kept, 'Mudar o volume mantém o foco no controle');

  // Alerts: choices save at once and drive "Testar som".
  const firstSound = await run("document.querySelector('#settings-alert-sound option:nth-child(2)')?.value || 'caderninho'");
  await choose('#settings-alert-mode', 'sound'); await wait(150);
  await choose('#settings-alert-sound', firstSound); await wait(150);
  await choose('#settings-alert-volume', '40'); await wait(150);
  check(store.getSetting('alert_mode') === 'sound' && store.getSetting('alert_sound') === firstSound && store.getSetting('alert_volume') === '40', 'Ajustes de alerta salvos no SQLite');
  check(await run("document.querySelector('#settings-test-notification').disabled"), 'Só som desativa a notificação de teste');
  await run("document.querySelector('#settings-test-sound').click()"); await wait(150);
  check(sounds.length === 1 && sounds[0].volume === 0.4 && sounds[0].file, 'Testar som toca o som e o volume escolhidos: ' + JSON.stringify(sounds));
  check(await run("Boolean(document.querySelector('#settings-open-notifications')) && document.querySelector('#settings-page').textContent.includes('permita as notificações do Caderninho')"), 'Botão e dica das notificações do macOS');

  // A due reminder follows the alert mode.
  const remind = async () => {
    store.dispatch('note:create', { type: 'notes', title: 'Lembrete dos ajustes' });
    const id = store.snapshot().selected.notes;
    store.dispatch('schedule:activate', { id, due: new Date(store.now() + 1000).toISOString() });
    await wait(2600);
  };
  sounds.length = 0; notificationAsks = 0;
  await remind();
  check(sounds.length === 1 && notificationAsks === 0, 'Só som: toca e não notifica ' + JSON.stringify({ sounds, notificationAsks }));
  await choose('#settings-alert-mode', 'notification'); await wait(150);
  check(await run("document.querySelector('#settings-alert-sound').disabled && document.querySelector('#settings-alert-volume').disabled"), 'Só notificação desativa som e volume');
  // Test notification: posted when macOS offers notifications, explained when it does not.
  const posted = [];
  configure({ notifications: () => true, showNotification: input => posted.push(input) });
  await run("document.querySelector('#settings-test-notification').click()"); await wait(200);
  check(posted.length === 1 && posted[0].title === 'Caderninho', 'Notificação de teste enviada: ' + JSON.stringify(posted));
  configure({ notifications: () => { notificationAsks++; return false; } });
  await run("document.querySelector('#settings-test-notification').click()"); await wait(200);
  check(posted.length === 1 && await run("!document.querySelector('#toast').hidden && document.querySelector('#toast').textContent.includes('não estão disponíveis')"), 'Aviso quando não há notificações');
  sounds.length = 0; notificationAsks = 0;
  await remind();
  check(sounds.length === 0 && notificationAsks === 1, 'Só notificação: notifica e não toca ' + JSON.stringify({ sounds, notificationAsks }));

  // Keep on top: page and Window menu stay in sync.
  const onTopBox = () => run("document.querySelector('#settings-keep-on-top').checked");
  await run("document.querySelector('#settings-keep-on-top').click()"); await wait(200);
  check(win.isAlwaysOnTop() && menuItem('Manter na Frente')?.checked === true, 'Página liga Manter na frente e o menu acompanha');
  menuItem('Manter na Frente').click(); await wait(300);
  check(!win.isAlwaysOnTop() && !await onTopBox() && store.getSetting('keep_on_top') === '0', 'Menu desliga Manter na frente e a página acompanha');

  await runRelatedSection({ run, store, related, choose });

  fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'artifacts', 'settings.png'), (await win.webContents.capturePage()).toPNG());
  console.log('SETTINGS_SMOKE_OK', JSON.stringify({ sound: firstSound }));
}

// Notas relacionadas section (spec 011). Vectors are seeded and passes are no-ops, so the model is never downloaded.
async function runRelatedSection({ run, store, related, choose }) {
  const { documents } = require('../../src/main/related/domain/documents.cjs');
  const { version } = require('../../src/main/related/domain/model.cjs');
  related.scheduler.pass = async () => {};
  const create = title => { store.dispatch('note:create', { type: 'notes', title }); return store.snapshot().selected.notes; };
  const source = create('Viagem para a serra'); create('Roteiro da serra');
  for (const d of documents(store.snapshot())) store.db.prepare('INSERT OR REPLACE INTO related_vectors VALUES(?,?,?,?)').run(d.id, d.hash, version, JSON.stringify([1, 0]));
  related.scheduler.status = 'ready';
  const vectors = () => store.db.prepare('SELECT count(*) AS n FROM related_vectors').get().n;
  const openNote = async () => { await run(`(async()=>{state=await window.notebook.action('note:select',{id:${JSON.stringify(source)}});view=state.activeView;render();})()`); await wait(900); };
  const footerLinks = () => run("document.querySelectorAll('#footer-label [data-related-footer]').length");
  const openSettings = async () => { await run("(async()=>{await openSettings();})()"); await wait(400); };

  await openNote();
  check(await footerLinks() > 0, 'Rodapé mostra relacionadas com elas ligadas');
  await openSettings();
  check(await run("(()=>{const text=document.querySelector('#settings-related').textContent;return ['embeddinggemma-300m-ONNX','5090578','q4','Não baixado'].every(part=>text.includes(part))&&Boolean(document.querySelector('#settings-related-source'));})()"), 'Bloco do modelo com nome, revisão, q4, origem e estado');

  await run("document.querySelector('#settings-related-enabled').click()"); await wait(300);
  check(store.getSetting('related_enabled') === '0' && related.scheduler.status === 'disabled', 'Desligar salva e para a indexação');
  await openNote();
  check(await footerLinks() === 0, 'Rodapé sem relacionadas com elas desligadas');
  await run("openRelated()"); await wait(400);
  check(await run("document.querySelector('#related-content').textContent.includes('desligadas em Ajustes')"), 'Diálogo explica que estão desligadas');
  await run("document.querySelector('#related-dialog').close()");
  await openSettings();
  await run("document.querySelector('#settings-related-enabled').click()"); await wait(300);
  related.scheduler.status = 'ready';
  await openNote();
  check(await footerLinks() > 0, 'Religar mostra as relacionadas de novo');

  await openSettings();
  await choose('#settings-related-limit', '3'); await wait(200);
  await choose('#settings-related-sensitivity', 'strict'); await wait(200);
  check(store.getSetting('related_limit') === '3' && store.getSetting('related_sensitivity') === 'strict', 'Quantidade e sensibilidade salvas');
  await run("document.querySelector('#settings-related-reset').click()"); await wait(300);
  check(store.getSetting('related_limit') === '8' && store.getSetting('related_sensitivity') === 'balanced' && await run("document.querySelector('#settings-related-limit').value==='8'&&document.querySelector('#settings-related-sensitivity').value==='balanced'"), 'Restaurar padrão volta a 8 e Equilibrada');

  // A failed save puts the control back to the stored value.
  const realUpdate = related.useCases.updateRelatedSettings;
  related.useCases.updateRelatedSettings = () => { throw new Error('falha simulada'); };
  await run("document.querySelector('#settings-related-enabled').click()"); await wait(300);
  related.useCases.updateRelatedSettings = realUpdate;
  check(await run("document.querySelector('#settings-related-enabled').checked") && store.getSetting('related_enabled') === '1', 'Falha ao salvar volta o interruptor ao valor salvo');
  // A link that cannot open shows a notice instead of an unhandled rejection.
  await run("openRelatedSource('javascript:alert(1)')"); await wait(300);
  check(await run("!document.querySelector('#toast').hidden && document.querySelector('#toast').textContent.includes('Não foi possível abrir o link')"), 'Link que não abre mostra aviso');

  const before = vectors();
  await run("document.querySelector('#settings-related-clear').click()"); await wait(200);
  check(await run("document.querySelector('#related-clear-dialog').open"), 'Apagar cache pede confirmação');
  await run("document.querySelector('#related-clear-cancel').click()"); await wait(200);
  check(vectors() === before && before > 0, 'Cancelar não apaga nada');
  await run("document.querySelector('#settings-related-clear').click()"); await wait(200);
  await run("document.querySelector('#related-clear-confirm').click()"); await wait(600);
  check(vectors() === 0 && !await run("document.querySelector('#related-clear-dialog').open"), 'Confirmar apaga os vetores');
}

module.exports = { runSettingsSmoke };
