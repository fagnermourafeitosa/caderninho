let noteMutationQueue=Promise.resolve(),queuedNoteMutations=0;
const pendingNoteMutations=new Map();
const noteMutationPending=noteId=>Boolean(pendingNoteMutations.get(noteId));
function enqueueNoteMutation(work,noteId) {
  queuedNoteMutations++;
  if(noteId)pendingNoteMutations.set(noteId,(pendingNoteMutations.get(noteId)||0)+1);
  const result=noteMutationQueue.then(work);
  noteMutationQueue=result.catch(()=>{}).finally(()=>{
    queuedNoteMutations--;
    if(noteId){const count=pendingNoteMutations.get(noteId)-1;if(count)pendingNoteMutations.set(noteId,count);else pendingNoteMutations.delete(noteId);}
  });
  return result;
}
function historyMediaNote(note,history) {
  return {...note,cuts:note.cuts.map(cut=>({...cut,...history.current.mediaLayout?.find(item=>item.id===cut.id)}))};
}
function changeMediaLayout(method,input) {
  const note=state.notes.find(note=>note.id===input.noteId);if(!note)return Promise.resolve(false);
  const history=pageHistories.get(note.id)||ensurePageHistory(note),previous=history.current;
  let projected;
  try {
    projected=method==='mediaLayoutMove'?MediaLayoutDomain.move(previous.mediaLayout,input.cutId,input.target):MediaLayoutDomain.resize(previous.mediaLayout,input.cutId,input.width);
  }catch(error){toast(error.message);return Promise.resolve(false);}
  if(!history.record({...previous,mediaLayout:projected},null))return Promise.resolve(true);
  if(currentNote()?.id===input.noteId&&view==='notes')refreshMediaGroups(historyMediaNote(note,history));
  return enqueueNoteMutation(async()=>{
    pending++;beginSaving();
    try {
      state=await window.notebook[method](input);
      const fresh=state.notes.find(note=>note.id===input.noteId);
      history.reconcileMediaLayout(projected,noteMediaPlacements(fresh));
      if(currentNote()?.id===input.noteId&&view==='notes'){refreshMediaGroups(historyMediaNote(fresh,history));updateTemporalLabels();}
      return true;
    } catch(error) {
      history.reconcileMediaLayout(projected,previous.mediaLayout);
      const fresh=state.notes.find(note=>note.id===input.noteId);
      if(fresh&&currentNote()?.id===input.noteId&&view==='notes')refreshMediaGroups(historyMediaNote(fresh,history));
      $('#save-state').textContent='Falha ao salvar';$('#save-state').classList.add('failed');toast(error.message);return false;
    } finally {pending--;saved();}
  },input.noteId);
}
window.addEventListener('beforeunload',event=>{
  if(!queuedNoteMutations)return;
  event.preventDefault();event.returnValue=false;
  noteMutationQueue.then(()=>{if(!queuedNoteMutations&&!$('#save-state').classList.contains('failed'))window.close();});
});
