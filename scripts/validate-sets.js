#!/usr/bin/env node

// Validation script to check all disciplines, levels and sets
// Usage: node validate-sets.js

// This script needs to run in a Vite environment to handle YAML imports
// For now, we'll create a simplified version using dynamic imports

import fs from 'fs';
import path from 'path';
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
    if (pages === 10 && exercises !== 100 && !set.comingSoon) {
      warnings.push(`Expected 100 exercises (10 pages × 10), found ${exercises}`);
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
  
  return { set, index, pages, exercises, issues, warnings };
}

function printSummaryTable(results) {
  console.log(colorize('\n📊 SUMMARY BY DISCIPLINE & LEVEL', BOLD + CYAN));
  console.log(''.padEnd(80, '='));
  
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
        warnings: 0
      };
    }
    
    summary[key].count++;
    summary[key].totalPages += result.pages;
    summary[key].totalExercises += result.exercises;
    summary[key].issues += result.issues.length;
    summary[key].warnings += result.warnings.length;
  });
  
  // Header
  console.log(
    colorize('DISCIPLINE', BOLD).padEnd(20) +
    colorize('LEVEL', BOLD).padEnd(8) + 
    colorize('SETS', BOLD).padEnd(6) +
    colorize('PAGES', BOLD).padEnd(8) +
    colorize('EXERCISES', BOLD).padEnd(12) +
    colorize('ISSUES', BOLD).padEnd(8) +
    colorize('WARNINGS', BOLD)
  );
  console.log(''.padEnd(80, '-'));
  
  Object.values(summary)
    .sort((a, b) => {
      if (a.discipline !== b.discipline) return a.discipline.localeCompare(b.discipline);
      return a.level.localeCompare(b.level);
    })
    .forEach(item => {
      const issueColor = item.issues > 0 ? RED : GREEN;
      const warningColor = item.warnings > 0 ? YELLOW : GREEN;
      const pagesColor = item.discipline === 'math' && item.totalPages % 10 !== 0 ? YELLOW : RESET;
      
      console.log(
        item.discipline.padEnd(20) +
        item.level.padEnd(8) +
        item.count.toString().padEnd(6) +
        colorize(item.totalPages.toString(), pagesColor).padEnd(8 + (pagesColor !== RESET ? 8 : 0)) +
        item.totalExercises.toString().padEnd(12) +
        colorize(item.issues.toString(), issueColor).padEnd(8 + 8) +
        colorize(item.warnings.toString(), warningColor)
      );
    });
}

function printDetailedTable(results) {
  console.log(colorize('\n📋 DETAILED SET VALIDATION', BOLD + BLUE));
  console.log(''.padEnd(120, '='));
  
  // Header
  console.log(
    colorize('#', BOLD).padEnd(4) +
    colorize('DISCIPLINE', BOLD).padEnd(12) +
    colorize('LEVEL', BOLD).padEnd(6) + 
    colorize('SET TITLE', BOLD).padEnd(45) +
    colorize('PAGES', BOLD).padEnd(7) +
    colorize('EXERCISES', BOLD).padEnd(11) +
    colorize('STATUS', BOLD)
  );
  console.log(''.padEnd(120, '-'));
  
  results.forEach((result, i) => {
    const { set, pages, exercises, issues, warnings } = result;
    
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
    
    console.log(
      (i + 1).toString().padEnd(4) +
      (set.subject || 'unknown').padEnd(12) +
      (set.level || '?').padEnd(6) +
      title.padEnd(45) +
      colorize(pages.toString(), pagesColor).padEnd(7 + (pagesColor !== RESET ? 8 : 0)) +
      colorize(exercises.toString(), exercisesColor).padEnd(11 + (exercisesColor !== RESET ? 8 : 0)) +
      colorize(status, statusColor)
    );
    
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
  });
}

function printStatistics(results) {
  const total = results.length;
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const totalPages = results.reduce((sum, r) => sum + r.pages, 0);
  const totalExercises = results.reduce((sum, r) => sum + r.exercises, 0);
  
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
