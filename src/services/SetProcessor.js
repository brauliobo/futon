// src/services/SetProcessor.js
export class SetProcessor {
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static expandPortuguesePages(wb) {
    // Special handling for Portuguese A, B, C, D levels: split exercises into individual pages
    if (wb.subject === 'portuguese' && ['A', 'B', 'C', 'D'].includes(wb.level) && wb.pages?.length === 1 && wb.pages[0]?.exercises?.length > 1) {
      const originalPage = wb.pages[0];
      const splitPages = originalPage.exercises.map((exercise, index) => ({
        pageNumber: index + 1,
        title: `${originalPage.title} - Questão ${index + 1}`,
        description: originalPage.description,
        ...(originalPage.passage ? { passage: originalPage.passage } : {}),
        exercises: [exercise]
      }));
      return { ...wb, pages: splitPages };
    }
    return wb;
  }

  static expandRepetitions(wb) {
    const deep = this.deepClone;
    
    const sourcePages = wb.pages.flatMap((p) => {
      const times = Number.isFinite(p.repeat) && p.repeat > 1 ? Math.floor(p.repeat) : 1;
      return Array.from({ length: times }, () => deep({ ...p, repeat: undefined }));
    });
    
    const allTimes = Number.isFinite(wb.repeatAll) && wb.repeatAll > 1 ? Math.floor(wb.repeatAll) : 1;
    let pages = sourcePages;
    for (let t = 1; t < allTimes; t += 1) {
      pages = pages.concat(sourcePages.map((p) => deep(p)));
    }

    return { ...wb, pages };
  }

  static trailingChoiceBody(question) {
    return this.trailingChoiceInfo(question).body;
  }

  static trailingChoiceInfo(question) {
    const text = String(question || '').trim();
    const hasQuestionMark = text.endsWith('?');
    const bodyEnd = hasQuestionMark ? text.length - 1 : text.length;
    const removeEnd = hasQuestionMark ? text.length : bodyEnd;
    if (text[bodyEnd - 1] !== ')') return { body: '', start: -1, end: -1 };

    let depth = 0;
    for (let idx = bodyEnd - 1; idx >= 0; idx -= 1) {
      const char = text[idx];
      if (char === ')') depth += 1;
      if (char === '(') depth -= 1;
      if (depth === 0 && char === '(') return { body: text.slice(idx + 1, bodyEnd - 1), start: idx, end: removeEnd };
    }

    return { body: '', start: -1, end: -1 };
  }

