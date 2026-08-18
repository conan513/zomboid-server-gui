const fs = require('fs-extra');
const path = require('path');
const { getSettings } = require('../config');

// Default INI template with commonly tuned options
const defaultIniTemplate = {
  PVP: 'true',
  PauseEmpty: 'true',
  GlobalChat: 'true',
  Open: 'true',
  ServerWelcomeMessage: 'Welcome to Project Zomboid Dedicated Server! <LINE> <LINE> Survive together.',
  LogLocalChat: 'false',
  AutoCreateUserInWhiteList: 'false',
  DisplayUserName: 'true',
  ShowFirstAndLastName: 'false',
  SpawnPoint: '0,0,0',
  SafetySystem: 'true',
  ShowSafety: 'true',
  SafetyToggleTimer: '2',
  SafetyCooldownTimer: '3',
  HidePlayersBehindYou: 'true',
  AllowDestructionBySledgehammer: 'true',
  SledgehammerOnlyInSafehouse: 'false',
  PlayerSafehouse: 'false',
  AdminSafehouse: 'false',
  SafehouseAllowTrepass: 'false',
  SafehouseAllowFire: 'false',
  SafehouseAllowLoot: 'false',
  SafehouseAllowRespawn: 'false',
  SafehouseDaySurvivedToClaim: '0',
  SafeHouseRemovalTime: '144',
  SafehouseAllowNonResidential: 'false',
  Public: 'true',
  PublicName: 'My Project Zomboid Dedicated Server',
  PublicDescription: 'Project Zomboid Server managed with PZ GUI Manager',
  MaxPlayers: '32',
  PingLimit: '400',
  HoursForLootRespawn: '0',
  MaxItemsForLootRespawn: '4',
  ConstructionPreventsLootRespawn: 'true',
  DropOffWhiteListAfterDeath: 'false',
  MinutesPerPage: '1.0',
  SaveWorldEveryMinutes: '0',
  SpeedLimit: '120.0',
  ServerPlayerID: '1234567890',
  Map: 'Muldraugh, KY',
  WorkshopItems: '',
  Mods: '',
  RCONPort: '27015',
  RCONPassword: '',
  Password: '',
  MaxAccountsPerUser: '0',
  SleepAllowed: 'false',
  SleepNeeded: 'false',
  KnockedDownAllowed: 'true',
  SneakModeHideFromOtherPlayers: 'true',
  BackupsCount: '5',
  BackupsOnStart: 'true',
  BackupsOnVersionChange: 'true',
  BackupsPeriod: '0',
  DoLuaChecksum: 'true',
  DenyLoginOnOverloadedServer: 'true',
  NoZombie: 'false'
};

function getServerIniPath(serverName) {
  const settings = getSettings();
  const name = serverName || settings.serverName || 'servertest';
  return path.join(settings.zomboidUserDataPath, 'Server', `${name}.ini`);
}

function getServerSandboxPath(serverName) {
  const settings = getSettings();
  const name = serverName || settings.serverName || 'servertest';
  return path.join(settings.zomboidUserDataPath, 'Server', `${name}_SandboxVars.lua`);
}

function parseIniFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { ...defaultIniTemplate };
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const result = { ...defaultIniTemplate };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith(';')) {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      result[key] = val;
    }
  }

  return result;
}

function writeIniFile(filePath, configObj) {
  fs.ensureDirSync(path.dirname(filePath));
  
  // Read existing lines if any, to preserve comments/order if possible
  let outputLines = [];
  const writtenKeys = new Set();

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith(';')) {
        outputLines.push(line);
        continue;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        if (configObj.hasOwnProperty(key)) {
          outputLines.push(`${key}=${configObj[key]}`);
          writtenKeys.add(key);
        } else {
          outputLines.push(line);
        }
      } else {
        outputLines.push(line);
      }
    }
  }

  // Append any keys that weren't in the original file
  for (const [k, v] of Object.entries(configObj)) {
    if (!writtenKeys.has(k)) {
      outputLines.push(`${k}=${v}`);
    }
  }

  fs.writeFileSync(filePath, outputLines.join('\r\n'), 'utf-8');
  return true;
}

// Get structured list of mods from server INI
function getModsFromIni(serverName) {
  const iniPath = getServerIniPath(serverName);
  const ini = parseIniFile(iniPath);
  const rawMods = ini.Mods || '';
  const rawWorkshop = ini.WorkshopItems || '';

  const modList = rawMods.split(';').map(s => s.trim()).filter(Boolean);
  const workshopList = rawWorkshop.split(';').map(s => s.trim()).filter(Boolean);
  const mapList = (ini.Map || 'Muldraugh, KY').split(';').map(s => s.trim()).filter(Boolean);

  return {
    rawMods,
    rawWorkshop,
    modList,
    workshopList,
    mapList
  };
}

// Sync mod order and workshop IDs into server INI
function syncModsToIni(serverName, { mods = [], workshopItems = [], maps = [] }) {
  const iniPath = getServerIniPath(serverName);
  const ini = parseIniFile(iniPath);

  // Format: id1;id2;id3; (trailing semicolon standard in PZ)
  const modsString = mods.length > 0 ? mods.join(';') + ';' : '';
  const workshopString = workshopItems.length > 0 ? workshopItems.join(';') + ';' : '';
  
  // Maps: Custom maps first, then Muldraugh, KY last
  let mapString = maps.join(';');
  if (!mapString.includes('Muldraugh, KY')) {
    mapString = mapString ? `${mapString};Muldraugh, KY` : 'Muldraugh, KY';
  }

  ini.Mods = modsString;
  ini.WorkshopItems = workshopString;
  ini.Map = mapString;

  writeIniFile(iniPath, ini);
  return { modsString, workshopString, mapString };
}

// SandboxVars.lua simple parser / reader
function readSandboxVars(serverName) {
  const luaPath = getServerSandboxPath(serverName);
  if (!fs.existsSync(luaPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(luaPath, 'utf-8');
    // Simple key-value extraction for SandboxVars
    const vars = {};
    const lines = raw.split(/\r?\n/);
    let currentCategory = 'General';

    for (const line of lines) {
      const trimmed = line.trim();
      const catMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*\{/);
      if (catMatch && !catMatch[1].startsWith('SandboxVars')) {
        currentCategory = catMatch[1];
      }
      const kvMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.+?)(?:,)?$/);
      if (kvMatch && !trimmed.includes('{') && !trimmed.includes('}')) {
        const k = kvMatch[1];
        let v = kvMatch[2].trim();
        if (v.endsWith(',')) v = v.slice(0, -1).trim();
        if (v === 'true') v = true;
        else if (v === 'false') v = false;
        else if (!isNaN(Number(v))) v = Number(v);
        else if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);

        vars[`${currentCategory}.${k}`] = v;
      }
    }
    return { raw, vars };
  } catch (e) {
    console.error('Error reading SandboxVars:', e);
    return null;
  }
}

// List all available server configurations in Zomboid/Server directory
function listAvailableServers() {
  const settings = getSettings();
  const serverDir = path.join(settings.zomboidUserDataPath, 'Server');
  if (!fs.existsSync(serverDir)) {
    return ['servertest'];
  }
  const files = fs.readdirSync(serverDir);
  const servers = files
    .filter(f => f.endsWith('.ini'))
    .map(f => path.basename(f, '.ini'));

  return servers.length > 0 ? servers : ['servertest'];
}

module.exports = {
  defaultIniTemplate,
  getServerIniPath,
  getServerSandboxPath,
  parseIniFile,
  writeIniFile,
  getModsFromIni,
  syncModsToIni,
  readSandboxVars,
  listAvailableServers
};
