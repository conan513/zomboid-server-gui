import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import ModManager from './components/ModManager';
import ConsoleView from './components/ConsoleView';
import ServerSettings from './components/ServerSettings';
import ServerInstaller from './components/ServerInstaller';
import BackupManager from './components/BackupManager';
import {
  fetchSettings,
  fetchAvailableServers,
  fetchServerStatus,
  startServer,
  stopServer,
  restartServer,
  fetchServerLogs
} from './services/api';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('mods'); // Default to mod manager as requested
  const [settings, setSettings] = useState({});
  const [installInfo, setInstallInfo] = useState(null);
  const [isSteamCmdRunning, setIsSteamCmdRunning] = useState(false);
  const [serverStatus, setServerStatus] = useState('stopped');
  const [serverInfo, setServerInfo] = useState(null);
  const [serversList, setServersList] = useState(['servertest']);
  const [currentServer, setCurrentServer] = useState('servertest');
  const [logs, setLogs] = useState([]);
  const [toasts, setToasts] = useState([]);

  const wsRef = useRef(null);

  // Initial load
  useEffect(() => {
    loadInitialData();
    setupWebSocket();

    const interval = setInterval(() => {
      refreshStatus();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  async function loadInitialData() {
    try {
      const data = await fetchSettings();
      setSettings(data.settings || {});
      setInstallInfo(data.installInfo);
      setIsSteamCmdRunning(data.isSteamCmdRunning);
      if (data.settings?.serverName) {
        setCurrentServer(data.settings.serverName);
      }

      const sList = await fetchAvailableServers();
      if (sList.servers && sList.servers.length > 0) {
        setServersList(sList.servers);
      }

      const status = await fetchServerStatus();
      setServerInfo(status);
      setServerStatus(status.status || 'stopped');

      const initialLogs = await fetchServerLogs();
      if (initialLogs.logs) {
        setLogs(initialLogs.logs);
      }
    } catch (e) {
      console.error('Failed to load initial settings:', e);
    }
  }

  async function refreshStatus() {
    try {
      const status = await fetchServerStatus();
      setServerInfo(status);
      setServerStatus(status.status || 'stopped');
    } catch (e) {
      // Ignore background refresh errors
    }
  }

  function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to PZ Server Manager');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status') {
          setServerInfo(msg.data);
          setServerStatus(msg.data.status || 'stopped');
        } else if (msg.type === 'log') {
          setLogs(prev => [...prev.slice(-1400), msg.data]);
        } else if (msg.type === 'initial_logs') {
          setLogs(msg.data || []);
        } else if (msg.type === 'players') {
          setServerInfo(prev => ({ ...prev, onlinePlayers: msg.data }));
        }
      } catch (e) {
        console.error('[WS] Message parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 3s...');
      setTimeout(setupWebSocket, 3000);
    };
  }

  function addNotification(message, type = 'info') {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }

  async function handleStart() {
    try {
      addNotification('Starting Project Zomboid Server...', 'info');
      const res = await startServer({ serverName: currentServer });
      if (res.success) {
        setServerStatus('starting');
        addNotification('Server process started!', 'success');
      }
    } catch (e) {
      addNotification('Start failed: ' + e.message, 'error');
    }
  }

  async function handleStop() {
    try {
      addNotification('Stopping server gracefully...', 'info');
      await stopServer();
    } catch (e) {
      addNotification('Stop error: ' + e.message, 'error');
    }
  }

  async function handleRestart() {
    try {
      addNotification('Restarting server...', 'info');
      await restartServer();
    } catch (e) {
      addNotification('Restart error: ' + e.message, 'error');
    }
  }

  return (
    <div className="min-h-screen bg-[#090b0e] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        serverStatus={serverStatus}
        serverInfo={serverInfo}
        serversList={serversList}
        currentServer={currentServer}
        isSteamCmdRunning={isSteamCmdRunning}
        onChangeServer={(name) => {
          setCurrentServer(name);
          addNotification(`Switched to profile: ${name}.ini`, 'info');
        }}
        onStartServer={handleStart}
        onStopServer={handleStop}
        onRestartServer={handleRestart}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'mods' && (
          <ModManager
            serverName={currentServer}
            onNotify={addNotification}
          />
        )}

        {activeTab === 'console' && (
          <ConsoleView
            logs={logs}
            serverStatus={serverStatus}
            onNotify={addNotification}
          />
        )}

        {activeTab === 'settings' && (
          <ServerSettings
            serverName={currentServer}
            onNotify={addNotification}
          />
        )}

        {activeTab === 'installer' && (
          <ServerInstaller
            settings={settings}
            installInfo={installInfo}
            isSteamCmdRunning={isSteamCmdRunning}
            logs={logs}
            onRefreshSettings={loadInitialData}
            onNotify={addNotification}
            onSwitchToConsole={() => setActiveTab('console')}
          />
        )}

        {activeTab === 'backups' && (
          <BackupManager
            serverName={currentServer}
            onNotify={addNotification}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-900 bg-slate-950/60 text-center text-xs text-slate-500">
        Project Zomboid Dedicated Server Control Center • Managing {currentServer}.ini • Ready for Build 41 & Build 42
      </footer>

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          let bgClass = 'bg-slate-900 border-slate-700 text-slate-200';
          let Icon = Info;

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-950/90 border-emerald-700 text-emerald-200 glow-green';
            Icon = CheckCircle;
          } else if (toast.type === 'error') {
            bgClass = 'bg-red-950/90 border-red-700 text-red-200 glow-red';
            Icon = AlertCircle;
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-950/90 border-amber-700 text-amber-200 glow-amber';
            Icon = AlertTriangle;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border shadow-2xl text-xs backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${bgClass}`}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1 font-medium leading-relaxed">{toast.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
