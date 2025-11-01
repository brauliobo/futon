#!/usr/bin/env node

// Validation script to check all disciplines, levels and sets
// Usage: node validate-sets.js

// This script needs to run in a Vite environment to handle YAML imports
// For now, we'll create a simplified version using dynamic imports

import fs from 'fs';
import path from 'path';
import Table from 'cli-table3';
import { parse } from 'yaml';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

function colorize(text, color) {
  return `${color}${text}${RESET}`;
}

const tableStyle = { head: [], border: [], compact: true, "padding-left": 1, "padding-right": 1 };

const normalize = value => typeof value === 'string' ? value : JSON.stringify(value);

function countDuplicateExercises(set) {
  if (!set.pages) return { duplicates: 0, randomness: null, pageDuplicates: [] };
  const seen = new Map();
  let repeats = 0;
  let total = 0;
  const pageDuplicates = [];
  
  set.pages.forEach((page, pageIndex) => {
    const pageSeen = new Map();
    let pageRepeats = 0;
    const pageExercises = page.exercises || [];
    
    pageExercises.forEach(exercise => {
      total++;
      const key = normalize(exercise);
      
      // Check within page
      if (pageSeen.has(key)) pageRepeats++;
      else pageSeen.set(key, true);
      
      // Check across all pages
      if (seen.has(key)) repeats++;
      else seen.set(key, true);
    });
    
    if (pageRepeats > 0) {
      pageDuplicates.push({
        pageNumber: page.pageNumber || pageIndex + 1,
        duplicates: pageRepeats,
        totalExercises: pageExercises.length
      });
    }
  });
  
  if (!total) return { duplicates: repeats, randomness: null, pageDuplicates: [] };
  const randomness = +(1 - repeats / total).toFixed(3);
  return { duplicates: repeats, randomness, pageDuplicates };
}

function validateSet(set, index) {
  const issues = [];
  const warnings = [];
  
  // Basic structure checks
  if (!set.title) issues.push('Missing title');
  if (!set.level) issues.push('Missing level');
  if (!set.subject) issues.push('Missing subject');
  if (!set.pages || !Array.isArray(set.pages)) {
    issues.push('Missing or invalid pages array');
    return { set, index, pages: 0, exercises: 0, issues, warnings };
  }
  
  const pages = set.pages.length;
  const exercises = set.pages.reduce((total, page) => {
    if (!page.exercises || !Array.isArray(page.exercises)) {
      issues.push(`Page ${page.pageNumber || 'unknown'} has invalid exercises`);
      return total;
    }
    return total + page.exercises.length;
  }, 0);
  
  // Math set specific validation
  if (set.subject === 'math') {
    if (pages !== 10 && !set.comingSoon) {
      warnings.push(`Expected 10 pages, found ${pages}`);
    }
    if (pages === 10 && exercises < 90 && !set.comingSoon) {
      warnings.push(`Expected at least 90 exercises (10 pages × 10), found ${exercises}`);
    }
  }
  
  // Check for empty pages
  set.pages.forEach((page, i) => {
    if (!page.exercises || page.exercises.length === 0) {
      warnings.push(`Page ${i + 1} has no exercises`);
    }
  });
  
  // Check page numbering
  set.pages.forEach((page, i) => {
    if (page.pageNumber !== i + 1) {
      warnings.push(`Page ${i + 1} has incorrect pageNumber: ${page.pageNumber}`);
    }
  });
  
  const { duplicates, randomness, pageDuplicates } = set.subject === 'math' ? countDuplicateExercises(set) : { duplicates: 0, randomness: null, pageDuplicates: [] };
  
  if (pageDuplicates.length > 0) {
    pageDuplicates.forEach(({ pageNumber, duplicates: pageDupes }) => {
      warnings.push(`Page ${pageNumber} has ${pageDupes} duplicate exercise(s) within the same page`);
    });
  }
  
  return { set, index, pages, exercises, issues, warnings, duplicates, randomness, pageDuplicates };
}

