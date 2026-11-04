import fs from 'fs';
const s = fs.readFileSync('todo.md','utf8');
const lines = s.replace(/\r\n/g,'\n').split('\n').filter(l=>l.trim());
for (let i=0; i<Math.min(60, lines.length); i++) {
  console.log(lines[i]);
}
