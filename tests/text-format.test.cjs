const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plural, sentenceCase } = require('../src/shared/text-format.js');

test('counts use the singular only for exactly one', () => {
  assert.equal(plural(1, 'lembrete', 'lembretes'), '1 lembrete');
  assert.equal(plural(0, 'lembrete', 'lembretes'), '0 lembretes');
  assert.equal(plural(2, 'tarefa pendente', 'tarefas pendentes'), '2 tarefas pendentes');
});

test('dates keep Portuguese casing and capitalize only the first letter', () => {
  assert.equal(sentenceCase('outubro de 2026'), 'Outubro de 2026');
  assert.equal(sentenceCase('domingo, 4 de outubro'), 'Domingo, 4 de outubro');
  assert.equal(sentenceCase(''), '');
});
