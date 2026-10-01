(async () => {
 const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
 const assert = (ok, label) => { if (!ok) throw new Error(label); };
 const fill = (selector, value) => { const element = document.querySelector(selector); element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); };
 await wait(200);
 fill('#quick-title', 'Uma ideia'); fill('#quick-body', 'Uma ideia capturada.'); await wait(180);
 assert((await window.quick.state()).draft.body === 'Uma ideia capturada.', 'Rascunho automático');
 assert(document.querySelector('#quick-dates').textContent.includes('Atualizado:'), 'Datas do rascunho independente visíveis');
 await window.quick.hide();
 // Refresh is also used when the global shortcut reopens a hidden sheet.
 await refresh();
 assert(document.querySelector('#quick-body').value === 'Uma ideia capturada.', 'Reabrir recupera texto');
 document.querySelector('#quick-form').requestSubmit(); await wait(250);
 assert(document.querySelector('#quick-body').value === '', 'Guardar limpa somente depois de gravar');
 assert(!document.querySelector('#quick-reveal').hidden, 'Link para abrir nota salva');
 const saved = await window.quick.state();
 const target = saved.notes.find(note => note.title === 'Uma ideia'); assert(target, 'Nota criada');
 fill('#quick-target', target.id); fill('#quick-body', 'Mais um detalhe.'); await wait(180);
 document.querySelector('#quick-form').requestSubmit(); await wait(250);
 assert((await window.quick.state()).draft.body === '', 'Transferência para nota existente');
 fill('#quick-title', 'Uma ideia para depois'); fill('#quick-body', 'Capturar primeiro.\nOrganizar depois.'); await wait(180);
 assert(document.querySelector('#quick-body').getBoundingClientRect().height > 100, 'Folha pequena com área legível');
 return { saved: true, appended: true, draftRecovered: true, errors: window.quickErrors };
})()
