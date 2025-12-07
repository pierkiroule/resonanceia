// Mini metaphor generator using deterministic templates.

const ANALOGIES = [
  { frame: "comme un tambour trop serre sous les cotes", tone: 'tension' },
  { frame: "comme une voile qui cherche le vent", tone: 'élan' },
  { frame: "comme une braise qui ne veut pas s eteindre", tone: 'endurance' },
  { frame: "comme une corde sensible qui vibre en silence", tone: 'sensibilite' },
  { frame: "comme un phare pris dans la brume", tone: 'brouillard' },
  { frame: "comme un galet sous la surface calme", tone: 'poids' },
  { frame: "comme un ressort qui attend de se detendre", tone: 'liberation' },
];

function chooseAnalogyIndex(pivot = '') {
  if (!pivot) return 0;
  const code = pivot
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return code % ANALOGIES.length;
}

function buildMetaphore(pivot, noyau = []) {
  const index = chooseAnalogyIndex(pivot);
  const base = ANALOGIES[index];
  const neighbor = noyau[0] || 'toi';
  return `${base.frame}, ${pivot || 'mot'} touche ${neighbor}.`;
}

export { buildMetaphore, chooseAnalogyIndex };
