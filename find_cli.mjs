import fs from 'fs';
const walk=(d,o=[])=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=d+'/'+e.name;if(e.isDirectory()){if(e.name==='node_modules')continue;walk(f,o);}else if(f.includes('cli'))o.push(f);}return o;};
console.log(walk('packages').slice(0,15).join('\n'));