function printSummaryTable(results) {
  console.log(colorize('\n📊 SUMMARY BY DISCIPLINE & LEVEL', BOLD + CYAN));
  
  const summary = {};
  
  results.forEach(result => {
    const { set } = result;
    const key = `${set.subject || 'unknown'}-${set.level || 'unknown'}`;
    
    if (!summary[key]) {
      summary[key] = {
        discipline: set.subject || 'unknown',
        level: set.level || 'unknown',
        count: 0,
        totalPages: 0,
        totalExercises: 0,
        issues: 0,
        warnings: 0,
        duplicates: 0,
        randomnessSum: 0,
        mathSets: 0,
        pageDuplicatesCount: 0
      };
    }
    
    summary[key].count++;
    summary[key].totalPages += result.pages;
    summary[key].totalExercises += result.exercises;
    summary[key].issues += result.issues.length;
    summary[key].warnings += result.warnings.length;
    summary[key].duplicates += result.duplicates || 0;
    summary[key].pageDuplicatesCount += (result.pageDuplicates || []).length;
    if (result.randomness !== null) {
      summary[key].randomnessSum += result.randomness;
      summary[key].mathSets++;
    }
  });
  
  const summaryTable = new Table({ head: [
    colorize('DISCIPLINE', BOLD),
    colorize('LEVEL', BOLD),
    colorize('SETS', BOLD),
    colorize('PAGES', BOLD),
    colorize('EXERCISES', BOLD),
    colorize('ISSUES', BOLD),
    colorize('WARNINGS', BOLD),
    colorize('DUPES', BOLD),
    colorize('PAGE DUPES', BOLD),
    colorize('RANDOMNESS', BOLD)
  ], style: tableStyle });
  
  Object.values(summary)
    .sort((a, b) => {
      if (a.discipline !== b.discipline) return a.discipline.localeCompare(b.discipline);
      return a.level.localeCompare(b.level);
    })
    .forEach(item => {
      const issueColor = item.issues > 0 ? RED : GREEN;
      const warningColor = item.warnings > 0 ? YELLOW : GREEN;
      const pagesColor = item.discipline === 'math' && item.totalPages % 10 !== 0 ? YELLOW : RESET;
      const randomness = item.mathSets ? `${Math.round((item.randomnessSum / item.mathSets) * 100)}%` : '-';
      const randomnessPercent = item.mathSets ? (item.randomnessSum / item.mathSets) : -1;
      const randomnessColor = randomness === '-' ? RESET : (randomnessPercent >= 0.6 ? GREEN : YELLOW);
      
      const pageDupesColor = item.pageDuplicatesCount > 0 ? YELLOW : RESET;
      summaryTable.push([
        item.discipline,
        item.level,
        item.count,
        colorize(item.totalPages.toString(), pagesColor),
        item.totalExercises,
        colorize(item.issues.toString(), issueColor),
        colorize(item.warnings.toString(), warningColor),
        item.duplicates,
        colorize(item.pageDuplicatesCount.toString(), pageDupesColor),
        colorize(randomness, randomnessColor)
      ]);
    });

  console.log(summaryTable.toString());
}

