const {execFileSync}=require('node:child_process');
const fs=require('node:fs'); const path=require('node:path');
if(process.platform==='darwin') {
 const root=path.join(__dirname,'..');const target=path.join(root,'native','caderninho-ocr');const src=path.join(root,'native','ocr.swift');
 if(!fs.existsSync(target)||fs.statSync(src).mtimeMs>fs.statSync(target).mtimeMs) execFileSync('/usr/bin/xcrun',['swiftc','-O',src,'-o',target]);
}
