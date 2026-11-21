/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Video,
  Music,
  Play,
  Pause,
  Plus,
  Upload,
  Trash2,
  Sparkles,
  Scissors,
  Subtitles,
  DownloadCloud,
  Maximize2,
  Minimize2,
  CheckCircle2,
  RefreshCcw,
  Download,
  Search,
  FolderOpen,
  Type,
  Filter,
  Repeat,
  Move,
  Wand2,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Redo2,
  Mic,
  AlertCircle,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Save,
  Film,
  Image as ImageIcon,
  Menu,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import type {
  AutoStyleId,
  AutoStyleOptions,
  CaptionGroupingMode,
  CaptionItem,
  CaptionStyle,
  CustomCaptionPreset,
  EditorWorkspaceState,
  ExportJob,
  GenerationRecord,
  MediaItem,
  MotionPreset,
  Project,
  StyleIntensity,
  TimelineClip,
  TimelineTrack,
  TransitionType,
  WorkspacePreset,
} from '../types';
import { api } from '../lib/api';
import { CaptionDesignerPanel } from './editor/CaptionDesignerPanel';
import { AutoStyleModal } from './editor/AutoStyleModal';
import { TimelinePanel, type TimelineTool } from './editor/TimelinePanel';
import { DEFAULT_CAPTION_STYLE, FONT_LIBRARY, VIDEO_FILTER_PRESETS } from '../lib/captionPresets';
import {
  AUTO_STYLE_PRESETS,
  DEFAULT_AUTO_STYLE_OPTIONS,
  computeAutoStyleResult,
} from '../lib/autoStyleEngine';
import {
  computeCaptionLiveVisuals,
  computeCaptionWordStates,
  ensureCaptionWords,
  getVideoClipCssFilter,
  mergeNextCaptionCue,
  regroupCaptions,
  splitCaptionCue,
} from '../lib/captionEngine';

interface VideoEditorViewProps {
  currentProject: Project | null;
  history: GenerationRecord[];
  onUpdateProject: (patch: Partial<Project>) => Promise<void>;
  onOpenVoiceStudio: () => void;
  appSidebarOpen?: boolean;
  onToggleAppSidebar?: () => void;
}

type LeftTool = 'media' | 'text' | 'filters' | 'transitions' | 'motion' | 'audio' | 'effects' | 'export';

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'v1', type: 'video', name: 'V1: Main Video', clips: [] },
  { id: 'v2', type: 'overlay', name: 'V2: Overlay Video', clips: [] },
  { id: 'v3', type: 'video', name: 'V3: Images & Graphics', clips: [] },
  { id: 'a1', type: 'audio', name: 'A1: Voiceover', clips: [] },
  { id: 'a2', type: 'audio', name: 'A2: Music', clips: [] },
  { id: 'a3', type: 'audio', name: 'A3: Sound Effects', clips: [] },
  { id: 't1', type: 'caption', name: 'T1: Captions', clips: [] },
  { id: 't2', type: 'text', name: 'T2: Titles & Text', clips: [] },
];

function mergeDefaultTracks(existing?: TimelineTrack[]): TimelineTrack[] {
  if (!existing || existing.length === 0) return DEFAULT_TRACKS.map((t) => ({ ...t, clips: [] }));
  const map = new Map(existing.map((t) => [t.id, t]));
  return DEFAULT_TRACKS.map((def) => map.get(def.id) || { ...def, clips: [] });
}

function formatTimecode(sec: number, fps = 30): string {
  const safe = Math.max(0, sec);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const frames = Math.floor((safe - Math.floor(safe)) * fps);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dbToGain(db: number): number {
  if (db <= -59) return 0;
  return Math.min(1, Math.max(0, Math.pow(10, db / 20)));
}

interface AudioClipPlayerProps {
  clip: TimelineClip;
  src: string;
  currentTime: number;
  isPlaying: boolean;
  trackMuted: boolean;
}

function AudioClipPlayer({ clip, src, currentTime, isPlaying, trackMuted }: AudioClipPlayerProps) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const localTime = Math.max(0, (currentTime - clip.startTime) * (clip.speed || 1) + (clip.trimStart || 0));
    const elapsed = Math.max(0, currentTime - clip.startTime);
    const remaining = Math.max(0, clip.startTime + clip.duration - currentTime);
    let fadeMult = 1;
    if (clip.fadeIn && clip.fadeIn > 0 && elapsed < clip.fadeIn) {
      fadeMult = Math.min(fadeMult, elapsed / clip.fadeIn);
    }
    if (clip.fadeOut && clip.fadeOut > 0 && remaining < clip.fadeOut) {
      fadeMult = Math.min(fadeMult, remaining / clip.fadeOut);
    }

    el.muted = trackMuted;
    el.volume = Math.max(0, Math.min(1, dbToGain(clip.volume ?? 0) * fadeMult));
    el.playbackRate = Math.max(0.25, Math.min(4, clip.speed || 1));

    if (Math.abs(el.currentTime - localTime) > 0.35) {
      el.currentTime = localTime;
    }

    if (isPlaying && !trackMuted) {
      if (el.paused) {
        void el.play().catch(() => undefined);
      }
    } else if (!el.paused) {
      el.pause();
    }
  }, [clip.startTime, clip.duration, clip.trimStart, clip.volume, clip.speed, clip.fadeIn, clip.fadeOut, currentTime, isPlaying, trackMuted, src]);

  return <audio ref={ref} src={src} preload="auto" className="hidden" />;
}

interface VideoClipLayerProps {
  clip: TimelineClip;
  src: string;
  currentTime: number;
  isPlaying: boolean;
  trackMuted: boolean;
  style: React.CSSProperties;
}

function VideoClipLayer({ clip, src, currentTime, isPlaying, trackMuted, style }: VideoClipLayerProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const localTime = Math.max(0, (currentTime - clip.startTime) * (clip.speed || 1) + (clip.trimStart || 0));
    el.muted = trackMuted || (clip.volume ?? 0) <= -59;
    el.volume = dbToGain(clip.volume ?? 0);
    el.playbackRate = Math.max(0.25, Math.min(4, clip.speed || 1));

    if (Math.abs(el.currentTime - localTime) > 0.35) {
      el.currentTime = localTime;
    }

    if (isPlaying) {
      if (el.paused) {
        void el.play().catch(() => undefined);
      }
    } else if (!el.paused) {
      el.pause();
    }
  }, [clip.startTime, clip.trimStart, clip.volume, clip.speed, currentTime, isPlaying, trackMuted, src]);

  return (
    <video
      ref={ref}
      src={src}
      playsInline
      preload="auto"
      style={style}
      className="max-h-full max-w-full object-contain pointer-events-none"
    />
  );
}

interface HistorySnapshot {
  tracks: TimelineTrack[];
  captions: CaptionItem[];
  captionStyle?: CaptionStyle;
}

