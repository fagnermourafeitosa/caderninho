// Command: delete the downloaded model and every vector, keep text read from images, index again when on.
const CLEAR_FAILED = 'Não foi possível apagar o cache do modelo.';

const clearRelatedCache = ({ repository, scheduler, engine, folder, read, log = message => console.error(message) }) => async () => {
  try {
    // Stop the worker and let a running pass finish, so nothing is written after the deletion.
    await engine.stop();
    await scheduler.settled();
    folder.remove();
    repository.clearVectors();
  } catch (error) {
    log(`Cache do modelo: ${error.message}`);
    throw new Error(CLEAR_FAILED);
  }
  scheduler.restart();
  return read();
};

module.exports = { clearRelatedCache };
