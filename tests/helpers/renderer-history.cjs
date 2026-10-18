const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {EditHistory}=require('../../src/renderer/edit-history.js');
const domain=require('../../src/shared/media-layout/domain/layout.js');
const ROOT=path.join(__dirname,'../..');
function deferred() {let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
// Load the public save/history commands of ordered renderer scripts with presentation and IPC ports.
function rendererHistory({body='base',cuts=[],save=async()=>{},layout=async()=>{},importMedia=async()=>{},restore=async()=>{}}={}) {
  let persisted={id:'n',type:'notes',title:'Note',body,editorDoc:null,cuts};
  const writes=[],errors=[];let displayedCuts=cuts;
  const editor={id:'note-body',tagName:'TEXTAREA',value:body,selectionStart:0,selectionEnd:0,scrollTop:0,classList:{contains:()=>false},focus(){},setSelectionRange(){}};
  const title={id:'note-title',tagName:'INPUT',value:'Note',focus(){},setSelectionRange(){}};
  const label={textContent:'',classList:{add(){},contains:()=>false}},noop=()=>{};
  const snapshot=()=>({notes:[structuredClone(persisted)]});
  const context={EditHistory,MediaLayoutDomain:domain,console,Promise,JSON,Object,Map,Set,Date,Number,Math,
    state:snapshot(),view:'notes',pending:0,unfinishedCategoryNote:null,
    $:selector=>selector==='#note-body'?editor:selector==='#note-title'?title:label,
    document:{activeElement:editor,addEventListener:noop},
    window:{addEventListener:noop,notebook:{onHistory:noop,
      action:async(_name,input)=>{await save(input);persisted={...persisted,...input};writes.push(input.body);return snapshot();},
      mediaLayoutResize:async input=>{await layout(input);const next=domain.resize(placements(persisted),input.cutId,input.width);persisted.cuts=persisted.cuts.map(cut=>({...cut,...next.find(p=>p.id===cut.id)}));return snapshot();},
      link:async({placement})=>{await importMedia();persisted.cuts.push({id:'imported',groupId:'imported',position:0,anchor:0,side:'left',width:.5});const next=domain.move(placements(persisted),'imported',placement);persisted.cuts=persisted.cuts.map(cut=>({...cut,...next.find(p=>p.id===cut.id)}));return snapshot();},
      mediaLayoutRestore:async input=>{await restore(input);const next=domain.restore(placements(persisted),input.placements);persisted.cuts=persisted.cuts.map(cut=>({...cut,...next.find(p=>p.id===cut.id)}));return snapshot();},
    }},
    noteMediaPlacements:placements,getSelection:()=>({rangeCount:0}),categoryText:{tokens:()=>[]},
    beginSaving:noop,saved:noop,updateTemporalLabels:noop,renderCategoryBadges:noop,refreshRelatedSoon:noop,
    finishDiagramSession:noop,updateDetail:noop,renderSmartMargin:noop,renderSourceMargin:noop,renderPage:noop,
    toast:message=>errors.push(message),refreshImportedMedia:note=>{displayedCuts=note.cuts;},refreshMediaGroups:note=>{displayedCuts=note.cuts;},mountCollage:note=>{editor.value=note.body;},
  };
  context.currentNote=()=>context.state.notes[0];
  vm.createContext(context);
  for(const file of ['src/renderer/media-layout/mutations.js','src/renderer/undo.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
  const cutsSource=fs.readFileSync(path.join(ROOT,'src/renderer/cuts.js'),'utf8');
  vm.runInContext(cutsSource.slice(cutsSource.indexOf('function importCuts('),cutsSource.indexOf("$('#cut-dialog-close')")),context);
  const renderer=fs.readFileSync(path.join(ROOT,'src/renderer/renderer.js'),'utf8');
  vm.runInContext(renderer.slice(renderer.indexOf('function action('),renderer.indexOf('const illustration')),context);
  vm.runInContext('ensurePageHistory(currentNote())',context);
  return {
    editor,writes,errors,
    type(text){editor.value+=text;context.nextBody=editor.value;return vm.runInContext("action('note:update',{id:'n',body:nextBody})",context);},
    undo(){return vm.runInContext("editPageHistory('undo')",context);},
    redo(){return vm.runInContext("editPageHistory('redo')",context);},
    resize(width,id='card'){context.nextWidth=width;context.resizeId=id;return vm.runInContext("changeMediaLayout('mediaLayoutResize',{noteId:'n',cutId:resizeId,width:nextWidth})",context);},
    import(placement={kind:'block',anchor:0,side:'left'}){context.importPlacement=placement;return vm.runInContext("importCuts([],'https://example.com','n',importPlacement)",context);},
    displayed:()=>structuredClone(displayedCuts),
    render(){return vm.runInContext('ensurePageHistory(currentNote())',context);},
    flush:()=>vm.runInContext('noteMutationQueue',context),
    saved:()=>structuredClone(persisted),
  };
}
function placements(note){return note.cuts.map(({id,groupId,position,anchor,side,width})=>({id,groupId,position,anchor,side,width}));}
module.exports={rendererHistory,deferred};
