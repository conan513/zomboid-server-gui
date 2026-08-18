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
  FileArchive
} from 'lucide-react';
import { fetchBackups, createBackup, restoreBackup, deleteBackup } from '../services/api';

export default function BackupManager({ serverName, onNotify }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  async function loadBackups() {
    setLoading(true);
    try {
      const data = await fetchBackups();
      setBackups(data.backups || []);
    } catch (e) {
      if (onNotify) onNotify('Failed to load backups: ' + e.message, 'error');
    } finally {
      setLoading(false);
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
    if (!confirm(`Are you sure you want to restore "${filename}"? This will overwrite the current world save and server settings.`)) {
      return;
    }
    try {
      const res = await restoreBackup(filename);
      if (res.success) {
        if (onNotify) onNotify('Backup restored successfully!', 'success');
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Archive className="w-6 h-6 text-cyan-400" />
            <span>World & Configuration Backups</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create snapshot zip archives of your multiplayer world, player databases, and server ini settings.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg transition"
        >
          {creating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>{creating ? 'Creating Zip...' : 'Create Instant Backup'}</span>
        </button>
      </div>

      {/* Backup List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
          <p className="text-sm">Loading backups...</p>
        </div>
      ) : backups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-slate-800 text-center">
          <FileArchive className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No Backups Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "Create Instant Backup" above to make a safety snapshot before modifying mods or launching your server.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {backups.map((b) => (
            <div
              key={b.filename}
              className="glass-card rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm font-mono">{b.filename}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{b.size}</span>
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50 text-xs font-semibold transition"
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
  );
}
