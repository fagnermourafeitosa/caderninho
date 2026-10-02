const {parentPort,workerData}=require('node:worker_threads');
const {execFile}=require('node:child_process');
const config=require('./related-config.cjs');
const fs=require('node:fs');const path=require('node:path');
let model,tokenizer;
async function load() {
 if(model)return;
 parentPort.postMessage({status:'loading'});
 const {env,AutoModel,AutoTokenizer}=await import('@huggingface/transformers');
 env.cacheDir=workerData.cacheDir;
 env.localModelPath=workerData.cacheDir+path.sep;
 const local=path.join(workerData.cacheDir,config.model);
 env.allowRemoteModels=!['config.json','tokenizer.json','tokenizer_config.json','onnx/model_q4.onnx','onnx/model_q4.onnx_data'].every(file=>fs.existsSync(path.join(local,file))); 
 tokenizer=await AutoTokenizer.from_pretrained(config.model,{revision:config.revision});
 model=await AutoModel.from_pretrained(config.model,{revision:config.revision,dtype:config.dtype,device:'cpu',session_options:{intra_op_num_threads:2,inter_op_num_threads:1}});
 parentPort.postMessage({status:'indexing'});
}
function normalize(values) {const norm=Math.hypot(...values);if(!norm || values.some(v=>!Number.isFinite(v)))throw Error('Embedding inválido.');return values.map(v=>v/norm);}
async function embed(text) {
 await load();
 // Process all text in bounded chunks; never silently drop the end of a page.
 const words=text.split(/\s+/);const chunks=[];let part='';
 for(const word of words){if(part.length+word.length>1800&&part){chunks.push(part);part='';}part+=(part?' ':'')+word;}if(part)chunks.push(part);
 const vectors=[];
 for(const chunk of chunks){const input=await tokenizer('task: sentence similarity | query: '+chunk,{truncation:true,max_length:2048});const result=await model(input);const vector=result.sentence_embedding;if(!vector)throw Error('Modelo não retornou sentence_embedding.');vectors.push(normalize(Array.from(vector.data)));}
 if(!vectors.length) return null;
 return normalize(vectors[0].map((_,i)=>vectors.reduce((sum,v)=>sum+v[i],0)/vectors.length));
}
parentPort.on('message',async job=>{
 try {
  if(job.kind==='ocr') {
   const text=await new Promise((resolve,reject)=>execFile(workerData.ocrPath,[job.file],{timeout:30000,maxBuffer:2*1024*1024},(err,out)=>err?reject(err):resolve(JSON.parse(out).text)));
   parentPort.postMessage({id:job.id,result:text});
  } else parentPort.postMessage({id:job.id,result:await embed(job.text)});
 }catch(error){parentPort.postMessage({id:job.id,error:error.message});}
});
