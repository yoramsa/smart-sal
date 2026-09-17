export function flattenDict(dictObj) {
  const entries = [];
  for (const [section, dict] of Object.entries(dictObj)) {
    if (section.startsWith('_')) continue;
    for (const [he, fr] of Object.entries(dict)) {
      if (he && fr) entries.push([he, fr]);
    }
  }
  return entries.sort((a, b) => b[0].length - a[0].length);
}

export function translateHebrew(text, dictEntries) {
  if (!text) return '';
  let result = text;
  for (const [he, fr] of dictEntries) {
    if (result.includes(he)) result = result.split(he).join(fr);
  }
  return result.trim().replace(/\s+/g, ' ');
}

export function hebrewRatio(s) {
  if (!s) return 0;
  const heb = (s.match(/[֐-׿]/g) || []).length;
  const letters = (s.match(/[֐-׿a-zA-Z]/g) || []).length;
  if (letters === 0) return 0;
  return heb / letters;
}

export function isMostlyTranslated(fr, threshold = 0.15) {
  if (!fr) return false;
  return hebrewRatio(fr) < threshold;
}