function printDetailedTable(results) {
  console.log(colorize('\n📋 DETAILED SET VALIDATION', BOLD + BLUE));
  const detailTable = new Table({ head: [
    colorize('#', BOLD),
    colorize('DISCIPLINE', BOLD),
    colorize('LEVEL', BOLD),
    colorize('SET TITLE', BOLD),
    colorize('PAGES', BOLD),
    colorize('EXERCISES', BOLD),
    colorize('RANDOM', BOLD),
    colorize('PAGE DUPES', BOLD),
    colorize('STATUS', BOLD)
  ], style: tableStyle, wordWrap: true });
  
  results.forEach((result, i) => {
    const { set, pages, exercises, issues, warnings, duplicates, randomness, pageDuplicates } = result;
    
    let status = '';
    let statusColor = GREEN;
    
    if (issues.length > 0) {
      status = `❌ ${issues.length} errors`;
      statusColor = RED;
    } else if (warnings.length > 0) {
      status = `⚠️  ${warnings.length} warnings`;
      statusColor = YELLOW;
    } else {
      status = '✅ OK';
      statusColor = GREEN;
    }
    
    const title = (set.title || 'Untitled').substring(0, 44);
    const pagesColor = (set.subject === 'math' && pages !== 10 && !set.comingSoon) ? YELLOW : RESET;
    const exercisesColor = (set.subject === 'math' && pages === 10 && exercises !== 100 && !set.comingSoon) ? YELLOW : RESET;
    const randomnessColor = randomness === null ? RESET : (randomness >= 0.6 ? GREEN : YELLOW);
    const randomText = randomness === null ? '-' : `${Math.round(randomness * 100)}% (${duplicates})`;
    
    const pageDupesCount = pageDuplicates.length;
    const pageDupesColor = pageDupesCount > 0 ? YELLOW : RESET;
    const pageDupesText = pageDupesCount > 0 ? `${pageDupesCount} page(s)` : '-';
    
    detailTable.push([
      i + 1,
      set.subject || 'unknown',
      set.level || '?',
      title,
      colorize(pages.toString(), pagesColor),
      colorize(exercises.toString(), exercisesColor),
      colorize(randomText, randomnessColor),
      colorize(pageDupesText, pageDupesColor),
      colorize(status, statusColor)
    ]);
    
    // Print issues and warnings
    if (issues.length > 0) {
      issues.forEach(issue => {
        console.log('      ' + colorize(`❌ ${issue}`, RED));
      });
    }
    if (warnings.length > 0) {
      warnings.forEach(warning => {
        console.log('      ' + colorize(`⚠️  ${warning}`, YELLOW));
      });
    }
    if (pageDuplicates.length > 0) {
      pageDuplicates.forEach(({ pageNumber, duplicates: pageDupes, totalExercises }) => {
        console.log('      ' + colorize(`🔄 Page ${pageNumber}: ${pageDupes} duplicate(s) out of ${totalExercises} exercises`, YELLOW));
      });
    }
  });

  console.log(detailTable.toString());
}

function printStatistics(results) {
  const total = results.length;
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const totalPages = results.reduce((sum, r) => sum + r.pages, 0);
  const totalExercises = results.reduce((sum, r) => sum + r.exercises, 0);
  const mathMetrics = results
    .filter(r => r.set.subject === 'math')
    .reduce((acc, r) => {
      acc.mathSets++;
      acc.duplicates += r.duplicates || 0;
      if (r.randomness !== null) acc.randomness += r.randomness;
      return acc;
    }, { mathSets: 0, duplicates: 0, randomness: 0 });
  
  const mathSets = results.filter(r => r.set.subject === 'math').length;
  const portugueseSets = results.filter(r => r.set.subject === 'portuguese').length;
  const otherSets = total - mathSets - portugueseSets;
  
  console.log(colorize('\n📈 STATISTICS', BOLD + CYAN));
  console.log(''.padEnd(50, '='));
  console.log(`Total Sets:        ${colorize(total, BOLD)}`);
  console.log(`  • Math:          ${mathSets}`);
  console.log(`  • Portuguese:    ${portugueseSets}`);
  console.log(`  • Other:         ${otherSets}`);
  console.log(`Total Pages:       ${colorize(totalPages, BOLD)}`);
  console.log(`Total Exercises:   ${colorize(totalExercises, BOLD)}`);
  console.log(`Issues:            ${colorize(totalIssues, totalIssues > 0 ? RED : GREEN)}`);
  console.log(`Warnings:          ${colorize(totalWarnings, totalWarnings > 0 ? YELLOW : GREEN)}`);
  if (mathMetrics.mathSets) {
    const avgRandom = Math.round((mathMetrics.randomness / mathMetrics.mathSets) * 100);
    console.log(`Math duplicates:   ${mathMetrics.duplicates}`);
    console.log(`Math randomness:   ${avgRandom}%`);
  }
  
  const avgPagesPerSet = (totalPages / total).toFixed(1);
  const avgExercisesPerSet = (totalExercises / total).toFixed(1);
  const avgExercisesPerPage = (totalExercises / totalPages).toFixed(1);
  
  console.log(`\nAverages:`);
  console.log(`  Pages per set:     ${avgPagesPerSet}`);
  console.log(`  Exercises per set: ${avgExercisesPerSet}`);
  console.log(`  Exercises per page: ${avgExercisesPerPage}`);
}

