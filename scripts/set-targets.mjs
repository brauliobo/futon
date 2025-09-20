import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import YAML from 'yaml';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function expandPages(wb) {
  const pages = [];
  const deep = (o) => JSON.parse(JSON.stringify(o));
  const sourcePages = (wb.pages || []).flatMap(p => {
    const times = Number.isFinite(p.repeat) && p.repeat > 1 ? Math.floor(p.repeat) : 1;
    return Array.from({ length: times }, () => deep({ ...p, repeat: undefined }));
  });
  const allTimes = Number.isFinite(wb.repeatAll) && wb.repeatAll > 1 ? Math.floor(wb.repeatAll) : 1;
  for (let t = 0; t < allTimes; t += 1) pages.push(...sourcePages.map(p => deep(p)));
  return pages.map((p, i) => ({ ...p, pageNumber: i + 1 }));
}

function inferTarget(wb) {
  const expanded = expandPages(wb);
  return expanded.reduce((sum, p) => sum + (p.exercises?.length || 0), 0);
}

const files = await fg(['src/levels/**/*.{json,yaml,yml}'], { cwd: root, absolute: true });
let changed = 0;
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const isYaml = /\.ya?ml$/i.test(file);
  const data = isYaml ? YAML.parse(text) : JSON.parse(text);
  const target = inferTarget(data);
  if (data.target !== target) {
    data.target = target;
    const out = isYaml ? YAML.stringify(data) : JSON.stringify(data, null, 2) + '\n';
    await writeFile(file, out, 'utf8');
    changed += 1;
    console.log(`Updated target in ${path.relative(root, file)} -> ${target}`);
  }
}

console.log(`Done. Files updated: ${changed}`);


