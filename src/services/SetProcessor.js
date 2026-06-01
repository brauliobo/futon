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
    const text = String(question || '').trim();
    if (!text.endsWith(')')) return '';

    let depth = 0;
    for (let idx = text.length - 1; idx >= 0; idx -= 1) {
      const char = text[idx];
      if (char === ')') depth += 1;
      if (char === '(') depth -= 1;
      if (depth === 0 && char === '(') return text.slice(idx + 1, -1);
    }

    return '';
  }

  static splitChoiceBody(body) {
    const text = String(body || '').trim();
    if (!text.includes('/')) return [];

    const slashCount = (text.match(/\//g) || []).length;
    if (text.length <= 160 && slashCount <= 5) return this.cleanChoices(text.split('/'));

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

    const opensShortMarker = after.length <= 2 && next[after.length] === '/';
    const closesShortMarker = before.startsWith('/') && before.length <= 2;

    return opensShortMarker || closesShortMarker || /^[)\]:]/.test(next);
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
        const body    = this.trailingChoiceBody(ex.question);
        const choices = this.splitChoiceBody(body);
        if (!choices.length) return;

        ex.choices  = choices;
        ex.question = ex.question.slice(0, ex.question.length - body.length - 2).trim();
        ex.type = 'choice';
      });
    });
    return wb;
  }

  static processSet(wb) {
    let processed = this.expandPortuguesePages(wb);
    processed = this.expandRepetitions(processed);
    processed = this.parseChoices(processed);
    processed = this.simplifyChoiceBoilerplate(processed);
    processed = this.numberPages(processed);
    processed = this.calculateTotalExercises(processed);
    return processed;
  }
}
