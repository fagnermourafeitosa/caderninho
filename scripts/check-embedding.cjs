// Manual integration check with the real pinned local model. Downloads only model files.
const {Worker}=require('node:worker_threads');const path=require('node:path');const {cosine}=require('../src/main/related-engine.cjs');
const worker=new Worker(path.join(__dirname,'..','src','main','related-worker.cjs'),{workerData:{cacheDir:path.join(__dirname,'..','artifacts','embedding-cache')}});
let serial=0;const pending=new Map();
worker.on('message',m=>{if(m.status)return;const job=pending.get(m.id);if(job){pending.delete(m.id);m.error?job.reject(Error(m.error)):job.resolve(m.result);}});
worker.on('error',e=>{for(const job of pending.values())job.reject(e);pending.clear();});
const embed=text=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});worker.postMessage({id,kind:'embed',text});});
(async()=>{try{
 const a=await embed('Reduzir os gastos com infraestrutura e serviços de nuvem.');
 const b=await embed('Optimize cloud infrastructure costs and reduce spending.');
 const c=await embed('Receita de bolo de cenoura com cobertura de chocolate.');
 if(a.length!==768||!a.every(Number.isFinite))throw Error('Vetor inválido.');
 const related=cosine(a,b),unrelated=cosine(a,c);
 if(related<=unrelated)throw Error('Par relacionado perdeu para assunto diferente.');
 console.log('EMBEDDING_LOCAL_OK',{dimensions:a.length,crossLanguage:related,unrelated});
}finally{await worker.terminate();if(process.versions.electron)require('electron').app.quit();}})().catch(e=>{console.error(e);process.exitCode=1;});
