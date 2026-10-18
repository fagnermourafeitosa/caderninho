const {sqliteLayoutRepository}=require('./infrastructure/sqlite-layout-repository.cjs');
function createMediaLayout({store}) {
  const repository=sqliteLayoutRepository(store);
  return {read:require('./application/read-layout.cjs')(repository),move:require('./application/move-card.cjs')(repository),resize:require('./application/resize-card.cjs')(repository),restore:require('./application/restore-layout.cjs')(repository)};
}
function initializeImportedLayout(store,input) {
  require('./application/initialize-import.cjs')(sqliteLayoutRepository(store))(input);
}
module.exports={createMediaLayout,initializeImportedLayout};