// Load all YAML files from a directory
function loadYAMLSets(dirPath, discipline, level) {
  if (!fs.existsSync(dirPath)) return [];
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  return files.map(file => {
    try {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const set = parse(content);
      return { ...set, discipline, level, sourceFile: file };
    } catch (error) {
      console.warn(colorize(`⚠️  Could not parse ${file}: ${error.message}`, YELLOW));
      return null;
    }
  }).filter(Boolean);
}

// All sets are now static YAML files - no dynamic generation needed

async function main() {
  console.log(colorize('🔍 FUTON SET VALIDATION TOOL', BOLD + BLUE));
  console.log(colorize('Checking all disciplines, levels, and sets...', BLUE));
  
  try {
    const allSets = [];
    
    // Load static math sets from YAML files
    console.log(colorize('Loading static math sets...', CYAN));
    const mathLevelsDir = path.join(process.cwd(), 'src', 'levels', 'math');
    if (fs.existsSync(mathLevelsDir)) {
      const mathLevels = fs.readdirSync(mathLevelsDir).filter(d => 
        fs.statSync(path.join(mathLevelsDir, d)).isDirectory()
      );
      
      for (const level of mathLevels) {
        const levelPath = path.join(mathLevelsDir, level);
        const sets = loadYAMLSets(levelPath, 'math', level);
        allSets.push(...sets);
      }
    }
    
    // Load static Portuguese sets
    console.log(colorize('Loading static Portuguese sets...', CYAN));
    const portugueseLevelsDir = path.join(process.cwd(), 'src', 'levels', 'portuguese');
    if (fs.existsSync(portugueseLevelsDir)) {
      const portugueseLevels = fs.readdirSync(portugueseLevelsDir).filter(d => 
        fs.statSync(path.join(portugueseLevelsDir, d)).isDirectory()
      );
      
      for (const level of portugueseLevels) {
        const levelPath = path.join(portugueseLevelsDir, level);
        const sets = loadYAMLSets(levelPath, 'portuguese', level);
        allSets.push(...sets);
      }
    }
    
    // Load static English sets
    console.log(colorize('Loading static English sets...', CYAN));
    const englishLevelsDir = path.join(process.cwd(), 'src', 'levels', 'english');
    if (fs.existsSync(englishLevelsDir)) {
      const englishLevels = fs.readdirSync(englishLevelsDir).filter(d => 
        fs.statSync(path.join(englishLevelsDir, d)).isDirectory()
      );
      
      for (const level of englishLevels) {
        const levelPath = path.join(englishLevelsDir, level);
        const sets = loadYAMLSets(levelPath, 'english', level);
        allSets.push(...sets);
      }
    }
    
    // All math sets are now static YAML files - no dynamic generation needed
    
    console.log(colorize(`Found ${allSets.length} sets to validate...`, CYAN));
    
    // Validate each set
    const results = allSets.map((set, index) => validateSet(set, index));
    
    // Print results
    printSummaryTable(results);
    printDetailedTable(results);
    printStatistics(results);
    
    // Final status
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    
    console.log('\n' + ''.padEnd(80, '='));
    if (totalIssues > 0) {
      console.log(colorize(`❌ VALIDATION FAILED: ${totalIssues} critical issues found`, BOLD + RED));
      process.exit(1);
    } else if (totalWarnings > 0) {
      console.log(colorize(`⚠️  VALIDATION PASSED WITH WARNINGS: ${totalWarnings} warnings`, BOLD + YELLOW));
      process.exit(0);
    } else {
      console.log(colorize('✅ ALL VALIDATIONS PASSED', BOLD + GREEN));
      process.exit(0);
    }
    
  } catch (error) {
    console.error(colorize('❌ VALIDATION ERROR:', BOLD + RED), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
