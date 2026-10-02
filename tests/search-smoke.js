(async()=>{
 const assert=(value,label)=>{if(!value)throw Error(label);};
 const command=async(name,input)=>{state=await window.notebook.action(name,input);};
 await command('note:create',{type:'notes',title:'Café de amanhã'});const noteId=state.selected.notes;
 await command('note:update',{id:noteId,body:'Uma viagem inesquecível com <img src=x>'});
 await command('note:create',{type:'notes',title:'Viagem removida'});await command('note:trash',{id:state.selected.notes});
 await command('notebook:create',{name:'Outro caderno',color:'#c5d3ae'});
 await command('note:create',{type:'tasks',title:'Compras'});const taskId=state.selected.tasks;
 await command('item:create',{noteId:taskId,title:'Comprar passagens especiais'});
 for(const section of ['home','notes','tasks','reminders','archive','notebooks']){
  await command('view:select',{view:section});view=state.activeView;render();
  assert(!searchControl.classList.contains('open'),'Collapsed initially');
  searchToggle.click();assert(document.activeElement===searchInput,'Search focused in '+section);
  searchInput.value='cafe';renderGlobalSearch();assert(searchMatches[0]?.note.id===noteId,'Cross notebook accent search in '+section);
  closeGlobalSearch();
 }
 openGlobalSearch();searchInput.value='viagem';renderGlobalSearch();
 assert(searchMatches.length===1&&searchMatches[0].note.id===noteId,'Trash excluded');
 assert(!searchResults.querySelector('img'),'Escaped results');
 searchInput.value='passagens';renderGlobalSearch();assert(searchMatches[0]?.note.id===taskId,'Task content searchable');
 searchInput.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
 assert(searchInput.getAttribute('aria-activedescendant')==='global-result-0','Keyboard result selected');
 await selectGlobalResult(0);assert(view==='tasks'&&currentNote().id===taskId,'Result navigation');
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'f',metaKey:true,bubbles:true,cancelable:true}));
 assert(searchControl.classList.contains('open'),'Global shortcut');
 searchInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!searchControl.classList.contains('open'),'Escape closes');
 return {sections:6,accentInsensitive:true,taskContent:true,trashExcluded:true,navigation:true};
})()
