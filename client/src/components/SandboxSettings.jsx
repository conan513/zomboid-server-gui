import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe,
  Save,
  Search,
  RefreshCw,
  Code,
  Sliders,
  Sparkles,
  Zap,
  ShieldAlert,
  Car,
  Heart,
  BookOpen,
  MapPin,
  Flame,
  Layers,
  Fuel,
  Volume2,
  Undo2,
  Check,
  AlertTriangle,
  Info,
  Compass,
  ArrowRight,
  Bookmark,
  Wand2,
  X
} from 'lucide-react';
import { fetchSandboxConfig, saveSandboxConfig } from '../services/api';

const PRESETS = [
  {
    id: 'default',
    name: 'Alapértelmezett (Jelenlegi Apokalipszis)',
    shortDesc: 'A szerver jelenlegi / eredeti alapbeállításai.',
    badge: 'Standard',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    color: 'border-slate-800 hover:border-slate-700 bg-slate-900/60',
    icon: Sliders,
    highlights: [
      'Eredeti PZ szerverbeállítások visszaállítása',
      'Minden módosítás visszaáll az aktív fájl állapotára'
    ],
    vars: {}
  },
  {
    id: 'clear_and_migrate',
    name: 'Terület-tisztítás & Vándorlás (No Respawn)',
    shortDesc: 'Nincs végtelen zombi respawn! A megtisztított városrészek tiszták maradnak, miközben a többi zombi vándorol a térképen és zajokra reagál.',
    badge: 'Ajánlott • Immerzív',
    badgeClass: 'bg-cyan-950 text-cyan-300 border-cyan-700 glow-cyan',
    color: 'border-cyan-600/70 hover:border-cyan-500 bg-cyan-950/30',
    icon: Compass,
    highlights: [
      'Zombi Respawn kikapcsolva (RespawnHours = 0.0, ZombieRespawn = 4)',
      'Valós vándorlás bekapcsolva (ZombieMigrate = true, RedistributeHours = 12.0)',
      'Megnövelt hangkövetés & hordaképződés (FollowSoundDistance = 200)',
      'Helikopter & Meta események (Időnként felkavarják és vándorlásra bírják a hordákat)',
      'Valódi értelme van megtisztítani és védeni egy-egy bázist vagy negyedet!'
    ],
    vars: {
      'ZombieRespawn': 4,
      'ZombieMigrate': true,
      'ZombieVoronoiNoise': true,
      'Helicopter': 3,
      'MetaEvent': 2,
      'SleepingEvent': 2,
      'ZombieAttractionMultiplier': 1.15,
      'ZombieConfig.RespawnHours': 0.0,
      'ZombieConfig.RespawnUnseenHours': 0.0,
      'ZombieConfig.RespawnMultiplier': 0.0,
      'ZombieConfig.RedistributeHours': 12.0,
      'ZombieConfig.FollowSoundDistance': 200,
      'ZombieConfig.RallyGroupSize': 25,
      'ZombieConfig.RallyTravelDistance': 30,
      'ZombieConfig.RallyGroupSeparation': 15,
      'ZombieConfig.RallyGroupRadius': 3,
      'ZombieConfig.PopulationMultiplier': 1.0,
      'ZombieConfig.PopulationStartMultiplier': 1.0,
      'ZombieConfig.PopulationPeakMultiplier': 1.5,
      'ZombieConfig.PopulationPeakDay': 28
    }
  },
  {
    id: 'hardcore_survival',
    name: 'Zord Túlélés (Hardcore Apocalypse)',
    shortDesc: 'Keményebb zombik, extrém ritka loot, keményebb sebek és hidegebb, esősebb időjárás.',
    badge: 'Nehéz Kihívás',
    badgeClass: 'bg-red-950 text-red-300 border-red-700',
    color: 'border-red-900/60 hover:border-red-700 bg-red-950/20',
    icon: ShieldAlert,
    highlights: [
      'Extrém ritka élelem, fegyver és gyógyszer',
      'Zombik erősebbek és szívósabbak',
      'Súlyosabb sérülések és fertőzésveszély',
      'Alacsonyabb hőmérséklet, gyakoribb eső'
    ],
    vars: {
      'FoodLootNew': 1,
      'WeaponLootNew': 1,
      'RangedWeaponLootNew': 1,
      'AmmoLootNew': 1,
      'MedicalLootNew': 1,
      'SurvivalGearsLootNew': 1,
      'InjurySeverity': 3,
      'BoneFracture': true,
      'ZombieLore.Speed': 3,
      'ZombieLore.Strength': 2,
      'ZombieLore.Toughness': 2,
      'ZombieLore.Cognition': 2,
      'Temperature': 1,
      'Rain': 3
    }
  },
  {
    id: 'chill_builder',
    name: 'Békés Építkezés & Felfedezés (Relaxed Builder)',
    shortDesc: 'Kevesebb zombi, bőséges loot, több karakterpont, gyorsabb fejlődés és több jármű.',
    badge: 'Kényelmes',
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    color: 'border-emerald-900/60 hover:border-emerald-700 bg-emerald-950/20',
    icon: Sparkles,
    highlights: [
      'Alacsony zombi népesség (PopulationMultiplier = 0.35)',
      'Bőséges loot és fegyverek',
      'Több kezdő képességpont (CharacterFreePoints = 10)',
      'MultiHit harcrendszer engedélyezve',
      '2.0x Globális XP szorzó'
    ],
    vars: {
      'Zombies': 5,
      'ZombieConfig.PopulationMultiplier': 0.35,
      'FoodLootNew': 4,
      'WeaponLootNew': 4,
      'MedicalLootNew': 4,
      'MultiHitZombies': true,
      'CharacterFreePoints': 10,
      'MultiplierConfig.Global': 2.0,
      'CarSpawnRate': 4,
      'ChanceHasGas': 3
    }
  },
  {
    id: 'sprinters_nightmare',
    name: '28 Nappal Később (Sprinters Nightmare)',
    shortDesc: 'Halálos futó zombik és kiélezett érzékek. Extrém kihívás a legbátrabb túlélőknek!',
    badge: 'Extrém Halálos',
    badgeClass: 'bg-amber-950 text-amber-300 border-amber-700',
    color: 'border-amber-900/60 hover:border-amber-700 bg-amber-950/20',
    icon: Flame,
    highlights: [
      'Minden zombi gyors futó (Sprinter)',
      'Sasfülű hallás és sastollú látás',
      'Csökkentett népességszám a túlélhetőség érdekében',
      'MultiHit harcrendszer engedélyezve'
    ],
    vars: {
      'ZombieLore.Speed': 1,
      'ZombieLore.Hearing': 1,
      'ZombieLore.Sight': 1,
      'ZombieConfig.PopulationMultiplier': 0.5,
      'MultiHitZombies': true
    }
  }
];

