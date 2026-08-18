const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const { getSettings, DATA_DIR } = require('../config');

const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

function listBackups() {
  fs.ensureDirSync(BACKUPS_DIR);
  const files = fs.readdirSync(BACKUPS_DIR);
  const backups = [];

  for (const f of files) {
    if (f.endsWith('.zip')) {
      const fullPath = path.join(BACKUPS_DIR, f);
      const stat = fs.statSync(fullPath);
      backups.push({
        filename: f,
        size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
        createdAt: stat.birthtime || stat.mtime,
        path: fullPath
      });
    }
  }

  return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createBackup(serverName) {
  fs.ensureDirSync(BACKUPS_DIR);
  const settings = getSettings();
  const name = serverName || settings.serverName || 'servertest';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${name}_backup_${timestamp}.zip`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  const zip = new AdmZip();

  // 1. Add server configs
  const serverConfigDir = path.join(settings.zomboidUserDataPath, 'Server');
  if (fs.existsSync(serverConfigDir)) {
    const configFiles = fs.readdirSync(serverConfigDir).filter(f => f.startsWith(name));
    for (const cf of configFiles) {
      const srcFile = path.join(serverConfigDir, cf);
      zip.addLocalFile(srcFile, 'Server');
    }
  }

  // 2. Add multiplayer save directory if exists
  const saveDir = path.join(settings.zomboidUserDataPath, 'Saves', 'Multiplayer', name);
  if (fs.existsSync(saveDir)) {
    zip.addLocalFolder(saveDir, path.join('Saves', 'Multiplayer', name));
  }

  // 3. Add db file if exists
  const dbDir = path.join(settings.zomboidUserDataPath, 'db');
  if (fs.existsSync(dbDir)) {
    const dbFiles = fs.readdirSync(dbDir).filter(f => f.startsWith(name));
    for (const df of dbFiles) {
      const srcFile = path.join(dbDir, df);
      zip.addLocalFile(srcFile, 'db');
    }
  }

  zip.writeZip(backupFilePath);

  const stat = fs.statSync(backupFilePath);
  return {
    filename: backupFileName,
    size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
    createdAt: new Date().toISOString(),
    path: backupFilePath
  };
}

function restoreBackup(backupFilename) {
  const settings = getSettings();
  const backupFilePath = path.join(BACKUPS_DIR, backupFilename);
  if (!fs.existsSync(backupFilePath)) {
    throw new Error('Backup file not found.');
  }

  const zip = new AdmZip(backupFilePath);
  zip.extractAllTo(settings.zomboidUserDataPath, true);
  return true;
}

function deleteBackup(backupFilename) {
  const backupFilePath = path.join(BACKUPS_DIR, backupFilename);
  if (fs.existsSync(backupFilePath)) {
    fs.unlinkSync(backupFilePath);
    return true;
  }
  return false;
}

module.exports = {
  BACKUPS_DIR,
  listBackups,
  createBackup,
  restoreBackup,
  deleteBackup
};
