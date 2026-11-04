import fs from 'fs';
import path from 'path';

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next' || e.name === 'dist') continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

const files = walk('.');
const replacements = [
  { from: /@neuralforge\//g, to: '@neuralforge/' },
  { from: /NeuralForge/g, to: 'NeuralForge' },
  { from: /neuralforge/g, to: 'neuralforge' },
  { from: /NeuralForge/g, to: 'NeuralForge' },
];

for (const f of files) {
  if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.gif') || f.endsWith('.ico')) continue;
  try {
    const content = fs.readFileSync(f, 'utf8');
    let changed = content;
    for (const r of replacements) {
      changed = changed.replace(r.from, r.to);
    }
    if (changed !== content) {
      fs.writeFileSync(f, changed);
      console.log('updated', f);
    }
  } catch (e) {
    // skip
  }
}
