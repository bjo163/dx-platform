import fs from 'fs';
let s = fs.readFileSync('todo.md','utf8');
const items = [
  'Update `packages/cli/README.md` (kalo ada) jadi NeuralForge',
  'Ganti semua string "WTAgent API" -> "NeuralForge API" di web UI components',
  'Update favicon/title di `apps/web` kalo ada default Next.js',
  'Tambahkan `NEURALFORGE_BANNER` constant dan pakai di CLI',
];
for (const it of items) {
  const old = '- [ ] ' + it;
  const neu = '- [x] ' + it;
  if (s.includes(old)) s = s.replace(old, neu);
}
fs.writeFileSync('todo.md',s);
