// Generates emotional tags with emojis according to simple lexical clues.

const EMOTION_LEXICON = [
  { match: ['peur', 'angoiss', 'stress', 'crain'], emoji: '🌫️', label: 'anxiete' },
  { match: ['joie', 'heureux', 'lumineu', 'soulage'], emoji: '🌞', label: 'legerete' },
  { match: ['coler', 'rage', 'fureur'], emoji: '🔥', label: 'tension' },
  { match: ['pression', 'poids', 'lourd', 'serr'], emoji: '🪨', label: 'pression' },
  { match: ['souffl', 'respir', 'air'], emoji: '🌬️', label: 'souffle' },
  { match: ['avanc', 'mouv', 'march'], emoji: '🚶', label: 'mouvement' },
  { match: ['coeur', 'poitrine'], emoji: '❤️', label: 'coeur' },
];

function detectTags(words = []) {
  const found = [];
  words.forEach((word) => {
    const entry = EMOTION_LEXICON.find((item) => item.match.some((stem) => word.startsWith(stem)));
    if (entry) {
      const tag = `${entry.emoji} ${entry.label}`;
      if (!found.includes(tag)) {
        found.push(tag);
      }
    }
  });
  return found;
}

function buildTags({ pivot, noyau = [], peripherie = [] }) {
  const all = [pivot, ...noyau, ...peripherie].filter(Boolean);
  const lexicalTags = detectTags(all);
  const filler = all
    .filter((word) => !lexicalTags.some((tag) => tag.includes(word)))
    .slice(0, 3)
    .map((word) => `✨ ${word}`);
  return [...lexicalTags, ...filler].slice(0, 6);
}

function buildCielEtoile(tags = []) {
  return tags.slice(0, 4).map((tag) => {
    const [emoji, ...rest] = tag.split(' ');
    return { emoji: emoji || '✨', label: rest.join(' ') || 'constellation' };
  });
}

export { buildTags, buildCielEtoile, detectTags, EMOTION_LEXICON };
