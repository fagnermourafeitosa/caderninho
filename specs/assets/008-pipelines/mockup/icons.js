// Mockup-only: injects the stroke icon set and the shared sidebar/book chrome.
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute"><defs>
<symbol id="cal" viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2.5v3M13 2.5v3"/></symbol>
<symbol id="books" viewBox="0 0 20 20"><path d="M3 4v12M6.5 4v12M10 4.5l3.5 11.5M14 4l3 11"/></symbol>
<symbol id="note" viewBox="0 0 20 20"><path d="M10 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5V10"/><path d="M15 2.5l2.5 2.5L10 12.5H7.5V10z"/></symbol>
<symbol id="check" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="2.5"/><path d="M6.5 10l2.5 2.5 4.5-5"/></symbol>
<symbol id="tick" viewBox="0 0 20 20"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></symbol>
<symbol id="bell" viewBox="0 0 20 20"><path d="M5 14V9a5 5 0 0 1 10 0v5l1.5 1.5h-13zM8.5 17.5h3"/></symbol>
<symbol id="board" viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="15" height="11" rx="1.5"/><path d="M10 14.5v3M6.5 17.5h7"/><rect x="5" y="6" width="4" height="4" rx=".5"/><path d="M11 8h4M11 11h3"/></symbol>
<symbol id="kanban" viewBox="0 0 20 20"><rect x="3" y="3.5" width="4" height="13" rx="1"/><rect x="8" y="3.5" width="4" height="9" rx="1"/><rect x="13" y="3.5" width="4" height="11" rx="1"/></symbol>
<symbol id="trash" viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="4" rx="1"/><path d="M4.5 8v7.5A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5V8M8 11h4"/></symbol>
<symbol id="back" viewBox="0 0 20 20"><path d="M12.5 4l-6 6 6 6"/></symbol>
<symbol id="right" viewBox="0 0 20 20"><path d="M7.5 4l6 6-6 6"/></symbol>
<symbol id="down" viewBox="0 0 20 20"><path d="M4 7.5l6 6 6-6"/></symbol>
<symbol id="plus" viewBox="0 0 20 20"><path d="M10 4v12M4 10h12"/></symbol>
<symbol id="x" viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15"/></symbol>
<symbol id="search" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5"/><path d="M12.5 12.5L17 17"/></symbol>
<symbol id="more" viewBox="0 0 20 20"><path d="M4.5 10h.01M10 10h.01M15.5 10h.01" stroke-width="2.4"/></symbol>
<symbol id="comment" viewBox="0 0 20 20"><path d="M3.5 5a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 16.5 5v7a1.5 1.5 0 0 1-1.5 1.5H8l-3.5 3v-3a1 1 0 0 1-1-1z"/></symbol>
<symbol id="image" viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" rx="1.5"/><circle cx="7.5" cy="8" r="1.3"/><path d="M3.5 14.5l4.5-4 3 2.5 2-1.5 3.5 3"/></symbol>
<symbol id="user" viewBox="0 0 20 20"><circle cx="10" cy="7" r="3.2"/><path d="M4 17c.8-3.2 3.2-4.8 6-4.8s5.2 1.6 6 4.8"/></symbol>
<symbol id="clock" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2"/></symbol>
<symbol id="history" viewBox="0 0 20 20"><path d="M3.5 10a6.5 6.5 0 1 0 2-4.7M3.5 3.5v3h3M10 6.5V10l2.5 1.5"/></symbol>
<symbol id="pencil" viewBox="0 0 20 20"><path d="M13.5 3.5l3 3L7 16H4v-3z"/></symbol>
<symbol id="del" viewBox="0 0 20 20"><path d="M4 6h12M8 6V4h4v2M5.5 6l.8 10.5h7.4L14.5 6"/></symbol>
<symbol id="grip" viewBox="0 0 20 20"><path d="M7.5 5h.01M12.5 5h.01M7.5 10h.01M12.5 10h.01M7.5 15h.01M12.5 15h.01" stroke-width="2.2"/></symbol>
<symbol id="lock" viewBox="0 0 20 20"><rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/></symbol>
<symbol id="list" viewBox="0 0 20 20"><path d="M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01"/></symbol>
<symbol id="open" viewBox="0 0 20 20"><path d="M6 14L14 6M8 6h6v6"/></symbol>
<symbol id="graph" viewBox="0 0 20 20"><circle cx="5" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="10" cy="15" r="2"/><path d="M6.5 6.5L9 13M13.5 6.5L11 13M7 5h6"/></symbol>
</defs></svg>`);
function chrome(active, content, collapsed=false) {
  const rows = [['cal','Caderninho'],['books','Cadernos'],['note','Notas'],['check','Tarefas'],['bell','Lembretes'],['board','Quadros']];
  return `${collapsed?'':`<aside class="side"><h6>PESSOAL</h6>${rows.map(([i,l])=>`<div class="row ${l===active?'on':''}"><svg class="i"><use href="#${i}"/></svg>${l}</div>`).join('')}<div class="row gap"><svg class="i"><use href="#trash"/></svg>Lixeira</div></aside>`}
  <main class="book"><div class="fold"><svg class="i" style="width:10px"><use href="#${collapsed?'right':'back'}"/></svg></div><div class="tabs"><div class="tab a">Pessoal</div><div class="tab b"></div><div class="tab c"></div><div class="tab d">+</div></div>${content}</main>`;
}
const I = (id, extra='') => `<svg class="i" ${extra}><use href="#${id}"/></svg>`;
function card(title, date, comments, extra='') {
  return `<div class="card ${extra}"><strong>${title}</strong><div class="cm"><span>${date}</span><span class="sp"></span>${comments?`<span class="pill">${I('comment')}${comments} ${comments===1?'comentário':'comentários'}</span>`:''}</div></div>`;
}
