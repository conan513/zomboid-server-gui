import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  Shield,
  Wifi,
  Swords,
  Home,
  Clock,
  RefreshCw,
  FileText
} from 'lucide-react';
import { fetchIniConfig, saveIniConfig } from '../services/api';

export default function ServerSettings({ serverName, onNotify }) {
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState({});
  const [iniPath, setIniPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [serverName]);

  async function loadConfig() {
    setLoading(true);
    try {
      const data = await fetchIniConfig(serverName);
      setConfig(data.config || {});
      setIniPath(data.iniPath || '');
    } catch (e) {
      if (onNotify) onNotify('Failed to load server INI config: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(key, value) {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveIniConfig(serverName, config);
      if (onNotify) onNotify(`Server configuration saved to ${serverName}.ini!`, 'success');
    } catch (e) {
      if (onNotify) onNotify('Failed to save INI: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'general', label: 'General & Server Info', icon: Sliders },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'network', label: 'Network & Ports', icon: Wifi },
    { id: 'gameplay', label: 'Gameplay & PvP', icon: Swords },
    { id: 'safehouses', label: 'Safehouses', icon: Home },
    { id: 'respawn', label: 'Loot & Respawn', icon: Clock }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
        <p className="text-sm">Loading {serverName}.ini settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <span>Server Configuration Editor</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Editing file: <span className="text-slate-300">{iniPath}</span>
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg transition"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Server INI'}</span>
        </button>
      </div>

      {/* Settings Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                isActive
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Public Server Name</label>
                <input
                  type="text"
                  value={config.PublicName || ''}
                  onChange={(e) => handleFieldChange('PublicName', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Max Players</label>
                <input
                  type="number"
                  value={config.MaxPlayers || '32'}
                  onChange={(e) => handleFieldChange('MaxPlayers', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Public Server Description</label>
              <textarea
                rows={2}
                value={config.PublicDescription || ''}
                onChange={(e) => handleFieldChange('PublicDescription', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Welcome Message</label>
              <textarea
                rows={2}
                value={config.ServerWelcomeMessage || ''}
                onChange={(e) => handleFieldChange('ServerWelcomeMessage', e.target.value)}
                placeholder="Use <LINE> for line breaks"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.Public === 'true'}
                  onChange={(e) => handleFieldChange('Public', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>List Server on Public Browser</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.PauseEmpty === 'true'}
                  onChange={(e) => handleFieldChange('PauseEmpty', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Pause World Clock when Server is Empty</span>
              </label>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Server Password (Leave blank for open server)</label>
                <input
                  type="password"
                  value={config.Password || ''}
                  onChange={(e) => handleFieldChange('Password', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">RCON Password</label>
                <input
                  type="password"
                  value={config.RCONPassword || ''}
                  onChange={(e) => handleFieldChange('RCONPassword', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.Open === 'true'}
                  onChange={(e) => handleFieldChange('Open', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Open Server (Allow anyone to register account)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.AutoCreateUserInWhiteList === 'true'}
                  onChange={(e) => handleFieldChange('AutoCreateUserInWhiteList', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Auto-Create User in Whitelist</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.DoLuaChecksum === 'true'}
                  onChange={(e) => handleFieldChange('DoLuaChecksum', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Enforce Lua Checksum (Prevents client-side file tampering)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.DenyLoginOnOverloadedServer === 'true'}
                  onChange={(e) => handleFieldChange('DenyLoginOnOverloadedServer', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Deny Login when Server is Overloaded</span>
              </label>
            </div>
          </div>
        )}

        {/* NETWORK TAB */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Default Game Port (UDP)</label>
              <input
                type="number"
                value={config.DefaultPort || '16261'}
                onChange={(e) => handleFieldChange('DefaultPort', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">RCON Port</label>
              <input
                type="number"
                value={config.RCONPort || '27015'}
                onChange={(e) => handleFieldChange('RCONPort', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Ping Limit (ms)</label>
              <input
                type="number"
                value={config.PingLimit || '400'}
                onChange={(e) => handleFieldChange('PingLimit', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* GAMEPLAY & PVP TAB */}
        {activeTab === 'gameplay' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.PVP === 'true'}
                  onChange={(e) => handleFieldChange('PVP', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Enable PvP (Player vs Player Combat)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.SafetySystem === 'true'}
                  onChange={(e) => handleFieldChange('SafetySystem', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Enable Safety System (Skull Icon toggle for PvP)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.AllowDestructionBySledgehammer === 'true'}
                  onChange={(e) => handleFieldChange('AllowDestructionBySledgehammer', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Allow Sledgehammer World Destruction</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.SleepAllowed === 'true'}
                  onChange={(e) => handleFieldChange('SleepAllowed', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Sleep Allowed in Multiplayer</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Safety Toggle Timer (seconds)</label>
                <input
                  type="number"
                  value={config.SafetyToggleTimer || '2'}
                  onChange={(e) => handleFieldChange('SafetyToggleTimer', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Max Vehicle Speed Limit</label>
                <input
                  type="number"
                  value={config.SpeedLimit || '120.0'}
                  onChange={(e) => handleFieldChange('SpeedLimit', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* SAFETHOUSES TAB */}
        {activeTab === 'safehouses' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.PlayerSafehouse === 'true'}
                  onChange={(e) => handleFieldChange('PlayerSafehouse', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Allow Players to Claim Safehouses</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.AdminSafehouse === 'true'}
                  onChange={(e) => handleFieldChange('AdminSafehouse', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Only Admins Can Create Safehouses</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.SafehouseAllowTrepass === 'true'}
                  onChange={(e) => handleFieldChange('SafehouseAllowTrepass', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Allow Non-Members to Trespass Safehouse</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.SafehouseAllowNonResidential === 'true'}
                  onChange={(e) => handleFieldChange('SafehouseAllowNonResidential', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Allow Claiming Non-Residential Buildings</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Days Survived Required to Claim</label>
                <input
                  type="number"
                  value={config.SafehouseDaySurvivedToClaim || '0'}
                  onChange={(e) => handleFieldChange('SafehouseDaySurvivedToClaim', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Safehouse Auto-Removal Inactive Hours</label>
                <input
                  type="number"
                  value={config.SafeHouseRemovalTime || '144'}
                  onChange={(e) => handleFieldChange('SafeHouseRemovalTime', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* RESPAWN & LOOT TAB */}
        {activeTab === 'respawn' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Hours for Loot Respawn (0 = Disabled)</label>
                <input
                  type="number"
                  value={config.HoursForLootRespawn || '0'}
                  onChange={(e) => handleFieldChange('HoursForLootRespawn', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Max Items for Loot Respawn in Container</label>
                <input
                  type="number"
                  value={config.MaxItemsForLootRespawn || '4'}
                  onChange={(e) => handleFieldChange('MaxItemsForLootRespawn', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.ConstructionPreventsLootRespawn === 'true'}
                  onChange={(e) => handleFieldChange('ConstructionPreventsLootRespawn', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Player Construction Prevents Loot Respawn</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.NoZombie === 'true'}
                  onChange={(e) => handleFieldChange('NoZombie', e.target.checked ? 'true' : 'false')}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>No Zombies Mode (Peaceful Builder)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
