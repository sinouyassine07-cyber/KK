/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import {
  MousePointer2,
  Scissors,
  Magnet,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
} from 'lucide-react';
import type { MediaItem, TimelineClip, TimelineTrack } from '../../types';
import { ClipVisualContent } from './MediaWaveThumbnail';

export type TimelineTool = 'select' | 'razor';

interface TimelinePanelProps {
  heightPx: number;
  trackHeightPx: number;
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  currentTime: number;
  sequenceDuration: number;
  zoomPct: number;
  snapEnabled: boolean;
  timelineTool: TimelineTool;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onSeek: (timeSec: number) => void;
  onSelectClips: (ids: string[]) => void;
  onSelectTrack: (trackId: string) => void;
  onSetZoomPct: (zoom: number) => void;
  onSetTrackHeightPx: (h: number) => void;
  onToggleSnap: () => void;
  onSetTimelineTool: (tool: TimelineTool) => void;
  onSplitAtTime: (timeSec: number, specificClipId?: string, specificTrackId?: string) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleTrackFlag: (trackId: string, flag: 'hidden' | 'muted' | 'solo' | 'locked') => void;
  onStartClipDrag: (
    e: React.MouseEvent,
    clip: TimelineClip,
    track: TimelineTrack,
    mode: 'move' | 'trim-left' | 'trim-right',
    laneWidth: number
  ) => void;
  onDropMediaOnTrack: (mediaId: string, trackId: string, atTimeSec: number) => void;
  onDropFishOnTrack: (fishId: string, trackId: string, atTimeSec: number) => void;
}

