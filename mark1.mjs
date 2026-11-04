import fs from 'fs';
let s = fs.readFileSync('todo.md','utf8');
s = s.replace('- [ ] Update `apps/web/src/app/layout.tsx` title/metadata jadi lebih brutalist (tambahkan "OMNI-NEXUS" secara konsisten)','- [x] Update `apps/web/src/app/layout.tsx` title/metadata jadi lebih brutalist (tambahkan "OMNI-NEXUS" secara konsisten)');
fs.writeFileSync('todo.md',s);
