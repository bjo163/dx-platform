import fs from 'fs';
const s = fs.readFileSync('todo.md','utf8');
const done = (s.match(/\[x\]/gi)||[]).length;
const todo = (s.match(/\[ \]/gi)||[]).length;
console.log(done+','+todo);
