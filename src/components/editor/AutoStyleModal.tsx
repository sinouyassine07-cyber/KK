/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Sparkles,
  X,
  Play,
  Check,
  AlertTriangle,
  Film,
  Repeat,
  Subtitles,
  Sliders,
  Mic,
  FileText,
  Layers,
} from 'lucide-react';
import type {
  AutoStyleId,
  AutoStyleOptions,
  MotionPreset,
  StyleIntensity,
} from '../../types';
import {
  AUTO_STYLE_PRESETS,
  type AutoStylePlanSummary,
} from '../../lib/autoStyleEngine';

interface AutoStyleModalProps {
  selectedStyleId: AutoStyleId;
  intensity: StyleIntensity;
  options: AutoStyleOptions;
  conflictMode: 'replace-all' | 'preserve-manual';
  hasPreviousAutoStyle: boolean;
  previousAutoStyleLabel?: string;
  hasCaptions: boolean;
  hasVoiceover: boolean;
  hasScript: boolean;
  isPreviewing: boolean;
  planSummary: AutoStylePlanSummary;
  onSelectStyle: (id: AutoStyleId) => void;
  onSelectIntensity: (intensity: StyleIntensity) => void;
  onUpdateOptions: (patch: Partial<AutoStyleOptions>) => void;
  onChangeConflictMode: (mode: 'replace-all' | 'preserve-manual') => void;
  onGenerateCaptionsFromVoice: () => void;
  onGenerateCaptionsFromScript: () => void;
  onPreview: () => void;
  onStopPreview: () => void;
  onApply: () => void;
  onCancel: () => void;
}