function formatTimecode(sec: number): string {
  const safe = Math.max(0, sec);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const frames = Math.floor((safe - Math.floor(safe)) * 30);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export function TimelinePanel({
  heightPx,
  trackHeightPx,
  tracks,
  mediaItems,
  currentTime,
  sequenceDuration,
  zoomPct,
  snapEnabled,
  timelineTool,
  selectedClipIds,
  selectedTrackId,
  canUndo,
  canRedo,
  onSeek,
  onSelectClips,
  onSelectTrack,
  onSetZoomPct,
  onSetTrackHeightPx,
  onToggleSnap,
  onSetTimelineTool,
  onSplitAtTime,
  onDuplicateSelected,
  onDeleteSelected,
  onUndo,
  onRedo,
  onToggleTrackFlag,
  onStartClipDrag,
  onDropMediaOnTrack,
  onDropFishOnTrack,
}: TimelinePanelProps) {
  const [scrubbingRuler, setScrubbingRuler] = useState(false);
  const rulerRef = useRef<HTMLDivElement | null>(null);

  const laneMinWidth = Math.max(760, Math.round((960 * zoomPct) / 100));

  const rulerStepSec = sequenceDuration <= 20 ? 1 : sequenceDuration <= 60 ? 5 : sequenceDuration <= 180 ? 10 : 30;
  const ticks: number[] = [];
  for (let s = 0; s <= sequenceDuration; s += rulerStepSec) {
    ticks.push(s);
  }

  const handleRulerPointer = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(Number((ratio * sequenceDuration).toFixed(2)));
  };

  return (
    <section
      style={{ height: `${heightPx}px` }}
      className="bg-[#11131a] border-t border-white/[0.08] flex flex-col shrink-0 select-none"
    >
      {/* Timeline Control Toolbar */}
      <div className="h-9 bg-[#161922] border-b border-white/[0.07] px-3 flex items-center justify-between gap-3 shrink-0 text-xs">
        <div className="flex items-center gap-1.5">
          {/* Selection vs Razor Tool */}
          <div className="flex items-center bg-[#0c0e13] p-0.5 rounded border border-white/[0.08]">
            <button
              type="button"
              onClick={() => onSetTimelineTool('select')}
              title="Selection Tool (V)"
              className={`px-2 py-1 rounded-sm flex items-center gap-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                timelineTool === 'select' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span>Select</span>
            </button>
            <button
              type="button"
              onClick={() => onSetTimelineTool('razor')}
              title="Razor / Split Tool (C)"
              className={`px-2 py-1 rounded-sm flex items-center gap-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                timelineTool === 'razor' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Razor</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleSnap}
            title="Snap to Playhead & Clip Boundaries"
            className={`px-2 py-1 rounded border text-[11px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
              snapEnabled
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-transparent border-white/[0.08] text-slate-400 hover:text-white'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            type="button"
            onClick={() => onSplitAtTime(currentTime)}
            title="Split Clip at Playhead"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06]"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={selectedClipIds.length === 0}
            onClick={onDuplicateSelected}
            title="Duplicate Selected Clip"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={selectedClipIds.length === 0}
            onClick={onDeleteSelected}
            title="Delete Selected Clip (Del)"
            className="p-1.5 rounded text-slate-300 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Track Row Height Presets */}
          <div className="hidden md:flex items-center gap-1 bg-[#0c0e13] p-0.5 rounded border border-white/[0.08]" title="Track Row Height">
            {[
              { label: 'S', val: 36 },
              { label: 'M', val: 46 },
              { label: 'L', val: 62 },
            ].map((sz) => (
              <button
                key={sz.label}
                type="button"
                onClick={() => onSetTrackHeightPx(sz.val)}
                className={`px-1.5 py-0.5 rounded-sm font-mono text-[10px] transition-colors ${
                  trackHeightPx === sz.val ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>

          <span className="font-mono tabular-nums text-[11px] text-blue-300 bg-[#0c0e13] px-2.5 py-0.5 rounded border border-white/[0.08]">
            {formatTimecode(currentTime)} <span className="text-slate-500">/ {formatTimecode(sequenceDuration)}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSetZoomPct(Math.max(50, zoomPct - 25))}
              title="Zoom Out"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06]"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={50}
              max={600}
              step={10}
              value={zoomPct}
              onChange={(e) => onSetZoomPct(Number(e.target.value))}
              className="w-24 accent-blue-500"
            />
            <button
              type="button"
              onClick={() => onSetZoomPct(Math.min(600, zoomPct + 25))}
              title="Zoom In"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono tabular-nums text-slate-400 w-9 text-right">{zoomPct}%</span>
          </div>
        </div>
      </div>

      {/* Scrollable Multi-Track Grid */}
      <div className="flex-1 overflow-auto bg-[#0d0f15] relative">
        <div style={{ minWidth: `${laneMinWidth + 204}px` }} className="relative">
          {/* Sticky Time Ruler Row */}
          <div className="flex sticky top-0 z-30 bg-[#141720] border-b border-white/[0.08]">
            <div className="w-48 shrink-0 sticky left-0 z-40 bg-[#141720] border-e border-white/[0.08] px-3 h-6 flex items-center justify-between text-[10px] font-medium text-slate-400">
              <span>Tracks</span>
              <span className="font-mono tabular-nums">{tracks.length}</span>
            </div>

            <div
              ref={rulerRef}
              onMouseDown={(e) => {
                setScrubbingRuler(true);
                handleRulerPointer(e.clientX);
              }}
              onMouseMove={(e) => {
                if (scrubbingRuler) handleRulerPointer(e.clientX);
              }}
              onMouseUp={() => setScrubbingRuler(false)}
              onMouseLeave={() => setScrubbingRuler(false)}
              className="flex-1 h-6 relative cursor-ew-resize overflow-hidden"
            >
              {ticks.map((sec) => (
                <div
                  key={sec}
                  style={{ left: `${(sec / sequenceDuration) * 100}%` }}
                  className="absolute top-0 bottom-0 border-s border-white/15 pl-1 flex items-center pointer-events-none"
                >
                  <span className="text-[9px] font-mono tabular-nums text-slate-400">{sec}s</span>
                </div>
              ))}

              {/* Playhead Cap */}
              <div
                style={{ left: `${(currentTime / sequenceDuration) * 100}%` }}
                className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center"
              >
                <div className="w-2.5 h-3 bg-blue-500 rounded-b-sm shadow" />
              </div>
            </div>
          </div>

          {/* Track Lanes */}
          <div className="divide-y divide-white/[0.05]">
            {tracks.map((track) => {
              const isSelectedTrack = selectedTrackId === track.id;
              const isAudioTrack = track.type === 'audio';
              return (
                <div key={track.id} className="flex items-stretch group">
                  {/* Sticky Track Header */}
                  <div
                    onClick={() => onSelectTrack(track.id)}
                    style={{ height: `${trackHeightPx}px` }}
                    className={`w-48 shrink-0 sticky left-0 z-20 px-2.5 flex items-center justify-between border-e border-white/[0.08] cursor-pointer transition-colors ${
                      isSelectedTrack ? 'bg-[#1b2232]' : 'bg-[#141720] hover:bg-[#181b25]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-mono font-bold px-1 py-0.5 rounded-sm ${
                          track.type === 'audio'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : track.type === 'caption'
                            ? 'bg-amber-500/15 text-amber-300'
                            : track.type === 'text'
                            ? 'bg-violet-500/15 text-violet-300'
                            : 'bg-blue-500/15 text-blue-300'
                        }`}
                      >
                        {track.id.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-medium text-slate-200 truncate">
                        {track.name.replace(/^[VAT]\d:\s*/i, '')}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 text-slate-400 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!isAudioTrack && (
                        <button
                          type="button"
                          onClick={() => onToggleTrackFlag(track.id, 'hidden')}
                          title={track.hidden ? 'Show Track' : 'Hide Track'}
                          className={`p-1 rounded hover:text-white ${track.hidden ? 'text-amber-400' : ''}`}
                        >
                          {track.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                      {(isAudioTrack || track.type === 'video' || track.type === 'overlay') && (
                        <button
                          type="button"
                          onClick={() => onToggleTrackFlag(track.id, 'muted')}
                          title={track.muted ? 'Unmute Track' : 'Mute Track'}
                          className={`p-1 rounded hover:text-white ${track.muted ? 'text-red-400' : ''}`}
                        >
                          {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                      )}
                      {isAudioTrack && (
                        <button
                          type="button"
                          onClick={() => onToggleTrackFlag(track.id, 'solo')}
                          title={track.solo ? 'Unsolo Track' : 'Solo Track'}
                          className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                            track.solo ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          S
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleTrackFlag(track.id, 'locked')}
                        title={track.locked ? 'Unlock Track' : 'Lock Track'}
                        className={`p-1 rounded hover:text-white ${track.locked ? 'text-blue-400' : ''}`}
                      >
                        {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Track Lane */}
                  <div
                    onClick={(e) => {
                      onSelectTrack(track.id);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      onSeek(Number((ratio * sequenceDuration).toFixed(2)));
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const atSec = Number((ratio * sequenceDuration).toFixed(2));
                      const mediaId = e.dataTransfer.getData('application/x-media-id');
                      const fishId = e.dataTransfer.getData('application/x-fish-id');
                      if (mediaId) onDropMediaOnTrack(mediaId, track.id, atSec);
                      if (fishId) onDropFishOnTrack(fishId, track.id, atSec);
                    }}
                    style={{ height: `${trackHeightPx}px` }}
                    className={`flex-1 relative overflow-hidden ${
                      timelineTool === 'razor' ? 'cursor-crosshair' : 'cursor-pointer'
                    } ${isSelectedTrack ? 'bg-[#121622]' : 'bg-[#0e1118]'} ${track.hidden ? 'opacity-45' : ''}`}
                  >
                    {track.clips.map((clip) => {
                      const isSelected = selectedClipIds.includes(clip.id);
                      const media = mediaItems.find((m) => m.id === clip.sourceMediaId);
                      const baseColor =
                        track.type === 'audio'
                          ? 'bg-emerald-950/80 border-emerald-500/40'
                          : track.type === 'caption'
                          ? 'bg-amber-950/75 border-amber-500/40'
                          : track.type === 'text'
                          ? 'bg-violet-950/75 border-violet-500/40'
                          : 'bg-slate-800/90 border-blue-400/40';

                      return (
                        <div
                          key={clip.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (timelineTool === 'razor') {
                              const lane = e.currentTarget.parentElement;
                              if (!lane) return;
                              const rect = lane.getBoundingClientRect();
                              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                              const splitSec = Number((ratio * sequenceDuration).toFixed(2));
                              onSplitAtTime(splitSec, clip.id, track.id);
                              return;
                            }

                            if (e.shiftKey || e.metaKey || e.ctrlKey) {
                              const next = isSelected
                                ? selectedClipIds.filter((id) => id !== clip.id)
                                : [...selectedClipIds, clip.id];
                              onSelectClips(next);
                            } else if (!isSelected) {
                              onSelectClips([clip.id]);
                            }

                            if (track.locked) return;
                            const lane = e.currentTarget.parentElement;
                            if (!lane) return;
                            onStartClipDrag(e, clip, track, 'move', lane.getBoundingClientRect().width);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            left: `${(clip.startTime / sequenceDuration) * 100}%`,
                            width: `${Math.max(1.5, (clip.duration / sequenceDuration) * 100)}%`,
                          }}
                          className={`absolute top-1 bottom-1 rounded-sm border overflow-hidden flex items-center transition-shadow ${
                            timelineTool === 'razor' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
                          } ${baseColor} ${
                            isSelected ? 'ring-2 ring-blue-400 border-white z-10 shadow-md' : 'hover:border-white/50'
                          }`}
                        >
                          {/* Left Trim Handle */}
                          {!track.locked && timelineTool === 'select' && (
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onSelectClips([clip.id]);
                                const lane = e.currentTarget.parentElement?.parentElement;
                                if (!lane) return;
                                onStartClipDrag(e, clip, track, 'trim-left', lane.getBoundingClientRect().width);
                              }}
                              className="w-1.5 h-full cursor-ew-resize bg-white/15 hover:bg-blue-400 shrink-0 z-20"
                              title="Trim In"
                            />
                          )}

                          <div className="flex-1 h-full min-w-0">
                            <ClipVisualContent clip={clip} track={track} media={media} />
                          </div>

                          {/* Right Trim / Resize Handle */}
                          {!track.locked && timelineTool === 'select' && (
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onSelectClips([clip.id]);
                                const lane = e.currentTarget.parentElement?.parentElement;
                                if (!lane) return;
                                onStartClipDrag(e, clip, track, 'trim-right', lane.getBoundingClientRect().width);
                              }}
                              className="w-1.5 h-full cursor-ew-resize bg-white/15 hover:bg-blue-400 shrink-0 z-20"
                              title="Resize Duration"
                            />
                          )}
                        </div>
                      );
                    })}

                    {/* Playhead Line */}
                    <div
                      style={{ left: `${(currentTime / sequenceDuration) * 100}%` }}
                      className="absolute top-0 bottom-0 w-px bg-blue-400 pointer-events-none z-20"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