const CATEGORY_ICONS = {
  zombies_general: ShieldAlert,
  zombielore: Zap,
  zombieconfig: Sliders,
  time_climate: Compass,
  multiplierconfig: Sparkles,
  loot_settings: Layers,
  vehicles: Car,
  fuel_stations: Fuel,
  nature_farming: Globe,
  animals_husbandry: Heart,
  combat_firearms: Flame,
  player_character: Heart,
  world_lore_reading: BookOpen,
  world_infrastructure: Volume2,
  map: MapPin,
  basement: Layers,
  general_misc: Sliders
};

export default function SandboxSettings({ serverName, onNotify }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [categories, setCategories] = useState([]);
  const [originalVars, setOriginalVars] = useState({});
  const [currentVars, setCurrentVars] = useState({});
  const [rawLua, setRawLua] = useState('');
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'raw'
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModifiedOnly, setFilterModifiedOnly] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [activePresetId, setActivePresetId] = useState(null);

  useEffect(() => {
    loadConfig();
  }, [serverName]);

  async function loadConfig() {
    setLoading(true);
    try {
      const data = await fetchSandboxConfig(serverName);
      setFilePath(data.filePath || '');
      setCategories(data.categories || []);
      setOriginalVars(data.flatVars || {});
      setCurrentVars(data.flatVars || {});
      setRawLua(data.raw || '');
      if (data.categories && data.categories.length > 0 && activeCategoryId === 'all') {
        // keep 'all' or default
      }
    } catch (err) {
      if (onNotify) onNotify('Error loading SandboxVars.lua: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Detect modified fields count
  const modifiedKeys = useMemo(() => {
    const keys = [];
    for (const [k, v] of Object.entries(currentVars)) {
      if (originalVars[k] !== undefined && originalVars[k] !== v) {
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

  function handleApplyPreset(preset) {
    if (preset.id === 'default') {
      setCurrentVars({ ...originalVars });
      setActivePresetId('default');
      setShowPresetsModal(false);
      if (onNotify) onNotify('Alapértelmezett szerverbeállítások visszaállítva.', 'info');
      return;
    }

    const updated = { ...currentVars, ...preset.vars };
    setCurrentVars(updated);
    setActivePresetId(preset.id);
    setEditorMode('visual');
    setShowPresetsModal(false);

    const changedCount = Object.keys(preset.vars).length;
    if (onNotify) {
      onNotify(`Alkalmazva: "${preset.name}" (${changedCount} beállítás módosítva)! Kattints a Mentés gombra az érvényesítéshez.`, 'success');
    }
  }

  function handleResetField(path) {
    if (originalVars[path] !== undefined) {
      handleFieldChange(path, originalVars[path]);
    }
  }

  function handleResetAll() {
    if (window.confirm('Are you sure you want to revert all unsaved changes to original values?')) {
      setCurrentVars({ ...originalVars });
      setActivePresetId(null);
      if (onNotify) onNotify('All changes reverted to current file state.', 'info');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editorMode === 'raw') {
        await saveSandboxConfig(serverName, { rawLua });
      } else {
        await saveSandboxConfig(serverName, { vars: currentVars });
      }
      setOriginalVars({ ...currentVars });
      if (onNotify) onNotify(`Sandbox settings saved to ${serverName}_SandboxVars.lua successfully!`, 'success');
      // Reload fresh state
      await loadConfig();
    } catch (err) {
      if (onNotify) onNotify('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Filter items based on activeCategory, searchQuery, and filterModifiedOnly
  const displayedCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categories.map(cat => {
      let filteredItems = cat.items;

      if (query) {
        filteredItems = filteredItems.filter(item => {
          const matchKey = item.key.toLowerCase().includes(query);
          const matchPath = item.path.toLowerCase().includes(query);
          const matchDesc = item.description ? item.description.toLowerCase().includes(query) : false;
          const matchCat = cat.name.toLowerCase().includes(query);
          return matchKey || matchPath || matchDesc || matchCat;
        });
      }

      if (filterModifiedOnly) {
        filteredItems = filteredItems.filter(item => modifiedKeys.includes(item.path));
      }

      return {
        ...cat,
        items: filteredItems
      };
    }).filter(cat => {
      if (activeCategoryId !== 'all' && cat.id !== activeCategoryId) {
        return false;
      }
      return cat.items.length > 0;
    });
  }, [categories, activeCategoryId, searchQuery, filterModifiedOnly, modifiedKeys]);

  const totalVisibleItems = useMemo(() => {
    return displayedCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [displayedCategories]);

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
  }, [currentVars, rawLua, editorMode, serverName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <RefreshCw className="w-9 h-9 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading {serverName}_SandboxVars.lua...</p>
        <p className="text-xs text-slate-500 mt-1">Parsing world parameters, zombie lore & XP multipliers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center text-white shadow-lg border border-cyan-500/40">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Sandbox World Settings</span>
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80 text-cyan-300">
                  SandboxVars.lua
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-xl">
                {filePath || `${serverName}_SandboxVars.lua`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          {/* Preset Selector Button */}
          <button
            onClick={() => setShowPresetsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-slate-900 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 hover:text-white text-xs font-semibold shadow-lg transition"
            title="Válassz előre összeállított játékélmény sablont"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preset Sablonok</span>
            <span className="text-[10px] bg-indigo-900/80 px-1.5 py-0.2 rounded border border-indigo-700 text-indigo-300 font-bold">
              {PRESETS.length}
            </span>
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setEditorMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                editorMode === 'visual'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Visual Editor</span>
            </button>
            <button
              onClick={() => setEditorMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                editorMode === 'raw'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw Lua</span>
            </button>
          </div>

          {/* Revert Changes if any */}
          {hasUnsavedChanges && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
              title="Revert all unsaved changes"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Revert ({modifiedKeys.length})</span>
            </button>
          )}

          {/* Save Button */}
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
            <span>{saving ? 'Saving...' : hasUnsavedChanges ? `Save Changes (${modifiedKeys.length})` : 'Save SandboxVars'}</span>
          </button>
        </div>
      </div>

      {editorMode === 'raw' ? (
        /* RAW LUA CODE EDITOR */
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>Direct Lua syntax editor. Edit and click Save to write directly to disk.</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">{rawLua.split('\n').length} lines</span>
          </div>

          <textarea
            value={rawLua}
            onChange={(e) => setRawLua(e.target.value)}
            rows={28}
            spellCheck={false}
            className="w-full font-mono text-xs p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y selection:bg-cyan-500/30"
          />
        </div>
      ) : (
        /* VISUAL FORM EDITOR */
        <div className="space-y-5">
          {/* Controls Bar: Search & Quick Filters */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search variables, descriptions, settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
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

            {/* Quick Filter Pill */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
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
                  <span>Modified Only ({modifiedKeys.length})</span>
                </button>
              )}

              <span className="text-xs text-slate-500">
                Showing <strong className="text-slate-300">{totalVisibleItems}</strong> options
              </span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activeCategoryId === 'all'
                  ? 'bg-cyan-950/90 border-cyan-500/70 text-cyan-300 shadow-md'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>All Categories</span>
            </button>

            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] || Sliders;
              const isActive = activeCategoryId === cat.id;
              const catModifiedCount = cat.items.filter(i => modifiedKeys.includes(i.path)).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                    isActive
                      ? 'bg-cyan-950/90 border-cyan-500/70 text-cyan-300 shadow-md'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{cat.name}</span>
                  {catModifiedCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                      {catModifiedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Variables List by Category */}
          {displayedCategories.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
              <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No settings found matching your search.</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting another category.</p>
            </div>
          ) : (
            displayedCategories.map((cat) => (
              <div key={cat.id} className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    {(() => {
                      const Icon = CATEGORY_ICONS[cat.id] || Sliders;
                      return <Icon className="w-5 h-5 text-cyan-400" />;
                    })()}
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">
                        {cat.name}
                      </h3>
                      {cat.isSubTable && (
                        <p className="text-[11px] font-mono text-cyan-500/80">
                          Table: SandboxVars.{cat.tableName}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {cat.items.length} options
                  </span>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cat.items.map((item) => (
                    <SandboxFieldItem
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
            ))
          )}
        </div>
      )}

      {/* PRESETS MODAL */}
      {showPresetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-800 border border-indigo-500/40 flex items-center justify-center text-white shadow-lg">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Sandbox Beállítás Sablonok (Presets)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Válassz előre összeállított játékstílust. Az értékek betöltődnek a szerkesztőbe, és a Mentés gombbal aktiválhatók.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPresetsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
              {PRESETS.map((preset) => {
                const Icon = preset.icon || Sliders;
                const isSelected = activePresetId === preset.id;

                return (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${preset.color} ${
                      isSelected ? 'ring-2 ring-cyan-500/50' : ''
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                        <h4 className="text-sm font-bold text-slate-100">
                          {preset.name}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${preset.badgeClass}`}>
                          {preset.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {preset.shortDesc}
                      </p>

                      {preset.highlights && preset.highlights.length > 0 && (
                        <div className="pt-1.5 space-y-1">
                          {preset.highlights.map((hl, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{hl}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md hover:shadow-cyan-900/40 transition shrink-0 w-full sm:w-auto justify-center"
                    >
                      <span>Sablon Alkalmazása</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>A sablon alkalmazása után a módosított mezőket a "Modified Only" szűrővel is áttekintheted.</span>
              </div>
              <button
                onClick={() => setShowPresetsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Sandbox Variable Card
function SandboxFieldItem({ item, currentValue, originalValue, onChange, onReset }) {
  const isModified = originalValue !== undefined && currentValue !== originalValue;

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
        isModified
          ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
      }`}
    >
      <div>
        {/* Top Key & Info Tags */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {item.key}
            </span>
            {item.table !== 'General' && (
              <span className="ml-1.5 text-[10px] font-mono text-cyan-400/80">
                ({item.table})
              </span>
            )}
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
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/80">
                Default: {item.defaultVal}
              </span>
            )}
          </div>
        </div>

        {/* Description / Hungarian Comment */}
        {item.description && (
          <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed" title={item.description}>
            {item.description}
          </p>
        )}
      </div>

      {/* Input Control Based on Type / Options */}
      <div className="pt-1">
        {/* BOOLEAN CONTROL (Switch / Checkbox) */}
        {item.type === 'boolean' && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => onChange(!currentValue)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                currentValue ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                  currentValue ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
            <span className={`text-xs font-semibold ${currentValue ? 'text-cyan-300' : 'text-slate-500'}`}>
              {currentValue ? 'Enabled (true)' : 'Disabled (false)'}
            </span>
          </label>
        )}

        {/* SELECT CONTROL (If item has options extracted from comments) */}
        {item.type !== 'boolean' && item.options && item.options.length > 0 && (
          <select
            value={currentValue ?? ''}
            onChange={(e) => {
              const numVal = Number(e.target.value);
              onChange(isNaN(numVal) ? e.target.value : numVal);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            {item.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value} - {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* NUMERIC CONTROL (Integer or Float without preset select options) */}
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
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            {item.min !== null && item.max !== null && (
              <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                [{item.min} - {item.max}]
              </span>
            )}
          </div>
        )}

        {/* STRING CONTROL */}
        {item.type === 'string' && (!item.options || item.options.length === 0) && (
          <input
            type="text"
            value={currentValue ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        )}
      </div>
    </div>
  );
}
