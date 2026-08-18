import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Send,
  Trash2,
  Copy,
  ChevronRight,
  ShieldAlert,
  Play,
  Save,
  Users,
  MessageSquare,
  HelpCircle,
  Power
} from 'lucide-react';
import { sendServerCommand } from '../services/api';

export default function ConsoleView({ logs = [], serverStatus, onNotify }) {
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');

  const logContainerRef = useRef(null);

  // Auto-scroll on new logs
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  async function handleSendCommand(cmdToSend) {
    const cmd = (cmdToSend !== undefined ? cmdToSend : inputCommand).trim();
    if (!cmd) return;

    try {
      await sendServerCommand(cmd);
      setHistory(prev => [cmd, ...prev.filter(c => c !== cmd)]);
      setHistoryIndex(-1);
      setInputCommand('');
    } catch (err) {
      if (onNotify) onNotify('Failed to send command: ' + err.message, 'error');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  }

  function handleCopyLogs() {
    const text = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    if (onNotify) onNotify('Logs copied to clipboard!', 'success');
  }

  function handleBroadcast() {
    if (!broadcastText.trim()) return;
    handleSendCommand(`servermsg "${broadcastText.trim()}"`);
    setBroadcastText('');
    setBroadcastModal(false);
  }

  const filteredLogs = logs.filter(l => {
    if (filterType === 'all') return true;
    if (filterType === 'errors') return l.type === 'error' || l.type === 'stderr' || (l.text && l.text.toLowerCase().includes('error'));
    if (filterType === 'commands') return l.type === 'command';
    if (filterType === 'system') return l.type === 'system' || l.type === 'steamcmd';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Console Header & Quick Commands */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white text-base">Interactive Server Console</h3>
          <span className="text-xs text-slate-500 font-mono">
            {logs.length} entries
          </span>
        </div>

        {/* Quick Command Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleSendCommand('save')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700/60 transition"
            title="Save Server World State"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>save</span>
          </button>

          <button
            onClick={() => handleSendCommand('players')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700/60 transition"
            title="List Online Players"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>players</span>
          </button>

          <button
            onClick={() => setBroadcastModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700/60 transition"
            title="Broadcast message in-game"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>broadcast</span>
          </button>

          <button
            onClick={() => handleSendCommand('help')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700/60 transition"
            title="Show Console Help"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>help</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Copy All Logs"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-2xl flex flex-col h-[560px] bg-slate-950/95 font-mono text-xs">
        {/* Terminal toolbar */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                serverStatus === 'running' ? 'bg-emerald-500 animate-pulse' :
                serverStatus === 'starting' ? 'bg-amber-500 animate-pulse' :
                serverStatus === 'stopping' ? 'bg-red-500 animate-pulse' : 'bg-slate-600'
              }`} />
              <span className="capitalize text-slate-300 font-semibold">{serverStatus}</span>
            </span>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              {['all', 'errors', 'commands', 'system'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2 py-0.5 rounded text-[11px] capitalize transition ${
                    filterType === f ? 'bg-slate-700 text-white font-semibold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500"
            />
            <span>Auto-scroll</span>
          </label>
        </div>

        {/* Output lines */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto space-y-1 pr-2 select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600">
              Waiting for server output...
            </div>
          ) : (
            filteredLogs.map((log) => {
              let colorClass = 'text-slate-300';
              if (log.type === 'command') colorClass = 'text-emerald-400 font-bold';
              else if (log.type === 'system') colorClass = 'text-cyan-400';
              else if (log.type === 'steamcmd') colorClass = 'text-indigo-300';
              else if (log.type === 'error' || log.type === 'stderr' || log.text.includes('ERR') || log.text.includes('Exception')) {
                colorClass = 'text-red-400';
              } else if (log.type === 'warning' || log.text.includes('WARN')) {
                colorClass = 'text-amber-400';
              }

              const timeStr = log.time ? new Date(log.time).toLocaleTimeString() : '';

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed break-all hover:bg-slate-900/40 px-1 rounded">
                  <span className="text-slate-600 select-none shrink-0 font-sans text-[10px]">
                    {timeStr}
                  </span>
                  <span className={colorClass}>{log.text}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <div className="pt-3 mt-2 border-t border-slate-800 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={serverStatus !== 'running' && serverStatus !== 'starting'}
            placeholder={
              serverStatus === 'running' || serverStatus === 'starting'
                ? "Type a console command (e.g. 'help', 'save', 'servermsg Hello')..."
                : "Server is stopped. Start server to execute console commands."
            }
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 text-xs focus:outline-none"
          />
          <button
            onClick={() => handleSendCommand()}
            disabled={!inputCommand.trim() || (serverStatus !== 'running' && serverStatus !== 'starting')}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Broadcast Modal */}
      {broadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-5 border border-slate-700 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              Broadcast In-Game Server Message
            </h3>
            <p className="text-xs text-slate-400">
              Sends an announcement to all connected players on the server.
            </p>
            <input
              type="text"
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="e.g. Server restart in 10 minutes for maintenance!"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBroadcastModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcast}
                disabled={!broadcastText.trim()}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 disabled:opacity-50"
              >
                Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
