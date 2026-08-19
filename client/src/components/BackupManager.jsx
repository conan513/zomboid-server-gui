import React, { useState, useEffect } from 'react';
import {
  Archive,
  Plus,
  RotateCcw,
  Trash2,
  HardDrive,
  CheckCircle,
  Clock,
  RefreshCw,
  FileArchive,
  AlertTriangle,
  Flame,
  ShieldCheck,
  FolderTree,
  Database,
  X,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import {
  fetchBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  fetchSaveInfo,
  resetSaveWorld
} from '../services/api';

export default function BackupManager({ serverName, serverStatus, onNotify }) {
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [creating, setCreating] = useState(false);

  // Save info state
  const [saveInfo, setSaveInfo] = useState(null);
  const [loadingSaveInfo, setLoadingSaveInfo] = useState(true);

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [optCreateBackup, setOptCreateBackup] = useState(true);
  const [optResetWorld, setOptResetWorld] = useState(true);
  const [optResetDb, setOptResetDb] = useState(false);

  const isServerRunning = serverStatus === 'running' || serverStatus === 'starting';

  useEffect(() => {
    loadAllData();
  }, [serverName]);

  async function loadAllData() {
    await Promise.all([loadBackups(), loadSaveInfo()]);
  }

  async function loadBackups() {
    setLoadingBackups(true);
    try {
      const data = await fetchBackups();
      setBackups(data.backups || []);
    } catch (e) {
      if (onNotify) onNotify('Failed to load backups: ' + e.message, 'error');
    } finally {
      setLoadingBackups(false);
    }
  }

  async function loadSaveInfo() {
    setLoadingSaveInfo(true);
    try {
      const info = await fetchSaveInfo(serverName);
      setSaveInfo(info);
    } catch (e) {
      console.error('Failed to load save info:', e);
    } finally {
      setLoadingSaveInfo(false);
    }
  }

  async function handleCreateBackup() {
    setCreating(true);
    try {
      const res = await createBackup(serverName);
      if (res.success) {
        if (onNotify) onNotify(`Backup "${res.backup.filename}" created successfully!`, 'success');
        loadBackups();
      }
    } catch (e) {
      if (onNotify) onNotify('Backup creation failed: ' + e.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(filename) {
    if (isServerRunning) {
      if (onNotify) onNotify('Please stop the server before restoring a backup!', 'warning');
      return;
    }

    if (!confirm(`Are you sure you want to restore "${filename}"? This will overwrite the current world save and server settings.`)) {
      return;
    }
    try {
      const res = await restoreBackup(filename);
      if (res.success) {
        if (onNotify) onNotify('Backup restored successfully!', 'success');
        loadSaveInfo();
      }
    } catch (e) {
      if (onNotify) onNotify('Failed to restore backup: ' + e.message, 'error');
    }
  }

  async function handleDelete(filename) {
    if (!confirm(`Permanently delete backup "${filename}"?`)) {
      return;
    }
    try {
      await deleteBackup(filename);
      setBackups(prev => prev.filter(b => b.filename !== filename));
      if (onNotify) onNotify('Backup deleted.', 'success');
    } catch (e) {
      if (onNotify) onNotify('Failed to delete backup: ' + e.message, 'error');
    }
  }

  async function handleExecuteReset() {
    if (isServerRunning) {
      if (onNotify) onNotify('Cannot reset save while server is running. Stop the server first!', 'error');
      return;
    }

    if (!optResetWorld && !optResetDb) {
      if (onNotify) onNotify('Please select at least one item to reset (World Save or Database).', 'warning');
      return;
    }

    setResetting(true);
    try {
      const res = await resetSaveWorld({
        serverName,
        resetWorld: optResetWorld,
        resetDb: optResetDb,
        createBackup: optCreateBackup
      });

      if (res.success) {
        setShowResetModal(false);
        if (onNotify) {
          onNotify(
            res.backupCreated
              ? `World save reset complete! Safety backup created: ${res.backupCreated}`
              : `World save for "${serverName}" successfully reset! Game will start from day 1.`,
            'success'
          );
        }
        await loadAllData();
      }
    } catch (e) {
      if (onNotify) onNotify('Save reset failed: ' + e.message, 'error');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Banner & World Status */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow effect in background */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Save State & World Wipe</span>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    {serverName}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage live world saves, create instant backup snapshots, or wipe save data for a fresh start.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/50 transition disabled:opacity-50"
            >
              {creating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{creating ? 'Creating Zip...' : 'Create Backup Snapshot'}</span>
            </button>

            <button
              onClick={() => setShowResetModal(true)}
              disabled={isServerRunning}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                isServerRunning
                  ? 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-950/50 hover:shadow-red-900/40 glow-red'
              }`}
              title={isServerRunning ? 'Stop the server first before resetting the save world' : 'Reset world save to start from scratch'}
            >
              <Flame className="w-4 h-4" />
              <span>Reset Save / Start Over</span>
            </button>
          </div>
        </div>

        {/* Server running notice */}
        {isServerRunning && (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-center gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Server is currently <strong>running/starting</strong>. To restore or wipe/reset the save world, please stop the server first.
            </span>
          </div>
        )}

        {/* Save Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          {/* World Save Folder */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300 mt-0.5">
              <FolderTree className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">World Save</span>
              <div className="mt-1">
                {loadingSaveInfo ? (
                  <div className="h-4 w-20 bg-slate-800 animate-pulse rounded" />
                ) : saveInfo?.saveExists ? (
                  <div>
                    <span className="text-sm font-bold text-slate-100 font-mono">{saveInfo.size}</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      ✓ Active ({saveInfo.fileCount} files)
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-slate-400">No Save Yet</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Will be created on first launch</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Database File */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Player Database</span>
              <div className="mt-1">
                {loadingSaveInfo ? (
                  <div className="h-4 w-20 bg-slate-800 animate-pulse rounded" />
                ) : saveInfo?.dbExists ? (
                  <div>
                    <span className="text-sm font-bold text-slate-100 font-mono">{saveInfo.dbSize}</span>
                    <span className="text-[10px] text-cyan-400 block mt-0.5">
                      ✓ Accounts & Whitelist ({serverName}.db)
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-slate-400">Default DB</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">No separate .db file found</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Last Played / Modified */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Last Modified</span>
              <div className="mt-1">
                {loadingSaveInfo ? (
                  <div className="h-4 w-20 bg-slate-800 animate-pulse rounded" />
                ) : saveInfo?.lastModified ? (
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {new Date(saveInfo.lastModified).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                      {new Date(saveInfo.lastModified).toLocaleTimeString()}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-slate-400">Fresh Profile</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">No save activity</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Server Config State */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Profile Config</span>
              <div className="mt-1">
                <span className="text-xs font-bold text-slate-200 font-mono block truncate">
                  {serverName}.ini
                </span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">
                  Ready & Configured
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backups List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Stored Backup Archives
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {backups.length}
            </span>
          </div>

          <button
            onClick={loadAllData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBackups ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingBackups ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 glass-card rounded-2xl border border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
            <p className="text-sm">Loading backup archives...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-slate-800 text-center glass-card">
            <FileArchive className="w-12 h-12 text-slate-600 mb-3" />
            <h4 className="text-base font-semibold text-slate-300">No Backup Archives Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Create a backup snapshot before making major changes, adding new mods, or resetting your world.
            </p>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Backup</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {backups.map((b) => (
              <div
                key={b.filename}
                className="glass-card rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-cyan-400">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm font-mono">{b.filename}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-cyan-300/80">{b.size}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(b.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleRestore(b.filename)}
                    disabled={isServerRunning}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isServerRunning
                        ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400'
                        : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50'
                    }`}
                    title={isServerRunning ? 'Stop server to restore' : 'Restore world and configuration from this backup'}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => handleDelete(b.filename)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-800/50 transition"
                    title="Delete backup"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-red-500/30 shadow-2xl p-6 overflow-hidden">
            {/* Ambient red top strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400 shadow-inner">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Reset Save World / Wipe
                  </h3>
                  <p className="text-xs text-slate-400">
                    Server Profile: <span className="font-mono text-cyan-300">{serverName}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Message */}
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-200 space-y-1.5 mb-5">
              <div className="flex items-center gap-2 font-bold text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>Attention: World state will be erased!</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Resetting the save will delete the existing map chunks, player-built bases, vehicles, zombies, and loot. When the server is next launched, it will generate a brand new world from <strong>Day 1</strong>.
              </p>
            </div>

            {/* Options Checkboxes */}
            <div className="space-y-3 mb-6">
              {/* Option 1: Automatic Safety Backup */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={optCreateBackup}
                  onChange={(e) => setOptCreateBackup(e.target.checked)}
                  disabled={resetting}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Create safety backup before reset (Recommended)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Saves current state into a .zip archive in the Backups list, so you can restore it anytime if needed.
                  </span>
                </div>
              </label>

              {/* Option 2: Wipe World Save */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={optResetWorld}
                  onChange={(e) => setOptResetWorld(e.target.checked)}
                  disabled={resetting}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-red-500 focus:ring-red-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-red-400" />
                    <span>Wipe World Map & Chunks (Saves/Multiplayer/{serverName})</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Removes all world save data: map, player inventories, vehicles, loot, and buildings.
                  </span>
                </div>
              </label>

              {/* Option 3: Reset Player Accounts & Whitelist Database */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={optResetDb}
                  onChange={(e) => setOptResetDb(e.target.checked)}
                  disabled={resetting}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reset User Accounts & Player Database (db/{serverName}.db)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Optional: Deletes user logins, passwords, whitelist, and privileges. (Leave unchecked to keep user accounts).
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={resetting || (!optResetWorld && !optResetDb)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/50 transition disabled:opacity-50"
              >
                {resetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Wiping World Save...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3.5 h-3.5" />
                    <span>Confirm Wipe & Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
