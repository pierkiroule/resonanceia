export function craftMetaphor(pivot, orbites = [], variation = 0) {
  const orbitNames = orbites.slice(0, 5).map((o) => o.mot);
  const orbitList = orbitNames.length ? orbitNames.join(', ') : 'aucune orbite immédiate';
  const drift = variation > 0 ? 'brille davantage' : variation < 0 ? "s'atténue" : 'reste stable';

  const metaphore = pivot
    ? `Autour de "${pivot}", le tissu reste co-émergent : ${orbitList}. La résonance ${drift}.`
    : 'Constellation en attente de premiers éclats.';

  const constellation = [
    '🌌 neutralité',
    '🧭 co-émergent',
    "✨ pas d'interprétation",
    `🛰️ delta ${variation >= 0 ? '+' : ''}${variation}`,
    pivot ? `🌠 pivot ${pivot}` : '🌠 pivot latent'
  ];

  return { metaphore, constellation };
}