  static splitChoiceBody(body, options = {}) {
    const text = String(body || '').trim();
    const delimiterChoices = this.splitDelimitedChoiceBody(text);
    if (delimiterChoices.length) return delimiterChoices;

    if (!text.includes('/')) return [];

    const slashCount = (text.match(/\//g) || []).length;
    if (text.length <= 160 && slashCount <= 5) return this.cleanChoices(text.split('/'));
    if (
      slashCount <= 5
      && !this.hasShortSlashMarker(text)
      && !this.hasNestedSlash(text)
      && (options.allowProperNameSlashes || !this.hasProperNameSlash(text))
    ) return this.cleanChoices(text.split('/'));

    const choices = [];
    let depth     = 0;
    let last      = 0;

    for (let idx = 0; idx < text.length; idx += 1) {
      const char = text[idx];
      if (char === '(') depth += 1;
      if (char === ')') depth = Math.max(0, depth - 1);
      if (char !== '/' || depth > 0 || !this.isLongChoiceBoundary(text, idx, last)) continue;

      choices.push(text.slice(last, idx));
      last = idx + 1;
    }

    choices.push(text.slice(last));
    return this.cleanChoices(choices);
  }

  static splitDelimitedChoiceBody(text) {
    return this.splitKeyedChoiceBody(text)
      || this.splitChoiceBodyOnDelimiter(text, '›')
      || this.splitChoiceBodyOnDelimiter(text, '|')
      || [];
  }

  static splitKeyedChoiceBody(text) {
    const choices = this.cleanChoices(String(text || '').split(/\s*,\s*/));
    if (!choices.length) return null;
    if (!choices.every(choice => /^[^=,\s]{1,12}\s*=\s*\S.+$/.test(choice))) return null;

    return choices;
  }

  static splitChoiceBodyOnDelimiter(text, delimiter) {
    if (!String(text || '').includes(delimiter)) return null;

    const escaped = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const choices = this.cleanChoices(String(text || '').split(new RegExp(`\\s*${escaped}\\s*`)));
    if (!choices.length) return null;

    return choices;
  }

  static cleanChoices(choices) {
    const cleaned = choices.map(choice => String(choice).trim());
    if (cleaned.some(choice => !choice)) return [];
    if (cleaned.length < 2 || cleaned.length > 6) return [];
    return cleaned;
  }

  static isLongChoiceBoundary(text, slashIndex, segmentStart = 0) {
    const previous = text.slice(segmentStart, slashIndex).trim();
    const next = text.slice(slashIndex + 1).trimStart();
    if (!next) return false;

    if (this.isPhonemeSlash(previous, next)) return false;
    if (this.isShortChoiceSegment(previous) && this.startsShortChoice(next)) return true;
    if (this.startsTerminalShortChoice(next)) return true;

    return /^(que|ambos?|la|el|las|los|un|una|unos|unas|en|no|sí|si|solo|son|es|porque|por|como|cuando)\b/i.test(next)
      || /^[A-ZÁÉÍÓÚÑ][^/\s:]{1,30}:\s/.test(next);
  }

  static isPhonemeSlash(previous, next) {
    const before = previous.split(/\s+/).pop() || '';
    const after = (next.match(/^[^/\s)\]]+/) || [''])[0];

    const opensShortMarker = after.length <= 3 && next[after.length] === '/';
    const closesShortMarker = /^\/[\p{L}]-?$/u.test(before) || /^\/[\p{L}]{2}-?$/u.test(before);

    return opensShortMarker || closesShortMarker || /^[)\]:]/.test(next);
  }

  static hasShortSlashMarker(text) {
    return /\/[\p{L}]{1,3}-?\//u.test(String(text || ''));
  }

  static hasNestedSlash(text) {
    let depth = 0;
    for (const char of String(text || '')) {
      if (char === '(') depth += 1;
      if (char === ')') depth = Math.max(0, depth - 1);
      if (char === '/' && depth > 0) return true;
    }
    return false;
  }

  static hasProperNameSlash(text) {
    return /\b[A-ZÁÉÍÓÚÑ][\p{L}]+\/[A-ZÁÉÍÓÚÑ][\p{L}]+\b/u.test(String(text || ''));
  }

  static isShortChoiceSegment(segment) {
    const text = String(segment || '').trim();
    if (text.length < 2 || text.length > 90) return false;
    if (/[→:;]/.test(text)) return false;
    return text.split(/\s+/).length <= 8;
  }

  static startsShortChoice(text) {
    const first = String(text || '').split('/')[0].trim();
    if (!this.isShortChoiceSegment(first)) return false;
    return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡'"]/.test(first);
  }

  static startsTerminalShortChoice(text) {
    return this.startsShortChoice(text) && !String(text || '').slice(0, 120).includes('/');
  }

  static numberPages(wb) {
    wb.pages.forEach((p, i) => { p.pageNumber = i + 1; });
    return wb;
  }

  static calculateTotalExercises(wb) {
    const totalExercises = wb.pages.reduce((acc, page) => acc + page.exercises.length, 0);
    return { ...wb, totalExercises };
  }

  static simplifyChoiceBoilerplate(wb) {
    wb.pages.forEach(page => {
      page.exercises.forEach(ex => {
        if (ex.choices) ex.choices = ex.choices.map(choice => this.simplifyValue(choice));
        if (ex.correctAnswer !== undefined) ex.correctAnswer = this.simplifyValue(ex.correctAnswer);
      });
    });
    return wb;
  }

  static simplifyValue(value) {
    if (typeof value === 'string') return this.simplifyText(value);
    if (Array.isArray(value)) return value.map(item => this.simplifyValue(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, this.simplifyValue(val)]));
    }
    return value;
  }

  static simplifyText(text) {
    const source = String(text);
    const withSimplifiedParens = source.replace(/\(([^()]*)\)/g, (match, body) => {
      const cleaned = this.simplifyPlusList(body);
      return cleaned === body ? match : `(${cleaned})`;
    });

    return this.simplifyPredicateTail(withSimplifiedParens).replace(/\s+/g, ' ').trim();
  }

  static simplifyPlusList(text, minParts = 4, minKept = 2) {
    const parts = String(text).split(/\s+\+\s+/);
    if (parts.length < minParts) return text;

    const kept = parts.filter(part => !this.isBoilerplateSegment(part));
    if (kept.length === parts.length || kept.length < minKept) return text;
    return kept.join(' + ');
  }

  static simplifyPredicateTail(text) {
    const match = String(text).match(/^(.*?\s(?:é|is)\s)(.*)$/);
    if (!match) return text;

    const cleaned = this.simplifyPlusList(match[2], 2, 1);
    return `${match[1]}${cleaned}`;
  }

  static isBoilerplateSegment(segment) {
    const text = String(segment).toLowerCase();
    const terms = ['emerging', 'frontier', 'translational', 'scale-up', 'commercial', 'industrial', 'bio-manufacturing', 'milestone', 'paradigm', 'era', 'pipeline'];
    const matches = terms.filter(term => text.includes(term)).length;

    return text.includes('emerging next-')
      || text.includes('frontier translational')
      || /\bera\s+2024\s+frontier\b/.test(text)
      || (text.includes('emerging') && matches >= 3);
  }

  static parseChoices(wb) {
    wb.pages.forEach(page => {
      page.exercises.forEach(ex => {
        if (ex.choices || ex.type === 'choice') return;
        const choiceInfo = this.trailingChoiceInfo(ex.question);
        const choices = this.splitChoiceBody(choiceInfo.body, { allowProperNameSlashes: wb.subject === 'portuguese' });
        if (!choices.length) return;

        ex.choices  = choices;
        ex.question = `${ex.question.slice(0, choiceInfo.start)}${ex.question.slice(choiceInfo.end)}`.trim();
        ex.type = 'choice';
        this.normalizeKeyedChoices(ex);
      });
    });
    return wb;
  }

  static normalizeKeyedChoices(ex) {
    const answer = String(ex.correctAnswer ?? '').trim();
    if (!answer || !Array.isArray(ex.choices)) return;

    const keyedChoices = ex.choices.map(choice => String(choice).match(/^([^=]+)=\s*(.+)$/));
    if (keyedChoices.some(choice => !choice)) return;

    const mappedAnswer = keyedChoices.find(([, key]) => key.trim() === answer)?.[2]?.trim();
    ex.choices = keyedChoices.map(([, , value]) => value.trim());
    if (mappedAnswer) ex.correctAnswer = mappedAnswer;
  }

  static normalizeMathPrompts(wb) {
    if (wb.subject !== 'math') return wb;

    wb.pages.forEach(page => {
      page.exercises.forEach(ex => {
        if (ex.type === 'sequence') ex.question = this.normalizeSequencePrompt(ex.question);
        ex.question = this.normalizeMathOperatorSpacing(ex.question);
        if (this.isBareMathExpressionPrompt(ex.question)) ex.question = `${String(ex.question).trim()} =`;
      });
    });
    return wb;
  }

  static normalizeSequencePrompt(question) {
    return String(question || '')
      .trim()
      .replace(/,\s*/g, ', ')
      .replace(/,\s*\.\.\./g, ', ...');
  }

  static normalizeMathOperatorSpacing(question) {
    return String(question || '')
      .trim()
      .replace(/([\[{(])([^\]})]*,[^\]})]*)([\]})])/g, (_match, open, body, close) => `${open}${this.normalizeMathDelimitedCommas(body)}${close}`)
      .replace(/\s*(?<![<>=!])=(?![=>])\s*/g, ' = ')
      .replace(/\s*×\s*/g, ' × ')
      .replace(/\s*\+\s*/g, ' + ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static normalizeMathDelimitedCommas(body) {
    const text = String(body || '').trim();
    if (/^-?\d+,\d+$/.test(text)) return text;
    return text.replace(/,\s*/g, ', ');
  }

  static isBareMathExpressionPrompt(question) {
    const text = String(question || '').trim();
    if (!text || /[=?]/.test(text)) return false;
    if (!/[+×*·÷]|(?<=\d)\s-\s(?=\d)/.test(text)) return false;
    return /^[-\d\s/×*·÷()+.,]+$/.test(text);
  }

  static processSet(wb) {
    let processed = this.expandPortuguesePages(wb);
    processed = this.expandRepetitions(processed);
    processed = this.parseChoices(processed);
    processed = this.normalizeMathPrompts(processed);
    processed = this.simplifyChoiceBoilerplate(processed);
    processed = this.numberPages(processed);
    processed = this.calculateTotalExercises(processed);
    return processed;
  }
}
