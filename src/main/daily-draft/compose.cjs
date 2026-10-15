// Composition of the Daily draft context: the SQLite adapter wired into the use cases the IPC layer calls.
const { SqliteDailyDraftRepository } = require('./infrastructure/sqlite-daily-draft-repository.cjs');
const { openDailyDraft } = require('./application/open-daily-draft.cjs');
const { startDailyDraft } = require('./application/start-daily-draft.cjs');

function createDailyDraftUseCases({ store }) {
  const repository = new SqliteDailyDraftRepository(store);
  return {
    openDailyDraft: openDailyDraft(repository),
    startDailyDraft: startDailyDraft(repository),
  };
}

module.exports = { createDailyDraftUseCases };
