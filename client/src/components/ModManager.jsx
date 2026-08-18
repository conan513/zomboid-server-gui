import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  Plus,
  Save,
  Download,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  Sparkles,
  ArrowDownUp,
  FileText,
  ListPlus,
  Check
} from 'lucide-react';
import ModItem from './ModItem';
import {
  fetchMods,
  fetchWorkshopDetails,
  batchFetchWorkshop,
  saveMods,
  importModsFromIni
} from '../services/api';

export default function ModManager({ serverName, onNotify }) {
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingInput, setAddingInput] = useState('');
  const [fetchingMod, setFetchingMod] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfigPreview, setShowConfigPreview] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Load mods on mount or server change
  useEffect(() => {
    loadMods();
  }, [serverName]);

  async function loadMods() {
    setLoading(true);
    try {
      const data = await fetchMods(serverName);
      if (data.mods && Array.isArray(data.mods)) {
        setMods(data.mods);
      }
    } catch (err) {
      console.error('Failed to load mods:', err);
      if (onNotify) onNotify('Failed to load mods: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  }

  // Handle adding single mod
  async function handleAddSingleMod(e) {
    if (e) e.preventDefault();
    const query = addingInput.trim();
    if (!query) return;

    // Check if already in list
    const existing = mods.find(m => m.workshopId === query || query.includes(m.workshopId));
    if (existing) {
      if (onNotify) onNotify(`Mod ${existing.title} (${existing.workshopId}) is already in the list!`, 'warning');
      return;
    }

    setFetchingMod(true);
    try {
      const res = await fetchWorkshopDetails(query);
      if (res.success && res.mod) {
        setMods(prev => [...prev, res.mod]);
        setAddingInput('');
        setHasUnsavedChanges(true);
        if (onNotify) onNotify(`Added "${res.mod.title}" to mod list!`, 'success');
      } else {
        if (onNotify) onNotify('Could not fetch mod information.', 'error');
      }
    } catch (err) {
      if (onNotify) onNotify('Failed to fetch mod: ' + err.message, 'error');
    } finally {
      setFetchingMod(false);
    }
  }

  // Handle batch adding mods
  async function handleBatchAdd() {
    if (!batchInput.trim()) return;
    const lines = batchInput.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return;

    setFetchingMod(true);
    setBatchModalOpen(false);

    try {
      const res = await batchFetchWorkshop(lines);
      if (res.success && res.mods) {
        // Filter out items already present
        const newMods = res.mods.filter(nm => !mods.some(m => m.workshopId === nm.workshopId));
        setMods(prev => [...prev, ...newMods]);
        setBatchInput('');
        setHasUnsavedChanges(true);
        if (onNotify) onNotify(`Successfully added ${newMods.length} mods to the list!`, 'success');
      }
    } catch (err) {
      if (onNotify) onNotify('Batch fetch error: ' + err.message, 'error');
    } finally {
      setFetchingMod(false);
    }
  }

  // Import from server INI
  async function handleImportFromIni() {
    if (!confirm('This will load all mods found in your current server INI file and fetch their Steam Workshop details. Continue?')) {
      return;
    }
    setLoading(true);
    try {
      const res = await importModsFromIni(serverName);
      if (res.success) {
        setMods(res.mods);
        setHasUnsavedChanges(true);
        if (onNotify) onNotify(`Imported ${res.count} mods from server INI!`, 'success');
      }
    } catch (err) {
      if (onNotify) onNotify('Import failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Save mods and sync to INI
  async function handleSave(syncToIni = true) {
    setSaving(true);
    try {
      const res = await saveMods(mods, serverName, syncToIni);
      if (res.success) {
        setHasUnsavedChanges(false);
        if (onNotify) onNotify('Mod list saved and synced to Server INI successfully!', 'success');
      } else {
        if (onNotify) onNotify('Error saving mods: ' + res.error, 'error');
      }
    } catch (err) {
      if (onNotify) onNotify('Failed to save mods: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Reorder via DnD
  function handleDragEnd(event) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setMods((items) => {
        const oldIndex = items.findIndex(i => (i.workshopId || i.id) === active.id);
        const newIndex = items.findIndex(i => (i.workshopId || i.id) === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(items, oldIndex, newIndex);
          setHasUnsavedChanges(true);
          return reordered;
        }
        return items;
      });
    }
  }

  // Reorder via Up/Down buttons
  function handleMoveUp(index) {
    if (index <= 0) return;
    setMods(items => {
      const newItems = [...items];
      const temp = newItems[index - 1];
      newItems[index - 1] = newItems[index];
      newItems[index] = temp;
      setHasUnsavedChanges(true);
      return newItems;
    });
  }

  function handleMoveDown(index) {
    if (index >= mods.length - 1) return;
    setMods(items => {
      const newItems = [...items];
      const temp = newItems[index + 1];
      newItems[index + 1] = newItems[index];
      newItems[index] = temp;
      setHasUnsavedChanges(true);
      return newItems;
    });
  }

  // Remove mod
  function handleRemove(index) {
    setMods(items => {
      const copy = items.filter((_, i) => i !== index);
      setHasUnsavedChanges(true);
      return copy;
    });
  }

  // Toggle mod enabled/disabled
  function handleToggleEnabled(index) {
    setMods(items => {
      const copy = [...items];
      const current = copy[index].enabled !== false;
      copy[index] = { ...copy[index], enabled: !current };
      setHasUnsavedChanges(true);
      return copy;
    });
  }

  // Toggle specific sub Mod ID
  function handleToggleModId(index, modId) {
    setMods(items => {
      const copy = [...items];
      const mod = copy[index];
      const currentSelected = mod.selectedModIds || mod.modIds || [];
      let newSelected;
      if (currentSelected.includes(modId)) {
        newSelected = currentSelected.filter(id => id !== modId);
      } else {
        newSelected = [...currentSelected, modId];
      }
      copy[index] = { ...mod, selectedModIds: newSelected };
      setHasUnsavedChanges(true);
      return copy;
    });
  }

  // Export mod preset
  function handleExportPreset() {
    const dataStr = JSON.stringify(mods, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pz_modlist_${serverName}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import mod preset
  function handleImportPresetFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          setMods(parsed);
          setHasUnsavedChanges(true);
          if (onNotify) onNotify(`Loaded preset with ${parsed.length} mods!`, 'success');
        }
      } catch (err) {
        if (onNotify) onNotify('Invalid preset JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  // Filtered mods
  const filteredMods = mods.filter(m => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    const titleMatch = (m.title || '').toLowerCase().includes(term);
    const idMatch = (m.workshopId || '').includes(term);
    const modIdMatch = (m.modIds || []).some(id => id.toLowerCase().includes(term));
    return titleMatch || idMatch || modIdMatch;
  });

  // Calculate generated strings
  const activeMods = mods.filter(m => m.enabled !== false);
  const generatedWorkshopIds = activeMods.map(m => m.workshopId).filter(Boolean);
  const generatedModIds = activeMods.flatMap(m => m.selectedModIds || m.modIds || []);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Steam Workshop & Mod Manager</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                {mods.length} Mods ({activeMods.length} Active)
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Add Steam Workshop IDs, manage exact load priorities with drag & drop, select sub-mod IDs, and auto-sync to <span className="text-slate-200 font-mono">{serverName}.ini</span>.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse-glow'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Syncing...' : 'Sync to Server INI'}
            </button>

            <button
              onClick={handleImportFromIni}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
              title="Read existing Mods and WorkshopItems from server.ini"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Import from INI</span>
            </button>

            <button
              onClick={() => setBatchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 transition"
            >
              <ListPlus className="w-4 h-4 text-indigo-400" />
              <span>Batch Add</span>
            </button>

            <button
              onClick={handleExportPreset}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50 transition"
              title="Export Modlist JSON Preset"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition"
              title="Import Modlist JSON Preset"
            >
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".json"
                onChange={handleImportPresetFile}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowConfigPreview(!showConfigPreview)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50 transition"
              title="Toggle Server.ini String Preview"
            >
              <FileCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Mod Input Bar */}
        <form onSubmit={handleAddSingleMod} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1">
            <input
              type="text"
              value={addingInput}
              onChange={(e) => setAddingInput(e.target.value)}
              placeholder="Paste Steam Workshop URL or Workshop ID (e.g. 2875848298 or https://steamcommunity.com/...)"
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700/70 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            {addingInput && (
              <button
                type="button"
                onClick={() => setAddingInput('')}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={fetchingMod || !addingInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white transition shadow-md"
          >
            {fetchingMod ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Fetching Steam Data...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Workshop Mod</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* INI Strings Preview Drawer */}
      {showConfigPreview && (
        <div className="glass-panel rounded-xl p-4 border border-cyan-900/60 bg-cyan-950/20 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-cyan-300 font-semibold">
            <span>Project Zomboid Server.ini Preview</span>
            <span className="text-slate-400">Loads in exact left-to-right order</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold">Mods=</span>
            <div className="p-2 mt-1 rounded bg-slate-950/90 text-cyan-200 border border-slate-800 break-all select-all">
              {generatedModIds.join(';') ? generatedModIds.join(';') + ';' : 'None'}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-bold">WorkshopItems=</span>
            <div className="p-2 mt-1 rounded bg-slate-950/90 text-indigo-200 border border-slate-800 break-all select-all">
              {generatedWorkshopIds.join(';') ? generatedWorkshopIds.join(';') + ';' : 'None'}
            </div>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search in loaded mods (title, ID, ModID)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-slate-600 transition"
          />
        </div>

        {mods.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all mods from the load list?')) {
                setMods([]);
                setHasUnsavedChanges(true);
              }
            }}
            className="text-xs text-red-400 hover:text-red-300 hover:underline transition"
          >
            Clear All Mods
          </button>
        )}
      </div>

      {/* Mod List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-sm">Loading mod loadout...</p>
        </div>
      ) : mods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-slate-800 text-center">
          <Sparkles className="w-12 h-12 text-cyan-500/50 mb-3" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No Mods Installed Yet</h3>
          <p className="text-slate-400 text-sm max-w-md mb-4">
            Paste a Steam Workshop ID or URL above to automatically fetch mod details, thumbnail, and sub-mod IDs.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setBatchModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Batch Add Workshop IDs
            </button>
            <button
              onClick={handleImportFromIni}
              className="px-4 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 text-xs font-semibold transition"
            >
              Import from {serverName}.ini
            </button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredMods.map(m => m.workshopId || m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filteredMods.map((mod, idx) => (
                <ModItem
                  key={mod.workshopId || mod.id}
                  mod={mod}
                  index={idx}
                  total={mods.length}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onRemove={handleRemove}
                  onToggleEnabled={handleToggleEnabled}
                  onToggleModId={handleToggleModId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Batch Add Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-indigo-400" />
                Batch Add Steam Workshop Items
              </h3>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Enter multiple Steam Workshop IDs or URLs separated by newlines, commas, or semicolons. The manager will fetch all metadata in parallel.
            </p>

            <textarea
              rows={6}
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={`2875848298\nhttps://steamcommunity.com/sharedfiles/filedetails/?id=2392709985\n2200148440`}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchAdd}
                disabled={!batchInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                Fetch & Add All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
