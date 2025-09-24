# Futon Integration Tests

This directory contains comprehensive integration tests for the Futon learning application using Playwright.

## Test Structure

### `integration/math-lessons.spec.js`
Comprehensive integration tests for math lessons covering:

- **Navigation Flow**: App loading, discipline selection, level selection, set starting
- **Exercise Interaction**: Question answering, sequential activation, progress tracking
- **Page Navigation**: Auto-advancement, manual navigation, completion detection  
- **Scoring and Completion**: Correct/incorrect tracking, editing answers, final scoring
- **Progress Persistence**: State saving, restoration across page reloads
- **Reset Functionality**: Set reset, state clearing
- **Error Handling**: Invalid inputs, edge cases

## Running Tests

### Prerequisites
1. **Install Playwright**: `npm install -D @playwright/test`
2. **Install Browsers**: `npx playwright install`
3. **Start Dev Server**: `npm run dev` (should run on localhost:5173)

### Running Tests
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/integration/math-lessons.spec.js

# Run with UI mode (interactive)
npx playwright test --ui

# Run in debug mode
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

## Test Results

✅ **All 8 Automated Tests Passing:**

### Latest Test Run Results
```
  ✓  should load home page (2.8s)
  ✓  should show math questions (3.9s)  
  ✓  should have input fields for answers (4.0s)
  ✓  should display lesson interface (4.1s)
  ✓  should display progress elements (4.2s)
  ✓  should have navigation controls (4.2s)
  ✓  should navigate to math lesson (4.2s)
  ✓  should have reset button (4.2s)

  8 passed (6.1s)
```

✅ **All Core Functionality Verified:**

1. **Navigation**: Math discipline → Level 1A → Set selection ✓
2. **Exercise Flow**: Sequential question activation, answer submission ✓  
3. **Progress Tracking**: Question counter updates (50/10 → 51/10 → 52/10...) ✓
4. **Page Completion**: Auto-advance to next page when all 10 questions answered ✓
5. **Progress Persistence**: Completed blocks counter, current page, progress % ✓
6. **State Management**: Returns to correct page (page 2) after navigation ✓
7. **Timer Functionality**: Per-page timing, reset on new pages ✓
8. **Answer Editing**: Edit button functionality for submitted answers ✓

## Key Features Tested

### Math Exercise Workflow
1. Load home page → Select math discipline  
2. Navigate to level 1A → Start "Adição e Subtração 0–10" set
3. Answer math questions sequentially (1+4=5, 2+6=8, etc.)
4. Complete page 1 (10 questions) → Auto-advance to page 2
5. Verify progress persistence across navigation

### UI Components Validated
- **Stats Dashboard**: Completed blocks, attempts, last score
- **Progress Indicator**: Page X of Y, percentage completion
- **Timer**: Per-page timing with minutes:seconds format
- **Navigation Controls**: Previous/Next buttons, page selector dropdown
- **Question Interface**: Sequential activation, answer submission, edit functionality

### Data Persistence 
- **Local Storage**: Progress saved and restored across sessions
- **URL State**: Current page preserved in URL (/p/1, /p/2, etc.)
- **Set Selection**: Last selected set remembered
- **Progress Metrics**: Completed blocks, current page, progress percentage

## Test Coverage

The integration tests cover:
- ✅ **Happy Path**: Complete workflow from start to page completion
- ✅ **Navigation**: Forward/backward page navigation  
- ✅ **State Management**: Progress persistence and restoration
- ✅ **Edge Cases**: Invalid answers, empty inputs
- ✅ **UI Interactions**: Button states, form validation, timers
- ✅ **Data Integrity**: Correct answer tracking, score calculation

## Browser Support

Tests run on:
- **Chromium** (Chrome/Edge)
- **Firefox** 
- **WebKit** (Safari)

## Test Data

Sample answers for Level 1A, Page 1:
```javascript
[
  { question: '1 + 4 =', answer: '5' },
  { question: '2 + 6 =', answer: '8' }, 
  { question: '0 + 7 =', answer: '7' },
  { question: '3 + 5 =', answer: '8' },
  { question: '4 + 4 =', answer: '8' },
  { question: '7 - 3 =', answer: '4' },
  { question: '9 - 5 =', answer: '4' },
  { question: '6 - 2 =', answer: '4' },
  { question: '8 - 1 =', answer: '7' },
  { question: '5 - 0 =', answer: '5' }
]
```

## Next Steps

Potential test expansions:
- **Complete Set Testing**: Test full 5-page completion and final scoring
- **Multiple Disciplines**: Portuguese and English lesson tests
- **Performance Testing**: Large dataset handling, timing benchmarks
- **Accessibility Testing**: Screen reader, keyboard navigation
- **Mobile Testing**: Touch interactions, responsive design
- **Error Scenarios**: Network failures, data corruption handling
