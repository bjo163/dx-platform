import fs from 'fs';
const s = fs.readFileSync('todo.md','utf8');
const idx = s.indexOf('NEURALFORGE_BANNER');
console.log(s.substring(Math.max(0,idx-40), idx+80));
