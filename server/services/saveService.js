const path = require('path');
const fs = require('fs-extra');
const { getSettings } = require('../config');
const backupService = require('./backupService');
const serverManager = require('./serverManager');

/**
 * Recursively calculates the size and file count of a directory.
 */
function getDirStats(dirPath) {
  let totalSize = 0;
  let fileCount = 0;

  if (!fs.existsSync(dirPath)) {
    return { totalSize: 0, fileCount: 0, formattedSize: '0 MB' };
  }

  function traverse(current) {
    try {
      const files = fs.readdirSync(current);
      for (const file of files) {
        const full = path.join(current, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          traverse(full);
        } else {
          totalSize += stat.size;
          fileCount++;
        }
      }
    } catch (e) {
      // ignore read permission errors on isolated files
    }
  }

  traverse(dirPath);

  let formattedSize = '0 MB';
  if (totalSize > 1024 * 1024 * 1024) {
    formattedSize = (totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  } else {
    formattedSize = (totalSize / (1024 * 1024)).toFixed(2) + ' MB';
  }

  return { totalSize, fileCount, formattedSize };
}

/**
 * Gets details of the world save, database, and configs for a given server name.
 */
function getSaveInfo(serverName) {
  const settings = getSettings();
  const name = serverName || settings.serverName || 'servertest';
  
  const saveDirPath = path.join(settings.zomboidUserDataPath, 'Saves', 'Multiplayer', name);
  const saveExists = fs.existsSync(saveDirPath);
  
  let saveStats = { totalSize: 0, fileCount: 0, formattedSize: '0 MB' };
  let lastModified = null;

  if (saveExists) {
    saveStats = getDirStats(saveDirPath);
    try {
      const stat = fs.statSync(saveDirPath);
      lastModified = stat.mtime;
    } catch (e) {}
  }

  // Check database
  const dbDir = path.join(settings.zomboidUserDataPath, 'db');
  const dbPath = path.join(dbDir, `${name}.db`);
  const dbExists = fs.existsSync(dbPath);
  let dbSize = '0 KB';
  if (dbExists) {
    try {
      const stat = fs.statSync(dbPath);
      dbSize = (stat.size / 1024).toFixed(1) + ' KB';
    } catch (e) {}
  }

  // Check server config files
  const iniPath = path.join(settings.zomboidUserDataPath, 'Server', `${name}.ini`);
  const iniExists = fs.existsSync(iniPath);

  return {
    serverName: name,
    savePath: saveDirPath,
    saveExists,
    fileCount: saveStats.fileCount,
    size: saveStats.formattedSize,
    rawSizeBytes: saveStats.totalSize,
    lastModified,
    dbPath,
    dbExists,
    dbSize,
    iniExists,
    isServerRunning: serverManager.status !== 'stopped'
  };
}

/**
 * Resets/Wipes the save world so the game starts over completely from day 1.
 */
function resetSave({
  serverName,
  resetWorld = true,
  resetDb = false,
  createBackup = true
}) {
  const settings = getSettings();
  const name = serverName || settings.serverName || 'servertest';

  if (serverManager.status !== 'stopped') {
    throw new Error('Cannot reset save while the server is running or starting. Please stop the server first.');
  }

  let backupCreated = null;

  // 1. Create a safety backup if requested
  if (createBackup) {
    try {
      serverManager.addLog(`[Save Manager] Creating safety backup before world reset for "${name}"...`, 'system');
      backupCreated = backupService.createBackup(name);
      serverManager.addLog(`[Save Manager] Safety backup created: ${backupCreated.filename}`, 'system');
    } catch (e) {
      serverManager.addLog(`[Save Manager Warning] Could not create backup: ${e.message}`, 'warning');
    }
  }

  const deletedItems = [];

  // 2. Delete world save directory
  if (resetWorld) {
    const saveDirPath = path.join(settings.zomboidUserDataPath, 'Saves', 'Multiplayer', name);
    if (fs.existsSync(saveDirPath)) {
      fs.removeSync(saveDirPath);
      deletedItems.push(`Saves/Multiplayer/${name}`);
      serverManager.addLog(`[Save Manager] World save directory deleted: ${saveDirPath}`, 'warning');
    }
  }

  // 3. Delete database files (player accounts, whitelist, bans) if requested
  if (resetDb) {
    const dbDir = path.join(settings.zomboidUserDataPath, 'db');
    if (fs.existsSync(dbDir)) {
      const dbFiles = fs.readdirSync(dbDir).filter(f => f.startsWith(name));
      for (const df of dbFiles) {
        const fullDbFile = path.join(dbDir, df);
        fs.removeSync(fullDbFile);
        deletedItems.push(`db/${df}`);
      }
      if (dbFiles.length > 0) {
        serverManager.addLog(`[Save Manager] Player database file(s) deleted: ${dbFiles.join(', ')}`, 'warning');
      }
    }
  }

  serverManager.addLog(`[Save Manager] World reset completed for server "${name}". The game will start fresh from day 1 on next launch.`, 'system');

  return {
    success: true,
    serverName: name,
    deletedItems,
    backupCreated: backupCreated ? backupCreated.filename : null,
    message: `Save world for "${name}" successfully reset!`
  };
}

module.exports = {
  getSaveInfo,
  resetSave
};
