function installMediaLayout(store) {
  if (store.db.prepare('PRAGMA table_info(cuts)').all().some(column => column.name === 'layout_group')) return;
  store.transaction(() => {
    store.db.exec("ALTER TABLE cuts ADD COLUMN layout_group TEXT NOT NULL DEFAULT ''; ALTER TABLE cuts ADD COLUMN layout_order INTEGER NOT NULL DEFAULT 0; UPDATE cuts SET layout_group=id;");
  });
}
function sqliteLayoutRepository(store) {
  function read(noteId) {
    const note=store.note(noteId,'notes');
    if(note.trashed) throw new Error('Restaure o recorte antes de mover.');
    return store.db.prepare('SELECT id,layout_group AS groupId,layout_order AS position,anchor,side,width FROM cuts WHERE note_id=? AND trashed=0 ORDER BY created,rowid').all(noteId).map(row=>({...row}));
  }
  function write(noteId,next) {
    const stamp=new Date(store.now()).toISOString();
    const update=store.db.prepare('UPDATE cuts SET layout_group=?,layout_order=?,anchor=?,side=?,width=?,updated_at=? WHERE id=? AND note_id=? AND trashed=0');
    for(const item of next) update.run(item.groupId,item.position,item.anchor,item.side,item.width,stamp,item.id,noteId);
    store.db.prepare('UPDATE notes SET updated=? WHERE id=?').run(stamp,noteId);
  }
  return {
    read,
    initialize(noteId,work) { write(noteId,work(read(noteId))); },
    assertOwnership(noteId,ids) {
      for(const id of ids) {
        const row=store.db.prepare('SELECT note_id FROM cuts WHERE id=?').get(id);
        if(row&&row.note_id!==noteId)throw new Error('Posição do recorte inválida.');
      }
    },
    mutate(noteId,work) {
      store.transaction(() => {
        write(noteId,work(read(noteId)));
      });
      return store.snapshot();
    }
  };
}
module.exports={installMediaLayout,sqliteLayoutRepository};
