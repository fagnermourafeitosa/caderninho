(function (root) {
  const plural = (count, singular, pluralForm) => `${count} ${count === 1 ? singular : pluralForm}`;
  // Intl already returns Portuguese casing ("outubro de 2026"); only a line start is capitalized.
  const sentenceCase = text => String(text).charAt(0).toLocaleUpperCase('pt-BR') + String(text).slice(1);
  const api = { plural, sentenceCase };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.textFormat = api;
})(typeof window === 'object' ? window : globalThis);
