const API_BASE = '/api';

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  return res.json();
}

export async function saveSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  return res.json();
}

export async function fetchAvailableServers() {
  const res = await fetch(`${API_BASE}/servers`);
  return res.json();
}

export async function fetchServerStatus() {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

export async function startServer(options = {}) {
  const res = await fetch(`${API_BASE}/server/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  return res.json();
}

export async function stopServer(force = false) {
  const res = await fetch(`${API_BASE}/server/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force })
  });
  return res.json();
}

export async function restartServer() {
  const res = await fetch(`${API_BASE}/server/restart`, {
    method: 'POST'
  });
  return res.json();
}

export async function sendServerCommand(command) {
  const res = await fetch(`${API_BASE}/server/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
  return res.json();
}

export async function fetchServerLogs() {
  const res = await fetch(`${API_BASE}/server/logs`);
  return res.json();
}

export async function installServer(options) {
  const res = await fetch(`${API_BASE}/steamcmd/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  return res.json();
}

export async function cancelSteamCmd() {
  const res = await fetch(`${API_BASE}/steamcmd/cancel`, {
    method: 'POST'
  });
  return res.json();
}

export async function fetchMods(serverName) {
  const res = await fetch(`${API_BASE}/mods?serverName=${encodeURIComponent(serverName || '')}`);
  return res.json();
}

export async function fetchWorkshopDetails(query) {
  const res = await fetch(`${API_BASE}/mods/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return res.json();
}

export async function batchFetchWorkshop(workshopIds) {
  const res = await fetch(`${API_BASE}/mods/batch-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workshopIds })
  });
  return res.json();
}

export async function saveMods(mods, serverName, syncToIni = true) {
  const res = await fetch(`${API_BASE}/mods/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mods, serverName, syncToIni })
  });
  return res.json();
}

export async function importModsFromIni(serverName) {
  const res = await fetch(`${API_BASE}/mods/import-ini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverName })
  });
  return res.json();
}

export async function fetchIniConfig(serverName) {
  const res = await fetch(`${API_BASE}/config/ini?serverName=${encodeURIComponent(serverName || '')}`);
  return res.json();
}

export async function saveIniConfig(serverName, config) {
  const res = await fetch(`${API_BASE}/config/ini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverName, config })
  });
  return res.json();
}

export async function fetchSandboxConfig(serverName) {
  const res = await fetch(`${API_BASE}/config/sandbox?serverName=${encodeURIComponent(serverName || '')}`);
  return res.json();
}

export async function saveSandboxConfig(serverName, payload) {
  const res = await fetch(`${API_BASE}/config/sandbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverName, ...payload })
  });
  return res.json();
}

export async function fetchBackups() {
  const res = await fetch(`${API_BASE}/backups`);
  return res.json();
}

export async function createBackup(serverName) {
  const res = await fetch(`${API_BASE}/backups/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverName })
  });
  return res.json();
}

export async function restoreBackup(filename) {
  const res = await fetch(`${API_BASE}/backups/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  return res.json();
}

export async function deleteBackup(filename) {
  const res = await fetch(`${API_BASE}/backups/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  });
  return res.json();
}
