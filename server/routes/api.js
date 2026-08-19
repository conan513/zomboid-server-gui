const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { getSettings, updateSettings, DATA_DIR } = require('../config');
const steamcmd = require('../services/steamcmd');
const serverManager = require('../services/serverManager');
const workshopService = require('../services/workshopService');
const iniParser = require('../services/iniParser');
const sandboxParser = require('../services/sandboxParser');
const backupService = require('../services/backupService');

const MODS_FILE = path.join(DATA_DIR, 'mods.json');

function getSavedMods() {
  fs.ensureDirSync(DATA_DIR);
  if (fs.existsSync(MODS_FILE)) {
    try {
      return fs.readJsonSync(MODS_FILE);
    } catch (e) {
      console.error('Error reading mods.json:', e);
    }
  }
  return [];
}

function saveModsFile(mods) {
  fs.ensureDirSync(DATA_DIR);
  fs.writeJsonSync(MODS_FILE, mods, { spaces: 2 });
}

// ----------------- SETTINGS & SYSTEM -----------------
router.get('/settings', (req, res) => {
  const settings = getSettings();
  const installInfo = steamcmd.checkServerInstalled(settings.serverInstallPath);
  res.json({
    settings,
    installInfo,
    isSteamCmdRunning: steamcmd.isSteamCmdRunning()
  });
});

router.post('/settings', (req, res) => {
  const updated = updateSettings(req.body);
  serverManager.addLog('[Web UI] Updated server and engine settings.', 'system');
  res.json({ success: true, settings: updated });
});

router.get('/servers', (req, res) => {
  const servers = iniParser.listAvailableServers();
  res.json({ servers });
});

// ----------------- SERVER PROCESS & LOGS -----------------
router.get('/status', (req, res) => {
  res.json(serverManager.getStatus());
});

