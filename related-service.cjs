const {Worker}=require('node:worker_threads');const path=require('node:path');const fs=require('node:fs');
const config=require('./related-config.cjs');const {documents,rank}=require('./related-engine.cjs');
class RelatedService {
 constructor(store,media,{ocrPath,onUpdate=()=>{}}={}) {
  this.store=store;this.media=media;this.cacheDir=path.join(store.directory,'models');this.ocrPath=ocrPath;this.onUpdate=onUpdate;this.status='idle';this.serial=0;this.pending=new Map();
  store.db.exec('CREATE TABLE IF NOT EXISTS related_vectors(id TEXT PRIMARY KEY,hash TEXT NOT NULL,model TEXT NOT NULL,vector TEXT NOT NULL); CREATE TABLE IF NOT EXISTS related_ocr(blob_id TEXT PRIMARY KEY,text TEXT NOT NULL,updated_at TEXT NOT NULL);');
 }
 worker() {
  if(!this.thread){this.thread=new Worker(path.join(__dirname,'related-worker.cjs'),{workerData:{cacheDir:this.cacheDir,ocrPath:this.ocrPath}});this.thread.on('message',m=>{if(m.status){this.status=m.status;this.onUpdate();return;}const job=this.pending.get(m.id);if(job){this.pending.delete(m.id);m.error?job.reject(Error(m.error)):job.resolve(m.result);}});this.thread.on('error',e=>{for(const job of this.pending.values())job.reject(e);this.pending.clear();this.thread=null;});this.thread.on('exit',()=>{for(const job of this.pending.values())job.reject(Error('Processo de indexação encerrado.'));this.pending.clear();this.thread=null;});}return this.thread;
 }
 job(input){return new Promise((resolve,reject)=>{const id=++this.serial;this.pending.set(id,{resolve,reject});this.worker().postMessage({...input,id});});}
 schedule(){if(this.closed)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.run(),config.debounceMs);}
 ocr(){return Object.fromEntries(this.store.db.prepare('SELECT blob_id,text FROM related_ocr').all().map(r=>[r.blob_id,r.text]));}
 async run(){if(this.closed)return;if(this.running){this.again=true;return;}this.running=true;this.status='indexing';this.onUpdate();try{
  if(process.platform==='darwin'&&fs.existsSync(this.ocrPath||'')) {
   for(const row of this.store.db.prepare("SELECT DISTINCT c.blob_id FROM cuts c JOIN notes n ON n.id=c.note_id LEFT JOIN related_ocr o ON o.blob_id=c.blob_id WHERE c.kind='image' AND c.trashed=0 AND n.trashed=0 AND o.blob_id IS NULL").all()) {
    const file=this.media.file(row.blob_id);if(file){const text=await this.job({kind:'ocr',file});this.store.db.prepare('INSERT OR REPLACE INTO related_ocr VALUES(?,?,?)').run(row.blob_id,text,new Date().toISOString());}
   }
  }
  const docs=documents(this.store.snapshot(),this.ocr());
  for(const d of docs){if(!d.text.trim())continue;const old=this.store.db.prepare('SELECT hash,model FROM related_vectors WHERE id=?').get(d.id);if(old?.hash===d.hash&&old?.model===config.version)continue;const vector=await this.job({kind:'embed',text:d.text});if(vector){this.store.db.prepare('INSERT OR REPLACE INTO related_vectors VALUES(?,?,?,?)').run(d.id,d.hash,config.version,JSON.stringify(vector));this.onUpdate();}}
  const active=new Set(docs.map(d=>d.id));for(const {id} of this.store.db.prepare('SELECT id FROM related_vectors').all())if(!active.has(id))this.store.db.prepare('DELETE FROM related_vectors WHERE id=?').run(id);
  this.status='ready';this.error=null;
 }catch(e){if(this.closed)return;this.status='error';this.error=e.message;console.error('Relacionados:',e.message);}finally{this.running=false;if(this.closed)return;this.onUpdate();if(this.again){this.again=false;this.schedule();}}}
 query(noteId){const docs=documents(this.store.snapshot(),this.ocr());const source=docs.find(d=>d.id==='page:'+noteId);if(!source)return {status:this.status,results:[]};const vectors={};const hashes=new Map(docs.map(d=>[d.id,d.hash]));for(const row of this.store.db.prepare('SELECT * FROM related_vectors WHERE model=?').all(config.version))if(hashes.get(row.id)===row.hash)vectors[row.id]=JSON.parse(row.vector);
 return {status:this.status,results:vectors[source.id]?rank(source,docs.filter(d=>vectors[d.id]),vectors):[]};}
 close(){this.closed=true;clearTimeout(this.timer);this.thread?.terminate();}
}
module.exports={RelatedService};
