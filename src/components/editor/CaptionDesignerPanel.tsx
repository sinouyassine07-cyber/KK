/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  X,
  Subtitles,
  Sparkles,
  Type,
  Wand2,
  Clock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  BookmarkPlus,
  Copy,
  Trash2,
  Edit3,
  Star,
  Check,
  Mic,
  Scissors,
  Merge,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';
import type {
  CaptionAnimation,
  CaptionGroupingMode,
  CaptionItem,
  CaptionPosition,
  CaptionStyle,
  CaptionVisualEffect,
  CustomCaptionPreset,
  SafeZonePlatform,
} from '../../types';
import {
  CAPTION_ANIMATIONS,
  CAPTION_COLOR_PRESETS,
  CAPTION_PRESETS,
  CAPTION_PRESET_CATEGORIES,
  CAPTION_VISUAL_EFFECTS,
  FONT_LIBRARY,
  type CaptionPresetCategory,
} from '../../lib/captionPresets';

export type CaptionDesignerTab = 'presets' | 'style' | 'motion' | 'timing';

interface CaptionDesignerPanelProps {
  widthPx?: number;
  captions: CaptionItem[];
  selectedCaption: CaptionItem | null;
  captionStyle: CaptionStyle;
  customPresets: CustomCaptionPreset[];
  isAligning?: boolean;
  alignStatusMessage?: string | null;
  onCollapse: () => void;
  onUpdateStyle: (patch: Partial<CaptionStyle>, immediate?: boolean) => void;
  onApplyStyleToAll: (baseStyle?: CaptionStyle) => void;
  onClearSelectedOverride: (captionId: string) => void;
  onSelectCue: (caption: CaptionItem) => void;
  onUpdateCueTextAndTiming: (captionId: string, patch: { text?: string; startMs?: number; endMs?: number }) => void;
  onSplitCue: (captionId: string) => void;
  onMergeNextCue: (captionId: string) => void;
  onDeleteCue: (captionId: string) => void;
  onChangeGrouping: (mode: CaptionGroupingMode, maxWordsPerLine?: number, maxLines?: number) => void;
  onAlignFromAudio: () => void;
  onGenerateFromVoice: () => void;
  onGenerateFromScript: () => void;
  onSaveCustomPreset: (name: string) => Promise<void>;
  onRenameCustomPreset: (id: string, name: string) => Promise<void>;
  onDuplicateCustomPreset: (id: string) => Promise<void>;
  onDeleteCustomPreset: (id: string) => Promise<void>;
  onSetDefaultCustomPreset: (id: string) => Promise<void>;
}

