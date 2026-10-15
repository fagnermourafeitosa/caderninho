// Composition of the Related pages context: adapters wired into the scheduler and the use cases.
const path = require('node:path');
const config = require('./domain/model.cjs');
const { SqliteRelatedRepository } = require('./infrastructure/sqlite-related-repository.cjs');
const { EmbeddingWorkerClient } = require('./infrastructure/embedding-worker-client.cjs');
const { IndexingScheduler } = require('./application/indexing-scheduler.cjs');
const { indexPages } = require('./application/index-pages.cjs');
const { queryRelated } = require('./application/query-related.cjs');
const { readRelatedSettings } = require('./application/read-related-settings.cjs');
const { updateRelatedSettings } = require('./application/update-related-settings.cjs');
const { resetRelatedRanking } = require('./application/reset-related-ranking.cjs');
const { clearRelatedCache } = require('./application/clear-related-cache.cjs');
const { modelFolder } = require('./infrastructure/model-folder.cjs');
const { preferences } = require('./domain/preferences.cjs');

// `engine` replaces the worker in tests.
function createRelatedPages({ store, media, ocrPath, cacheDir = path.join(store.directory, 'models'), engine, onUpdate = () => {} }) {
  const repository = new SqliteRelatedRepository(store), folder = modelFolder(cacheDir);
  const pages = { snapshot: () => store.snapshot(), file: blobId => media.file(blobId) };
  let scheduler;
  const engineInUse = engine || new EmbeddingWorkerClient({ cacheDir, ocrPath, onStatus: status => scheduler.setStatus(status) });
  scheduler = new IndexingScheduler({ pass: indexPages({ pages, repository, engine: engineInUse, onProgress: onUpdate }), debounceMs: config.debounceMs, enabled: preferences(repository.preferences()).enabled, onUpdate });
  const read = readRelatedSettings({ repository, folder, status: () => scheduler.status });
  return {
    scheduler,
    engine: engineInUse,
    schedule: () => scheduler.schedule(),
    refresh: () => { scheduler.runNow(); },
    ocrText: () => repository.ocrText(),
    close: () => { scheduler.close(); engineInUse.stop(); },
    useCases: {
      queryRelated: queryRelated({ pages, repository, status: () => scheduler.status }),
      readRelatedSettings: read,
      updateRelatedSettings: updateRelatedSettings({ repository, scheduler, engine: engineInUse, read }),
      resetRelatedRanking: resetRelatedRanking({ repository, read }),
      clearRelatedCache: clearRelatedCache({ repository, scheduler, engine: engineInUse, folder, read }),
    },
  };
}

module.exports = { createRelatedPages };
