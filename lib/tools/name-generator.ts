const PREFIXES = [
  'get', 'try', 'go', 'real', 'pure', 'fit', 'be', 'the', 'my', 'its',
  'just', 'live', 'stay', 'do', 'feel',
];

const SUFFIXES = {
  professional: ['hq', 'official', 'pro', 'corp', 'inc', 'studio', 'hub', 'central'],
  fun: ['vibes', 'zone', 'fun', 'jam', 'pop', 'buzz', 'wow', 'yes', 'lol'],
  creative: ['art', 'lab', 'craft', 'make', 'design', 'ink', 'create', 'studio', 'works'],
  minimal: ['co', 'hq', 'lab', 'box', 'dot', 'io', 'app', 'base'],
};

const SEPARATORS = ['', '.', '_', ''];

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function generateNames(keyword: string, style: keyof typeof SUFFIXES): string[] {
  const clean = keyword.toLowerCase().trim().replace(/\s+/g, '');
  if (!clean) return [];

  const suffixes = SUFFIXES[style] ?? SUFFIXES.professional;
  const names = new Set<string>();

  for (const sep of SEPARATORS) {
    for (const suffix of suffixes) {
      names.add(`${clean}${sep}${suffix}`);
    }
    for (const prefix of PREFIXES) {
      names.add(`${prefix}${capitalizeFirst(clean)}`);
    }
  }

  const result: string[] = [];
  for (const name of names) {
    if (result.length >= 20) break;
    result.push(name);
  }

  return result;
}