export function AutoStyleModal({
  selectedStyleId,
  intensity,
  options,
  conflictMode,
  hasPreviousAutoStyle,
  previousAutoStyleLabel,
  hasCaptions,
  hasVoiceover,
  hasScript,
  isPreviewing,
  planSummary,
  onSelectStyle,
  onSelectIntensity,
  onUpdateOptions,
  onChangeConflictMode,
  onGenerateCaptionsFromVoice,
  onGenerateCaptionsFromScript,
  onPreview,
  onStopPreview,
  onApply,
  onCancel,
}: AutoStyleModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 pointer-events-auto">
      <div className="w-full max-w-2xl rounded-lg bg-[#13161f] border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#171b26] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-tight">Auto Style</h2>
              <p className="text-[11px] text-slate-400">
                Coordinated image motion, mix transitions, visual grade & caption styling
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.08]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* 1. Style Grid (6 Styles) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">
                Choose Visual Direction
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {planSummary.imagesStyled} imgs · {planSummary.videosStyled} clips · {planSummary.transitionsApplied} transitions
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AUTO_STYLE_PRESETS.map((preset) => {
                const active = selectedStyleId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectStyle(preset.id)}
                    className={`p-2.5 rounded border text-left transition-all flex flex-col gap-1.5 ${
                      active
                        ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/40'
                        : 'bg-[#0c0e13] border-white/[0.08] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white text-xs">{preset.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: preset.accentHex }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{preset.tagline}</p>
                    <div className="pt-1 flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
                      <span>{preset.motionSequence[0]}</span>
                      <span>·</span>
                      <span>{preset.transitionSequence[0]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Intensity & Image Motion Strategy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2.5 rounded bg-[#0c0e13] border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Style Intensity</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-[#141720] p-0.5 rounded border border-white/[0.07]">
                {(
                  [
                    { id: 'subtle', label: 'Subtle' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'strong', label: 'Strong' },
                  ] as Array<{ id: StyleIntensity; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectIntensity(item.id)}
                    className={`py-1.5 rounded-sm text-[11px] font-medium transition-colors ${
                      intensity === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0c0e13] border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                <Film className="w-3.5 h-3.5 text-blue-400" />
                <span>Image Motion Mode</span>
              </div>
              <select
                value={options.imageMotionMode}
                onChange={(e) =>
                  onUpdateOptions({ imageMotionMode: e.target.value as 'alternating' | MotionPreset })
                }
                className="w-full px-2 py-1.5 rounded bg-[#141720] border border-white/10 text-white text-[11px]"
              >
                <option value="alternating">Alternating Motion (Non-Repeating)</option>
                <option value="ken-burns">Ken Burns</option>
                <option value="zoom-pan">Zoom + Pan</option>
                <option value="zoom-in">Slow Zoom In</option>
                <option value="zoom-out">Slow Zoom Out</option>
                <option value="pan-left">Pan Left</option>
                <option value="pan-right">Pan Right</option>
              </select>
            </div>
          </div>

          {/* 3. Apply Options */}
          <div className="p-3 rounded bg-[#0c0e13] border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Apply Options</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'applyToImages' as const, label: 'Apply to all images', icon: Film },
                { key: 'applyToVisualClips' as const, label: 'Apply to all visual clips', icon: Film },
                { key: 'applyTransitions' as const, label: 'Apply transitions', icon: Repeat },
                { key: 'applyCaptions' as const, label: 'Apply caption styling', icon: Subtitles },
                { key: 'applyVisualEffects' as const, label: 'Apply visual effects', icon: Sparkles },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 p-1.5 rounded bg-[#141720] border border-white/[0.06] hover:border-white/20 cursor-pointer text-[11px] text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={options[opt.key]}
                    onChange={(e) => onUpdateOptions({ [opt.key]: e.target.checked })}
                    className="accent-blue-500 rounded"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Offer Caption Generation if Captions Do Not Exist */}
          {!hasCaptions && options.applyCaptions && (
            <div className="p-3 rounded bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2 text-[11px] text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">No captions on timeline yet</div>
                  <div className="text-[10px] text-amber-300/80">
                    Generate captions from your existing voiceover or approved script (speech timing is never invented).
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {hasVoiceover && (
                  <button
                    type="button"
                    onClick={onGenerateCaptionsFromVoice}
                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Mic className="w-3 h-3" />
                    <span>From Voiceover</span>
                  </button>
                )}
                {hasScript && (
                  <button
                    type="button"
                    onClick={onGenerateCaptionsFromScript}
                    className="px-2.5 py-1 rounded bg-[#1d222d] hover:bg-[#252b39] border border-white/15 text-slate-200 text-[10px] font-medium flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    <span>From Script</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 5. Re-Apply Conflict Protection (Preserve Manual Edits vs Replace) */}
          {hasPreviousAutoStyle && (
            <div className="p-3 rounded bg-[#0e1420] border border-blue-500/30 space-y-2">
              <div className="text-[11px] font-semibold text-blue-200">
                Previous Auto Style detected ({previousAutoStyleLabel})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-2 p-2 rounded bg-[#0c0e13] border border-white/10 cursor-pointer">
                  <input
                    type="radio"
                    name="autostyle-conflict"
                    checked={conflictMode === 'preserve-manual'}
                    onChange={() => onChangeConflictMode('preserve-manual')}
                    className="accent-blue-500"
                  />
                  <div>
                    <div className="font-medium text-white">Preserve Manual Edits</div>
                    <div className="text-[10px] text-slate-400">Keep manually tweaked clips untouched</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 rounded bg-[#0c0e13] border border-white/10 cursor-pointer">
                  <input
                    type="radio"
                    name="autostyle-conflict"
                    checked={conflictMode === 'replace-all'}
                    onChange={() => onChangeConflictMode('replace-all')}
                    className="accent-blue-500"
                  />
                  <div>
                    <div className="font-medium text-white">Replace Previous Styling</div>
                    <div className="text-[10px] text-slate-400">Restyle all selected visual clips cleanly</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions: Preview / Cancel / Apply */}
        <div className="px-4 py-3 bg-[#171b26] border-t border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isPreviewing ? (
              <button
                type="button"
                onClick={onStopPreview}
                className="px-3 py-1.5 rounded bg-amber-600/25 hover:bg-amber-600/35 border border-amber-500/50 text-amber-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Stop Preview</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPreview}
                className="px-3 py-1.5 rounded bg-[#1d222d] hover:bg-[#272e3d] border border-white/15 text-slate-100 text-xs font-semibold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-blue-400" />
                <span>Preview Style</span>
              </button>
            )}
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Undo checkpoint created on Apply
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded bg-transparent hover:bg-white/[0.06] border border-white/10 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Auto Style</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
