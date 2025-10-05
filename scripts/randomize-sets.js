import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml';

function generateSubtractionExercise() {
  let a = Math.floor(Math.random() * 11);
  let b = Math.floor(Math.random() * 11);

  if (a < b) {
    [a, b] = [b, a]; // Swap to ensure non-negative result
  }

  return {
    type: 'subtraction',
    question: `${a} - ${b} =`,
    correctAnswer: a - b,
  };
}

function generateAdditionExercise() {
    let a = Math.floor(Math.random() * 11);
    let b = Math.floor(Math.random() * 11);
  
    return {
      type: 'addition',
      question: `${a} + ${b} =`,
      correctAnswer: a + b,
    };
}

function generateNextNumberExercise() {
    const num = Math.floor(Math.random() * 10);
    return {
      type: 'sequence',
      question: `${num}, __, ${num + 2}`,
      correctAnswer: num + 1,
    };
}

function generatePreviousNumberExercise() {
    const num = Math.floor(Math.random() * 10) + 1;
    return {
      type: 'sequence',
      question: `__, ${num}, ${num + 1}`,
      correctAnswer: num - 1,
    };
}


function processSetFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const set = parse(content);

    // Remove anchors from the first page exercises
    if (set.pages && set.pages.length > 0 && set.pages[0].exercises) {
        set.pages[0].exercises = JSON.parse(JSON.stringify(set.pages[0].exercises));
    }


    const exerciseGenerators = {
        'Adição e Subtração 0–10': () => Math.random() > 0.5 ? generateAdditionExercise() : generateSubtractionExercise(),
        'Número Anterior e Próximo 0–10': () => Math.random() > 0.5 ? generateNextNumberExercise() : generatePreviousNumberExercise(),
        'Adição Simples 0–10': generateAdditionExercise,
        'Subtração Simples 0–10': generateSubtractionExercise,
        'Números Anteriores 0–10': generatePreviousNumberExercise,
        'Próximos Números 0–10': generateNextNumberExercise,
        'Adição Mista 0–10': generateAdditionExercise,
        'Subtração Mista 0–10': generateSubtractionExercise,
        'Operações Mistas 0–10': () => Math.random() > 0.5 ? generateAdditionExercise() : generateSubtractionExercise(),
        'Somas até 10': generateAdditionExercise,
        'Subtrações até 10': generateSubtractionExercise,
        'Somas que dão 10': () => {
            const a = Math.floor(Math.random() * 11);
            const b = 10 - a;
            return { type: 'addition', question: `${a} + ${b} =`, correctAnswer: 10 };
        },
        'Subtrair de 10': () => {
            const a = 10;
            const b = Math.floor(Math.random() * 11);
            return { type: 'subtraction', question: `${a} - ${b} =`, correctAnswer: a - b };
        }
    };

    const generatorKey = Object.keys(exerciseGenerators).find(key => set.title.includes(key));
    const exerciseGenerator = generatorKey ? exerciseGenerators[generatorKey] : null;


    for (let i = 1; i < 10; i++) {
      if (set.pages && set.pages[i]) {
        const newExercises = [];
        for (let k = 0; k < 10; k++) {
            if (exerciseGenerator) {
                newExercises.push(exerciseGenerator());
            } else {
                // Default to subtraction if no generator found
                newExercises.push(generateSubtractionExercise());
            }
        }
        set.pages[i].exercises = newExercises;
      }
    }

    fs.writeFileSync(filePath, stringify(set, { anchorPrefix: 'a' }), 'utf8');
    console.log(`Processed and updated ${filePath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

async function main() {
  const levelDirs = ['src/levels/math/1A', 'src/levels/math/2A'];
  
  for (const dir of levelDirs) {
      const levelPath = path.join(process.cwd(), dir);
      if (fs.existsSync(levelPath)) {
        const files = fs.readdirSync(levelPath).filter(f => f.endsWith('.yaml'));
        for (const file of files) {
          processSetFile(path.join(levelPath, file));
        }
      }
  }
}

main().catch(console.error);
