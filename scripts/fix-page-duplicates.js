#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml';

// Use same normalization as validation script
const normalize = value => typeof value === 'string' ? value : JSON.stringify(value);

function findDuplicatesInPage(exercises) {
  const seen = new Map();
  const duplicates = [];
  let pageRepeats = 0;
  
  exercises.forEach((ex, idx) => {
    const key = normalize(ex);
    if (seen.has(key)) {
      pageRepeats++;
      duplicates.push({ index: idx, key, originalIndex: seen.get(key) });
    } else {
      seen.set(key, idx);
    }
  });
  
  return { duplicates, count: pageRepeats };
}

function fixPageDuplicates(page, allExercisesPool, pageIndex) {
  const { duplicates, count } = findDuplicatesInPage(page.exercises || []);
  if (duplicates.length === 0) return { fixed: false, count: 0 };
  
  const usedKeys = new Set();
  page.exercises.forEach(ex => usedKeys.add(normalize(ex)));
  
  // Collect all unique exercises from other pages that aren't on this page
  const availableReplacements = [];
  if (allExercisesPool && allExercisesPool.length > 0) {
    const pageKeys = new Set(page.exercises.map(ex => normalize(ex)));
    allExercisesPool.forEach((ex, idx) => {
      const key = normalize(ex);
      if (!pageKeys.has(key)) {
        availableReplacements.push({ exercise: ex, index: idx });
      }
    });
  }
  
  // Remove duplicates from availableReplacements
  const uniqueReplacements = [];
  const seenReplacementKeys = new Set();
  availableReplacements.forEach(({ exercise }) => {
    const key = normalize(exercise);
    if (!seenReplacementKeys.has(key)) {
      seenReplacementKeys.add(key);
      uniqueReplacements.push(exercise);
    }
  });
  
  const fixed = [...page.exercises];
  let fixedCount = 0;
  let replacementIndex = 0;
  
  duplicates.forEach(({ index }) => {
    if (replacementIndex < uniqueReplacements.length) {
      fixed[index] = uniqueReplacements[replacementIndex];
      replacementIndex++;
      fixedCount++;
    } else {
      console.warn(`    ⚠️  No unique replacement available for duplicate at index ${index} on page ${page.pageNumber || pageIndex + 1}`);
    }
  });
  
  return { fixed: fixedCount > 0, count: fixedCount, exercises: fixed };
}

function processSet(filePath, level) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const set = parse(content);
    
    if (!set.pages || !Array.isArray(set.pages)) return { fixed: false, error: 'Invalid pages' };
    
    // Collect all exercises from all pages as a pool
    const allExercisesPool = [];
    set.pages.forEach(page => {
      if (page.exercises) {
        allExercisesPool.push(...page.exercises);
      }
    });
    
    let totalFixed = 0;
    let pagesFixed = 0;
    
    set.pages.forEach((page, pageIndex) => {
      const result = fixPageDuplicates(page, allExercisesPool);
      if (result.fixed) {
        page.exercises = result.exercises;
        totalFixed += result.count;
        pagesFixed++;
        console.log(`  Page ${page.pageNumber || pageIndex + 1}: Fixed ${result.count} duplicate(s)`);
      }
    });
    
    if (totalFixed > 0) {
      const newContent = stringify(set, { lineWidth: 120, indent: 2 });
      fs.writeFileSync(filePath, newContent, 'utf8');
      return { fixed: true, totalFixed, pagesFixed, setTitle: set.title };
    }
    
    return { fixed: false };
  } catch (error) {
    return { fixed: false, error: error.message };
  }
}

async function main() {
  const levels = ['A', 'B', 'C'];
  const baseDir = path.join(process.cwd(), 'src', 'levels', 'math');
  
  console.log('🔧 Fixing same-page duplicates in math levels A, B, C...\n');
  
  for (const level of levels) {
    const levelDir = path.join(baseDir, level);
    if (!fs.existsSync(levelDir)) {
      console.log(`⚠️  Level ${level} directory not found`);
      continue;
    }
    
    console.log(`\n📁 Processing level ${level}...`);
    const files = fs.readdirSync(levelDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .sort();
    
    let levelFixed = 0;
    let levelTotal = 0;
    
    for (const file of files) {
      const filePath = path.join(levelDir, file);
      console.log(`\n  Processing: ${file}`);
      const result = processSet(filePath, level);
      
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      } else if (result.fixed) {
        console.log(`  ✅ Fixed ${result.totalFixed} duplicate(s) in ${result.pagesFixed} page(s)`);
        levelFixed += result.totalFixed;
        levelTotal += result.pagesFixed;
      } else {
        console.log(`  ✓ No duplicates found`);
      }
    }
    
    if (levelFixed > 0) {
      console.log(`\n  📊 Level ${level}: Fixed ${levelFixed} duplicate(s) across ${levelTotal} page(s)`);
    }
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
