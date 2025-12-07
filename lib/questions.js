// Bank of resonant questions to invite reflection.

const QUESTION_TEMPLATES = [
  'Que veut proteger "{pivot}" en toi ? fugue, bataille ou appel ?',
  'Si "{pivot}" parlait, demanderait-il de tenir, de crier ou de souffler ?',
  'Qu est-ce qui pulse derriere "{pivot}" : un besoin, une limite, un signal ?',
  'Quel geste simple pourrait apprivoiser "{pivot}" dans l instant ?',
];

function pickQuestion(pivot = '') {
  const safePivot = pivot || 'ce point';
  const index = Math.abs(safePivot.length + safePivot.charCodeAt(0)) % QUESTION_TEMPLATES.length;
  return QUESTION_TEMPLATES[index].replace('{pivot}', safePivot);
}

export { pickQuestion };
