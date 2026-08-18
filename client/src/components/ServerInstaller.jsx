import React, { useState } from 'react';
import {
  DownloadCloud,
  Folder,
  Cpu,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Play
} from 'lucide-react';
import { installServer, cancelSteamCmd, saveSettings } from '../services/api';

export default function ServerInstaller({
  settings,
  installInfo,
  isSteamCmdRunning,
  onRefreshSettings,
  onNotify
}) {
  const [installPath, setInstallPath] = useState(settings.serverInstallPath || '');
  const [branch, setBranch] = useState(settings.branch || 'public');
  const [betaPassword, setBetaPassword] = useState(settings.branchBetaPassword || '');
  const [memoryMin, setMemoryMin] = useState(settings.memoryMin || '4g');
  const [memoryMax, setMemoryMax] = useState(settings.memoryMax || '8g');
  const [validate, setValidate] = useState(true);
  const [installing, setInstalling] = useState(false);

  async function handleSaveSettings() {
    try {
      await saveSettings({
        serverInstallPath: installPath,
        branch,
        branchBetaPassword: betaPassword,
        memoryMin,
        memoryMax
      });
      if (onRefreshSettings) onRefreshSettings();
      if (onNotify) onNotify('Installation settings saved!', 'success');
    } catch (e) {
      if (onNotify) onNotify('Failed to save settings: ' + e.message, 'error');
    }
  }

  async function handleStartInstall() {
    setInstalling(true);
    try {
      await handleSaveSettings();
      const res = await installServer({
        installPath,
        branch,
        betaPassword,
        validate
      });
      if (res.success) {
        if (onNotify) onNotify('SteamCMD server installation / update started! Check Console tab for live progress.', 'success');
      } else {
        if (onNotify) onNotify('Installation failed to start: ' + res.error, 'error');
      }
    } catch (e) {
      if (onNotify) onNotify('Error starting installation: ' + e.message, 'error');
    } finally {
      setInstalling(false);
      if (onRefreshSettings) onRefreshSettings();
    }
  }

  async function handleCancel() {
    try {
      await cancelSteamCmd();
      if (onNotify) onNotify('SteamCMD process cancelled.', 'warning');
      if (onRefreshSettings) onRefreshSettings();
    } catch (e) {
      if (onNotify) onNotify('Failed to cancel SteamCMD: ' + e.message, 'error');
    }
  }

  const isInstalled = installInfo?.installed;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Installation Status Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            isInstalled
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
              : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
          }`}>
            {isInstalled ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-white text-base">
              {isInstalled ? 'Project Zomboid Server Installed' : 'Server Not Installed Yet'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Path: {installInfo?.path || settings.serverInstallPath}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSteamCmdRunning ? (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel SteamCMD</span>
            </button>
          ) : (
            <button
              onClick={handleStartInstall}
              disabled={installing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg transition"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>{isInstalled ? 'Update / Validate Server' : 'Install Server via SteamCMD'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-cyan-400" />
          <span>Server Installation & Engine Configuration</span>
        </h3>

        {/* Directory Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Server Installation Directory</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={installPath}
              onChange={(e) => setInstallPath(e.target.value)}
              placeholder="e.g. D:\Source\zomboid-server-gui\pz_server"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Destination folder where SteamCMD downloads the Project Zomboid Dedicated Server (AppID 380870).
          </p>
        </div>

        {/* Branch & Version */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Steam Beta Branch</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="public">Public (Default Release / Build 41+)</option>
              <option value="b41multiplayer">b41multiplayer - Legacy Build 41 Multiplayer</option>
              <option value="unstable">unstable - Latest Unstable Development Build</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Beta Branch Password (Optional)</label>
            <input
              type="password"
              value={betaPassword}
              onChange={(e) => setBetaPassword(e.target.value)}
              placeholder="Leave empty for public branches"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* RAM & Memory Allocation */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200">Server RAM Allocation (Java Heap Size)</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Min Memory (-Xms)</label>
              <input
                type="text"
                value={memoryMin}
                onChange={(e) => setMemoryMin(e.target.value)}
                placeholder="4g"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-500">Recommended: 4g</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Max Memory (-Xmx)</label>
              <input
                type="text"
                value={memoryMax}
                onChange={(e) => setMemoryMax(e.target.value)}
                placeholder="8g"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-500">Recommended: 8g - 16g for modded servers</p>
            </div>
          </div>
        </div>

        {/* Validation Checkbox */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={validate}
              onChange={(e) => setValidate(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500"
            />
            <span>Validate Steam files on install / update</span>
          </label>

          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            Save Engine Settings
          </button>
        </div>
      </div>
    </div>
  );
}
