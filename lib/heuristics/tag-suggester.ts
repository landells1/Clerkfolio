export const KEYWORD_TAG_MAP: [string[], string][] = [
  [['cardio', 'cardiac', 'heart', 'mi ', 'stemi', 'nstemi', 'atrial', 'chest pain', 'angina'], 'Cardiology'],
  [['resp', 'lung', 'pneum', 'asthma', 'copd', 'pleural', 'breathless', 'shortness'], 'Respiratory Medicine'],
  [['neuro', 'stroke', 'seizure', 'headache', 'parkinson'], 'Neurology'],
  [['gastro', 'bowel', 'abdomen', 'liver', 'endoscopy', 'ibd'], 'Gastroenterology'],
  [['surg', 'appendix', 'hernia', 'laparoscop', 'cholecyst'], 'General Surgery'],
  [['paeds', 'paediatric', 'child', 'neonatal'], 'Paediatrics'],
  [['psych', 'mental health', 'depression', 'anxiety'], 'Psychiatry'],
  [['ortho', 'fracture', 'bone', 'joint', 'knee', 'hip'], 'Orthopaedics'],
  [['derm', 'skin', 'rash', 'eczema', 'psoriasis'], 'Dermatology'],
  [['renal', 'kidney', 'aki', 'ckd', 'dialysis'], 'Nephrology'],
  [['diabet', 'dka', 'thyroid', 'endocrin'], 'Endocrinology & Diabetes'],
  [['haem', 'anaemia', 'lymphoma', 'leukaemia'], 'Clinical Haematology'],
  [['itu', 'icu', 'critical care', 'ventilat'], 'Critical Care / ITU'],
  [['a&e', 'trauma', 'resus', 'triage'], 'Emergency Medicine'],
]

export function suggestTagsForText(text: string, alreadyChosen: string[] = []) {
  const lower = ` ${text.toLowerCase()} `
  const chosen = new Set(alreadyChosen)
  const found: string[] = []
  for (const [keywords, tag] of KEYWORD_TAG_MAP) {
    if (chosen.has(tag)) continue
    if (keywords.some(keyword => lower.includes(keyword))) {
      found.push(tag)
      if (found.length >= 3) break
    }
  }
  return found
}
