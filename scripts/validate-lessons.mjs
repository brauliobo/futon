import { readFile } from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const schemaPath = path.join(root, 'src/schemas/level.math.schema.json');

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

const files = await fg(['src/levels/**/*.{json,yaml,yml}'], { cwd: root, absolute: true });
let failures = 0;

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const data = /\.ya?ml$/i.test(file) ? YAML.parse(text) : JSON.parse(text);
  const ok = validate(data);
  if (!ok) {
    failures += 1;
    const rel = path.relative(root, file);
    console.error(`Invalid: ${rel}`);
    for (const err of validate.errors ?? []) {
      console.error(`  - ${err.instancePath || '/'} ${err.message}`);
    }
    console.error('');
  }
}

if (failures) {
  console.error(`Validation failed for ${failures} file(s).`);
  process.exit(1);
} else {
  console.log('All math level JSON files are valid.');
}


