import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const makePlaceholderExercise = (type) => {
  switch (type) {
    case 'count': return { type, question: '● ● ● ●', correctAnswer: 4 };
    case 'next_number': return { type, question: 'Depois de 3 vem:', correctAnswer: 4 };
    case 'previous_number': return { type, question: 'Antes de 7 vem:', correctAnswer: 6 };
    case 'subtraction': return { type, question: '5 - 2 =', correctAnswer: 3 };
    default: return { type: 'addition', question: '2 + 3 =', correctAnswer: 5 };
  }
};

const pickType = (page) => {
  // prefer existing exercise type if present
  const firstType = page?.exercises?.[0]?.type;
  if (firstType) return firstType;
  const title = page?.title?.toLowerCase() || '';
  if (title.includes('subtra')) return 'subtraction';
  if (title.includes('próximo')) return 'next_number';
  if (title.includes('anterior')) return 'previous_number';
  if (title.includes('contar') || title.includes('número')) return 'count';
  return 'addition';
};

const makePlaceholderPage = (num, type) => ({ pageNumber: num, title: `Página ${num}`, description: 'Completar exercícios.', exercises: Array.from({ length: 10 }, () => makePlaceholderExercise(type)) });

function ensureTenPagesTenExercises(wb) {
  wb.level = '5A';
  wb.subject = 'math';
  delete wb.repeatAll; // normalize to explicit pages
  const pages = Array.isArray(wb.pages) ? wb.pages : [];
  // ensure each existing page has exactly 10 exercises
  for (const p of pages) {
    const type = pickType(p);
    p.exercises = Array.isArray(p.exercises) ? p.exercises.slice(0, 10) : [];
    while (p.exercises.length < 10) p.exercises.push(makePlaceholderExercise(type));
  }
  // pad pages to 10
  const lastType = pickType(pages[0] || {});
  while (pages.length < 10) pages.push(makePlaceholderPage(pages.length + 1, lastType));
  // normalize page numbers and simple titles
  wb.pages = pages.slice(0, 10).map((p, i) => ({ ...p, pageNumber: i + 1, title: p.title || `Página ${i + 1}` }));
  return wb;
}

async function run() {
  const files = await fg(['src/levels/math/5A/*.json'], { cwd: root, absolute: true });
  let changed = 0;
  for (const file of files) {
    const before = JSON.parse(await readFile(file, 'utf8'));
    const after = ensureTenPagesTenExercises({ ...before });
    const out = JSON.stringify(after, null, 2) + '\n';
    const orig = JSON.stringify(before, null, 2) + '\n';
    if (out !== orig) {
      await writeFile(file, out, 'utf8');
      changed += 1;
      console.log(`Normalized ${path.relative(root, file)}`);
    }
  }
  console.log(`Done. Files normalized: ${changed}`);
}

run().catch(err => { console.error(err); process.exit(1); });


