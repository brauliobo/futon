#!/usr/bin/env node
// Quote plain-scalar YAML values containing ": " (which is forbidden in plain scalars per YAML 1.2 spec).
// Targets keys: pt, en, correctAnswer, rationale (rare), question (rare).
import fs from 'node:fs';
import { parse } from 'yaml';

const targetKeys = /^(\s+)(pt|en|correctAnswer|question)(:\s+)(.+)$/;

function escapeSingle(s) { return s.replace(/'/g, "''"); }

function fixContent(src) {
  return src.split('\n').map(line => {
    const m = line.match(targetKeys);
    if (!m) return line;
    const [, indent, key, sep, val] = m;
    const trimmed = val.trim();
    if (!trimmed.includes(': ')) return line;
    if (/^['"|>]/.test(trimmed)) return line;
    return `${indent}${key}${sep}'${escapeSingle(trimmed)}'`;
  }).join('\n');
}

// Also handle list items "          - value with : space"
function fixListItems(src) {
  // Only target choices-list items (10-space indent before `- `).
  const re = /^(          - )([^'"|>\n].*)$/;
  return src.split('\n').map(line => {
    const m = line.match(re);
    if (!m) return line;
    const [, prefix, val] = m;
    if (!val.includes(': ')) return line;
    return `${prefix}'${escapeSingle(val)}'`;
  }).join('\n');
}

for (const file of process.argv.slice(2)) {
  const orig = fs.readFileSync(file, 'utf8');
  const fixed = fixListItems(fixContent(orig));
  if (fixed !== orig) fs.writeFileSync(file, fixed);
  try { parse(fixed); console.log(`ok ${file}`); }
  catch (e) { console.error(`${file}: NEEDS MANUAL — ${e.message.split('\n')[0]}`); }
}
