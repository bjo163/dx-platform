import fs from 'fs';
const s = fs.readFileSync('todo.md','utf8');
const lines = s.replace(/\r\n/g,'\n').split('\n').filter(l=>l.trim());
let c=0;
for (const l of lines){
  if (l.includes('- [ ]')){
    console.log(l);
    c++;
    if (c>40) break;
  }
}
