import React from 'react';
import {
  Terminal,
  Layers,
  Sliders,
  DownloadCloud,
  Archive,
  Play,
  Square,
  RotateCw,
  Users,
  Activity,
  Server,
  Loader2,
  Globe,
  Puzzle
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  serverStatus,
  serverInfo,
  serversList,
  currentServer,
  isSteamCmdRunning,
  onChangeServer,
  onStartServer,
  onStopServer,
  onRestartServer
}) {
  const isRunning = serverStatus === 'running';
  const isStarting = serverStatus === 'starting';
  const isStopping = serverStatus === 'stopping';

  const navItems = [
    { id: 'mods', label: 'Mod Manager', icon: Layers, badge: 'Core' },
    { id: 'console', label: 'Live Console', icon: Terminal },
    { id: 'sandbox', label: 'Sandbox (Vanilla)', icon: Globe },
    { id: 'modoptions', label: 'Mod Options', icon: Puzzle, badge: 'Auto' },
    { id: 'settings', label: 'Server INI', icon: Sliders },
    { id: 'installer', label: 'Installation & SteamCMD', icon: DownloadCloud, badge: isSteamCmdRunning ? 'Active' : null },
    { id: 'backups', label: 'Backups & Reset', icon: Archive }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-red-800 to-slate-900 border border-red-500/40 flex items-center justify-center shadow-lg glow-red">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white tracking-wider text-base">PROJECT ZOMBOID</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-400">
                  Dedicated GUI
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Active Server:</span>
                <select
                  value={currentServer}
                  onChange={(e) => onChangeServer(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-cyan-300 font-mono focus:outline-none"
                >
                  {serversList.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv}.ini
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Server Controls & Status Pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* SteamCMD active indicator if downloading */}
            {isSteamCmdRunning && (
              <div
                onClick={() => setActiveTab('installer')}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-700 text-xs text-indigo-300 animate-pulse hover:bg-indigo-900 transition"
                title="SteamCMD is running in background. Click to view."
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span className="font-semibold hidden sm:inline">SteamCMD Active</span>
              </div>
            )}

            {/* Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-ping' :
                isStarting ? 'bg-amber-500 animate-pulse' :
                isStopping ? 'bg-red-500 animate-pulse' : 'bg-slate-600'
              }`} />
              <span className="capitalize font-semibold text-slate-200">
                {serverStatus}
              </span>
              {isRunning && serverInfo?.uptime > 0 && (
                <span className="text-[11px] text-slate-500 font-mono">
                  ({Math.floor(serverInfo.uptime / 60)}m)
                </span>
              )}
            </div>

            {/* Online Players Pill */}
            {isRunning && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold">{serverInfo?.onlinePlayers?.length || 0}</span>
                <span className="text-slate-400 hidden sm:inline">Online</span>
              </div>
            )}

            {/* Power Action Buttons */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                onClick={onStartServer}
                disabled={isRunning || isStarting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-bold shadow transition"
                title="Start Dedicated Server"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden md:inline">Start</span>
              </button>

              <button
                onClick={onStopServer}
                disabled={!isRunning && !isStarting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-xs font-bold shadow transition"
                title="Stop Dedicated Server (Graceful Save & Quit)"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="hidden md:inline">Stop</span>
              </button>

              <button
                onClick={onRestartServer}
                disabled={!isRunning}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 disabled:opacity-30 transition"
                title="Restart Server"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 shadow-md border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                    item.badge === 'Active'
                      ? 'bg-indigo-900 text-indigo-200 border border-indigo-500 animate-pulse font-bold'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