export function CaptionDesignerPanel({
  widthPx = 360,
  captions,
  selectedCaption,
  captionStyle,
  customPresets,
  isAligning = false,
  alignStatusMessage,
  onCollapse,
  onUpdateStyle,
  onApplyStyleToAll,
  onClearSelectedOverride,
  onSelectCue,
  onUpdateCueTextAndTiming,
  onSplitCue,
  onMergeNextCue,
  onDeleteCue,
  onChangeGrouping,
  onAlignFromAudio,
  onGenerateFromVoice,
  onGenerateFromScript,
  onSaveCustomPreset,
  onRenameCustomPreset,
  onDuplicateCustomPreset,
  onDeleteCustomPreset,
  onSetDefaultCustomPreset,
}: CaptionDesignerPanelProps) {
  const [activeTab, setActiveTab] = useState<CaptionDesignerTab>('presets');
  const [presetCategory, setPresetCategory] = useState<CaptionPresetCategory>('All');
  const [newPresetName, setNewPresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [fontFilter, setFontFilter] = useState<'All' | 'Arabic' | 'Display' | 'Sans' | 'Serif' | 'Mono'>('All');

  // Effective style shown in controls: merges selected cue's override if any
  const effStyle: CaptionStyle = selectedCaption?.styleOverride
    ? { ...captionStyle, ...selectedCaption.styleOverride }
    : captionStyle;

  const selectedIndex = selectedCaption
    ? captions.findIndex((c) => c.id === selectedCaption.id)
    : -1;

  const hasWordSync = captions.some((c) => c.wordSyncAvailable !== false && Array.isArray(c.words) && c.words.length > 0);
  const selectedFontMeta = FONT_LIBRARY.find((f) => f.family === effStyle.fontFamily) || FONT_LIBRARY[0];

  const filteredPresets = CAPTION_PRESETS.filter(
    (p) => presetCategory === 'All' || p.category === presetCategory
  );

  const filteredFonts = FONT_LIBRARY.filter(
    (f) => fontFilter === 'All' || f.category === fontFilter
  );

  const handleSavePresetSubmit = async () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    await onSaveCustomPreset(trimmed);
    setNewPresetName('');
    setShowSaveInput(false);
  };

  return (
    <aside
      style={{ width: `${widthPx}px` }}
      className="bg-[#13161d] border-s border-white/[0.08] flex flex-col shrink-0 overflow-hidden select-none"
    >
      {/* Header */}
      <div className="h-9 px-3 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#161922] gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Subtitles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[11px] font-semibold text-white truncate">Caption Designer</span>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm truncate ${
              selectedCaption?.styleOverride
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
            }`}
          >
            {selectedCaption ? `Cue #${selectedIndex + 1}` : 'Global'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedCaption?.styleOverride && (
            <button
              type="button"
              onClick={() => onClearSelectedOverride(selectedCaption.id)}
              title="Reset selected caption to Global Style"
              className="p-1 rounded text-amber-300 hover:bg-amber-500/15"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse Caption Designer"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Global Apply Bar */}
      <div className="px-3 py-1.5 bg-[#10131a] border-b border-white/[0.07] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onApplyStyleToAll(effStyle)}
          className="flex-1 py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5"
        >
          <Check className="w-3 h-3" />
          <span>APPLY STYLE TO ALL CAPTIONS</span>
        </button>
      </div>

      {/* 4 Primary Tabs */}
      <div className="grid grid-cols-4 bg-[#0e1118] border-b border-white/[0.08] p-1 gap-1 shrink-0">
        {(
          [
            { id: 'presets', label: 'Presets', icon: Sparkles },
            { id: 'style', label: 'Style', icon: Type },
            { id: 'motion', label: 'Motion', icon: Wand2 },
            { id: 'timing', label: 'Timing', icon: Clock },
          ] as Array<{ id: CaptionDesignerTab; label: string; icon: typeof Sparkles }>
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-1.5 rounded-sm text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* ==================== TAB 1: PRESETS ==================== */}
        {activeTab === 'presets' && (
          <>
            {/* Category Chips */}
            <div className="flex flex-wrap gap-1">
              {CAPTION_PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPresetCategory(cat)}
                  className={`px-2 py-0.5 rounded-sm text-[10px] font-medium border transition-colors ${
                    presetCategory === cat
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-[#0c0e13] border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 20 Modern Presets Grid with Miniature Live Previews */}
            <div className="grid grid-cols-2 gap-2">
              {filteredPresets.map((preset) => {
                const isSelected = effStyle.presetId === preset.id;
                const st = preset.style;
                const bgPreview =
                  st.bgMode && st.bgMode !== 'none'
                    ? st.backgroundColor || 'rgba(0,0,0,0.75)'
                    : 'transparent';
                const glowShadow =
                  st.visualEffect === 'neon' || st.visualEffect === 'glow'
                    ? `0 0 8px ${st.activeWordColor || st.color || '#22D3EE'}`
                    : st.visualEffect === '3d-depth'
                    ? '2px 2px 0px #000, 3px 3px 0px rgba(0,0,0,0.7)'
                    : '0 1px 3px rgba(0,0,0,0.9)';

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onUpdateStyle(
                        {
                          ...st,
                          presetId: preset.id,
                          presetName: preset.name,
                        },
                        true
                      )
                    }
                    className={`rounded border p-2 text-left transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/40'
                        : 'bg-[#0c0e13] border-white/[0.08] hover:border-white/25'
                    }`}
                  >
                    <div className="w-full h-11 rounded-sm bg-[#06070a] border border-white/[0.06] flex items-center justify-center px-1.5 overflow-hidden">
                      <span
                        style={{
                          fontFamily: st.fontFamily || 'Montserrat',
                          fontWeight: st.fontWeight || 700,
                          fontStyle: st.italic ? 'italic' : 'normal',
                          color: st.gradientEnabled ? st.gradientFrom : st.color || '#FFFFFF',
                          backgroundColor: bgPreview,
                          WebkitTextStroke:
                            st.outlineThickness && st.outlineThickness > 0
                              ? `0.6px ${st.outlineColor || '#000000'}`
                              : undefined,
                          textShadow: glowShadow,
                          padding: bgPreview !== 'transparent' ? '2px 6px' : undefined,
                          borderRadius: '4px',
                        }}
                        className="text-[11px] leading-tight text-center truncate max-w-full"
                      >
                        {preset.sample.split(' ').slice(0, 2).join(' ')}{' '}
                        <span
                          style={{
                            color: st.activeWordColor || st.color,
                            backgroundColor:
                              st.bgMode === 'marker' || st.bgMode === 'word-boxes'
                                ? st.highlightBgColor
                                : undefined,
                            padding:
                              st.bgMode === 'marker' || st.bgMode === 'word-boxes'
                                ? '0 3px'
                                : undefined,
                            borderRadius: '2px',
                          }}
                        >
                          {preset.sample.split(' ').slice(2).join(' ')}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-semibold text-slate-200 truncate">{preset.name}</span>
                      <span className="text-[9px] font-mono text-slate-500 shrink-0">{preset.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Saved Presets */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-200">
                  Saved Presets ({customPresets.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowSaveInput((v) => !v)}
                  className="px-2 py-1 rounded bg-[#1d222d] hover:bg-blue-600 text-slate-200 hover:text-white border border-white/10 text-[10px] font-medium flex items-center gap-1 transition-colors"
                >
                  <BookmarkPlus className="w-3 h-3" />
                  <span>Save Style</span>
                </button>
              </div>

              {showSaveInput && (
                <div className="flex items-center gap-1.5 bg-[#0c0e13] p-1.5 rounded border border-blue-500/40">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSavePresetSubmit();
                    }}
                    placeholder="Preset name..."
                    className="flex-1 bg-transparent text-xs text-white px-1.5 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSavePresetSubmit()}
                    className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold"
                  >
                    Save
                  </button>
                </div>
              )}

              {customPresets.length === 0 ? (
                <p className="text-[10px] text-slate-500">
                  Save customized typography, colors, and animations to reuse across projects.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {customPresets.map((cp) => (
                    <div
                      key={cp.id}
                      className={`p-2 rounded border bg-[#0c0e13] flex items-center justify-between gap-2 ${
                        effStyle.presetId === cp.id ? 'border-blue-500' : 'border-white/[0.08]'
                      }`}
                    >
                      {editingPresetId === cp.id ? (
                        <div className="flex-1 flex items-center gap-1">
                          <input
                            type="text"
                            value={editingPresetName}
                            onChange={(e) => setEditingPresetName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                void onRenameCustomPreset(cp.id, editingPresetName);
                                setEditingPresetId(null);
                              }
                            }}
                            className="flex-1 px-1.5 py-0.5 rounded bg-[#141720] border border-blue-500 text-white text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void onRenameCustomPreset(cp.id, editingPresetName);
                              setEditingPresetId(null);
                            }}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStyle({ ...cp.style, presetId: cp.id, presetName: cp.name }, true)
                          }
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="text-[11px] font-medium text-white truncate flex items-center gap-1">
                            {cp.isDefault && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                            <span className="truncate">{cp.name}</span>
                          </div>
                          <div className="text-[9px] font-mono text-slate-500 truncate">
                            {cp.style.fontFamily} · {cp.style.fontSize}px · {cp.style.animation || 'none'}
                          </div>
                        </button>
                      )}

                      <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
                        <button
                          type="button"
                          onClick={() => void onSetDefaultCustomPreset(cp.id)}
                          title="Set as Default Preset"
                          className={`p-1 rounded hover:text-amber-400 ${cp.isDefault ? 'text-amber-400' : ''}`}
                        >
                          <Star className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPresetId(cp.id);
                            setEditingPresetName(cp.name);
                          }}
                          title="Rename"
                          className="p-1 rounded hover:text-white"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDuplicateCustomPreset(cp.id)}
                          title="Duplicate"
                          className="p-1 rounded hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteCustomPreset(cp.id)}
                          title="Delete"
                          className="p-1 rounded hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== TAB 2: STYLE & FONT ==================== */}
        {activeTab === 'style' && (
          <>
            {/* Font Library */}
            <div className="space-y-2 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-200">Font Library (18 Fonts)</span>
                <span className="text-[9px] font-mono text-blue-300">{selectedFontMeta.scriptBadge}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {(['All', 'Arabic', 'Display', 'Sans', 'Serif', 'Mono'] as const).map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setFontFilter(grp)}
                    className={`px-1.5 py-0.5 rounded-sm text-[9px] font-medium border ${
                      fontFilter === grp
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#0c0e13] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {filteredFonts.map((f) => {
                  const active = effStyle.fontFamily === f.family;
                  return (
                    <button
                      key={f.family}
                      type="button"
                      onClick={() =>
                        onUpdateStyle(
                          {
                            fontFamily: f.family,
                            fontWeight: f.weights.includes(effStyle.fontWeight || 700)
                              ? effStyle.fontWeight
                              : f.weights[f.weights.length - 1],
                          },
                          true
                        )
                      }
                      className={`w-full px-2.5 py-1.5 rounded border text-left flex items-center justify-between gap-2 transition-colors ${
                        active
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-[#0c0e13] border-white/[0.07] text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="min-w-0">
                        <div style={{ fontFamily: f.family }} className="text-xs font-bold truncate">
                          {f.label}
                        </div>
                        <div
                          style={{ fontFamily: f.family }}
                          dir="auto"
                          className="text-[10px] text-slate-400 truncate"
                        >
                          {f.sample}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-white/[0.05] text-slate-400 shrink-0">
                        {f.scriptBadge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Typography Controls */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Weight</label>
                  <select
                    value={effStyle.fontWeight || selectedFontMeta.weights[0]}
                    onChange={(e) => onUpdateStyle({ fontWeight: Number(e.target.value) }, true)}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                  >
                    {selectedFontMeta.weights.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Size (px)</label>
                  <input
                    type="number"
                    min={12}
                    max={72}
                    value={effStyle.fontSize}
                    onChange={(e) => onUpdateStyle({ fontSize: Math.max(12, Math.min(72, Number(e.target.value))) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Tracking</label>
                  <input
                    type="number"
                    step={0.5}
                    min={-2}
                    max={12}
                    value={effStyle.letterSpacing ?? 0}
                    onChange={(e) => onUpdateStyle({ letterSpacing: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Line Height</label>
                  <input
                    type="number"
                    step={0.05}
                    min={0.9}
                    max={2.0}
                    value={effStyle.lineHeight ?? 1.25}
                    onChange={(e) => onUpdateStyle({ lineHeight: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Case & Style</label>
                  <div className="grid grid-cols-3 gap-0.5 bg-[#0c0e13] p-0.5 rounded border border-white/10">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStyle(
                          { textTransform: effStyle.textTransform === 'uppercase' ? 'none' : 'uppercase' },
                          true
                        )
                      }
                      className={`py-1 rounded-sm text-[10px] font-bold ${
                        effStyle.textTransform === 'uppercase' ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                      title="Uppercase"
                    >
                      AA
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStyle(
                          { textTransform: effStyle.textTransform === 'lowercase' ? 'none' : 'lowercase' },
                          true
                        )
                      }
                      className={`py-1 rounded-sm text-[10px] font-bold ${
                        effStyle.textTransform === 'lowercase' ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                      title="Lowercase"
                    >
                      aa
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStyle({ italic: !effStyle.italic }, true)}
                      className={`py-1 rounded-sm text-[10px] italic font-serif ${
                        effStyle.italic ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                      title="Italic"
                    >
                      I
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Align</label>
                  <div className="grid grid-cols-3 gap-0.5 bg-[#0c0e13] p-0.5 rounded border border-white/10">
                    {(['left', 'center', 'right'] as const).map((al) => (
                      <button
                        key={al}
                        type="button"
                        onClick={() => onUpdateStyle({ align: al }, true)}
                        className={`py-1 rounded-sm flex items-center justify-center ${
                          (effStyle.align || 'center') === al ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        {al === 'left' ? (
                          <AlignLeft className="w-3 h-3" />
                        ) : al === 'center' ? (
                          <AlignCenter className="w-3 h-3" />
                        ) : (
                          <AlignRight className="w-3 h-3" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Colors & Word Highlighting */}
            <div className="space-y-2.5 pb-3 border-b border-white/[0.08]">
              <span className="text-[11px] font-semibold text-slate-200 block">Colors & Word Highlighting</span>

              <div className="flex flex-wrap gap-1.5">
                {CAPTION_COLOR_PRESETS.map((sw) => (
                  <button
                    key={sw.id}
                    type="button"
                    onClick={() =>
                      onUpdateStyle(
                        {
                          color: sw.color,
                          activeWordColor: sw.activeWordColor,
                          highlightBgColor: sw.highlightBgColor,
                          outlineColor: sw.outlineColor,
                          gradientEnabled: false,
                        },
                        true
                      )
                    }
                    title={sw.name}
                    className="flex items-center gap-1 px-1.5 py-1 rounded bg-[#0c0e13] border border-white/[0.08] hover:border-white/30 text-[9px] text-slate-300"
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: sw.activeWordColor }} />
                    <span>{sw.name}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Main Text</label>
                  <input
                    type="color"
                    value={effStyle.color}
                    onChange={(e) => onUpdateStyle({ color: e.target.value })}
                    className="w-full h-7 rounded bg-[#0c0e13] border border-white/10 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Active Word</label>
                  <input
                    type="color"
                    value={effStyle.activeWordColor || '#FDE047'}
                    onChange={(e) => onUpdateStyle({ activeWordColor: e.target.value })}
                    className="w-full h-7 rounded bg-[#0c0e13] border border-white/10 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Highlight Bg</label>
                  <input
                    type="color"
                    value={effStyle.highlightBgColor || '#2563EB'}
                    onChange={(e) => onUpdateStyle({ highlightBgColor: e.target.value })}
                    className="w-full h-7 rounded bg-[#0c0e13] border border-white/10 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Secondary</label>
                  <input
                    type="color"
                    value={effStyle.secondaryWordColor || '#CBD5E1'}
                    onChange={(e) => onUpdateStyle({ secondaryWordColor: e.target.value })}
                    className="w-full h-7 rounded bg-[#0c0e13] border border-white/10 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Outline</label>
                  <input
                    type="color"
                    value={effStyle.outlineColor || '#000000'}
                    onChange={(e) => onUpdateStyle({ outlineColor: e.target.value })}
                    className="w-full h-7 rounded bg-[#0c0e13] border border-white/10 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Shadow</label>
                  <input
                    type="color"
                    value={effStyle.shadowColor || '#000000'}
                    onChange={(e) => onUpdateStyle({ shadowColor: e.target.value })}
                    className="w-full h-7 rounded bg-[#0c0e13] border border-white/10 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-2 rounded bg-[#0c0e13] border border-white/[0.08] space-y-2">
                <label className="flex items-center justify-between text-[10px] text-slate-300 cursor-pointer">
                  <span>Text Gradient Fill</span>
                  <input
                    type="checkbox"
                    checked={Boolean(effStyle.gradientEnabled)}
                    onChange={(e) => onUpdateStyle({ gradientEnabled: e.target.checked }, true)}
                    className="accent-blue-500"
                  />
                </label>
                {effStyle.gradientEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="color"
                      value={effStyle.gradientFrom || '#38BDF8'}
                      onChange={(e) => onUpdateStyle({ gradientFrom: e.target.value })}
                      className="w-full h-6 rounded bg-[#141720] border border-white/10 cursor-pointer"
                    />
                    <input
                      type="color"
                      value={effStyle.gradientTo || '#F472B6'}
                      onChange={(e) => onUpdateStyle({ gradientTo: e.target.value })}
                      className="w-full h-6 rounded bg-[#141720] border border-white/10 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Highlight Rule */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 block">Highlight Rule</label>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'current-word', label: 'Current Word' },
                      { id: 'keywords', label: 'Keywords' },
                      { id: 'numbers', label: 'Numbers' },
                      { id: 'phrases', label: 'Phrases' },
                      { id: 'none', label: 'None' },
                    ] as Array<{ id: CaptionStyle['highlightMode']; label: string }>
                  ).map((hr) => (
                    <button
                      key={hr.id}
                      type="button"
                      onClick={() => onUpdateStyle({ highlightMode: hr.id }, true)}
                      className={`py-1 px-1.5 rounded-sm text-[10px] font-medium border ${
                        (effStyle.highlightMode || 'current-word') === hr.id
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#0c0e13] border-white/[0.08] text-slate-400 hover:text-white'
                      }`}
                    >
                      {hr.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onUpdateStyle({ autoEmphasis: !effStyle.autoEmphasis }, true)}
                    className={`py-1 px-1.5 rounded-sm text-[10px] font-medium border ${
                      effStyle.autoEmphasis
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-[#0c0e13] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto Emphasis
                  </button>
                </div>

                {(effStyle.highlightMode === 'keywords' ||
                  effStyle.highlightMode === 'phrases' ||
                  effStyle.highlightMode === 'current-word') && (
                  <input
                    type="text"
                    value={effStyle.highlightKeywords || ''}
                    onChange={(e) => onUpdateStyle({ highlightKeywords: e.target.value })}
                    placeholder="Keywords / phrases (comma separated)..."
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px] focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>
            </div>

            {/* Backgrounds & Caption Visual Effects */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-200 block">Backgrounds & Caption Effects</span>

              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'none', label: 'None' },
                    { id: 'solid', label: 'Solid' },
                    { id: 'semi', label: 'Semi' },
                    { id: 'rounded', label: 'Rounded' },
                    { id: 'word-boxes', label: 'Word Box' },
                    { id: 'marker', label: 'Marker' },
                    { id: 'glass', label: 'Glass' },
                    { id: 'blur', label: 'Blur' },
                  ] as Array<{ id: NonNullable<CaptionStyle['bgMode']>; label: string }>
                ).map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => onUpdateStyle({ bgMode: bg.id }, true)}
                    className={`py-1 rounded-sm text-[10px] font-medium border ${
                      (effStyle.bgMode || 'semi') === bg.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#0c0e13] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Box Color</label>
                  <input
                    type="color"
                    value={effStyle.backgroundColor?.startsWith('#') ? effStyle.backgroundColor : '#000000'}
                    onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
                    className="w-full h-7 rounded bg-[#0c0e13] border border-white/10 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>Bg Opacity</span>
                    <span className="font-mono tabular-nums">{effStyle.bgOpacity ?? 65}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={effStyle.bgOpacity ?? 65}
                    onChange={(e) => onUpdateStyle({ bgOpacity: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Radius (px)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={effStyle.borderRadius ?? 8}
                    onChange={(e) => onUpdateStyle({ borderRadius: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Pad X</label>
                  <input
                    type="number"
                    min={0}
                    max={36}
                    value={effStyle.paddingX ?? 12}
                    onChange={(e) => onUpdateStyle({ paddingX: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Pad Y</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={effStyle.paddingY ?? 6}
                    onChange={(e) => onUpdateStyle({ paddingY: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Outline (px)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={effStyle.outlineThickness ?? 3}
                    onChange={(e) => onUpdateStyle({ outlineThickness: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Shadow Blur</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={effStyle.shadowBlur ?? 6}
                    onChange={(e) => onUpdateStyle({ shadowBlur: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Glow %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={effStyle.glowIntensity ?? 0}
                    onChange={(e) => onUpdateStyle({ glowIntensity: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Visual Treatment</label>
                <div className="grid grid-cols-3 gap-1">
                  {CAPTION_VISUAL_EFFECTS.map((fx) => (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => onUpdateStyle({ visualEffect: fx.id as CaptionVisualEffect }, true)}
                      className={`py-1 px-1.5 rounded-sm text-[10px] font-medium border truncate ${
                        (effStyle.visualEffect || 'none') === fx.id
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#0c0e13] border-white/[0.08] text-slate-400 hover:text-white'
                      }`}
                    >
                      {fx.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 3: MOTION & SAFE ZONES ==================== */}
        {activeTab === 'motion' && (
          <>
            <div className="space-y-2 pb-3 border-b border-white/[0.08]">
              <span className="text-[11px] font-semibold text-slate-200 block">
                Caption Animations (16 Presets)
              </span>
              <div className="grid grid-cols-3 gap-1">
                {CAPTION_ANIMATIONS.map((an) => (
                  <button
                    key={an.id}
                    type="button"
                    onClick={() => onUpdateStyle({ animation: an.id }, true)}
                    className={`py-1.5 px-1.5 rounded-sm text-[10px] font-medium border truncate transition-colors ${
                      (effStyle.animation || 'none') === an.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#0c0e13] border-white/[0.08] text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {an.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation Parameters */}
            <div className="space-y-2.5 pb-3 border-b border-white/[0.08]">
              <span className="text-[11px] font-semibold text-slate-200 block">Animation Controls</span>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Duration</span>
                  <span className="font-mono tabular-nums">{effStyle.animDurationMs ?? 200} ms</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={600}
                  step={10}
                  value={effStyle.animDurationMs ?? 200}
                  onChange={(e) => onUpdateStyle({ animDurationMs: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Intensity</span>
                  <span className="font-mono tabular-nums">{effStyle.animIntensity ?? 75}%</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={150}
                  step={5}
                  value={effStyle.animIntensity ?? 75}
                  onChange={(e) => onUpdateStyle({ animIntensity: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Delay (ms)</label>
                  <input
                    type="number"
                    min={0}
                    max={400}
                    step={10}
                    value={effStyle.animDelayMs ?? 0}
                    onChange={(e) => onUpdateStyle({ animDelayMs: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Easing</label>
                  <select
                    value={effStyle.animEasing || 'ease-out'}
                    onChange={(e) =>
                      onUpdateStyle({ animEasing: e.target.value as CaptionStyle['animEasing'] }, true)
                    }
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                  >
                    <option value="ease-out">Ease Out</option>
                    <option value="spring">Spring</option>
                    <option value="ease-in-out">Ease In-Out</option>
                    <option value="linear">Linear</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Line Entrance</label>
                  <select
                    value={effStyle.lineEntrance || 'fade'}
                    onChange={(e) =>
                      onUpdateStyle({ lineEntrance: e.target.value as CaptionAnimation }, true)
                    }
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                  >
                    {CAPTION_ANIMATIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Active Word Anim</label>
                  <select
                    value={effStyle.activeWordAnimation || 'scale-punch'}
                    onChange={(e) =>
                      onUpdateStyle({ activeWordAnimation: e.target.value as CaptionAnimation }, true)
                    }
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                  >
                    {CAPTION_ANIMATIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Position & Platform Safe Zones */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-200 block">
                Position & Platform Safe Zones
              </span>

              <div className="grid grid-cols-5 gap-1">
                {(
                  [
                    { id: 'top', label: 'Top' },
                    { id: 'upper-middle', label: 'Upper' },
                    { id: 'middle', label: 'Center' },
                    { id: 'lower-middle', label: 'Lower' },
                    { id: 'bottom', label: 'Bottom' },
                  ] as Array<{ id: CaptionPosition; label: string }>
                ).map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => onUpdateStyle({ position: pos.id }, true)}
                    className={`py-1 rounded-sm text-[10px] font-medium border ${
                      effStyle.position === pos.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#0c0e13] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Manual X (%)</label>
                  <input
                    type="number"
                    min={-45}
                    max={45}
                    value={effStyle.manualX ?? 0}
                    onChange={(e) => onUpdateStyle({ manualX: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Manual Y (%)</label>
                  <input
                    type="number"
                    min={-45}
                    max={45}
                    value={effStyle.manualY ?? 0}
                    onChange={(e) => onUpdateStyle({ manualY: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
              </div>

              <div className="p-2 rounded bg-[#0c0e13] border border-white/[0.08] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Preview Safe-Zone Guides (Not Exported)</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'none', label: 'Off' },
                      { id: 'tiktok', label: 'TikTok' },
                      { id: 'reels', label: 'Reels' },
                      { id: 'shorts', label: 'Shorts' },
                    ] as Array<{ id: SafeZonePlatform; label: string }>
                  ).map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => onUpdateStyle({ safeZoneGuide: sz.id }, true)}
                      className={`py-1 rounded-sm text-[10px] font-medium border ${
                        (captionStyle.safeZoneGuide || 'none') === sz.id
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#141720] border-white/[0.08] text-slate-400 hover:text-white'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 4: TIMING & WORDS ==================== */}
        {activeTab === 'timing' && (
          <>
            {/* Audio Alignment & Generation */}
            <div className="space-y-2 pb-3 border-b border-white/[0.08]">
              <span className="text-[11px] font-semibold text-slate-200 block">Speech-Synchronized Captions</span>

              <button
                type="button"
                disabled={isAligning}
                onClick={onAlignFromAudio}
                className="w-full py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isAligning ? (
                  <>
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Aligning Words to Audio...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Align Word Timestamps to Audio</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onGenerateFromVoice}
                  className="py-1 px-2 rounded bg-[#0c0e13] hover:bg-[#1a1f2b] border border-white/10 text-slate-200 text-[10px] font-medium"
                >
                  From Voiceover
                </button>
                <button
                  type="button"
                  onClick={onGenerateFromScript}
                  className="py-1 px-2 rounded bg-[#0c0e13] hover:bg-[#1a1f2b] border border-white/10 text-slate-200 text-[10px] font-medium"
                >
                  From Script
                </button>
              </div>

              {/* Honest Word Sync Status */}
              {captions.length > 0 && (
                <div
                  className={`p-2 rounded border text-[10px] flex items-start gap-1.5 ${
                    hasWordSync
                      ? 'bg-emerald-950/35 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-950/35 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {hasWordSync ? (
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {alignStatusMessage ||
                      (hasWordSync
                        ? 'Word-level speech timestamps active. Regrouping preserves exact spoken timing.'
                        : 'Phrase-level script timing only — no audio word-level alignment yet. Click "Align Word Timestamps" to sync with audio.')}
                  </span>
                </div>
              )}
            </div>

            {/* Word Grouping Control */}
            <div className="space-y-2 pb-3 border-b border-white/[0.08]">
              <span className="text-[11px] font-semibold text-slate-200 block">Word Grouping</span>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: '1-word', label: '1 Word' },
                    { id: '2-words', label: '2 Words' },
                    { id: '3-words', label: '3 Words' },
                    { id: '4-words', label: '4 Words' },
                    { id: 'auto-pauses', label: 'Auto Pauses' },
                    { id: 'sentence', label: 'Sentence' },
                    { id: 'manual', label: 'Manual' },
                  ] as Array<{ id: CaptionGroupingMode; label: string }>
                ).map((gm) => (
                  <button
                    key={gm.id}
                    type="button"
                    onClick={() => onChangeGrouping(gm.id, captionStyle.maxWordsPerLine, captionStyle.maxLines)}
                    className={`py-1 px-1 rounded-sm text-[10px] font-medium border ${
                      (captionStyle.groupingMode || '3-words') === gm.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#0c0e13] border-white/[0.08] text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {gm.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Max Words / Line</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={captionStyle.maxWordsPerLine ?? 4}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(8, Number(e.target.value)));
                      onUpdateStyle({ maxWordsPerLine: val }, true);
                    }}
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Max Lines</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={captionStyle.maxLines ?? 2}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(3, Number(e.target.value)));
                      onUpdateStyle({ maxLines: val }, true);
                    }}
                    className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Editable Cue List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-200">
                  Timeline Cues ({captions.length})
                </span>
              </div>

              {captions.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-slate-500 border border-dashed border-white/10 rounded p-3">
                  Generate or align captions to edit text, timing, splits, and per-cue styling.
                </div>
              ) : (
                captions.map((c, idx) => {
                  const isSel = selectedCaption?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectCue(c)}
                      className={`p-2 rounded border space-y-1.5 cursor-pointer transition-colors ${
                        isSel
                          ? 'bg-blue-600/15 border-blue-500'
                          : 'bg-[#0c0e13] border-white/[0.08] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 font-mono text-slate-400">
                          <span className="font-bold text-slate-200">#{idx + 1}</span>
                          {c.styleOverride && (
                            <span className="px-1 rounded bg-amber-500/20 text-amber-300 text-[9px]">Custom</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onSplitCue(c.id)}
                            title="Split Cue in Two"
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08]"
                          >
                            <Scissors className="w-3 h-3" />
                          </button>
                          {idx < captions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => onMergeNextCue(c.id)}
                              title="Merge with Next Cue"
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08]"
                            >
                              <Merge className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteCue(c.id)}
                            title="Delete Cue"
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        dir="auto"
                        value={c.text}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateCueTextAndTiming(c.id, { text: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#141720] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                      />

                      <div className="grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 bg-[#141720] px-1.5 py-0.5 rounded border border-white/10">
                          <span className="text-[9px] text-slate-500">In</span>
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            value={Number((c.startMs / 1000).toFixed(2))}
                            onChange={(e) =>
                              onUpdateCueTextAndTiming(c.id, {
                                startMs: Math.max(0, Math.round(Number(e.target.value) * 1000)),
                              })
                            }
                            className="w-full bg-transparent text-white font-mono tabular-nums text-[10px] focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1 bg-[#141720] px-1.5 py-0.5 rounded border border-white/10">
                          <span className="text-[9px] text-slate-500">Out</span>
                          <input
                            type="number"
                            step={0.1}
                            min={0.2}
                            value={Number((c.endMs / 1000).toFixed(2))}
                            onChange={(e) =>
                              onUpdateCueTextAndTiming(c.id, {
                                endMs: Math.max(c.startMs + 200, Math.round(Number(e.target.value) * 1000)),
                              })
                            }
                            className="w-full bg-transparent text-white font-mono tabular-nums text-[10px] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
