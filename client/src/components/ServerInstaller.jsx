import React, { useState, useRef, useEffect } from 'react';
import {
  DownloadCloud,
  Folder,
  Cpu,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Terminal,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { installServer, cancelSteamCmd, saveSettings } from '../services/api';

export default function ServerInstaller({
  settings,
  installInfo,
  isSteamCmdRunning,
  logs = [],
  onRefreshSettings,
  onNotify,
  onSwitchToConsole
}) {
  const [installPath, setInstallPath] = useState(settings.serverInstallPath || '');
  const [branch, setBranch] = useState(settings.branch || 'public');
  const [betaPassword, setBetaPassword] = useState(settings.branchBetaPassword || '');
  const [memoryMin, setMemoryMin] = useState(settings.memoryMin || '4g');
  const [memoryMax, setMemoryMax] = useState(settings.memoryMax || '8g');
  const [validate, setValidate] = useState(true);
  const [installing, setInstalling] = useState(false);

  const steamLogsRef = useRef(null);

  // Filter logs related to steamcmd or install actions
  const steamLogs = logs.filter(l => l.type === 'steamcmd' || (l.text && (l.text.includes('SteamCMD') || l.text.includes('Installation') || l.text.includes('AppID'))));

  // Auto-scroll steam logs
  useEffect(() => {
    if (steamLogsRef.current) {
      steamLogsRef.current.scrollTop = steamLogsRef.current.scrollHeight;
    }
  }, [steamLogs]);

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
        if (onNotify) onNotify('SteamCMD process started! Live progress streaming below.', 'success');
      } else {
        if (onNotify) onNotify('Installation failed: ' + res.error, 'error');
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
  const isWorking = isSteamCmdRunning || installing;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Installation Status Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            isWorking
              ? 'bg-cyan-950/80 border-cyan-700/80 text-cyan-400 animate-pulse'
              : isInstalled
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
              : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
          }`}>
            {isWorking ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isInstalled ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                {isWorking
                  ? 'SteamCMD Server Installation / Update in Progress...'
                  : isInstalled
                  ? 'Project Zomboid Server Installed'
                  : 'Server Not Installed Yet'}
              </h3>
              {isWorking && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-900/80 text-cyan-300 border border-cyan-600 animate-pulse">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Path: {installInfo?.path || settings.serverInstallPath}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isWorking ? (
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

      {/* Live SteamCMD Console Terminal Box */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>SteamCMD Live Activity Log</span>
            {isWorking && (
              <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-normal">
                <Loader2 className="w-3 h-3 animate-spin" />
                Working in background...
              </span>
            )}
          </div>

          {onSwitchToConsole && (
            <button
              onClick={onSwitchToConsole}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Open Full Console</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        <div
          ref={steamLogsRef}
          className="h-44 overflow-y-auto bg-slate-950/90 rounded-xl p-3 font-mono text-[11px] space-y-1 select-text border border-slate-900"
        >
          {steamLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center">
              <span>No SteamCMD activity logged yet.</span>
              <span className="text-[10px] text-slate-700">Click "Install Server via SteamCMD" above to download and install.</span>
            </div>
          ) : (
            steamLogs.map((log) => {
              let colorClass = 'text-slate-300';
              if (log.type === 'system') colorClass = 'text-cyan-400 font-semibold';
              else if (log.type === 'steamcmd') colorClass = 'text-indigo-300';
              else if (log.type === 'error' || log.text.includes('ERR') || log.text.includes('Error')) colorClass = 'text-red-400';
              else if (log.text.includes('Success') || log.text.includes('complete') || log.text.includes('100%')) colorClass = 'text-emerald-400 font-semibold';

              return (
                <div key={log.id} className="leading-relaxed break-all">
                  <span className="text-slate-600 text-[10px] mr-2">[{new Date(log.time).toLocaleTimeString()}]</span>
                  <span className={colorClass}>{log.text}</span>
                </div>
              );
            })
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
