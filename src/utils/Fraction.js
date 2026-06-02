export class Fraction {
  static ANSWER_FRACTION_PATTERN_SOURCE = String.raw`(?<![\p{L}√\d])(-?\d+)\s+(\d+)\/(\d+)|(?<![\p{L}√\d])(-?\d+)\/(\d+)(?![\p{L}\d])`;
  static DISPLAY_TERM_PATTERN_SOURCE = String.raw`-?(?:\d+|√\d+|(?:sen|cos|tan|tg)(?:\([^()/]+\)|\s*(?!e\b)[a-zA-Z])?|[a-zA-Z]{1,4}|\([^()/]+\)|\[[^\]/]+\])`;
  static DISPLAY_FRACTION_PATTERN_SOURCE = String.raw`(-?\d+)\s+(\d+)\/(\d+)|(${Fraction.DISPLAY_TERM_PATTERN_SOURCE})\/(${Fraction.DISPLAY_TERM_PATTERN_SOURCE})`;

  static answerFractionPattern() {
    return new RegExp(this.ANSWER_FRACTION_PATTERN_SOURCE, 'gu');
  }

  static displayFractionPattern() {
    return new RegExp(this.DISPLAY_FRACTION_PATTERN_SOURCE, 'gi');
  }

  static parts(value) {
    const text    = String(value ?? '');
    const pattern = this.displayFractionPattern();
    const parts   = [];
    let last      = 0;

    for (const match of text.matchAll(pattern)) {
      if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });

      if (match[1] !== undefined) {
        parts.push({
          type:        'mixed',
          value:       match[0],
          whole:       match[1],
          numerator:   match[2],
          denominator: match[3],
        });
      } else {
        parts.push({
          type:        'fraction',
          value:       match[0],
          numerator:   match[4],
          denominator: match[5],
        });
      }

      last = match.index + match[0].length;
    }

    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
    return parts;
  }

  static hasFraction(value) {
    return this.answerFractionPattern().test(String(value ?? ''));
  }

  static parseAnswer(value) {
    const text  = String(value ?? '').trim();
    const mixed = text.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return { whole: mixed[1], numerator: mixed[2], denominator: mixed[3], mixed: true };

    const fraction = text.match(/^(-?\d+)\/(\d+)$/);
    if (fraction) return { whole: '', numerator: fraction[1], denominator: fraction[2], mixed: false };

    return { whole: '', numerator: '', denominator: '', mixed: false };
  }

  static answerFromParts({ whole = '', numerator = '', denominator = '' } = {}) {
    const w = String(whole).trim();
    const n = String(numerator).trim();
    const d = String(denominator).trim();
    if (!n && !d) return w;
    if (w) return `${w} ${n}/${d}`.trim();
    return `${n}/${d}`;
  }
}
