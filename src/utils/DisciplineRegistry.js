const MODULES = import.meta.glob('../levels/*/*/set_*.yaml');

const INDEX = (() => {
  const idx = {};
  for (const path of Object.keys(MODULES)) {
    const m = path.match(/\.\.\/levels\/([^/]+)\/([^/]+)\/set_(\d+)\.yaml$/);
    if (!m) continue;
    const [, discipline, level, num] = m;
    idx[discipline] ??= {};
    idx[discipline][level] ??= [];
    idx[discipline][level].push({ num: parseInt(num, 10), path });
  }
  for (const d of Object.values(idx))
    for (const level of Object.values(d)) level.sort((a, b) => a.num - b.num);
  return idx;
})();

const LEVEL_ORDER = {
  math:       ['5A','4A','3A','2A','1A','6A','7A','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'],
  portuguese: ['7A','6A','5A','4A','3A','2A','1A','A','B','C','D','E','F','G','H','I','J','K','L'],
  english:    ['7A','6A','5A','4A','3A','2A','1A','A','B','C','D','E','F','G','H','I','J','K','L'],
  japanese:   ['4A','3A','2A','1A','A','B','C','D','E','F','G','H','I','J','K','L'],
  spanish:    ['7A','6A','5A','4A','3A','2A','1A','A','B','C','D','E','F','G','H','I','J','K','L'],
  biology:    ['7A','6A','5A','4A','3A','2A','1A','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S']
};

export class DisciplineRegistry {
  static metadata(name) {
    const d = INDEX[name];
    if (!d) throw new Error(`Unknown discipline: ${name}`);
    const order = LEVEL_ORDER[name] || [];
    const levels = order.filter(l => d[l]).concat(Object.keys(d).filter(l => !order.includes(l)));
    return { levels };
  }

  static async importLevel(name, level) {
    const entries = INDEX[name]?.[level];
    if (!entries) throw new Error(`Unknown level ${level} for ${name}`);
    const sets = [];
    for (const { path } of entries) {
      const module = await MODULES[path]();
      sets.push({ level, set: module.default });
    }
    return sets;
  }
}
