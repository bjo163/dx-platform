import fs from 'fs';
let s = fs.readFileSync('todo.md','utf8');
const idx = s.indexOf('@wtagent/');
console.log(s.substring(Math.max(0,idx-30), idx+40));