router.post('/server/start', (req, res) => {
  try {
    serverManager.addLog('[Web UI] Starting Project Zomboid Dedicated Server...', 'system');
    const status = serverManager.startServer(req.body);
    res.json({ success: true, status });
  } catch (err) {
    serverManager.addLog(`[Web UI Error] Start failed: ${err.message}`, 'error');
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/server/stop', (req, res) => {
  try {
    const force = req.body?.force || false;
    serverManager.addLog(`[Web UI] Stopping server (Force: ${force})...`, 'system');
    serverManager.stopServer(force);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/server/restart', (req, res) => {
  try {
    serverManager.addLog('[Web UI] Restarting server...', 'system');
    serverManager.restartServer();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/server/command', (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    serverManager.sendCommand(command);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/server/logs', (req, res) => {
  res.json({ logs: serverManager.getLogs() });
});

// ----------------- STEAMCMD INSTALLER -----------------
router.post('/steamcmd/install', (req, res) => {
  if (steamcmd.isSteamCmdRunning()) {
    return res.status(400).json({ error: 'SteamCMD is already running in background!' });
  }

  const { installPath, branch, betaPassword, validate } = req.body || {};

  serverManager.addLog('================================================================', 'system');
  serverManager.addLog('[Web UI] Triggered SteamCMD Project Zomboid Server Installation/Update...', 'system');
  serverManager.addLog(`[Web UI] Target Path: ${installPath || getSettings().serverInstallPath}`, 'system');
  serverManager.addLog(`[Web UI] Branch: ${branch || 'public'} | Validate: ${validate !== false}`, 'system');
  serverManager.addLog('================================================================', 'system');

  steamcmd.installOrUpdateServer(
    { installPath, branch, betaPassword, validate },
    (logText) => {
      serverManager.addLog(logText, 'steamcmd');
    },
    (exitCode) => {
      if (exitCode === 0) {
        serverManager.addLog('[SteamCMD] Server installation / update completed successfully!', 'system');
      } else {
        serverManager.addLog(`[SteamCMD] Process finished with exit code ${exitCode}`, 'steamcmd');
      }
    }
  );

  res.json({ success: true, message: 'SteamCMD process launched.' });
});

router.post('/steamcmd/cancel', (req, res) => {
  serverManager.addLog('[Web UI] Cancelling active SteamCMD process...', 'warning');
  const cancelled = steamcmd.cancelSteamCmd();
  res.json({ success: cancelled });
});

router.get('/steamcmd/status', (req, res) => {
  res.json({ isRunning: steamcmd.isSteamCmdRunning() });
});

// ----------------- MODS & WORKSHOP MANAGEMENT -----------------
router.get('/mods', async (req, res) => {
  const settings = getSettings();
  const serverName = req.query.serverName || settings.serverName || 'servertest';
  let savedMods = getSavedMods();

  const iniModsInfo = iniParser.getModsFromIni(serverName);

  res.json({
    mods: savedMods,
    iniModsInfo
  });
});

// Fetch info for single Workshop item by ID or URL
router.post('/mods/fetch', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Workshop ID or URL is required' });
    serverManager.addLog(`[Web UI] Fetching Steam Workshop item: "${query}"...`, 'system');
    const modInfo = await workshopService.fetchWorkshopDetails(query);
    serverManager.addLog(`[Web UI] Loaded mod: "${modInfo.title}" (ID: ${modInfo.workshopId}, ModIDs: ${modInfo.modIds.join(', ')})`, 'system');
    res.json({ success: true, mod: modInfo });
  } catch (err) {
    serverManager.addLog(`[Web UI Error] Failed to fetch mod "${req.body?.query}": ${err.message}`, 'error');
    res.status(400).json({ success: false, error: err.message });
  }
});

// Batch fetch details
router.post('/mods/batch-fetch', async (req, res) => {
  try {
    const { workshopIds } = req.body;
    if (!Array.isArray(workshopIds)) {
      return res.status(400).json({ error: 'workshopIds array required' });
    }
    serverManager.addLog(`[Web UI] Batch fetching ${workshopIds.length} Steam Workshop items...`, 'system');
    const results = await workshopService.batchFetchWorkshop(workshopIds);
    serverManager.addLog(`[Web UI] Batch fetched ${results.length} mods successfully.`, 'system');
    res.json({ success: true, mods: results });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Save mods list (ordered) & sync directly to Server INI
router.post('/mods/save', (req, res) => {
  try {
    const { mods, serverName, syncToIni = true } = req.body;
    if (!Array.isArray(mods)) {
      return res.status(400).json({ error: 'mods must be an array' });
    }

    saveModsFile(mods);

    let syncResult = null;
    if (syncToIni) {
      const activeServer = serverName || getSettings().serverName || 'servertest';

      const orderedModIds = [];
      const orderedWorkshopIds = [];
      const maps = [];

      for (const m of mods) {
        if (m.enabled !== false) {
          if (m.workshopId && !orderedWorkshopIds.includes(m.workshopId)) {
            orderedWorkshopIds.push(m.workshopId);
          }
          const selected = m.selectedModIds && m.selectedModIds.length > 0 ? m.selectedModIds : m.modIds;
          for (const mid of selected) {
            if (!orderedModIds.includes(mid)) {
              orderedModIds.push(mid);
            }
          }
          if (m.mapFolders && Array.isArray(m.mapFolders)) {
            for (const mapName of m.mapFolders) {
              if (!maps.includes(mapName)) maps.push(mapName);
            }
          }
        }
      }

      syncResult = iniParser.syncModsToIni(activeServer, {
        mods: orderedModIds,
        workshopItems: orderedWorkshopIds,
        maps
      });

      serverManager.addLog(`[Web UI] Synced ${orderedModIds.length} Mod IDs and ${orderedWorkshopIds.length} Workshop items to ${activeServer}.ini!`, 'system');
    }

    res.json({
      success: true,
      mods,
      syncResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import mods from existing server.ini file
router.post('/mods/import-ini', async (req, res) => {
  try {
    const { serverName } = req.body;
    const activeServer = serverName || getSettings().serverName || 'servertest';
    serverManager.addLog(`[Web UI] Scanning ${activeServer}.ini for existing mods...`, 'system');
    const iniInfo = iniParser.getModsFromIni(activeServer);

    if (iniInfo.workshopList.length === 0 && iniInfo.modList.length === 0) {
      serverManager.addLog(`[Web UI] No mods found in ${activeServer}.ini`, 'system');
      return res.json({ success: true, count: 0, mods: [] });
    }

    serverManager.addLog(`[Web UI] Found ${iniInfo.workshopList.length} Workshop IDs in ${activeServer}.ini. Fetching Steam details...`, 'system');
    const fetchedMods = await workshopService.batchFetchWorkshop(iniInfo.workshopList);

    for (const mod of fetchedMods) {
      const activeInIni = mod.modIds.filter(id => iniInfo.modList.includes(id));
      mod.selectedModIds = activeInIni.length > 0 ? activeInIni : mod.modIds;
      mod.enabled = true;
    }

    saveModsFile(fetchedMods);
    serverManager.addLog(`[Web UI] Successfully imported ${fetchedMods.length} mods from ${activeServer}.ini`, 'system');

    res.json({
      success: true,
      count: fetchedMods.length,
      mods: fetchedMods
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- CONFIG & INI MANAGEMENT -----------------
router.get('/config/ini', (req, res) => {
  try {
    const settings = getSettings();
    const serverName = req.query.serverName || settings.serverName || 'servertest';
    const iniPath = iniParser.getServerIniPath(serverName);
    const config = iniParser.parseIniFile(iniPath);
    res.json({
      serverName,
      iniPath,
      exists: fs.existsSync(iniPath),
      config
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/config/ini', (req, res) => {
  try {
    const { serverName, config } = req.body;
    const activeServer = serverName || getSettings().serverName || 'servertest';
    const iniPath = iniParser.getServerIniPath(activeServer);
    iniParser.writeIniFile(iniPath, config);
    serverManager.addLog(`[Web UI] Saved server settings to ${activeServer}.ini`, 'system');
    res.json({ success: true, message: 'Server INI saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/config/sandbox', (req, res) => {
  try {
    const settings = getSettings();
    const serverName = req.query.serverName || settings.serverName || 'servertest';
    const filePath = sandboxParser.getServerSandboxPath(serverName);
    const data = sandboxParser.parseSandboxFile(filePath);
    res.json({
      serverName,
      filePath,
      exists: data.exists,
      categories: data.categories,
      flatVars: data.flatVars,
      raw: data.raw
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/config/sandbox', (req, res) => {
  try {
    const { serverName, vars, rawLua } = req.body;
    const activeServer = serverName || getSettings().serverName || 'servertest';
    const filePath = sandboxParser.getServerSandboxPath(activeServer);

    if (typeof rawLua === 'string') {
      sandboxParser.writeRawSandboxFile(filePath, rawLua);
      serverManager.addLog(`[Web UI] Saved raw Lua configuration to ${activeServer}_SandboxVars.lua`, 'system');
    } else if (vars && typeof vars === 'object') {
      const current = sandboxParser.parseSandboxFile(filePath);
      sandboxParser.writeSandboxFile(filePath, vars, current.raw);
      serverManager.addLog(`[Web UI] Saved sandbox variables to ${activeServer}_SandboxVars.lua`, 'system');
    } else {
      return res.status(400).json({ error: 'Either vars or rawLua is required' });
    }

    res.json({ success: true, message: 'Sandbox configuration saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- BACKUPS -----------------
router.get('/backups', (req, res) => {
  try {
    const backups = backupService.listBackups();
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/backups/create', (req, res) => {
  try {
    const { serverName } = req.body;
    serverManager.addLog(`[Web UI] Creating backup archive for server "${serverName || 'servertest'}"...`, 'system');
    const backup = backupService.createBackup(serverName);
    serverManager.addLog(`[Web UI] Created backup archive: "${backup.filename}" (${backup.size})`, 'system');
    res.json({ success: true, backup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/backups/restore', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });
    serverManager.addLog(`[Web UI] Restoring backup archive: "${filename}"...`, 'warning');
    backupService.restoreBackup(filename);
    serverManager.addLog(`[Web UI] Backup "${filename}" restored successfully.`, 'system');
    res.json({ success: true, message: 'Backup restored successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/backups/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const deleted = backupService.deleteBackup(filename);
    serverManager.addLog(`[Web UI] Deleted backup archive: "${filename}"`, 'system');
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
