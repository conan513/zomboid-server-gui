import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  ExternalLink,
  MapPin,
  AlertCircle,
  Package,
  Layers,
  Check
} from 'lucide-react';

export default function ModItem({
  mod,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleEnabled,
  onToggleModId
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: mod.workshopId || mod.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1
  };

  const isEnabled = mod.enabled !== false;
  const modIds = mod.modIds || [];
  const selectedModIds = mod.selectedModIds || modIds;
  const mapFolders = mod.mapFolders || [];
  const requiredItems = mod.requiredItems || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card rounded-xl p-4 transition-all duration-200 border ${
        isEnabled
          ? 'border-slate-700/60 bg-slate-900/60'
          : 'border-slate-800/40 bg-slate-950/40 opacity-60'
      } hover:border-slate-600 shadow-lg`}
    >
      <div className="flex items-start gap-3 md:gap-4">
        {/* Drag Handle & Order controls */}
        <div className="flex flex-col items-center justify-between self-stretch gap-1">
          <div
            {...attributes}
            {...listeners}
            className="p-1 rounded cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition"
            title="Drag to reorder load order"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            #{index + 1}
          </span>

          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition"
              title="Move Up in Load Order"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition"
              title="Move Down in Load Order"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thumbnail Preview */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 flex items-center justify-center">
          {mod.previewUrl ? (
            <img
              src={mod.previewUrl}
              alt={mod.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '';
              }}
            />
          ) : (
            <Package className="w-8 h-8 text-slate-500" />
          )}
        </div>

        {/* Mod Info & Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-slate-100 text-sm md:text-base truncate">
                {mod.title || `Workshop Item ${mod.workshopId}`}
              </h3>
              {mod.url && (
                <a
                  href={mod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-cyan-400 transition"
                  title="Open in Steam Workshop"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onToggleEnabled(index)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  {isEnabled ? 'Active' : 'Disabled'}
                </span>
              </label>

              <button
                onClick={() => onRemove(index)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-800/50 transition"
                title="Remove mod"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Badges & Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-cyan-300 font-mono">
              Workshop ID: {mod.workshopId}
            </span>
            {mod.author && (
              <span className="text-slate-400">by <span className="text-slate-300 font-medium">{mod.author}</span></span>
            )}
            {mod.fileSize && (
              <span className="text-slate-500">• {mod.fileSize}</span>
            )}
          </div>

          {/* Sub Mod IDs Section */}
          <div className="mt-2 pt-2 border-t border-slate-800/70">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mod IDs to load ({selectedModIds.length}/{modIds.length}):</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {modIds.map((mid) => {
                const isMidSelected = selectedModIds.includes(mid);
                return (
                  <button
                    key={mid}
                    onClick={() => onToggleModId(index, mid)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition border ${
                      isMidSelected
                        ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-200 hover:bg-indigo-900'
                        : 'bg-slate-900 border-slate-800 text-slate-500 line-through hover:text-slate-400'
                    }`}
                    title={isMidSelected ? 'Click to disable this Mod ID' : 'Click to enable this Mod ID'}
                  >
                    {isMidSelected && <Check className="w-3 h-3 text-indigo-400" />}
                    <span>{mid}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map Folders badge if applicable */}
          {mapFolders.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/40">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Map folder(s): {mapFolders.join(', ')}</span>
            </div>
          )}

          {/* Dependencies / Required Items if any */}
          {requiredItems.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-amber-300/90 bg-amber-950/20 px-2 py-1 rounded border border-amber-800/30">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Required:</span>
              {requiredItems.map(req => (
                <a
                  key={req.workshopId}
                  href={req.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-amber-200"
                >
                  {req.title} ({req.workshopId})
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
