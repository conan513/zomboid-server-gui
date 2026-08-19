import React, { useState, useEffect, useMemo } from 'react';
import {
  Puzzle,
  Save,
  Search,
  RefreshCw,
  Sliders,
  Sparkles,
  Undo2,
  Check,
  AlertTriangle,
  Info,
  Layers,
  ChevronRight,
  Globe,
  SlidersHorizontal,
  FolderTree,
  FileCode,
  ArrowUpRight,
  X
} from 'lucide-react';
import { fetchSandboxConfig, saveSandboxConfig } from '../services/api';

export default function ModOptionsSettings({ serverName, onNotify, onSwitchToVanilla }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [modGroups, setModGroups] = useState([]);
  const [originalVars, setOriginalVars] = useState({});
  const [currentVars, setCurrentVars] = useState({});
  const [stats, setStats] = useState({ totalKeys: 0, modKeysCount: 0, modGroupsCount: 0 });
  const [selectedModId, setSelectedModId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModifiedOnly, setFilterModifiedOnly] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [serverName]);

  async function loadConfig(isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const data = await fetchSandboxConfig(serverName);
      setFilePath(data.filePath || '');
      setModGroups(data.modGroups || []);
      setOriginalVars(data.flatVars || {});
      setCurrentVars(data.flatVars || {});
      if (data.stats) setStats(data.stats);
    } catch (err) {
      if (onNotify) onNotify('Error loading mod sandbox options: ' + err.message, 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  // Detect modified fields count across mod items
  const modifiedKeys = useMemo(() => {
    const keys = [];
    for (const [k, v] of Object.entries(currentVars)) {
      if (originalVars[k] !== undefined && originalVars[k] !== v) {
        keys.push(k);
      } else if (originalVars[k] === undefined && v !== undefined) {
        keys.push(k);
      }
    }
    return keys;
  }, [currentVars, originalVars]);

  const hasUnsavedChanges = modifiedKeys.length > 0;

  function handleFieldChange(path, val) {
    setCurrentVars(prev => ({
      ...prev,
      [path]: val
    }));
  }

  function handleResetField(path) {
    if (originalVars[path] !== undefined) {
      handleFieldChange(path, originalVars[path]);
    }
  }

  function handleResetAll() {
    if (window.confirm('Are you sure you want to revert all unsaved mod settings changes?')) {
      setCurrentVars({ ...originalVars });
      if (onNotify) onNotify('All mod settings reverted to file state.', 'info');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSandboxConfig(serverName, { vars: currentVars });
      setOriginalVars({ ...currentVars });
      if (onNotify) onNotify(`Mod settings saved to ${serverName}_SandboxVars.lua successfully!`, 'success');
      await loadConfig(true);
    } catch (err) {
      if (onNotify) onNotify('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVars, serverName]);

  // Filtered Mod Groups based on selected mod, search query, and modified only
  const displayedModGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return modGroups
      .filter(mod => {
        if (selectedModId !== 'all' && mod.modId !== selectedModId) {
          return false;
        }
        return true;
      })
      .map(mod => {
        const filteredTables = mod.tables.map(table => {
          let items = table.items;

          if (query) {
            items = items.filter(item => {
              const matchKey = item.key.toLowerCase().includes(query);
              const matchLabel = item.label ? item.label.toLowerCase().includes(query) : false;
              const matchDesc = item.description ? item.description.toLowerCase().includes(query) : false;
              const matchTable = table.tableLabel.toLowerCase().includes(query);
              const matchMod = mod.modName.toLowerCase().includes(query);
              return matchKey || matchLabel || matchDesc || matchTable || matchMod;
            });
          }

          if (filterModifiedOnly) {
            items = items.filter(item => modifiedKeys.includes(item.path));
          }

          return {
            ...table,
            items
          };
        }).filter(t => t.items.length > 0);

        return {
          ...mod,
          tables: filteredTables,
          visibleCount: filteredTables.reduce((acc, t) => acc + t.items.length, 0)
        };
      })
      .filter(mod => mod.tables.length > 0);
  }, [modGroups, selectedModId, searchQuery, filterModifiedOnly, modifiedKeys]);

  const totalVisibleModItems = useMemo(() => {
    return displayedModGroups.reduce((acc, mod) => acc + mod.visibleCount, 0);
  }, [displayedModGroups]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <RefreshCw className="w-9 h-9 animate-spin text-indigo-400 mb-3" />
        <p className="text-sm font-medium text-slate-300">Scanning and organizing mod settings...</p>
        <p className="text-xs text-slate-500 mt-1">Grouping sandbox options by individual Workshop mods</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-indigo-950/80 bg-gradient-to-r from-indigo-950/30 via-slate-900/60 to-purple-950/20 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-slate-900 flex items-center justify-center text-white shadow-lg border border-indigo-400/40 glow-cyan">
            <Puzzle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Mod Options & Configurations
              </h2>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-600/70 text-indigo-300">
                {stats.modKeysCount || 0} Modded Settings
              </span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {modGroups.length} Mods Detected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Auto-scanned from installed Steam Workshop mods. Configure each mod independently with full descriptions and dropdown options.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              loadConfig();
              if (onNotify) onNotify('Mod options reloaded from disk.', 'info');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
            title="Reload from disk"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reload</span>
          </button>

          {onSwitchToVanilla && (
            <button
              onClick={onSwitchToVanilla}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Vanilla Sandbox</span>
            </button>
          )}

          {hasUnsavedChanges && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Revert ({modifiedKeys.length})</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition duration-200 ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : hasUnsavedChanges ? `Save Mod Options (${modifiedKeys.length})` : 'Save to Lua'}</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Sidebar (Mod List) + Content (Mod Settings) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Mod Navigation List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="p-3 rounded-2xl glass-panel border border-slate-800 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
              Installed Mods ({modGroups.length})
            </span>

            {/* All Mods Option */}
            <button
              onClick={() => setSelectedModId('all')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition text-left ${
                selectedModId === 'all'
                  ? 'bg-indigo-950/90 text-indigo-200 border border-indigo-600/70 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className={`w-4 h-4 shrink-0 ${selectedModId === 'all' ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="truncate">All Mod Settings</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                {stats.modKeysCount}
              </span>
            </button>

            {/* Individual Mod Buttons */}
            {modGroups.map((mod) => {
              const isSelected = selectedModId === mod.modId;
              const modModifiedCount = mod.tables.reduce((acc, t) => {
                return acc + t.items.filter(i => modifiedKeys.includes(i.path)).length;
              }, 0);

              return (
                <button
                  key={mod.modId}
                  onClick={() => setSelectedModId(mod.modId)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition text-left group ${
                    isSelected
                      ? 'bg-indigo-950/90 text-indigo-200 border border-indigo-600/70 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <Puzzle className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-300'}`} />
                    <span className="truncate" title={mod.modName}>
                      {mod.modName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    {modModifiedCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Has unsaved changes" />
                    )}
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {mod.totalOptionsCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area: Mod Settings Cards */}
        <div className="lg:col-span-3 space-y-5">
          {/* Controls Bar: Search & Modified Filter */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search mod settings, options, tooltips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {modifiedKeys.length > 0 && (
                <button
                  onClick={() => setFilterModifiedOnly(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    filterModifiedOnly
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modified ({modifiedKeys.length})</span>
                </button>
              )}

              <span className="text-xs text-slate-500">
                Showing <strong className="text-slate-300">{totalVisibleModItems}</strong> mod settings
              </span>
            </div>
          </div>

          {/* Mod Groups Display */}
          {displayedModGroups.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
              <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No mod settings found matching your search.</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing the search query or selecting another mod.</p>
            </div>
          ) : (
            displayedModGroups.map((mod) => (
              <div
                key={mod.modId}
                className="glass-panel rounded-2xl p-5 sm:p-6 border border-indigo-900/40 shadow-xl space-y-6 bg-slate-950/50"
              >
                {/* Mod Group Header */}
                <div className="flex items-center justify-between border-b border-indigo-950/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400">
                      <Puzzle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-wide">
                        {mod.modName}
                      </h3>
                      <p className="text-xs text-indigo-300/70 font-mono mt-0.5">
                        {mod.tables.length} sub-table{mod.tables.length > 1 ? 's' : ''} • {mod.visibleCount} customizable option{mod.visibleCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-900/60 border border-indigo-700/70 text-indigo-200">
                    {mod.visibleCount} options
                  </span>
                </div>

                {/* Sub-Tables inside this Mod */}
                {mod.tables.map((table) => (
                  <div key={table.tableName} className="space-y-3">
                    {mod.tables.length > 1 && (
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 pt-2 border-t border-slate-900">
                        <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Section: {table.tableLabel}</span>
                        <span className="text-[10px] font-mono text-slate-500 font-normal">
                          (SandboxVars.{table.tableName})
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {table.items.map((item) => (
                        <ModSettingFieldCard
                          key={item.path}
                          item={item}
                          currentValue={currentVars[item.path]}
                          originalValue={originalVars[item.path]}
                          onChange={(val) => handleFieldChange(item.path, val)}
                          onReset={() => handleResetField(item.path)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Field Card for each individual Mod Option
function ModSettingFieldCard({ item, currentValue, originalValue, onChange, onReset }) {
  const isModified = (originalValue !== undefined && currentValue !== originalValue) || (originalValue === undefined && currentValue !== undefined);

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
        isModified
          ? 'bg-amber-950/25 border-amber-500/50 shadow-md'
          : 'bg-slate-950/80 border-slate-800/90 hover:border-indigo-800/60'
      }`}
    >
      <div>
        {/* Top Header: Label & Table Name */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-200 block">
              {item.label || item.key}
            </span>
            <span className="text-[10px] font-mono text-indigo-400/80 block mt-0.5">
              {item.path}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isModified && (
              <button
                onClick={onReset}
                title="Reset to original value"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[10px] font-medium border border-amber-700/80"
              >
                <Undo2 className="w-2.5 h-2.5" />
                <span>Revert</span>
              </button>
            )}

            {item.defaultVal && (
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Def: {item.defaultVal}
              </span>
            )}
          </div>
        </div>

        {/* Detailed Tooltip / Description from mod translation */}
        {item.description && (
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed" title={item.description}>
            {item.description}
          </p>
        )}
      </div>

      {/* Input Controls */}
      <div className="pt-2 border-t border-slate-900/80">
        {/* BOOLEAN CONTROL (Switch Toggle) */}
        {item.type === 'boolean' && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => onChange(!currentValue)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                currentValue ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                  currentValue ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
            <span className={`text-xs font-semibold ${currentValue ? 'text-indigo-300' : 'text-slate-500'}`}>
              {currentValue ? 'Enabled (true)' : 'Disabled (false)'}
            </span>
          </label>
        )}

        {/* ENUM / SELECT DROPDOWN */}
        {item.type !== 'boolean' && item.options && item.options.length > 0 && (
          <select
            value={currentValue ?? ''}
            onChange={(e) => {
              const numVal = Number(e.target.value);
              onChange(isNaN(numVal) ? e.target.value : numVal);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            {item.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value} - {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* NUMERIC (INTEGER / FLOAT) */}
        {item.type !== 'boolean' && (!item.options || item.options.length === 0) && (item.type === 'integer' || item.type === 'float') && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={item.type === 'float' ? '0.01' : '1'}
              min={item.min ?? undefined}
              max={item.max ?? undefined}
              value={currentValue ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onChange('');
                } else {
                  onChange(item.type === 'float' ? parseFloat(val) : parseInt(val, 10));
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
            {item.min !== null && item.max !== null && (
              <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                [{item.min} - {item.max}]
              </span>
            )}
          </div>
        )}

        {/* STRING TEXT */}
        {item.type === 'string' && (!item.options || item.options.length === 0) && (
          <input
            type="text"
            value={currentValue ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          />
        )}
      </div>
    </div>
  );
}