export function VideoEditorView({
  currentProject,
  history,
  onUpdateProject,
  onOpenVoiceStudio,
  appSidebarOpen = false,
  onToggleAppSidebar,
}: VideoEditorViewProps) {
  const defaultTimelineH = typeof window !== 'undefined' && window.innerHeight < 820 ? 220 : 270;
  const [activeTool, setActiveTool] = useState<LeftTool>('media');
  const [activePreset, setActivePreset] = useState<WorkspacePreset>(
    () => currentProject?.workspaceState?.activePreset ?? 'editing'
  );
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(() => currentProject?.workspaceState?.leftPanelOpen ?? true);
  const [captionDesignerOpen, setCaptionDesignerOpen] = useState<boolean>(
    () => currentProject?.workspaceState?.captionDesignerOpen ?? currentProject?.workspaceState?.rightPanelOpen ?? true
  );
  const [leftDrawerWidth, setLeftDrawerWidth] = useState<number>(
    () => currentProject?.workspaceState?.leftDrawerWidth ?? 288
  );
  const [captionDesignerWidth, setCaptionDesignerWidth] = useState<number>(
    () => currentProject?.workspaceState?.captionDesignerWidth ?? currentProject?.workspaceState?.inspectorWidth ?? 360
  );
  const [timelineHeight, setTimelineHeight] = useState<number>(
    () => currentProject?.workspaceState?.timelineHeight ?? defaultTimelineH
  );
  const [trackHeightPx, setTrackHeightPx] = useState<number>(
    () => currentProject?.workspaceState?.trackHeightPx ?? 46
  );
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [sequenceSettingsOpen, setSequenceSettingsOpen] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<'full' | 'half' | 'draft'>(
    () => currentProject?.workspaceState?.previewQuality ?? 'full'
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [previewMediaItem, setPreviewMediaItem] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>('v1');
  const [zoomPct, setZoomPct] = useState<number>(() => currentProject?.workspaceState?.zoomPct ?? 120);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [timelineTool, setTimelineTool] = useState<TimelineTool>('select');

  // Optimistic local state synced from project
  const [tracks, setTracks] = useState<TimelineTrack[]>(() => mergeDefaultTracks(currentProject?.timeline?.tracks));
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => currentProject?.mediaItems || []);
  const [captions, setCaptions] = useState<CaptionItem[]>(() => currentProject?.captions || []);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(() => ({
    ...DEFAULT_CAPTION_STYLE,
    ...(currentProject?.captionStyle || {}),
  }));
  const [exportSettings, setExportSettings] = useState(() => ({
    resolution: currentProject?.exportSettings?.resolution || '1080p',
    aspectRatio: (currentProject?.exportSettings?.aspectRatio as '16:9' | '9:16' | '1:1') || '16:9',
    fps: currentProject?.exportSettings?.fps || 30,
    quality: currentProject?.exportSettings?.quality || 'high',
    burnCaptions: currentProject?.exportSettings?.burnCaptions ?? true,
  }));

  // Undo / Redo
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Export state
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderResult, setRenderResult] = useState<ExportJob | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Caption Designer custom presets & audio alignment state
  const [customPresets, setCustomPresets] = useState<CustomCaptionPreset[]>([]);
  const [isAligningCaptions, setIsAligningCaptions] = useState(false);
  const [alignStatusMessage, setAlignStatusMessage] = useState<string | null>(null);

  // Auto Style modal & non-destructive preview sandbox state
  const [autoStyleModalOpen, setAutoStyleModalOpen] = useState(false);
  const [autoStyleSelectedId, setAutoStyleSelectedId] = useState<AutoStyleId>(
    () => currentProject?.lastAutoStyle?.styleId || 'cinematic'
  );
  const [autoStyleIntensity, setAutoStyleIntensity] = useState<StyleIntensity>(
    () => currentProject?.lastAutoStyle?.intensity || 'balanced'
  );
  const [autoStyleOptions, setAutoStyleOptions] = useState<AutoStyleOptions>(DEFAULT_AUTO_STYLE_OPTIONS);
  const [autoStyleConflictMode, setAutoStyleConflictMode] = useState<'replace-all' | 'preserve-manual'>(() =>
    currentProject?.lastAutoStyle ? 'preserve-manual' : 'replace-all'
  );
  const [isPreviewingAutoStyle, setIsPreviewingAutoStyle] = useState(false);
  const [autoStyleNotice, setAutoStyleNotice] = useState<string | null>(null);

  // Timeline drag-to-move/trim state
  const [dragState, setDragState] = useState<{
    clipId: string;
    trackId: string;
    mode: 'move' | 'trim-left' | 'trim-right';
    startClientX: number;
    origStart: number;
    origDuration: number;
    origTrimStart: number;
    laneWidth: number;
  } | null>(null);

  // Resizable splitter drag states
  const [resizingTimeline, setResizingTimeline] = useState<{ startY: number; startHeight: number } | null>(null);
  const [resizingLeft, setResizingLeft] = useState<{ startX: number; startWidth: number } | null>(null);
  const [resizingRight, setResizingRight] = useState<{ startX: number; startWidth: number } | null>(null);

  // Canvas overlay drag state
  const [canvasDrag, setCanvasDrag] = useState<{
    clipId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    boxW: number;
    boxH: number;
  } | null>(null);

  const monitorRef = useRef<HTMLDivElement | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const saveDebounceRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  isPlayingRef.current = isPlaying;
  currentTimeRef.current = currentTime;

  // Sync from incoming project
  useEffect(() => {
    setTracks(mergeDefaultTracks(currentProject?.timeline?.tracks));
    setMediaItems(currentProject?.mediaItems || []);
    setCaptions(currentProject?.captions || []);
    setCaptionStyle({
      ...DEFAULT_CAPTION_STYLE,
      ...(currentProject?.captionStyle || {}),
    });
    if (currentProject?.exportSettings) {
      setExportSettings({
        resolution: currentProject.exportSettings.resolution || '1080p',
        aspectRatio: (currentProject.exportSettings.aspectRatio as '16:9' | '9:16' | '1:1') || '16:9',
        fps: currentProject.exportSettings.fps || 30,
        quality: currentProject.exportSettings.quality || 'high',
        burnCaptions: currentProject.exportSettings.burnCaptions ?? true,
      });
    }
    if (currentProject?.workspaceState) {
      if (currentProject.workspaceState.activePreset) {
        setActivePreset(currentProject.workspaceState.activePreset);
      }
      if (typeof currentProject.workspaceState.timelineHeight === 'number') {
        setTimelineHeight(currentProject.workspaceState.timelineHeight);
      }
      if (typeof currentProject.workspaceState.leftPanelOpen === 'boolean') {
        setLeftPanelOpen(currentProject.workspaceState.leftPanelOpen);
      }
      if (typeof currentProject.workspaceState.captionDesignerOpen === 'boolean') {
        setCaptionDesignerOpen(currentProject.workspaceState.captionDesignerOpen);
      } else if (typeof currentProject.workspaceState.rightPanelOpen === 'boolean') {
        setCaptionDesignerOpen(currentProject.workspaceState.rightPanelOpen);
      }
      if (typeof currentProject.workspaceState.leftDrawerWidth === 'number') {
        setLeftDrawerWidth(currentProject.workspaceState.leftDrawerWidth);
      }
      if (typeof currentProject.workspaceState.captionDesignerWidth === 'number') {
        setCaptionDesignerWidth(currentProject.workspaceState.captionDesignerWidth);
      } else if (typeof currentProject.workspaceState.inspectorWidth === 'number') {
        setCaptionDesignerWidth(Math.max(310, currentProject.workspaceState.inspectorWidth));
      }
      if (typeof currentProject.workspaceState.trackHeightPx === 'number') {
        setTrackHeightPx(currentProject.workspaceState.trackHeightPx);
      }
      if (typeof currentProject.workspaceState.zoomPct === 'number') {
        setZoomPct(currentProject.workspaceState.zoomPct);
      }
      if (currentProject.workspaceState.previewQuality) {
        setPreviewQuality(currentProject.workspaceState.previewQuality);
      }
    }
    if (currentProject?.exportHistory?.[0] && !isRendering) {
      setRenderResult(currentProject.exportHistory[0]);
    }
    if (currentProject?.lastAutoStyle) {
      setAutoStyleSelectedId(currentProject.lastAutoStyle.styleId);
      setAutoStyleIntensity(currentProject.lastAutoStyle.intensity);
      setAutoStyleConflictMode('preserve-manual');
    } else {
      setAutoStyleConflictMode('replace-all');
    }
    setIsPreviewingAutoStyle(false);
  }, [currentProject?.id, currentProject?.updatedAt]);

  useEffect(() => {
    void api
      .getPreferences()
      .then((prefs) => {
        if (Array.isArray(prefs.customCaptionPresets)) {
          setCustomPresets(prefs.customCaptionPresets);
          if (!currentProject?.captionStyle?.presetId) {
            const def = prefs.customCaptionPresets.find((p) => p.isDefault);
            if (def) {
              setCaptionStyle({ ...DEFAULT_CAPTION_STYLE, ...def.style, presetId: def.id, presetName: def.name });
            }
          }
        }
      })
      .catch(() => undefined);
    return () => {
      if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, []);

  const sequenceDuration = useMemo(() => {
    let maxEnd = 0;
    for (const tr of tracks) {
      for (const cl of tr.clips) {
        maxEnd = Math.max(maxEnd, cl.startTime + cl.duration);
      }
    }
    for (const cap of captions) {
      maxEnd = Math.max(maxEnd, cap.endMs / 1000);
    }
    return Math.max(30, Math.ceil(maxEnd + 3));
  }, [tracks, captions]);

  const durationRef = useRef(sequenceDuration);
  durationRef.current = sequenceDuration;

  const persistPatch = useCallback(
    (patch: Partial<Project>, immediate = false) => {
      if (saveDebounceRef.current) {
        window.clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
      setSaveStatus('saving');
      const runSave = () => {
        void onUpdateProject(patch)
          .then(() => setSaveStatus('saved'))
          .catch((err) => {
            setSaveStatus('saved');
            setEditorError(err instanceof Error ? err.message : 'Failed to save project.');
          });
      };
      if (immediate) {
        runSave();
      } else {
        saveDebounceRef.current = window.setTimeout(runSave, 300);
      }
    },
    [onUpdateProject]
  );

  const pushUndo = useCallback(
    (snapshot?: HistorySnapshot) => {
      const snap = snapshot || {
        tracks: structuredClone(tracks),
        captions: structuredClone(captions),
        captionStyle: structuredClone(captionStyle),
      };
      setUndoStack((prev) => [...prev.slice(-29), snap]);
      setRedoStack([]);
    },
    [tracks, captions, captionStyle]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevSnap = undoStack[undoStack.length - 1];
    const currentSnap: HistorySnapshot = {
      tracks: structuredClone(tracks),
      captions: structuredClone(captions),
      captionStyle: structuredClone(captionStyle),
    };
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, currentSnap]);
    setTracks(prevSnap.tracks);
    setCaptions(prevSnap.captions);
    if (prevSnap.captionStyle) {
      setCaptionStyle(prevSnap.captionStyle);
    }
    setAutoStyleNotice(null);
    persistPatch(
      {
        timeline: { tracks: prevSnap.tracks },
        captions: prevSnap.captions,
        ...(prevSnap.captionStyle ? { captionStyle: prevSnap.captionStyle } : {}),
      },
      true
    );
  }, [undoStack, tracks, captions, captionStyle, persistPatch]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextSnap = redoStack[redoStack.length - 1];
    const currentSnap: HistorySnapshot = {
      tracks: structuredClone(tracks),
      captions: structuredClone(captions),
      captionStyle: structuredClone(captionStyle),
    };
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, currentSnap]);
    setTracks(nextSnap.tracks);
    setCaptions(nextSnap.captions);
    if (nextSnap.captionStyle) {
      setCaptionStyle(nextSnap.captionStyle);
    }
    persistPatch(
      {
        timeline: { tracks: nextSnap.tracks },
        captions: nextSnap.captions,
        ...(nextSnap.captionStyle ? { captionStyle: nextSnap.captionStyle } : {}),
      },
      true
    );
  }, [redoStack, tracks, captions, captionStyle, persistPatch]);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      return;
    }

    let lastTimestamp = performance.now();
    const tick = (now: number) => {
      if (!isPlayingRef.current) return;
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;
      const next = currentTimeRef.current + deltaSec;
      if (next >= durationRef.current) {
        currentTimeRef.current = 0;
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }
      currentTimeRef.current = next;
      setCurrentTime(next);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [isPlaying]);

  // Snap helper for timeline boundaries & playhead
  const snapTime = useCallback(
    (candidateSec: number, excludeClipId: string) => {
      if (!snapEnabled) return candidateSec;
      const thresholdSec = Math.max(0.2, 0.45 * (100 / Math.max(50, zoomPct)));
      const anchors: number[] = [0, currentTimeRef.current];
      for (const tr of tracks) {
        for (const cl of tr.clips) {
          if (cl.id === excludeClipId) continue;
          anchors.push(cl.startTime, cl.startTime + cl.duration);
        }
      }
      let best = candidateSec;
      let minDist = thresholdSec;
      for (const a of anchors) {
        const d = Math.abs(candidateSec - a);
        if (d < minDist) {
          minDist = d;
          best = a;
        }
      }
      return best;
    },
    [snapEnabled, zoomPct, tracks]
  );

  // Global mouse move/up for clip dragging/trimming
  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startClientX;
      const dt = (dx / Math.max(200, dragState.laneWidth)) * sequenceDuration;
      setTracks((prev) =>
        prev.map((tr) => {
          if (tr.id !== dragState.trackId) return tr;
          return {
            ...tr,
            clips: tr.clips.map((c) => {
              if (c.id !== dragState.clipId) return c;
              if (dragState.mode === 'move') {
                const rawStart = Math.max(0, dragState.origStart + dt);
                const snappedStart = snapTime(rawStart, c.id);
                return { ...c, startTime: Number(snappedStart.toFixed(2)) };
              }
              if (dragState.mode === 'trim-right') {
                const rawEnd = Math.max(dragState.origStart + 0.3, dragState.origStart + dragState.origDuration + dt);
                const snappedEnd = snapTime(rawEnd, c.id);
                return { ...c, duration: Math.max(0.3, Number((snappedEnd - c.startTime).toFixed(2))) };
              }
              // trim-left
              const maxStart = dragState.origStart + dragState.origDuration - 0.3;
              const rawStart = Math.max(0, Math.min(maxStart, dragState.origStart + dt));
              const snappedStart = Math.min(maxStart, snapTime(rawStart, c.id));
              const shift = snappedStart - dragState.origStart;
              return {
                ...c,
                startTime: Number(snappedStart.toFixed(2)),
                duration: Math.max(0.3, Number((dragState.origDuration - shift).toFixed(2))),
                trimStart: Math.max(0, Number((dragState.origTrimStart + shift).toFixed(2))),
              };
            }),
          };
        })
      );
    };
    const onUp = () => {
      setDragState(null);
      setTracks((latest) => {
        const t1Clips = latest.find((t) => t.id === 't1')?.clips || [];
        if (t1Clips.length > 0 && captions.length > 0) {
          const syncedCaptions = captions.map((cap) => {
            const matched = t1Clips.find((cl) => cl.captionId === cap.id);
            if (!matched) return cap;
            const newStartMs = Math.round(matched.startTime * 1000);
            const newEndMs = Math.round((matched.startTime + matched.duration) * 1000);
            const deltaMs = newStartMs - cap.startMs;
            const updatedWords = Array.isArray(cap.words)
              ? cap.words.map((w) => ({ ...w, startMs: w.startMs + deltaMs, endMs: w.endMs + deltaMs }))
              : cap.words;
            return { ...cap, startMs: newStartMs, endMs: newEndMs, words: updatedWords };
          });
          setCaptions(syncedCaptions);
          persistPatch({ timeline: { tracks: latest }, captions: syncedCaptions }, true);
        } else {
          persistPatch({ timeline: { tracks: latest } }, true);
        }
        return latest;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState, sequenceDuration, snapTime, persistPatch, captions]);

  // Resizable splitter between preview and timeline
  useEffect(() => {
    if (!resizingTimeline) return;
    const maxTimelineH = Math.max(460, Math.round(window.innerHeight * 0.68));
    const onMove = (e: MouseEvent) => {
      const dy = resizingTimeline.startY - e.clientY;
      const nextH = Math.max(150, Math.min(maxTimelineH, resizingTimeline.startHeight + dy));
      setTimelineHeight(nextH);
    };
    const onUp = () => {
      setResizingTimeline(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingTimeline]);

  // Resizable horizontal splitters (left drawer & right caption designer)
  useEffect(() => {
    if (!resizingLeft) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizingLeft.startX;
      setLeftDrawerWidth(Math.max(220, Math.min(440, resizingLeft.startWidth + dx)));
    };
    const onUp = () => setResizingLeft(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingLeft]);

  useEffect(() => {
    if (!resizingRight) return;
    const onMove = (e: MouseEvent) => {
      const dx = resizingRight.startX - e.clientX;
      setCaptionDesignerWidth(Math.max(310, Math.min(480, resizingRight.startWidth + dx)));
    };
    const onUp = () => setResizingRight(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingRight]);

  // Canvas direct position drag
  useEffect(() => {
    if (!canvasDrag) return;
    const onMove = (e: MouseEvent) => {
      const dxPct = ((e.clientX - canvasDrag.startX) / Math.max(100, canvasDrag.boxW)) * 100;
      const dyPct = ((e.clientY - canvasDrag.startY) / Math.max(100, canvasDrag.boxH)) * 100;
      const nextX = Math.round(canvasDrag.origX + dxPct);
      const nextY = Math.round(canvasDrag.origY + dyPct);
      setTracks((prev) =>
        prev.map((tr) => ({
          ...tr,
          clips: tr.clips.map((c) => (c.id === canvasDrag.clipId ? { ...c, x: nextX, y: nextY } : c)),
        }))
      );
    };
    const onUp = () => {
      setCanvasDrag(null);
      setTracks((latest) => {
        persistPatch({ timeline: { tracks: latest } }, true);
        return latest;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [canvasDrag, persistPatch]);

  const primarySelectedClipId = selectedClipIds[0] || null;

  const selectedClipInfo = useMemo(() => {
    if (!primarySelectedClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === primarySelectedClipId);
      if (clip) return { track, clip };
    }
    return null;
  }, [tracks, primarySelectedClipId]);

  const selectedCaption = useMemo(() => {
    if (!selectedClipInfo || selectedClipInfo.track.id !== 't1' || !selectedClipInfo.clip.captionId) return null;
    return captions.find((c) => c.id === selectedClipInfo.clip.captionId) || null;
  }, [selectedClipInfo, captions]);

  // Non-destructive Auto Style computation for Preview & Apply
  const computedAutoStyle = useMemo(
    () =>
      computeAutoStyleResult({
        tracks,
        mediaItems,
        captionStyle,
        styleId: autoStyleSelectedId,
        intensity: autoStyleIntensity,
        options: autoStyleOptions,
        conflictMode: currentProject?.lastAutoStyle ? autoStyleConflictMode : 'replace-all',
      }),
    [
      tracks,
      mediaItems,
      captionStyle,
      autoStyleSelectedId,
      autoStyleIntensity,
      autoStyleOptions,
      autoStyleConflictMode,
      currentProject?.lastAutoStyle,
    ]
  );

  const displayTracks = isPreviewingAutoStyle ? computedAutoStyle.nextTracks : tracks;
  const displayCaptionStyle = isPreviewingAutoStyle ? computedAutoStyle.nextCaptionStyle : captionStyle;

  // Active Visual Layers (V1 -> V3 -> V2)
  const activeVisualLayers = useMemo(() => {
    const order = ['v1', 'v3', 'v2'];
    const layers: Array<{ clip: TimelineClip; media: MediaItem; trackMuted: boolean }> = [];
    for (const id of order) {
      const track = displayTracks.find((t) => t.id === id);
      if (!track || track.hidden) continue;
      for (const clip of track.clips) {
        if (clip.startTime <= currentTime && clip.startTime + clip.duration > currentTime) {
          const media = mediaItems.find((m) => m.id === clip.sourceMediaId);
          if (media) {
            layers.push({ clip, media, trackMuted: Boolean(track.muted) });
          } else if (clip.sourceUrl) {
            layers.push({
              clip,
              media: {
                id: clip.sourceMediaId || clip.id,
                name: clip.title || 'Media',
                type: 'image',
                url: clip.sourceUrl,
                sizeBytes: 0,
                createdAt: '',
              },
              trackMuted: Boolean(track.muted),
            });
          }
        }
      }
    }
    return layers;
  }, [displayTracks, mediaItems, currentTime]);

  // Active Audio Clips (respecting Solo & Mute)
  const activeAudioClips = useMemo(() => {
    const audioTracks = displayTracks.filter((t) => t.id === 'a1' || t.id === 'a2' || t.id === 'a3');
    const hasSolo = audioTracks.some((t) => Boolean(t.solo));
    const list: Array<{ clip: TimelineClip; src: string; trackMuted: boolean }> = [];
    for (const track of audioTracks) {
      const effectiveMuted = Boolean(track.muted) || (hasSolo && !track.solo);
      for (const clip of track.clips) {
        if (clip.startTime <= currentTime && clip.startTime + clip.duration > currentTime) {
          const media = mediaItems.find((m) => m.id === clip.sourceMediaId);
          const src = clip.sourceUrl || media?.url || '';
          if (src) {
            list.push({ clip, src, trackMuted: effectiveMuted });
          }
        }
      }
    }
    return list;
  }, [displayTracks, mediaItems, currentTime]);

  const activeTextOverlays = useMemo(() => {
    const t2 = displayTracks.find((t) => t.id === 't2');
    if (!t2 || t2.hidden) return [];
    return t2.clips.filter((c) => c.startTime <= currentTime && c.startTime + c.duration > currentTime);
  }, [displayTracks, currentTime]);

  const activeCaption = useMemo(() => {
    const t1 = displayTracks.find((t) => t.id === 't1');
    if (t1?.hidden) return null;
    const ms = currentTime * 1000;
    return captions.find((c) => c.startMs <= ms && c.endMs >= ms) || null;
  }, [displayTracks, captions, currentTime]);

  // Real active effects count at current playhead
  const activeEffectsCount = useMemo(() => {
    let count = 0;
    for (const { clip } of activeVisualLayers) {
      if ((clip.brightness ?? 100) !== 100 || (clip.contrast ?? 100) !== 100 || (clip.saturation ?? 100) !== 100) count++;
      if ((clip.blur || 0) > 0) count++;
      if (clip.transition && clip.transition !== 'none') count++;
      if (clip.motionPreset && clip.motionPreset !== 'none') count++;
      if ((clip.cropTop || 0) + (clip.cropBottom || 0) + (clip.cropLeft || 0) + (clip.cropRight || 0) > 0) count++;
    }
    if (activeCaption) count++;
    count += activeTextOverlays.length;
    return count;
  }, [activeVisualLayers, activeCaption, activeTextOverlays]);

  // Operations
  const processUploadedFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);
    setEditorError(null);

    let nextMedia = [...mediaItems];
    let nextTracks = structuredClone(tracks);

    try {
      for (const file of files) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
          reader.readAsDataURL(file);
        });

        const newItem = await api.uploadMedia({
          name: file.name,
          dataBase64: base64,
        });

        nextMedia = [...nextMedia, newItem];
        const targetTrackId =
          newItem.type === 'video' || newItem.type === 'image'
            ? 'v1'
            : newItem.type === 'bgm'
            ? 'a2'
            : newItem.type === 'sfx'
            ? 'a3'
            : 'a1';

        nextTracks = nextTracks.map((track) => {
          if (track.id !== targetTrackId) return track;
          const lastClip = track.clips[track.clips.length - 1];
          const startTime = lastClip ? Number((lastClip.startTime + lastClip.duration).toFixed(2)) : 0;
          const dur = newItem.duration && newItem.duration > 0 ? newItem.duration : newItem.type === 'image' ? 5 : 10;
          return {
            ...track,
            clips: [
              ...track.clips,
              {
                id: crypto.randomUUID(),
                trackId: targetTrackId,
                startTime,
                duration: Number(dur.toFixed(2)),
                sourceMediaId: newItem.id,
                sourceUrl: newItem.url,
                title: newItem.name,
                volume: 0,
                scale: 100,
                opacity: 100,
              },
            ],
          };
        });
      }

      pushUndo();
      setMediaItems(nextMedia);
      setTracks(nextTracks);
      await onUpdateProject({
        mediaItems: nextMedia,
        timeline: { tracks: nextTracks },
      });
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Media upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length > 0) await processUploadedFiles(files);
  };

  const addMediaToTrack = (item: MediaItem, preferredTrackId?: string, atTime?: number) => {
    const targetTrackId =
      preferredTrackId ||
      (item.type === 'video' || item.type === 'image'
        ? 'v1'
        : item.type === 'bgm'
        ? 'a2'
        : item.type === 'sfx'
        ? 'a3'
        : 'a1');

    const targetTrack = tracks.find((t) => t.id === targetTrackId);
    if (targetTrack?.locked) {
      setEditorError(`Track "${targetTrack.name}" is locked.`);
      return;
    }

    pushUndo();
    const newClipId = crypto.randomUUID();
    const nextTracks = tracks.map((tr) => {
      if (tr.id !== targetTrackId) return tr;
      const lastClip = tr.clips[tr.clips.length - 1];
      const startTime = typeof atTime === 'number' ? atTime : lastClip ? Number((lastClip.startTime + lastClip.duration).toFixed(2)) : 0;
      const dur = item.duration && item.duration > 0 ? item.duration : item.type === 'image' ? 5 : 10;
      return {
        ...tr,
        clips: [
          ...tr.clips,
          {
            id: newClipId,
            trackId: targetTrackId,
            startTime: Math.max(0, startTime),
            duration: Number(dur.toFixed(2)),
            sourceMediaId: item.id,
            sourceUrl: item.url,
            title: item.name,
            volume: 0,
            scale: 100,
            opacity: 100,
          },
        ],
      };
    });

    setTracks(nextTracks);
    setSelectedClipIds([newClipId]);
    persistPatch({ timeline: { tracks: nextTracks } }, true);
  };

  const deleteMediaItem = (mediaId: string) => {
    pushUndo();
    const nextMedia = mediaItems.filter((m) => m.id !== mediaId);
    const nextTracks = tracks.map((tr) => ({
      ...tr,
      clips: tr.clips.filter((c) => c.sourceMediaId !== mediaId),
    }));
    if (previewMediaItem?.id === mediaId) setPreviewMediaItem(null);
    setMediaItems(nextMedia);
    setTracks(nextTracks);
    setSelectedClipIds([]);
    persistPatch({ mediaItems: nextMedia, timeline: { tracks: nextTracks } }, true);
  };

  const addFishAudioToTrack = (rec: GenerationRecord, targetTrackId = 'a1', atTime?: number) => {
    const targetTrack = tracks.find((t) => t.id === targetTrackId);
    if (targetTrack?.locked) {
      setEditorError(`Track "${targetTrack.name}" is locked.`);
      return;
    }
    pushUndo();
    const dur = rec.durationSeconds && rec.durationSeconds > 0 ? rec.durationSeconds : 10;
    const newClipId = crypto.randomUUID();
    const nextTracks = tracks.map((tr) => {
      if (tr.id !== targetTrackId) return tr;
      const lastClip = tr.clips[tr.clips.length - 1];
      const startTime = typeof atTime === 'number' ? atTime : lastClip ? Number((lastClip.startTime + lastClip.duration).toFixed(2)) : 0;
      return {
        ...tr,
        clips: [
          ...tr.clips,
          {
            id: newClipId,
            trackId: targetTrackId,
            startTime: Math.max(0, startTime),
            duration: Number(dur.toFixed(2)),
            sourceMediaId: `fish-${rec.id}`,
            sourceUrl: rec.audioUrl,
            title: `Voiceover: ${rec.voiceName}`,
            volume: 0,
          },
        ],
      };
    });
    setTracks(nextTracks);
    setSelectedClipIds([newClipId]);

    let nextCaptions = captions;
    if (captions.length === 0 && Array.isArray(rec.transcript) && rec.transcript.length > 0) {
      nextCaptions = rec.transcript.map((cue) => ({
        id: crypto.randomUUID(),
        startMs: cue.startMs,
        endMs: cue.endMs,
        text: cue.text,
        words: cue.words,
        wordSyncAvailable: cue.wordSyncAvailable,
      }));
      const captionClips: TimelineClip[] = nextCaptions.map((c) => ({
        id: crypto.randomUUID(),
        trackId: 't1',
        captionId: c.id,
        startTime: Number((c.startMs / 1000).toFixed(2)),
        duration: Math.max(0.3, Number(((c.endMs - c.startMs) / 1000).toFixed(2))),
        title: c.text,
      }));
      nextTracks.forEach((tr) => {
        if (tr.id === 't1') tr.clips = captionClips;
      });
      setCaptions(nextCaptions);
      setTracks([...nextTracks]);
    }

    persistPatch(
      {
        audioRecordId: rec.id,
        audioUrl: rec.audioUrl,
        timeline: { tracks: nextTracks },
        captions: nextCaptions,
      },
      true
    );
  };

  const addTextOverlayClip = (titleText: string, preset?: Partial<TimelineClip>) => {
    const t2 = tracks.find((t) => t.id === 't2');
    if (t2?.locked) {
      setEditorError('Track T2 is locked.');
      return;
    }
    pushUndo();
    const newClip: TimelineClip = {
      id: crypto.randomUUID(),
      trackId: 't2',
      startTime: Number(currentTime.toFixed(2)),
      duration: 4,
      title: titleText,
      x: 0,
      y: 0,
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 36,
      textColor: '#FFFFFF',
      bgColor: 'rgba(0,0,0,0.55)',
      outlineColor: '#000000',
      opacity: 100,
      ...preset,
    };
    const nextTracks = tracks.map((tr) => (tr.id === 't2' ? { ...tr, clips: [...tr.clips, newClip] } : tr));
    setTracks(nextTracks);
    setSelectedClipIds([newClip.id]);
    persistPatch({ timeline: { tracks: nextTracks } }, true);
  };

  const updateClipProps = (clipId: string, patch: Partial<TimelineClip>, immediate = false) => {
    const nextTracks = tracks.map((tr) => {
      if (tr.locked) return tr;
      return {
        ...tr,
        clips: tr.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
      };
    });
    setTracks(nextTracks);
    persistPatch({ timeline: { tracks: nextTracks } }, immediate);
  };

  const syncCaptionsAndTrack = useCallback(
    (nextCaptions: CaptionItem[], immediate = true) => {
      const captionClips: TimelineClip[] = nextCaptions.map((c) => ({
        id: crypto.randomUUID(),
        trackId: 't1',
        captionId: c.id,
        startTime: Number((c.startMs / 1000).toFixed(2)),
        duration: Math.max(0.25, Number(((c.endMs - c.startMs) / 1000).toFixed(2))),
        title: c.text,
      }));
      const nextTracks = tracks.map((tr) => (tr.id === 't1' ? { ...tr, clips: captionClips } : tr));
      setCaptions(nextCaptions);
      setTracks(nextTracks);
      persistPatch({ captions: nextCaptions, timeline: { tracks: nextTracks } }, immediate);
      return nextTracks;
    },
    [tracks, persistPatch]
  );

  const handleUpdateCaptionStyleOrCue = (patch: Partial<CaptionStyle>, immediate = false) => {
    if (selectedCaption) {
      // Update selected cue override while also keeping global grouping/safeZoneGuide synchronized
      const globalKeys: Array<keyof CaptionStyle> = ['safeZoneGuide', 'groupingMode', 'maxWordsPerLine', 'maxLines'];
      const globalPatch: Partial<CaptionStyle> = {};
      const cuePatch: Partial<CaptionStyle> = {};
      for (const [k, v] of Object.entries(patch) as Array<[keyof CaptionStyle, unknown]>) {
        if (globalKeys.includes(k)) {
          (globalPatch as Record<string, unknown>)[k] = v;
        } else {
          (cuePatch as Record<string, unknown>)[k] = v;
        }
      }
      const nextGlobal = { ...captionStyle, ...globalPatch };
      if (Object.keys(globalPatch).length > 0) setCaptionStyle(nextGlobal);

      if (Object.keys(cuePatch).length > 0) {
        const nextCaps = captions.map((c) =>
          c.id === selectedCaption.id
            ? { ...c, styleOverride: { ...(c.styleOverride || {}), ...cuePatch } }
            : c
        );
        setCaptions(nextCaps);
        persistPatch({ captions: nextCaps, captionStyle: nextGlobal }, immediate);
      } else {
        persistPatch({ captionStyle: nextGlobal }, immediate);
      }
      return;
    }

    const next = { ...captionStyle, ...patch };
    setCaptionStyle(next);
    persistPatch({ captionStyle: next }, immediate);
  };

  const handleApplyStyleToAll = (baseStyle?: CaptionStyle) => {
    const unified = baseStyle ? { ...captionStyle, ...baseStyle } : captionStyle;
    const clearedCaps = captions.map((c) => {
      if (!c.styleOverride) return c;
      const copy = { ...c };
      delete copy.styleOverride;
      return copy;
    });
    setCaptionStyle(unified);
    setCaptions(clearedCaps);
    persistPatch({ captionStyle: unified, captions: clearedCaps }, true);
  };

  const handleClearSelectedOverride = (captionId: string) => {
    const nextCaps = captions.map((c) => {
      if (c.id !== captionId) return c;
      const copy = { ...c };
      delete copy.styleOverride;
      return copy;
    });
    setCaptions(nextCaps);
    persistPatch({ captions: nextCaps }, true);
  };

  const handleUpdateCueTextAndTiming = (
    captionId: string,
    patch: { text?: string; startMs?: number; endMs?: number }
  ) => {
    const nextCaps = captions.map((c) => {
      if (c.id !== captionId) return c;
      const nextText = patch.text ?? c.text;
      const nextStart = patch.startMs ?? c.startMs;
      const nextEnd = Math.max(nextStart + 200, patch.endMs ?? c.endMs);
      let nextWords = c.words;
      if (patch.text !== undefined) {
        const rebuilt = ensureCaptionWords({ ...c, text: nextText, startMs: nextStart, endMs: nextEnd, words: undefined });
        nextWords = rebuilt.words;
      } else if (Array.isArray(c.words) && (patch.startMs !== undefined || patch.endMs !== undefined)) {
        const oldSpan = Math.max(1, c.endMs - c.startMs);
        const newSpan = Math.max(200, nextEnd - nextStart);
        nextWords = c.words.map((w) => ({
          ...w,
          startMs: Math.round(nextStart + ((w.startMs - c.startMs) / oldSpan) * newSpan),
          endMs: Math.round(nextStart + ((w.endMs - c.startMs) / oldSpan) * newSpan),
        }));
      }
      return { ...c, text: nextText, startMs: nextStart, endMs: nextEnd, words: nextWords };
    });

    const nextTracks = tracks.map((tr) =>
      tr.id === 't1'
        ? {
            ...tr,
            clips: tr.clips.map((cl) => {
              if (cl.captionId !== captionId) return cl;
              const updated = nextCaps.find((nc) => nc.id === captionId);
              if (!updated) return cl;
              return {
                ...cl,
                title: updated.text,
                startTime: Number((updated.startMs / 1000).toFixed(2)),
                duration: Math.max(0.2, Number(((updated.endMs - updated.startMs) / 1000).toFixed(2))),
              };
            }),
          }
        : tr
    );
    setCaptions(nextCaps);
    setTracks(nextTracks);
    persistPatch({ captions: nextCaps, timeline: { tracks: nextTracks } });
  };

  const handleChangeGrouping = (mode: CaptionGroupingMode, maxWords?: number, maxLines?: number) => {
    const nextStyle = {
      ...captionStyle,
      groupingMode: mode,
      maxWordsPerLine: maxWords ?? captionStyle.maxWordsPerLine,
      maxLines: maxLines ?? captionStyle.maxLines,
    };
    setCaptionStyle(nextStyle);
    if (captions.length === 0 || mode === 'manual') {
      persistPatch({ captionStyle: nextStyle }, true);
      return;
    }
    pushUndo();
    const regrouped = regroupCaptions(
      captions,
      mode,
      nextStyle.maxWordsPerLine ?? 4,
      nextStyle.maxLines ?? 2
    );
    const captionClips: TimelineClip[] = regrouped.map((c) => ({
      id: crypto.randomUUID(),
      trackId: 't1',
      captionId: c.id,
      startTime: Number((c.startMs / 1000).toFixed(2)),
      duration: Math.max(0.25, Number(((c.endMs - c.startMs) / 1000).toFixed(2))),
      title: c.text,
    }));
    const nextTracks = tracks.map((tr) => (tr.id === 't1' ? { ...tr, clips: captionClips } : tr));
    setCaptions(regrouped);
    setTracks(nextTracks);
    setSelectedClipIds([]);
    persistPatch({ captionStyle: nextStyle, captions: regrouped, timeline: { tracks: nextTracks } }, true);
  };

  const handleSplitCaptionCue = (captionId: string) => {
    pushUndo();
    const nextCaps = splitCaptionCue(captions, captionId);
    syncCaptionsAndTrack(nextCaps, true);
  };

  const handleMergeNextCaptionCue = (captionId: string) => {
    pushUndo();
    const nextCaps = mergeNextCaptionCue(captions, captionId);
    syncCaptionsAndTrack(nextCaps, true);
  };

  const handleDeleteCaptionCue = (captionId: string) => {
    pushUndo();
    const nextCaps = captions.filter((c) => c.id !== captionId);
    syncCaptionsAndTrack(nextCaps, true);
    setSelectedClipIds([]);
  };

  const handleAlignFromAudio = async () => {
    setIsAligningCaptions(true);
    setAlignStatusMessage(null);
    setEditorError(null);
    try {
      const a1Clip = tracks.find((t) => t.id === 'a1')?.clips[0];
      const linkedRecord = history.find((h) => h.id === currentProject?.audioRecordId) || history[0];
      const resp = await api.alignCaptions({
        audioRecordId: currentProject?.audioRecordId || linkedRecord?.id || null,
        mediaUrl: a1Clip?.sourceUrl || currentProject?.audioUrl || null,
        scriptText: currentProject?.scriptText || linkedRecord?.text || captions.map((c) => c.text).join(' '),
        mode: 'auto',
      });

      const rawCues: CaptionItem[] = resp.cues.map((c) => ({
        id: crypto.randomUUID(),
        startMs: c.startMs,
        endMs: c.endMs,
        text: c.text,
        words: c.words,
        wordSyncAvailable: c.wordSyncAvailable ?? resp.wordSyncAvailable,
      }));
      const grouped =
        captionStyle.groupingMode && captionStyle.groupingMode !== 'manual'
          ? regroupCaptions(
              rawCues,
              captionStyle.groupingMode,
              captionStyle.maxWordsPerLine ?? 4,
              captionStyle.maxLines ?? 2
            )
          : rawCues;

      pushUndo();
      syncCaptionsAndTrack(grouped, true);
      setAlignStatusMessage(
        resp.wordSyncAvailable
          ? `Synced ${grouped.length} caption cues from audio (${resp.source}).`
          : resp.reason || 'Audio alignment unavailable — generated script timing without word-level audio sync.'
      );
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Speech alignment failed.');
    } finally {
      setIsAligningCaptions(false);
    }
  };

  const saveCustomPresetsList = async (next: CustomCaptionPreset[]) => {
    setCustomPresets(next);
    await api.updatePreferences({ customCaptionPresets: next });
  };

  const handleSaveCustomPreset = async (name: string) => {
    const eff = selectedCaption?.styleOverride ? { ...captionStyle, ...selectedCaption.styleOverride } : captionStyle;
    const item: CustomCaptionPreset = {
      id: `custom-${crypto.randomUUID().slice(0, 8)}`,
      name,
      category: 'Custom',
      style: { ...eff },
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...customPresets];
    await saveCustomPresetsList(next);
    handleUpdateCaptionStyleOrCue({ presetId: item.id, presetName: item.name }, true);
  };

  const handleRenameCustomPreset = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveCustomPresetsList(customPresets.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
  };

  const handleDuplicateCustomPreset = async (id: string) => {
    const src = customPresets.find((p) => p.id === id);
    if (!src) return;
    const copy: CustomCaptionPreset = {
      ...src,
      id: `custom-${crypto.randomUUID().slice(0, 8)}`,
      name: `${src.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    await saveCustomPresetsList([copy, ...customPresets]);
  };

  const handleDeleteCustomPreset = async (id: string) => {
    await saveCustomPresetsList(customPresets.filter((p) => p.id !== id));
  };

  const handleSetDefaultCustomPreset = async (id: string) => {
    await saveCustomPresetsList(customPresets.map((p) => ({ ...p, isDefault: p.id === id })));
  };

  const handleSplitAtTime = useCallback(
    (splitSec: number, specificClipId?: string, specificTrackId?: string) => {
      let targetClip: TimelineClip | undefined;
      let targetTrack: TimelineTrack | undefined;

      if (specificClipId && specificTrackId) {
        targetTrack = tracks.find((t) => t.id === specificTrackId);
        targetClip = targetTrack?.clips.find((c) => c.id === specificClipId);
      } else if (
        selectedClipInfo &&
        selectedClipInfo.clip.startTime < splitSec &&
        selectedClipInfo.clip.startTime + selectedClipInfo.clip.duration > splitSec
      ) {
        targetClip = selectedClipInfo.clip;
        targetTrack = selectedClipInfo.track;
      } else {
        for (const tr of tracks) {
          const hit = tr.clips.find((c) => c.startTime < splitSec && c.startTime + c.duration > splitSec);
          if (hit && !tr.locked) {
            targetClip = hit;
            targetTrack = tr;
            break;
          }
        }
      }

      if (!targetClip || !targetTrack) {
        setEditorError('Position the playhead inside a clip (or use Razor on a clip) to split.');
        return;
      }
      if (targetTrack.locked) {
        setEditorError(`Track "${targetTrack.name}" is locked.`);
        return;
      }

      const leftDur = Number((splitSec - targetClip.startTime).toFixed(2));
      const rightDur = Number((targetClip.duration - leftDur).toFixed(2));
      if (leftDur < 0.25 || rightDur < 0.25) {
        setEditorError('Split point is too close to the clip edge.');
        return;
      }

      pushUndo();
      const rightClip: TimelineClip = {
        ...targetClip,
        id: crypto.randomUUID(),
        startTime: Number(splitSec.toFixed(2)),
        duration: rightDur,
        trimStart: Number(((targetClip.trimStart || 0) + leftDur * (targetClip.speed || 1)).toFixed(2)),
      };

      const nextTracks = tracks.map((tr) => {
        if (tr.id !== targetTrack!.id) return tr;
        return {
          ...tr,
          clips: tr.clips.flatMap((c) => (c.id === targetClip!.id ? [{ ...c, duration: leftDur }, rightClip] : [c])),
        };
      });
      setTracks(nextTracks);
      setSelectedClipIds([rightClip.id]);
      persistPatch({ timeline: { tracks: nextTracks } }, true);
    },
    [tracks, selectedClipInfo, pushUndo, persistPatch]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedClipIds.length === 0) return;
    pushUndo();
    const deletedSet = new Set(selectedClipIds);
    const removedCaptionIds = new Set<string>();
    const nextTracks = tracks.map((tr) => {
      if (tr.locked) return tr;
      const kept: TimelineClip[] = [];
      for (const c of tr.clips) {
        if (deletedSet.has(c.id)) {
          if (c.captionId) removedCaptionIds.add(c.captionId);
        } else {
          kept.push(c);
        }
      }
      return { ...tr, clips: kept };
    });
    const nextCaptions =
      removedCaptionIds.size > 0 ? captions.filter((c) => !removedCaptionIds.has(c.id)) : captions;

    setTracks(nextTracks);
    setCaptions(nextCaptions);
    setSelectedClipIds([]);
    persistPatch({ timeline: { tracks: nextTracks }, captions: nextCaptions }, true);
  }, [selectedClipIds, tracks, captions, pushUndo, persistPatch]);

  const handleDuplicateSelected = useCallback(() => {
    if (!selectedClipInfo) return;
    if (selectedClipInfo.track.locked) {
      setEditorError(`Track "${selectedClipInfo.track.name}" is locked.`);
      return;
    }
    pushUndo();
    const dup: TimelineClip = {
      ...selectedClipInfo.clip,
      id: crypto.randomUUID(),
      startTime: Number((selectedClipInfo.clip.startTime + selectedClipInfo.clip.duration).toFixed(2)),
    };
    const nextTracks = tracks.map((tr) =>
      tr.id === selectedClipInfo.track.id ? { ...tr, clips: [...tr.clips, dup] } : tr
    );
    setTracks(nextTracks);
    setSelectedClipIds([dup.id]);
    persistPatch({ timeline: { tracks: nextTracks } }, true);
  }, [selectedClipInfo, tracks, pushUndo, persistPatch]);

  // Keyboard shortcuts (ignored when typing inside inputs)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, Number((t - 1 / (exportSettings.fps || 30)).toFixed(3))));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((t) => Math.min(sequenceDuration, Number((t + 1 / (exportSettings.fps || 30)).toFixed(3))));
      } else if (e.key.toLowerCase() === 'v') {
        setTimelineTool('select');
      } else if (e.key.toLowerCase() === 'c') {
        setTimelineTool('razor');
      } else if (e.key === 'Escape') {
        setPreviewMaximized(false);
        setSequenceSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDeleteSelected, exportSettings.fps, sequenceDuration]);

  const handleToggleTrackFlag = (trackId: string, flag: 'hidden' | 'muted' | 'solo' | 'locked') => {
    const nextTracks = tracks.map((tr) => (tr.id === trackId ? { ...tr, [flag]: !tr[flag] } : tr));
    setTracks(nextTracks);
    persistPatch({ timeline: { tracks: nextTracks } }, true);
  };

  const handleAutoArrange = () => {
    const visualItems = mediaItems.filter((m) => m.type === 'image' || m.type === 'video');
    if (visualItems.length === 0) {
      setEditorError('Import images or videos first to auto-arrange.');
      return;
    }
    pushUndo();
    let cursor = 0;
    const newClips: TimelineClip[] = visualItems.map((item) => {
      const dur = item.duration && item.duration > 0 ? item.duration : 5;
      const clip: TimelineClip = {
        id: crypto.randomUUID(),
        trackId: 'v1',
        startTime: Number(cursor.toFixed(2)),
        duration: Number(dur.toFixed(2)),
        sourceMediaId: item.id,
        sourceUrl: item.url,
        title: item.name,
        volume: 0,
        scale: 100,
        opacity: 100,
      };
      cursor += dur;
      return clip;
    });
    const nextTracks = tracks.map((tr) => (tr.id === 'v1' ? { ...tr, clips: newClips } : tr));
    setTracks(nextTracks);
    persistPatch({ timeline: { tracks: nextTracks } }, true);
  };

  // Caption generation modes: Voiceover transcript | Script | Word-level sync
  const handleGenerateCaptions = (genMode: 'voiceover' | 'script' | 'word-level') => {
    const linkedRecord = history.find((h) => h.id === currentProject?.audioRecordId) || history[0];
    const a1Clips = tracks.find((t) => t.id === 'a1')?.clips || [];
    const totalVoiceDurationMs =
      a1Clips.length > 0
        ? Math.max(3000, Math.round(a1Clips.reduce((acc, c) => Math.max(acc, c.startTime + c.duration), 0) * 1000))
        : linkedRecord?.durationSeconds
        ? Math.round(linkedRecord.durationSeconds * 1000)
        : 0;

    let newCaptions: CaptionItem[] = [];

    if (genMode === 'voiceover' && linkedRecord?.transcript && linkedRecord.transcript.length > 0) {
      newCaptions = linkedRecord.transcript.map((cue) => ({
        id: crypto.randomUUID(),
        startMs: cue.startMs,
        endMs: cue.endMs,
        text: cue.text,
        words: cue.words,
        wordSyncAvailable: cue.wordSyncAvailable,
      }));
    } else if (genMode === 'word-level') {
      const rawText =
        linkedRecord?.text ||
        currentProject?.scriptText ||
        'Welcome to AI Creator Studio professional video editing workspace.';
      const words = rawText.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += 3) {
        chunks.push(words.slice(i, i + 3).join(' '));
      }
      const totalMs = totalVoiceDurationMs > 0 ? totalVoiceDurationMs : Math.max(3000, chunks.length * 1100);
      const perChunk = Math.max(450, Math.round(totalMs / Math.max(1, chunks.length)));
      newCaptions = chunks.map((txt, idx) => ({
        id: crypto.randomUUID(),
        startMs: idx * perChunk,
        endMs: (idx + 1) * perChunk,
        text: txt,
        wordSyncAvailable: false,
      }));
    } else {
      const text = currentProject?.scriptText || linkedRecord?.text || 'Welcome to AI Creator Studio.';
      const sentences = text
        .split(/(?<=[.?!؟۔])\s+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (totalVoiceDurationMs > 0 && sentences.length > 0) {
        const totalChars = Math.max(1, sentences.reduce((s, x) => s + x.length, 0));
        let cursor = 0;
        newCaptions = sentences.map((sentence) => {
          const share = Math.max(800, Math.round((sentence.length / totalChars) * totalVoiceDurationMs));
          const startMs = cursor;
          const endMs = startMs + share;
          cursor = endMs;
          return { id: crypto.randomUUID(), startMs, endMs, text: sentence, wordSyncAvailable: false };
        });
      } else {
        let cursor = 0;
        newCaptions = sentences.map((sentence) => {
          const startMs = cursor;
          const dur = Math.max(2000, Math.min(6500, sentence.length * 65));
          const endMs = startMs + dur;
          cursor = endMs + 150;
          return { id: crypto.randomUUID(), startMs, endMs, text: sentence, wordSyncAvailable: false };
        });
      }
    }

    const regrouped =
      captionStyle.groupingMode && captionStyle.groupingMode !== 'manual'
        ? regroupCaptions(
            newCaptions,
            captionStyle.groupingMode,
            captionStyle.maxWordsPerLine ?? 4,
            captionStyle.maxLines ?? 2
          )
        : newCaptions;

    pushUndo();
    syncCaptionsAndTrack(regrouped, true);
  };

  const handleApplyAutoStyle = () => {
    const { nextTracks, nextCaptionStyle, summary } = computedAutoStyle;
    const presetName = AUTO_STYLE_PRESETS.find((p) => p.id === autoStyleSelectedId)?.name || autoStyleSelectedId;
    pushUndo({
      tracks: structuredClone(tracks),
      captions: structuredClone(captions),
      captionStyle: structuredClone(captionStyle),
    });
    setIsPreviewingAutoStyle(false);
    setAutoStyleModalOpen(false);
    setTracks(nextTracks);
    setCaptionStyle(nextCaptionStyle);

    const lastAutoStyle = {
      styleId: autoStyleSelectedId,
      intensity: autoStyleIntensity,
      appliedAt: new Date().toISOString(),
    };
    setAutoStyleNotice(
      `Applied ${presetName} (${autoStyleIntensity}): ${summary.imagesStyled} images, ${summary.transitionsApplied} transitions`
    );
    persistPatch(
      {
        timeline: { tracks: nextTracks },
        captionStyle: nextCaptionStyle,
        lastAutoStyle,
      },
      true
    );
  };

  const applyWorkspacePreset = (preset: WorkspacePreset) => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    setActivePreset(preset);
    setPreviewMaximized(false);
    let nextState: EditorWorkspaceState;

    if (preset === 'preview') {
      const h = vh < 820 ? 165 : 190;
      setLeftPanelOpen(false);
      setCaptionDesignerOpen(false);
      setTimelineHeight(h);
      setTrackHeightPx(36);
      nextState = {
        activePreset: 'preview',
        leftPanelOpen: false,
        captionDesignerOpen: false,
        leftDrawerWidth,
        captionDesignerWidth,
        timelineHeight: h,
        trackHeightPx: 36,
        zoomPct,
        previewQuality,
      };
    } else if (preset === 'timeline') {
      const h = Math.min(520, Math.max(340, Math.round(vh * 0.54)));
      setLeftPanelOpen(true);
      setCaptionDesignerOpen(true);
      setLeftDrawerWidth(260);
      setCaptionDesignerWidth(340);
      setTimelineHeight(h);
      setTrackHeightPx(46);
      nextState = {
        activePreset: 'timeline',
        leftPanelOpen: true,
        captionDesignerOpen: true,
        leftDrawerWidth: 260,
        captionDesignerWidth: 340,
        timelineHeight: h,
        trackHeightPx: 46,
        zoomPct,
        previewQuality,
      };
    } else {
      const h = vh < 820 ? 220 : 270;
      setLeftPanelOpen(true);
      setCaptionDesignerOpen(true);
      setLeftDrawerWidth(288);
      setCaptionDesignerWidth(360);
      setTimelineHeight(h);
      setTrackHeightPx(46);
      nextState = {
        activePreset: 'editing',
        leftPanelOpen: true,
        captionDesignerOpen: true,
        leftDrawerWidth: 288,
        captionDesignerWidth: 360,
        timelineHeight: h,
        trackHeightPx: 46,
        zoomPct,
        previewQuality,
      };
    }

    persistPatch({ workspaceState: nextState }, true);
  };

  const restoreDefaultWorkspace = () => {
    applyWorkspacePreset('editing');
  };

  const handleSaveWorkspaceState = async () => {
    setSaveStatus('saving');
    const workspaceState: EditorWorkspaceState = {
      activePreset,
      timelineHeight,
      leftPanelOpen,
      captionDesignerOpen,
      leftDrawerWidth,
      captionDesignerWidth,
      trackHeightPx,
      zoomPct,
      previewQuality,
    };
    try {
      await onUpdateProject({
        workspaceState,
        mediaItems,
        timeline: { tracks },
        captions,
        captionStyle,
        exportSettings,
      });
    } finally {
      setSaveStatus('saved');
    }
  };

  const handleStartRender = async () => {
    if (!currentProject) {
      setRenderError('No active project found.');
      return;
    }
    setIsRendering(true);
    setRenderError(null);
    setRenderProgress(5);

    try {
      await onUpdateProject({
        mediaItems,
        timeline: { tracks },
        captions,
        captionStyle,
        exportSettings,
      });

      const initialJob = await api.renderExport({
        projectId: currentProject.id,
        settings: exportSettings,
      });
      setRenderResult(initialJob);
      setRenderProgress(initialJob.progress || 10);

      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = window.setInterval(async () => {
        try {
          const status = await api.getExportStatus(initialJob.renderId);
          setRenderResult(status);
          if (typeof status.progress === 'number') {
            setRenderProgress(status.progress);
          }
          if (status.status === 'completed') {
            if (pollTimerRef.current) {
              window.clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            setIsRendering(false);
            setRenderProgress(100);
            const nextHist = [status, ...(currentProject.exportHistory || []).filter((e) => e.renderId !== status.renderId)];
            await onUpdateProject({ exportHistory: nextHist });
          } else if (status.status === 'failed') {
            if (pollTimerRef.current) {
              window.clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            setIsRendering(false);
            setRenderError(status.error || 'Video render failed.');
          }
        } catch (pollErr) {
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setIsRendering(false);
          setRenderError(pollErr instanceof Error ? pollErr.message : 'Lost connection while polling render.');
        }
      }, 700);
    } catch (err) {
      setIsRendering(false);
      setRenderError(err instanceof Error ? err.message : 'Failed to start render.');
    }
  };

  const filteredMedia = mediaItems.filter((m) => {
    const matchesQuery = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesQuery) return false;
    if (mediaFilter === 'all') return true;
    if (mediaFilter === 'audio') return m.type === 'audio' || m.type === 'bgm' || m.type === 'sfx';
    return m.type === mediaFilter;
  });

  const aspectRatio = exportSettings.aspectRatio;
  const fps = exportSettings.fps || 30;

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0c10] text-slate-100 font-sans select-none overflow-hidden">
      {/* Hidden Real Audio Playback Pool */}
      {activeAudioClips.map(({ clip, src, trackMuted }) => (
        <AudioClipPlayer
          key={clip.id}
          clip={clip}
          src={src}
          currentTime={currentTime}
          isPlaying={isPlaying}
          trackMuted={trackMuted}
        />
      ))}

      {/* COMPACT FULLSCREEN TOP EDITOR TOOLBAR */}
      <header className="h-10 bg-[#13161f] border-b border-white/[0.08] px-2.5 flex items-center justify-between gap-2 shrink-0 text-xs relative z-30">
        {/* Left: App Sidebar Toggle + Project Title + Save Status + Undo/Redo + Sequence Settings */}
        <div className="flex items-center gap-2 min-w-0">
          {onToggleAppSidebar && (
            <button
              type="button"
              onClick={onToggleAppSidebar}
              title={appSidebarOpen ? 'Hide Navigation Sidebar' : 'Show Navigation Sidebar'}
              aria-label="Toggle App Navigation"
              className={`p-1.5 rounded border transition-colors shrink-0 ${
                appSidebarOpen
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-[#1a1e2a] border-white/10 text-slate-300 hover:text-white hover:bg-[#232838]'
              }`}
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-white truncate max-w-[170px]">
              {currentProject?.title || 'Untitled Sequence'}
            </span>
            <button
              type="button"
              onClick={handleSaveWorkspaceState}
              title="Save Project & Workspace Layout"
              className="px-2 py-0.5 rounded bg-[#0c0e13] border border-white/[0.08] hover:border-white/20 text-[11px] text-slate-300 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Save className={`w-3 h-3 ${saveStatus === 'saving' ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-0.5 border-s border-white/[0.08] ps-2">
            <button
              type="button"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              title="Undo"
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              title="Redo"
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sequence Settings Popover Trigger */}
          <div className="relative hidden md:block border-s border-white/[0.08] ps-2">
            <button
              type="button"
              onClick={() => setSequenceSettingsOpen((o) => !o)}
              className={`px-2 py-1 rounded border text-[11px] font-mono tabular-nums flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                sequenceSettingsOpen
                  ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                  : 'bg-[#0c0e13] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
              title="Sequence & Preview Settings"
            >
              <Sliders className="w-3 h-3 text-blue-400" />
              <span>
                {exportSettings.resolution} · {fps}fps · {aspectRatio}
              </span>
            </button>

            {sequenceSettingsOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 rounded bg-[#141720] border border-white/15 shadow-2xl p-3 space-y-2.5 z-50 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
                  <span className="font-semibold text-white">Sequence Settings</span>
                  <button
                    type="button"
                    onClick={() => setSequenceSettingsOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Resolution</label>
                    <select
                      value={exportSettings.resolution}
                      onChange={(e) => {
                        const next = { ...exportSettings, resolution: e.target.value };
                        setExportSettings(next);
                        persistPatch({ exportSettings: next }, true);
                      }}
                      className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                    >
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                      <option value="4K">4K</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Frame Rate</label>
                    <select
                      value={exportSettings.fps}
                      onChange={(e) => {
                        const next = { ...exportSettings, fps: Number(e.target.value) };
                        setExportSettings(next);
                        persistPatch({ exportSettings: next }, true);
                      }}
                      className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                    >
                      <option value={24}>24 FPS</option>
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Aspect Ratio</label>
                    <select
                      value={exportSettings.aspectRatio}
                      onChange={(e) => {
                        const next = { ...exportSettings, aspectRatio: e.target.value as '16:9' | '9:16' | '1:1' };
                        setExportSettings(next);
                        persistPatch({ exportSettings: next }, true);
                      }}
                      className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                    >
                      <option value="16:9">16:9 Landscape</option>
                      <option value="9:16">9:16 Vertical</option>
                      <option value="1:1">1:1 Square</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Preview Quality</label>
                    <select
                      value={previewQuality}
                      onChange={(e) => setPreviewQuality(e.target.value as 'full' | 'half' | 'draft')}
                      className="w-full px-2 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                    >
                      <option value="full">Full</option>
                      <option value="half">1/2</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: Workspace Presets + Restore + Maximize + Auto Arrange + Export */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 3 Workspace Presets */}
          <div className="hidden lg:flex items-center bg-[#0c0e13] p-0.5 rounded border border-white/[0.08]" title="Workspace Presets">
            {(
              [
                { id: 'editing', label: 'Editing' },
                { id: 'preview', label: 'Preview' },
                { id: 'timeline', label: 'Timeline' },
              ] as Array<{ id: WorkspacePreset; label: string }>
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyWorkspacePreset(preset.id)}
                className={`px-2 py-0.5 rounded-sm text-[11px] font-medium transition-colors whitespace-nowrap ${
                  !previewMaximized && activePreset === preset.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={restoreDefaultWorkspace}
            title="Restore Default Workspace"
            className="hidden xl:inline-flex px-2 py-1 rounded bg-[#1b1f2b] hover:bg-[#232838] text-slate-300 hover:text-white border border-white/10 text-[11px] font-medium items-center gap-1 whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewMaximized((m) => !m)}
            title={previewMaximized ? 'Restore Editing Workspace (Esc)' : 'Maximize Preview'}
            className={`px-2 py-1 rounded border text-[11px] font-medium flex items-center gap-1 whitespace-nowrap ${
              previewMaximized
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-[#1b1f2b] hover:bg-[#232838] border-white/10 text-slate-200'
            }`}
          >
            {previewMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span className="hidden sm:inline">{previewMaximized ? 'Restore Workspace' : 'Maximize'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAutoStyleConflictMode(currentProject?.lastAutoStyle ? 'preserve-manual' : 'replace-all');
              setAutoStyleModalOpen(true);
            }}
            title="One-Click AI Video Styling (Motion, Transitions, Effects & Captions)"
            className="px-2.5 py-1 rounded bg-gradient-to-r from-blue-600/25 to-indigo-600/25 hover:from-blue-600/40 hover:to-indigo-600/40 text-blue-100 border border-blue-500/45 text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5 text-blue-300" />
            <span>Auto Style</span>
          </button>

          <button
            type="button"
            onClick={handleAutoArrange}
            className="hidden md:inline-flex px-2.5 py-1 rounded bg-[#1b1f2b] hover:bg-[#232838] text-slate-200 border border-white/10 text-[11px] font-medium items-center gap-1 whitespace-nowrap"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Auto Arrange</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('export');
              setLeftPanelOpen(true);
              setPreviewMaximized(false);
            }}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {editorError && (
        <div className="bg-red-950/70 border-b border-red-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-red-200 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{editorError}</span>
          </div>
          <button type="button" onClick={() => setEditorError(null)} className="text-red-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* UPPER WORKSPACE: Left Rail + Tool Panel + Drag Handle + Program Monitor + Drag Handle + Right Inspector */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* A. LEFT VERTICAL TOOLBAR */}
        {!previewMaximized && (
          <nav
            aria-label="Editor Tools"
            className="w-[52px] bg-[#13161d] border-e border-white/[0.07] flex flex-col items-center py-2 gap-1 shrink-0 overflow-y-auto"
          >
            {[
              { id: 'media', label: 'Media', icon: FolderOpen },
              { id: 'captions', label: 'Captions', icon: Subtitles },
              { id: 'text', label: 'Text', icon: Type },
              { id: 'filters', label: 'Filters', icon: Filter },
              { id: 'transitions', label: 'Trans.', icon: Repeat },
              { id: 'motion', label: 'Motion', icon: Move },
              { id: 'audio', label: 'Audio', icon: Music },
              { id: 'effects', label: 'Effects', icon: Wand2 },
              { id: 'export', label: 'Export', icon: DownloadCloud },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive =
                tool.id === 'captions'
                  ? captionDesignerOpen
                  : leftPanelOpen && activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    if (tool.id === 'captions') {
                      setCaptionDesignerOpen((open) => !open);
                      return;
                    }
                    if (activeTool === tool.id && leftPanelOpen) {
                      setLeftPanelOpen(false);
                    } else {
                      setActiveTool(tool.id as LeftTool);
                      setLeftPanelOpen(true);
                    }
                  }}
                  title={tool.id === 'captions' ? 'Toggle Caption Designer' : tool.label}
                  className={`w-10 h-10 rounded flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="leading-none">{tool.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* LEFT TOOL DRAWER + RESIZE HANDLE */}
        {!previewMaximized && leftPanelOpen && (
          <>
            <aside
              style={{ width: `${leftDrawerWidth}px` }}
              className="bg-[#151820] border-e border-white/[0.07] flex flex-col shrink-0 overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length > 0) {
                  void processUploadedFiles(e.dataTransfer.files);
                }
              }}
            >
            {/* Panel Header */}
            <div className="h-9 px-3.5 border-b border-white/[0.07] flex items-center justify-between bg-[#161922] shrink-0">
              <span className="text-[11px] font-semibold text-slate-200 capitalize tracking-wide">
                {activeTool === 'media'
                  ? 'Media Library'
                  : activeTool === 'audio'
                  ? 'Audio & Fish Voiceover'
                  : `${activeTool} Studio`}
              </span>
              <button
                type="button"
                onClick={() => setLeftPanelOpen(false)}
                title="Collapse Panel"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* MEDIA PANEL */}
              {activeTool === 'media' && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploading ? 'Importing...' : 'Import Media'}</span>
                      <input type="file" multiple accept="image/*,video/*,audio/*" onChange={handleFileInputChange} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTool('audio')}
                      title="Open Fish Audio Voiceovers"
                      className="px-2.5 py-1.5 rounded bg-[#1d222d] hover:bg-[#252b39] border border-white/10 text-slate-200 text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                    >
                      <Mic className="w-3.5 h-3.5 text-blue-400" />
                      <span>Voice</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search project assets..."
                      className="w-full pl-8 pr-2.5 py-1.5 rounded bg-[#0c0e13] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 bg-[#0c0e13] p-0.5 rounded border border-white/[0.07] text-[11px]">
                    {(['all', 'video', 'image', 'audio'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setMediaFilter(tab)}
                        className={`py-1 rounded-sm capitalize font-medium transition-colors ${
                          mediaFilter === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Inline Media Preview Card */}
                  {previewMediaItem && (
                    <div className="p-2 rounded bg-[#0c0e13] border border-blue-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-white truncate">{previewMediaItem.name}</span>
                        <button type="button" onClick={() => setPreviewMediaItem(null)} className="text-slate-400 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {previewMediaItem.type === 'video' ? (
                        <video src={previewMediaItem.url} controls className="w-full aspect-video rounded bg-black" />
                      ) : previewMediaItem.type === 'image' ? (
                        <img src={previewMediaItem.url} alt={previewMediaItem.name} className="w-full aspect-video object-contain rounded bg-black" />
                      ) : (
                        <audio src={previewMediaItem.url} controls className="w-full h-8" />
                      )}
                      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400">
                        <span>{formatBytes(previewMediaItem.sizeBytes)}</span>
                        <span>
                          {previewMediaItem.width && previewMediaItem.height
                            ? `${previewMediaItem.width}×${previewMediaItem.height}`
                            : previewMediaItem.type.toUpperCase()}
                        </span>
                        <span>{(previewMediaItem.duration || 5).toFixed(1)}s</span>
                      </div>
                    </div>
                  )}

                  {filteredMedia.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-white/10 rounded p-4">
                      Drop images, videos, or audio files here, or click Import Media.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredMedia.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('application/x-media-id', item.id)}
                          onClick={() => setPreviewMediaItem(item)}
                          className="rounded bg-[#0c0e13] border border-white/[0.08] hover:border-blue-500/50 p-1.5 flex flex-col space-y-1 cursor-pointer group"
                        >
                          <div className="w-full aspect-video bg-black rounded-sm flex items-center justify-center overflow-hidden relative">
                            {item.type === 'image' ? (
                              <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                            ) : item.type === 'video' ? (
                              <video src={`${item.url}#t=0.5`} className="w-full h-full object-cover" muted preload="metadata" />
                            ) : (
                              <Music className="w-5 h-5 text-emerald-400" />
                            )}
                            <span className="absolute top-1 left-1 text-[9px] font-mono bg-black/75 text-slate-200 px-1 rounded-sm">
                              {item.type === 'video' ? <Film className="w-2.5 h-2.5 inline" /> : item.type === 'image' ? <ImageIcon className="w-2.5 h-2.5 inline" /> : <Music className="w-2.5 h-2.5 inline" />}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMediaItem(item.id);
                              }}
                              title="Remove Asset"
                              className="absolute top-1 right-1 w-5 h-5 rounded-sm bg-black/75 hover:bg-red-600 text-slate-200 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addMediaToTrack(item);
                              }}
                              title="Insert on Timeline"
                              className="absolute bottom-1 right-1 w-5 h-5 rounded-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="text-slate-200 truncate">{item.name}</span>
                            <span className="font-mono tabular-nums text-slate-500 shrink-0">{(item.duration || 5).toFixed(0)}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* AUDIO & FISH AUDIO PANEL */}
              {activeTool === 'audio' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">Fish Audio Voiceovers ({history.length})</span>
                    <button
                      type="button"
                      onClick={onOpenVoiceStudio}
                      className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center gap-1"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Generate</span>
                    </button>
                  </div>

                  {history.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-white/10 rounded p-3">
                      No Fish Audio recordings yet. Generate speech in Voice Studio to add it directly to Track A1.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((rec) => (
                        <div
                          key={rec.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('application/x-fish-id', rec.id)}
                          className="p-2 rounded bg-[#0c0e13] border border-white/[0.08] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-white truncate">{rec.voiceName}</span>
                            <span className="font-mono tabular-nums text-slate-400 shrink-0">
                              {rec.durationSeconds ? `${rec.durationSeconds.toFixed(1)}s` : rec.format.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2">{rec.text}</p>
                          <audio src={rec.audioUrl} controls className="w-full h-7" />
                          <button
                            type="button"
                            onClick={() => addFishAudioToTrack(rec, 'a1')}
                            className="w-full py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-medium transition-colors"
                          >
                            + Add to Voiceover Track (A1)
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {mediaItems.some((m) => m.type === 'audio' || m.type === 'bgm' || m.type === 'sfx') && (
                    <div className="pt-2 border-t border-white/[0.07] space-y-2">
                      <div className="text-[11px] font-semibold text-slate-300">Imported Music & SFX</div>
                      {mediaItems
                        .filter((m) => m.type === 'audio' || m.type === 'bgm' || m.type === 'sfx')
                        .map((item) => (
                          <div key={item.id} className="p-2 rounded bg-[#0c0e13] border border-white/[0.08] flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-200 truncate">{item.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => addMediaToTrack(item, 'a2')}
                                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-blue-600 text-[10px] text-white"
                              >
                                +A2
                              </button>
                              <button
                                type="button"
                                onClick={() => addMediaToTrack(item, 'a3')}
                                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-blue-600 text-[10px] text-white"
                              >
                                +A3
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}

              {/* TEXT PANEL */}
              {activeTool === 'text' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400">Insert an editable title overlay onto Track T2 at the playhead.</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Hero Chapter Title', title: 'CHAPTER ONE', fontSize: 44, y: 0, textColor: '#FFFFFF' },
                      { label: 'Lower Third Nameplate', title: 'Location · Timestamp', fontSize: 24, y: 65, textColor: '#93C5FD' },
                      { label: 'Key Insight Callout', title: 'THE TURNING POINT', fontSize: 34, y: -55, textColor: '#FDE047' },
                      { label: 'End Screen CTA', title: 'Subscribe & Follow', fontSize: 28, y: 70, textColor: '#34D399' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => addTextOverlayClip(preset.title, preset)}
                        className="w-full p-2.5 rounded bg-[#0c0e13] border border-white/[0.08] hover:border-blue-500/50 text-start transition-colors"
                      >
                        <div className="text-xs font-semibold text-white">{preset.label}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">"{preset.title}"</div>
                      </button>
                    ))}
                  </div>

                  {selectedClipInfo?.track.type === 'text' && (
                    <div className="pt-3 border-t border-white/[0.08] space-y-2">
                      <div className="text-[11px] font-semibold text-white">Selected Title Properties</div>
                      <textarea
                        rows={2}
                        value={selectedClipInfo.clip.title || ''}
                        onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { title: e.target.value })}
                        className="w-full px-2 py-1.5 rounded bg-[#0c0e13] border border-white/10 text-white text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Font</label>
                          <select
                            value={selectedClipInfo.clip.fontFamily || 'Montserrat'}
                            onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { fontFamily: e.target.value }, true)}
                            className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white text-[11px]"
                          >
                            {FONT_LIBRARY.map((f) => (
                              <option key={f.family} value={f.family}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Size</label>
                          <input
                            type="number"
                            min={14}
                            max={120}
                            value={selectedClipInfo.clip.fontSize ?? 36}
                            onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { fontSize: Number(e.target.value) })}
                            className="w-full px-1.5 py-1 rounded bg-[#0c0e13] border border-white/10 text-white font-mono text-[11px]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Text Color</label>
                          <input
                            type="color"
                            value={selectedClipInfo.clip.textColor || '#FFFFFF'}
                            onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { textColor: e.target.value })}
                            className="w-full h-7 rounded bg-[#0c0e13] border border-white/10"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Outline</label>
                          <input
                            type="color"
                            value={selectedClipInfo.clip.outlineColor || '#000000'}
                            onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { outlineColor: e.target.value })}
                            className="w-full h-7 rounded bg-[#0c0e13] border border-white/10"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIDEO FILTERS PANEL */}
              {activeTool === 'filters' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400">
                    {selectedClipInfo
                      ? `Video Color Grade: ${selectedClipInfo.clip.title}`
                      : 'Select a video or image clip on the timeline to apply filters.'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VIDEO_FILTER_PRESETS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        disabled={!selectedClipInfo}
                        onClick={() => {
                          if (!selectedClipInfo) return;
                          pushUndo();
                          updateClipProps(selectedClipInfo.clip.id, { ...f, filterPreset: f.id }, true);
                        }}
                        className={`p-2 rounded border text-xs font-medium disabled:opacity-40 ${
                          selectedClipInfo?.clip.filterPreset === f.id
                            ? 'bg-blue-600/20 border-blue-400 text-white'
                            : 'bg-[#0c0e13] border-white/[0.08] hover:border-blue-500/50 text-slate-200'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>

                  {selectedClipInfo && (selectedClipInfo.track.type === 'video' || selectedClipInfo.track.type === 'overlay') && (
                    <div className="pt-2 border-t border-white/[0.08] space-y-2">
                      {[
                        { label: 'Brightness', key: 'brightness' as const, min: 40, max: 180, def: 100, unit: '%' },
                        { label: 'Contrast', key: 'contrast' as const, min: 40, max: 180, def: 100, unit: '%' },
                        { label: 'Saturation', key: 'saturation' as const, min: 0, max: 200, def: 100, unit: '%' },
                        { label: 'Temperature', key: 'temperature' as const, min: -60, max: 60, def: 0, unit: '' },
                        { label: 'Sharpen', key: 'sharpen' as const, min: 0, max: 100, def: 0, unit: '%' },
                      ].map((sl) => (
                        <div key={sl.key}>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>{sl.label}</span>
                            <span className="font-mono tabular-nums">
                              {selectedClipInfo.clip[sl.key] ?? sl.def}{sl.unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={sl.min}
                            max={sl.max}
                            value={selectedClipInfo.clip[sl.key] ?? sl.def}
                            onChange={(e) =>
                              updateClipProps(selectedClipInfo.clip.id, { [sl.key]: Number(e.target.value) })
                            }
                            className="w-full accent-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TRANSITIONS PANEL */}
              {activeTool === 'transitions' && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-slate-400">
                    {selectedClipInfo ? `Target: ${selectedClipInfo.clip.title}` : 'Select a timeline clip to apply transition.'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'none', label: 'None' },
                        { id: 'crossfade', label: 'Cross Dissolve' },
                        { id: 'fade-black', label: 'Fade Black' },
                        { id: 'zoom-in', label: 'Zoom' },
                        { id: 'slide-up', label: 'Slide Up' },
                        { id: 'slide-left', label: 'Slide Left' },
                        { id: 'blur-dissolve', label: 'Blur Dissolve' },
                        { id: 'wipe-left', label: 'Wipe Left' },
                        { id: 'cinematic', label: 'Cinematic' },
                      ] as Array<{ id: TransitionType; label: string }>
                    ).map((tr) => (
                      <button
                        key={tr.id}
                        type="button"
                        disabled={!selectedClipInfo}
                        onClick={() => {
                          if (!selectedClipInfo) return;
                          pushUndo();
                          updateClipProps(
                            selectedClipInfo.clip.id,
                            {
                              transition: tr.id,
                              transitionDuration: tr.id === 'none' ? 0 : 0.6,
                              fadeIn: tr.id === 'none' ? 0 : 0.6,
                            },
                            true
                          );
                        }}
                        className={`p-2 rounded border text-xs font-medium disabled:opacity-40 ${
                          selectedClipInfo?.clip.transition === tr.id
                            ? 'bg-blue-600/20 border-blue-400 text-white'
                            : 'bg-[#0c0e13] border-white/[0.08] hover:border-blue-500/50 text-slate-200'
                        }`}
                      >
                        {tr.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MOTION PANEL */}
              {activeTool === 'motion' && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-slate-400">
                    {selectedClipInfo ? `Target: ${selectedClipInfo.clip.title}` : 'Select a clip to apply Ken Burns motion or speed.'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Static', motionPreset: 'none' as MotionPreset },
                      { label: 'Slow Zoom In', motionPreset: 'zoom-in' as MotionPreset },
                      { label: 'Slow Zoom Out', motionPreset: 'zoom-out' as MotionPreset },
                      { label: 'Pan Left', motionPreset: 'pan-left' as MotionPreset },
                      { label: 'Pan Right', motionPreset: 'pan-right' as MotionPreset },
                      { label: 'Zoom + Pan', motionPreset: 'zoom-pan' as MotionPreset },
                      { label: 'Ken Burns', motionPreset: 'ken-burns' as MotionPreset },
                      { label: '0.5x Slow', speed: 0.5 },
                      { label: '1.0x Normal', speed: 1.0 },
                      { label: '1.5x Fast', speed: 1.5 },
                    ].map((m) => {
                      const isMotionSelected =
                        'motionPreset' in m && selectedClipInfo?.clip.motionPreset === m.motionPreset;
                      return (
                        <button
                          key={m.label}
                          type="button"
                          disabled={!selectedClipInfo}
                          onClick={() => {
                            if (!selectedClipInfo) return;
                            pushUndo();
                            updateClipProps(selectedClipInfo.clip.id, m, true);
                          }}
                          className={`p-2 rounded border text-xs font-medium disabled:opacity-40 ${
                            isMotionSelected
                              ? 'bg-blue-600/20 border-blue-400 text-white'
                              : 'bg-[#0c0e13] border-white/[0.08] hover:border-blue-500/50 text-slate-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIDEO EFFECTS & TRANSFORM PANEL */}
              {activeTool === 'effects' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400">
                    {selectedClipInfo
                      ? `Video Effects & Transform: ${selectedClipInfo.clip.title}`
                      : 'Select a visual clip to apply vignette, grain, blur, or transform.'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Clear Effects', blur: 0, vignette: 0, filmGrain: 0, fadeIn: 0, fadeOut: 0, opacity: 100 },
                      { label: 'Soft Blur', blur: 3 },
                      { label: 'Cinema Vignette', vignette: 55 },
                      { label: '35mm Film Grain', filmGrain: 42 },
                      { label: 'Fade In/Out 0.8s', fadeIn: 0.8, fadeOut: 0.8 },
                      { label: '65% Overlay', opacity: 65 },
                    ].map((fx) => (
                      <button
                        key={fx.label}
                        type="button"
                        disabled={!selectedClipInfo}
                        onClick={() => {
                          if (!selectedClipInfo) return;
                          pushUndo();
                          updateClipProps(selectedClipInfo.clip.id, fx, true);
                        }}
                        className="p-2 rounded bg-[#0c0e13] border border-white/[0.08] hover:border-blue-500/50 disabled:opacity-40 text-xs font-medium text-slate-200"
                      >
                        {fx.label}
                      </button>
                    ))}
                  </div>

                  {selectedClipInfo && (selectedClipInfo.track.type === 'video' || selectedClipInfo.track.type === 'overlay') && (
                    <div className="pt-2 border-t border-white/[0.08] space-y-2">
                      {[
                        { label: 'Blur', key: 'blur' as const, min: 0, max: 20, def: 0, unit: 'px' },
                        { label: 'Vignette', key: 'vignette' as const, min: 0, max: 100, def: 0, unit: '%' },
                        { label: 'Film Grain', key: 'filmGrain' as const, min: 0, max: 100, def: 0, unit: '%' },
                        { label: 'Opacity', key: 'opacity' as const, min: 0, max: 100, def: 100, unit: '%' },
                        { label: 'Scale', key: 'scale' as const, min: 20, max: 250, def: 100, unit: '%' },
                        { label: 'Rotation', key: 'rotation' as const, min: -180, max: 180, def: 0, unit: '°' },
                      ].map((sl) => (
                        <div key={sl.key}>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>{sl.label}</span>
                            <span className="font-mono tabular-nums">
                              {selectedClipInfo.clip[sl.key] ?? sl.def}{sl.unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={sl.min}
                            max={sl.max}
                            value={selectedClipInfo.clip[sl.key] ?? sl.def}
                            onChange={(e) =>
                              updateClipProps(selectedClipInfo.clip.id, { [sl.key]: Number(e.target.value) })
                            }
                            className="w-full accent-blue-500"
                          />
                        </div>
                      ))}

                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <div>
                          <label className="text-[9px] text-slate-500 block">Crop T</label>
                          <input
                            type="number"
                            min={0}
                            max={45}
                            value={selectedClipInfo.clip.cropTop ?? 0}
                            onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { cropTop: Number(e.target.value) })}
                            className="w-full px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block">Crop B</label>
                          <input
                            type="number"
                            min={0}
                            max={45}
                            value={selectedClipInfo.clip.cropBottom ?? 0}
                            onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { cropBottom: Number(e.target.value) })}
                            className="w-full px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block">Crop L</label>
                          <input
                            type="number"
                            min={0}
                            max={45}
                            value={selectedClipInfo.clip.cropLeft ?? 0}
                            onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { cropLeft: Number(e.target.value) })}
                            className="w-full px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono text-[10px]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block">Crop R</label>
                          <input
                            type="number"
                            min={0}
                            max={45}
                            value={selectedClipInfo.clip.cropRight ?? 0}
                            onChange={(e) => updateClipProps(selectedClipInfo.clip.id, { cropRight: Number(e.target.value) })}
                            className="w-full px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono text-[10px]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EXPORT PANEL */}
              {activeTool === 'export' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Resolution</label>
                    <select
                      value={exportSettings.resolution}
                      onChange={(e) => {
                        const next = { ...exportSettings, resolution: e.target.value };
                        setExportSettings(next);
                        persistPatch({ exportSettings: next }, true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0c0e13] border border-white/10 text-white"
                    >
                      <option value="720p">720p HD</option>
                      <option value="1080p">1080p Full HD</option>
                      <option value="4K">4K Ultra HD</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Frame Rate</label>
                      <select
                        value={exportSettings.fps}
                        onChange={(e) => {
                          const next = { ...exportSettings, fps: Number(e.target.value) };
                          setExportSettings(next);
                          persistPatch({ exportSettings: next }, true);
                        }}
                        className="w-full px-2 py-1.5 rounded bg-[#0c0e13] border border-white/10 text-white"
                      >
                        <option value={24}>24 FPS</option>
                        <option value={30}>30 FPS</option>
                        <option value={60}>60 FPS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Quality</label>
                      <select
                        value={exportSettings.quality}
                        onChange={(e) => {
                          const next = { ...exportSettings, quality: e.target.value };
                          setExportSettings(next);
                          persistPatch({ exportSettings: next }, true);
                        }}
                        className="w-full px-2 py-1.5 rounded bg-[#0c0e13] border border-white/10 text-white"
                      >
                        <option value="medium">Standard</option>
                        <option value="high">High</option>
                        <option value="ultra">Ultra</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSettings.burnCaptions}
                      onChange={(e) => {
                        const next = { ...exportSettings, burnCaptions: e.target.checked };
                        setExportSettings(next);
                        persistPatch({ exportSettings: next }, true);
                      }}
                      className="rounded border-white/20 bg-[#0c0e13] accent-blue-500"
                    />
                    <span className="text-slate-300">Burn captions into MP4</span>
                  </label>

                  <button
                    type="button"
                    disabled={isRendering}
                    onClick={handleStartRender}
                    className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    {isRendering ? (
                      <>
                        <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering ({renderProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-4 h-4" />
                        <span>Render MP4 Video</span>
                      </>
                    )}
                  </button>

                  {isRendering && (
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${renderProgress}%` }} />
                    </div>
                  )}

                  {renderError && (
                    <div className="p-2 rounded bg-red-950/60 border border-red-500/30 text-red-200 text-[11px]">
                      {renderError}
                    </div>
                  )}

                  {renderResult?.status === 'completed' && renderResult.downloadUrl && (
                    <div className="p-2.5 rounded bg-emerald-950/50 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready · {renderResult.fileSizeMb ?? 0} MB</span>
                      </div>
                      <a
                        href={renderResult.downloadUrl}
                        download
                        className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-center font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download MP4</span>
                      </a>
                      {renderResult.srtUrl && captions.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <a
                            href={renderResult.srtUrl}
                            download
                            className="py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 text-center font-medium block"
                          >
                            Download .SRT
                          </a>
                          {renderResult.vttUrl && (
                            <a
                              href={renderResult.vttUrl}
                              download
                              className="py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 text-center font-medium block"
                            >
                              Download .VTT
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
          <div
            onMouseDown={(e) => setResizingLeft({ startX: e.clientX, startWidth: leftDrawerWidth })}
            title="Drag to resize tool panel"
            className="w-1 bg-transparent hover:bg-blue-500/60 cursor-ew-resize transition-colors shrink-0"
          />
        </>
        )}

        {/* C. CENTRAL VIDEO PREVIEW + D. FLOATING PLAYBACK CONTROL BAR */}
        <div
          ref={monitorRef}
          className="flex-1 bg-[#090b0f] flex flex-col justify-between p-2.5 min-w-0 relative overflow-hidden"
        >
          {/* Side Panel Toggle Helpers + Maximize */}
          <div className="flex items-center justify-between shrink-0 mb-1.5">
            <div className="flex items-center gap-2">
              {!leftPanelOpen && !previewMaximized && (
                <button
                  type="button"
                  onClick={() => setLeftPanelOpen(true)}
                  title="Expand Tool Panel"
                  className="p-1.5 rounded bg-[#141720] border border-white/10 text-slate-300 hover:text-white"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                Program Monitor · {aspectRatio} · Effects: {activeEffectsCount}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {autoStyleNotice && !isPreviewingAutoStyle && (
                <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/35 text-[10px] text-blue-200">
                  <span>{autoStyleNotice}</span>
                  {undoStack.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="underline font-semibold text-white hover:text-blue-300"
                    >
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAutoStyleNotice(null)}
                    className="text-blue-300 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPreviewMaximized((m) => !m)}
                title={previewMaximized ? 'Restore Editing Workspace (Esc)' : 'Maximize Preview'}
                className={`px-2 py-1 rounded border text-[11px] font-medium flex items-center gap-1 ${
                  previewMaximized
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-[#141720] border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {previewMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Restore Workspace</span>
                  </>
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              {!captionDesignerOpen && !previewMaximized && (
                <button
                  type="button"
                  onClick={() => setCaptionDesignerOpen(true)}
                  title="Open Caption Designer"
                  className="px-2 py-1 rounded bg-[#141720] border border-white/10 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1"
                >
                  <PanelRightOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Captions</span>
                </button>
              )}
            </div>
          </div>

          {/* Non-Destructive Auto Style Preview Bar */}
          {isPreviewingAutoStyle && (
            <div className="shrink-0 mb-1.5 px-3 py-1.5 rounded bg-blue-950/75 border border-blue-500/50 flex flex-wrap items-center justify-between gap-2 text-xs z-30">
              <div className="flex items-center gap-2 text-blue-100">
                <Wand2 className="w-3.5 h-3.5 text-blue-300" />
                <span className="font-semibold">
                  Previewing Auto Style:{' '}
                  {AUTO_STYLE_PRESETS.find((s) => s.id === autoStyleSelectedId)?.name || autoStyleSelectedId} (
                  {autoStyleIntensity})
                </span>
                <span className="text-[10px] text-blue-300/80 hidden sm:inline">
                  Unsaved sandbox preview — timeline unchanged until applied
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoStyleModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-[#141720] hover:bg-[#1e2330] border border-white/15 text-slate-200 text-[11px] font-medium"
                >
                  Options
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewingAutoStyle(false);
                    setIsPlaying(false);
                  }}
                  className="px-2.5 py-1 rounded bg-transparent hover:bg-white/10 border border-white/15 text-slate-200 text-[11px] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyAutoStyle}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold"
                >
                  Apply Style
                </button>
              </div>
            </div>
          )}

          {/* Contextual Compact Clip Controls Bar (Zero-Inspector Selected Clip Editing) */}
          {selectedClipInfo && selectedClipInfo.track.id !== 't1' && !previewMaximized && (
            <div className="shrink-0 mb-1.5 px-2.5 py-1 rounded bg-[#13161f] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-blue-300 uppercase">{selectedClipInfo.track.id}</span>
                <span className="font-medium text-white truncate max-w-[140px]">{selectedClipInfo.clip.title || 'Clip'}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1 text-slate-400">
                  <span>Dur</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0.2}
                    value={selectedClipInfo.clip.duration}
                    onChange={(e) =>
                      updateClipProps(selectedClipInfo.clip.id, { duration: Math.max(0.2, Number(e.target.value)) })
                    }
                    className="w-12 px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums"
                  />
                </label>

                {(selectedClipInfo.track.type === 'video' || selectedClipInfo.track.type === 'overlay') && (
                  <>
                    <label className="flex items-center gap-1 text-slate-400">
                      <span>Scale</span>
                      <input
                        type="number"
                        min={10}
                        max={250}
                        value={selectedClipInfo.clip.scale ?? 100}
                        onChange={(e) =>
                          updateClipProps(selectedClipInfo.clip.id, { scale: Number(e.target.value) })
                        }
                        className="w-12 px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-slate-400">
                      <span>Opacity</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedClipInfo.clip.opacity ?? 100}
                        onChange={(e) =>
                          updateClipProps(selectedClipInfo.clip.id, { opacity: Math.max(0, Math.min(100, Number(e.target.value))) })
                        }
                        className="w-11 px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('effects');
                        setLeftPanelOpen(true);
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#1b1f2b] hover:bg-blue-600 text-slate-200 hover:text-white border border-white/10"
                    >
                      Transform & Crop
                    </button>
                  </>
                )}

                {selectedClipInfo.track.type === 'audio' && (
                  <>
                    <label className="flex items-center gap-1 text-slate-400">
                      <span>Vol (dB)</span>
                      <input
                        type="number"
                        min={-60}
                        max={12}
                        value={selectedClipInfo.clip.volume ?? 0}
                        onChange={(e) =>
                          updateClipProps(selectedClipInfo.clip.id, { volume: Number(e.target.value) })
                        }
                        className="w-12 px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-slate-400">
                      <span>Speed</span>
                      <input
                        type="number"
                        step={0.1}
                        min={0.5}
                        max={2.0}
                        value={selectedClipInfo.clip.speed ?? 1}
                        onChange={(e) =>
                          updateClipProps(selectedClipInfo.clip.id, { speed: Math.max(0.5, Math.min(2.0, Number(e.target.value))) })
                        }
                        className="w-11 px-1 py-0.5 rounded bg-[#0c0e13] border border-white/10 text-white font-mono tabular-nums"
                      />
                    </label>
                  </>
                )}

                {selectedClipInfo.track.type === 'text' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool('text');
                      setLeftPanelOpen(true);
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#1b1f2b] hover:bg-blue-600 text-slate-200 hover:text-white border border-white/10"
                  >
                    Edit Title Style
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Centered Video Canvas */}
          <div
            style={{ containerType: 'size' }}
            className="flex-1 min-h-0 flex items-center justify-center p-1"
          >
            <div
              ref={canvasBoxRef}
              onClick={() => setSelectedClipIds([])}
              style={
                aspectRatio === '9:16'
                  ? {
                      width: 'min(100cqw, calc(100cqh * 9 / 16))',
                      height: 'min(100cqh, calc(100cqw * 16 / 9))',
                    }
                  : aspectRatio === '1:1'
                  ? {
                      width: 'min(100cqw, 100cqh)',
                      height: 'min(100cqw, 100cqh)',
                    }
                  : {
                      width: 'min(100cqw, calc(100cqh * 16 / 9))',
                      height: 'min(100cqh, calc(100cqw * 9 / 16))',
                    }
              }
              className="relative bg-black border border-white/[0.12] flex items-center justify-center overflow-hidden shadow-2xl"
            >
              {activeVisualLayers.length > 0 ? (
                activeVisualLayers.map(({ clip, media, trackMuted }) => {
                  const elapsed = Math.max(0, currentTime - clip.startTime);
                  const remaining = Math.max(0, clip.startTime + clip.duration - currentTime);
                  const progress = Math.min(1, elapsed / Math.max(0.1, clip.duration));
                  const mInt = clip.motionIntensity ?? 1;

                  let fadeAlpha = 1;
                  if (clip.fadeIn && clip.fadeIn > 0 && elapsed < clip.fadeIn) {
                    fadeAlpha = Math.min(fadeAlpha, elapsed / clip.fadeIn);
                  }
                  if (clip.fadeOut && clip.fadeOut > 0 && remaining < clip.fadeOut) {
                    fadeAlpha = Math.min(fadeAlpha, remaining / clip.fadeOut);
                  }

                  // Live Keyframed Motion Interpolation (scaled by motionIntensity)
                  let motionScale = 1;
                  let motionX = 0;
                  let motionY = 0;
                  if (clip.motionPreset === 'zoom-in') {
                    motionScale = 1 + 0.14 * mInt * progress;
                  } else if (clip.motionPreset === 'zoom-out') {
                    motionScale = 1 + 0.14 * mInt * (1 - progress);
                  } else if (clip.motionPreset === 'pan-left') {
                    motionScale = 1 + 0.08 * mInt;
                    motionX = (3 - 6 * progress) * mInt;
                  } else if (clip.motionPreset === 'pan-right') {
                    motionScale = 1 + 0.08 * mInt;
                    motionX = (-3 + 6 * progress) * mInt;
                  } else if (clip.motionPreset === 'zoom-pan') {
                    motionScale = 1 + 0.14 * mInt * progress;
                    motionX = (-2.5 + 5 * progress) * mInt;
                    motionY = (-1.5 + 3 * progress) * mInt;
                  } else if (clip.motionPreset === 'ken-burns') {
                    motionScale = 1 + 0.18 * mInt * progress;
                    motionX = (-2.8 + 5.6 * progress) * mInt;
                    motionY = (1.6 - 3.2 * progress) * mInt;
                  }

                  // Entry Transitions (Cross Dissolve, Fade, Zoom, Slide, Blur, Wipe, Cinematic)
                  let trScale = 1;
                  let trX = 0;
                  let trY = 0;
                  let trBlurPx = 0;
                  let trWipeRightPct = 0;
                  const trType = clip.transition || 'none';
                  const trDur = Math.max(0.15, clip.transitionDuration ?? 0.6);
                  if (trType !== 'none' && elapsed < trDur) {
                    const p = Math.max(0, Math.min(1, elapsed / trDur));
                    const eased = 1 - Math.pow(1 - p, 2);
                    if (trType === 'crossfade' || trType === 'fade-black') {
                      fadeAlpha = Math.min(fadeAlpha, eased);
                    } else if (trType === 'cinematic') {
                      fadeAlpha = Math.min(fadeAlpha, eased);
                      trScale = 1 + 0.05 * (1 - eased);
                    } else if (trType === 'zoom-in') {
                      trScale = 1 + 0.24 * (1 - eased);
                      fadeAlpha = Math.min(fadeAlpha, Math.min(1, p * 1.35));
                    } else if (trType === 'slide-up') {
                      trY = 18 * (1 - eased);
                      fadeAlpha = Math.min(fadeAlpha, Math.min(1, p * 1.5));
                    } else if (trType === 'slide-left') {
                      trX = 22 * (1 - eased);
                      fadeAlpha = Math.min(fadeAlpha, Math.min(1, p * 1.5));
                    } else if (trType === 'blur-dissolve') {
                      trBlurPx = 14 * (1 - eased);
                      fadeAlpha = Math.min(fadeAlpha, eased);
                    } else if (trType === 'wipe-left') {
                      trWipeRightPct = Math.round((1 - eased) * 100);
                    }
                  }

                  const baseOpacity = ((clip.opacity ?? 100) / 100) * fadeAlpha;
                  const scale = ((clip.scale ?? 100) / 100) * motionScale * trScale;
                  const transform = `translate(${(clip.x || 0) + motionX + trX}%, ${(clip.y || 0) + motionY + trY}%) scale(${scale}) rotate(${clip.rotation || 0}deg)`;
                  const baseCssFilter = getVideoClipCssFilter(clip, previewQuality === 'draft');
                  const filter =
                    trBlurPx > 0.2
                      ? `${baseCssFilter === 'none' ? '' : `${baseCssFilter} `}blur(${trBlurPx.toFixed(1)}px)`.trim()
                      : baseCssFilter;
                  const clipPath = `inset(${clip.cropTop || 0}% ${Math.max(clip.cropRight || 0, trWipeRightPct)}% ${clip.cropBottom || 0}% ${clip.cropLeft || 0}%)`;

                  const isSelected = selectedClipIds.includes(clip.id);

                  const layerStyle: React.CSSProperties = {
                    position: 'absolute',
                    inset: 0,
                    margin: 'auto',
                    opacity: Math.max(0, Math.min(1, baseOpacity)),
                    transform,
                    filter,
                    clipPath,
                  };

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedClipIds([clip.id]);
                        const box = canvasBoxRef.current?.getBoundingClientRect();
                        if (!box) return;
                        pushUndo();
                        setCanvasDrag({
                          clipId: clip.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          origX: clip.x || 0,
                          origY: clip.y || 0,
                          boxW: box.width,
                          boxH: box.height,
                        });
                      }}
                      className={`absolute inset-0 flex items-center justify-center ${
                        isSelected ? 'cursor-move' : 'cursor-pointer'
                      }`}
                    >
                      {media.type === 'video' ? (
                        <VideoClipLayer
                          clip={clip}
                          src={media.url}
                          currentTime={currentTime}
                          isPlaying={isPlaying}
                          trackMuted={trackMuted}
                          style={layerStyle}
                        />
                      ) : (
                        <img
                          src={media.url}
                          alt={media.name}
                          style={layerStyle}
                          className="max-h-full max-w-full object-contain pointer-events-none"
                        />
                      )}

                      {/* Transform Selection Bounds & Corner Handles */}
                      {isSelected && (
                        <div
                          style={{ transform }}
                          className="absolute inset-2 border border-blue-400 pointer-events-none z-20"
                        >
                          <div className="w-2 h-2 bg-white border border-blue-600 absolute -top-1 -left-1" />
                          <div className="w-2 h-2 bg-white border border-blue-600 absolute -top-1 -right-1" />
                          <div className="w-2 h-2 bg-white border border-blue-600 absolute -bottom-1 -left-1" />
                          <div className="w-2 h-2 bg-white border border-blue-600 absolute -bottom-1 -right-1" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-6 pointer-events-none">
                  <Video className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-400">Program Canvas Empty</div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Import media or drag assets onto the timeline to preview.
                  </p>
                </div>
              )}

              {/* Video Vignette & Film Grain Live Overlays */}
              {activeVisualLayers.some(({ clip }) => (clip.vignette || 0) > 0) && (
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    background: `radial-gradient(circle, transparent 48%, rgba(0,0,0,${Math.min(
                      0.85,
                      (activeVisualLayers[0]?.clip.vignette || 0) / 105
                    ).toFixed(2)}) 100%)`,
                  }}
                />
              )}
              {activeVisualLayers.some(({ clip }) => (clip.filmGrain || 0) > 0) && (
                <div
                  className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay"
                  style={{
                    opacity: Math.min(0.45, (activeVisualLayers[0]?.clip.filmGrain || 0) / 130),
                    backgroundImage:
                      'repeating-radial-gradient(circle at 17% 32%, rgba(255,255,255,0.25) 0, rgba(0,0,0,0.25) 1px, transparent 2px)',
                  }}
                />
              )}

              {/* Active T2 Text Overlays */}
              {activeTextOverlays.map((txtClip) => {
                const isSelected = selectedClipIds.includes(txtClip.id);
                return (
                  <div
                    key={txtClip.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedClipIds([txtClip.id]);
                      const box = canvasBoxRef.current?.getBoundingClientRect();
                      if (!box) return;
                      pushUndo();
                      setCanvasDrag({
                        clipId: txtClip.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: txtClip.x || 0,
                        origY: txtClip.y || 0,
                        boxW: box.width,
                        boxH: box.height,
                      });
                    }}
                    style={{
                      transform: `translate(${txtClip.x || 0}%, ${txtClip.y || 0}%)`,
                      fontFamily: txtClip.fontFamily || 'Montserrat',
                      color: txtClip.textColor || '#FFFFFF',
                      backgroundColor: txtClip.bgColor || 'rgba(0,0,0,0.55)',
                      WebkitTextStroke: txtClip.outlineColor ? `1px ${txtClip.outlineColor}` : undefined,
                      fontSize: `${Math.max(12, Math.round((txtClip.fontSize || 36) * 0.55))}px`,
                      opacity: (txtClip.opacity ?? 100) / 100,
                    }}
                    className={`absolute px-3 py-1 rounded font-bold tracking-wide cursor-move z-20 text-center max-w-[90%] ${
                      isSelected ? 'ring-1 ring-blue-400' : ''
                    }`}
                  >
                    {txtClip.title}
                  </div>
                );
              })}

              {/* Real-Time Caption Composition Renderer */}
              {activeCaption && (() => {
                const eff: CaptionStyle = activeCaption.styleOverride
                  ? { ...displayCaptionStyle, ...activeCaption.styleOverride }
                  : displayCaptionStyle;
                const live = computeCaptionLiveVisuals(activeCaption, currentTime * 1000, eff);
                const { lines } = computeCaptionWordStates(activeCaption, currentTime * 1000, eff);

                const posTop =
                  eff.position === 'top'
                    ? '10%'
                    : eff.position === 'upper-middle'
                    ? '26%'
                    : eff.position === 'middle'
                    ? '50%'
                    : eff.position === 'lower-middle'
                    ? '72%'
                    : '86%';

                const bgAlpha = Math.max(0, Math.min(1, (eff.bgOpacity ?? 65) / 100));
                const hexBg = (eff.backgroundColor || '#000000').replace('#', '');
                const rBg = /^[0-9a-fA-F]{6}$/.test(hexBg) ? parseInt(hexBg.slice(0, 2), 16) : 0;
                const gBg = /^[0-9a-fA-F]{6}$/.test(hexBg) ? parseInt(hexBg.slice(2, 4), 16) : 0;
                const bBg = /^[0-9a-fA-F]{6}$/.test(hexBg) ? parseInt(hexBg.slice(4, 6), 16) : 0;
                const rgbaBg = `rgba(${rBg},${gBg},${bBg},${eff.bgMode === 'solid' ? 1 : bgAlpha})`;
                const hasContainerBox =
                  eff.bgMode === 'solid' ||
                  eff.bgMode === 'semi' ||
                  eff.bgMode === 'rounded' ||
                  eff.bgMode === 'glass' ||
                  eff.bgMode === 'blur';

                const baseGlow =
                  eff.visualEffect === 'neon' || eff.visualEffect === 'glow'
                    ? `0 0 ${Math.max(8, Math.round((eff.glowIntensity ?? 60) / 5))}px ${eff.activeWordColor || eff.color}`
                    : eff.visualEffect === '3d-depth'
                    ? `2px 2px 0 ${eff.outlineColor || '#000'}, 4px 4px 0 ${eff.shadowColor || '#000'}`
                    : eff.visualEffect === 'retro'
                    ? `2px 2px 0 #F43F5E, -1px -1px 0 #22D3EE`
                    : eff.visualEffect === 'glitch'
                    ? `-2px 0 0 #22D3EE, 2px 0 0 #F43F5E`
                    : `0 2px ${eff.shadowBlur ?? 6}px ${eff.shadowColor || 'rgba(0,0,0,0.85)'}`;

                return (
                  <div
                    dir="auto"
                    style={{
                      top: `calc(${posTop} + ${eff.manualY ?? 0}%)`,
                      left: `calc(50% + ${eff.manualX ?? 0}%)`,
                      transform: `translate(-50%, -50%) ${live.transform !== 'none' ? live.transform : ''}`,
                      opacity: live.opacity,
                      filter: live.filter !== 'none' ? live.filter : undefined,
                      textAlign: eff.align || 'center',
                      maxWidth: '90%',
                    }}
                    className="absolute z-30 pointer-events-none flex flex-col items-center"
                  >
                    <div
                      style={{
                        fontFamily: eff.fontFamily || 'Montserrat',
                        fontWeight: eff.fontWeight ?? 800,
                        fontStyle: eff.italic ? 'italic' : 'normal',
                        fontSize: `${Math.max(12, Math.round((eff.fontSize || 26) * 0.68))}px`,
                        letterSpacing: `${eff.letterSpacing ?? 0}px`,
                        lineHeight: eff.lineHeight ?? 1.25,
                        backgroundColor: hasContainerBox ? rgbaBg : 'transparent',
                        backdropFilter:
                          eff.bgMode === 'glass' || eff.bgMode === 'blur' || eff.visualEffect === 'glass'
                            ? 'blur(10px)'
                            : undefined,
                        border:
                          eff.bgMode === 'glass' || eff.visualEffect === 'glass'
                            ? '1px solid rgba(255,255,255,0.18)'
                            : undefined,
                        borderRadius: `${eff.bgMode === 'rounded' || eff.bgMode === 'glass' ? Math.max(8, eff.borderRadius ?? 10) : eff.borderRadius ?? 6}px`,
                        padding: hasContainerBox ? `${eff.paddingY ?? 6}px ${eff.paddingX ?? 12}px` : undefined,
                      }}
                      className="inline-flex flex-col gap-0.5"
                    >
                      {lines.map((lineWords, li) => (
                        <div key={li} className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                          {lineWords.map((ws, wi) => {
                            if (!ws.isVisible) return null;
                            const isWordBoxed = eff.bgMode === 'word-boxes' || eff.bgMode === 'marker';
                            const wordBg = ws.isHighlighted
                              ? eff.bgMode === 'marker' || eff.bgMode === 'word-boxes' || eff.visualEffect === 'highlight-marker'
                                ? eff.highlightBgColor || '#2563EB'
                                : undefined
                              : isWordBoxed
                              ? rgbaBg
                              : undefined;
                            const wordScale =
                              ws.isActive && (eff.activeWordAnimation === 'scale-punch' || eff.activeWordAnimation === 'pop' || eff.activeWordAnimation === 'bounce')
                                ? 'scale(1.08)'
                                : undefined;

                            return (
                              <span
                                key={wi}
                                style={{
                                  display: 'inline-block',
                                  color: eff.gradientEnabled && !ws.isHighlighted
                                    ? 'transparent'
                                    : ws.isHighlighted
                                    ? eff.activeWordColor || eff.color
                                    : ws.isSpoken && eff.secondaryWordColor
                                    ? eff.color
                                    : eff.color,
                                  backgroundImage:
                                    eff.gradientEnabled && !ws.isHighlighted
                                      ? `linear-gradient(90deg, ${eff.gradientFrom || '#38BDF8'}, ${eff.gradientTo || '#F472B6'})`
                                      : undefined,
                                  WebkitBackgroundClip: eff.gradientEnabled && !ws.isHighlighted ? 'text' : undefined,
                                  backgroundColor: wordBg,
                                  borderRadius: wordBg ? `${Math.min(10, eff.borderRadius ?? 6)}px` : undefined,
                                  padding: wordBg ? '1px 5px' : undefined,
                                  WebkitTextStroke:
                                    (eff.outlineThickness ?? 0) > 0 && !eff.gradientEnabled
                                      ? `${Math.max(0.4, (eff.outlineThickness ?? 2) * 0.28)}px ${eff.outlineColor || '#000000'}`
                                      : undefined,
                                  textShadow: eff.gradientEnabled ? undefined : baseGlow,
                                  transform: wordScale,
                                  transition: 'transform 90ms ease-out, color 90ms ease-out',
                                }}
                              >
                                {ws.word}
                              </span>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Preview-Only Platform Safe-Zone Guide Overlay (Never Exported) */}
              {captionStyle.safeZoneGuide && captionStyle.safeZoneGuide !== 'none' && (
                <div className="absolute inset-0 pointer-events-none z-40">
                  <div className="absolute inset-x-[7%] top-[12%] bottom-[22%] border border-dashed border-cyan-400/55 rounded-sm">
                    <span className="absolute -top-4 left-0 text-[9px] font-mono uppercase tracking-wider bg-cyan-950/80 text-cyan-300 px-1.5 py-0.5 rounded-sm">
                      {captionStyle.safeZoneGuide === 'tiktok'
                        ? 'TikTok Safe Zone'
                        : captionStyle.safeZoneGuide === 'reels'
                        ? 'Instagram Reels Safe Zone'
                        : 'YouTube Shorts Safe Zone'}
                    </span>
                  </div>
                  <div className="absolute right-[2%] bottom-[16%] w-[10%] h-[36%] border border-dashed border-rose-400/45 rounded-sm flex items-center justify-center">
                    <span className="text-[8px] font-mono text-rose-300/80 -rotate-90 whitespace-nowrap">UI Icons</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* D. FLOATING PLAYBACK CONTROL BAR */}
          <div className="shrink-0 mt-2 bg-[#141720] border border-white/[0.08] rounded px-3 py-1.5 flex items-center justify-between gap-3">
            {/* Transport Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                title="Go to Beginning"
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime((t) => Math.max(0, Number((t - 1 / fps).toFixed(3))));
                }}
                title="Previous Frame"
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors mx-0.5"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime((t) => Math.min(sequenceDuration, Number((t + 1 / fps).toFixed(3))));
                }}
                title="Next Frame"
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono tabular-nums text-[11px] text-slate-200 ml-2 whitespace-nowrap">
                {formatTimecode(currentTime, fps)}{' '}
                <span className="text-slate-500">/ {formatTimecode(sequenceDuration, fps)}</span>
              </span>
            </div>

            {/* Aspect Ratio Selector + Edit Actions */}
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center bg-[#0c0e13] p-0.5 rounded border border-white/[0.08]">
                {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => {
                      const next = { ...exportSettings, aspectRatio: ratio };
                      setExportSettings(next);
                      persistPatch({ exportSettings: next }, true);
                    }}
                    className={`px-2 py-0.5 rounded-sm font-mono text-[10px] transition-colors ${
                      aspectRatio === ratio ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSplitAtTime(currentTime)}
                title="Split at Playhead"
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06]"
              >
                <Scissors className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={undoStack.length === 0}
                onClick={handleUndo}
                title="Undo"
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={redoStack.length === 0}
                onClick={handleRedo}
                title="Redo"
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('export');
                  setLeftPanelOpen(true);
                  setPreviewMaximized(false);
                }}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold whitespace-nowrap hidden md:inline-flex items-center gap-1"
              >
                <DownloadCloud className="w-3 h-3" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT-SIDE CAPTION DESIGNER + HORIZONTAL RESIZE HANDLE */}
        {!previewMaximized && captionDesignerOpen && (
          <>
            <div
              onMouseDown={(e) => setResizingRight({ startX: e.clientX, startWidth: captionDesignerWidth })}
              title="Drag to resize Caption Designer"
              className="w-1 bg-transparent hover:bg-blue-500/60 cursor-ew-resize transition-colors shrink-0"
            />
            <CaptionDesignerPanel
              widthPx={captionDesignerWidth}
              captions={captions}
              selectedCaption={selectedCaption}
              captionStyle={displayCaptionStyle}
              customPresets={customPresets}
              isAligning={isAligningCaptions}
              alignStatusMessage={alignStatusMessage}
              onCollapse={() => setCaptionDesignerOpen(false)}
              onUpdateStyle={handleUpdateCaptionStyleOrCue}
              onApplyStyleToAll={handleApplyStyleToAll}
              onClearSelectedOverride={handleClearSelectedOverride}
              onSelectCue={(cue) => {
                setCurrentTime(cue.startMs / 1000);
                const t1Clip = tracks.find((t) => t.id === 't1')?.clips.find((cl) => cl.captionId === cue.id);
                if (t1Clip) setSelectedClipIds([t1Clip.id]);
              }}
              onUpdateCueTextAndTiming={handleUpdateCueTextAndTiming}
              onSplitCue={handleSplitCaptionCue}
              onMergeNextCue={handleMergeNextCaptionCue}
              onDeleteCue={handleDeleteCaptionCue}
              onChangeGrouping={handleChangeGrouping}
              onAlignFromAudio={() => void handleAlignFromAudio()}
              onGenerateFromVoice={() => handleGenerateCaptions('voiceover')}
              onGenerateFromScript={() => handleGenerateCaptions('script')}
              onSaveCustomPreset={handleSaveCustomPreset}
              onRenameCustomPreset={handleRenameCustomPreset}
              onDuplicateCustomPreset={handleDuplicateCustomPreset}
              onDeleteCustomPreset={handleDeleteCustomPreset}
              onSetDefaultCustomPreset={handleSetDefaultCustomPreset}
            />
          </>
        )}
      </div>

      {/* RESIZABLE TIMELINE SPLITTER */}
      {!previewMaximized && (
        <div
          onMouseDown={(e) => setResizingTimeline({ startY: e.clientY, startHeight: timelineHeight })}
          title="Drag to resize timeline height"
          className="h-1.5 bg-[#0b0d12] hover:bg-blue-500/60 border-t border-white/[0.06] cursor-ns-resize transition-colors shrink-0 flex items-center justify-center"
        >
          <div className="w-10 h-0.5 bg-white/20 rounded-full" />
        </div>
      )}

      {/* MULTI-TRACK TIMELINE */}
      {!previewMaximized && (
        <TimelinePanel
          heightPx={timelineHeight}
          trackHeightPx={trackHeightPx}
          tracks={displayTracks}
          mediaItems={mediaItems}
          currentTime={currentTime}
          sequenceDuration={sequenceDuration}
          zoomPct={zoomPct}
          snapEnabled={snapEnabled}
          timelineTool={timelineTool}
          selectedClipIds={selectedClipIds}
          selectedTrackId={selectedTrackId}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onSeek={(sec) => setCurrentTime(sec)}
          onSelectClips={setSelectedClipIds}
          onSelectTrack={setSelectedTrackId}
          onSetZoomPct={setZoomPct}
          onSetTrackHeightPx={setTrackHeightPx}
          onToggleSnap={() => setSnapEnabled((s) => !s)}
          onSetTimelineTool={setTimelineTool}
          onSplitAtTime={handleSplitAtTime}
          onDuplicateSelected={handleDuplicateSelected}
          onDeleteSelected={handleDeleteSelected}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onToggleTrackFlag={handleToggleTrackFlag}
          onStartClipDrag={(e, clip, track, mode, laneWidth) => {
            pushUndo();
            setDragState({
              clipId: clip.id,
              trackId: track.id,
              mode,
              startClientX: e.clientX,
              origStart: clip.startTime,
              origDuration: clip.duration,
              origTrimStart: clip.trimStart || 0,
              laneWidth,
            });
          }}
          onDropMediaOnTrack={(mediaId, trackId, atSec) => {
            const item = mediaItems.find((m) => m.id === mediaId);
            if (item) addMediaToTrack(item, trackId, atSec);
          }}
          onDropFishOnTrack={(fishId, trackId, atSec) => {
            const rec = history.find((h) => h.id === fishId);
            if (rec) addFishAudioToTrack(rec, trackId, atSec);
          }}
        />
      )}

      {/* AUTO STYLE CONFIGURATION MODAL */}
      {autoStyleModalOpen && (
        <AutoStyleModal
          selectedStyleId={autoStyleSelectedId}
          intensity={autoStyleIntensity}
          options={autoStyleOptions}
          conflictMode={autoStyleConflictMode}
          hasPreviousAutoStyle={Boolean(currentProject?.lastAutoStyle)}
          previousAutoStyleLabel={
            currentProject?.lastAutoStyle
              ? `${AUTO_STYLE_PRESETS.find((p) => p.id === currentProject.lastAutoStyle?.styleId)?.name || currentProject.lastAutoStyle.styleId} · ${currentProject.lastAutoStyle.intensity}`
              : undefined
          }
          hasCaptions={captions.length > 0}
          hasVoiceover={
            tracks.some((t) => t.id === 'a1' && t.clips.length > 0) ||
            Boolean(currentProject?.audioRecordId) ||
            history.length > 0
          }
          hasScript={Boolean(currentProject?.scriptText?.trim() || history[0]?.text)}
          isPreviewing={isPreviewingAutoStyle}
          planSummary={computedAutoStyle.summary}
          onSelectStyle={setAutoStyleSelectedId}
          onSelectIntensity={setAutoStyleIntensity}
          onUpdateOptions={(patch) => setAutoStyleOptions((prev) => ({ ...prev, ...patch }))}
          onChangeConflictMode={setAutoStyleConflictMode}
          onGenerateCaptionsFromVoice={() => handleGenerateCaptions('voiceover')}
          onGenerateCaptionsFromScript={() => handleGenerateCaptions('script')}
          onPreview={() => {
            setIsPreviewingAutoStyle(true);
            setAutoStyleModalOpen(false);
            setCurrentTime(0);
            setIsPlaying(true);
          }}
          onStopPreview={() => {
            setIsPreviewingAutoStyle(false);
            setIsPlaying(false);
          }}
          onApply={handleApplyAutoStyle}
          onCancel={() => {
            setIsPreviewingAutoStyle(false);
            setIsPlaying(false);
            setAutoStyleModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
