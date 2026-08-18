const path = require('path');
const fs = require('fs-extra');
const os = require('os');

const isWindows = process.platform === 'win32';
const steamCmdExeName = isWindows ? 'steamcmd.exe' : 'steamcmd.sh';

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'settings.json');

// Default Zomboid path in user profile (~/Zomboid on Linux, %USERPROFILE%\Zomboid on Windows)
const defaultZomboidUserData = path.join(os.homedir(), 'Zomboid');
const defaultSteamCmdDir = path.join(__dirname, '..', 'steamcmd');
const defaultServerDir = path.join(__dirname, '..', 'pz_server');

const defaultConfig = {
  platform: process.platform,
  steamCmdPath: path.join(defaultSteamCmdDir, steamCmdExeName),
  serverInstallPath: defaultServerDir,
  zomboidUserDataPath: defaultZomboidUserData,
  serverName: 'servertest',
  adminPassword: '',
  serverPassword: '',
  memoryMin: '4g',
  memoryMax: '8g',
  branch: 'public', // or 'b41multiplayer' / 'unstable'
  branchBetaPassword: '',
  autoBackupOnStart: true,
  port: 16261,
  udpPort: 16262
};

function getSettings() {
  fs.ensureDirSync(DATA_DIR);
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeJsonSync(CONFIG_FILE, defaultConfig, { spaces: 2 });
    return { ...defaultConfig };
  }
  try {
    const loaded = fs.readJsonSync(CONFIG_FILE);
    const settings = { ...defaultConfig, ...loaded };
    
    // Auto-adjust steamCmdPath if switching platforms
    if (isWindows && settings.steamCmdPath.endsWith('steamcmd.sh')) {
      settings.steamCmdPath = path.join(defaultSteamCmdDir, 'steamcmd.exe');
    } else if (!isWindows && settings.steamCmdPath.endsWith('steamcmd.exe')) {
      settings.steamCmdPath = path.join(defaultSteamCmdDir, 'steamcmd.sh');
    }
    
    return settings;
  } catch (err) {
    console.error('Error reading settings.json, returning default', err);
    return { ...defaultConfig };
  }
}

function updateSettings(newSettings) {
  fs.ensureDirSync(DATA_DIR);
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  fs.writeJsonSync(CONFIG_FILE, updated, { spaces: 2 });
  return updated;
}

module.exports = {
  isWindows,
  steamCmdExeName,
  DATA_DIR,
  CONFIG_FILE,
  defaultZomboidUserData,
  defaultSteamCmdDir,
  defaultServerDir,
  getSettings,
  updateSettings
};
