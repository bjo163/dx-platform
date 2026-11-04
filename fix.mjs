import fs from 'fs';
let s = fs.readFileSync('todo.md','utf8');
if (s.includes('- [ ] Tambahkan `NEURALFORGE_BANNER`')) {
  s = s.split('- [ ] Tambahkan `NEURALFORGE_BANNER`')[0] + '- [x] Tambahkan `NEURALFORGE_BANNER` constant dan pakai di CLI\n' + s.split('- [ ] Tambahkan `NEURALFORGE_BANNER`')[1].replace(/.*\n/, '');
  fs.writeFileSync('todo.md', s);
  console.log('fixed');
} else {
  console.log('ok');
}
