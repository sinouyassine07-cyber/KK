export type UILanguage = 'en' | 'ar';

export type NavSection =
  | 'dashboard'
  | 'projects'
  | 'channels'
  | 'workflow'
  | 'script-studio'
  | 'studio'
  | 'video-editor'
  | 'library'
  | 'history'
  | 'favorites'
  | 'settings'
  | 'api-config';

export interface Channel {
  id: string;
  name: string;
  description: string;
  niche: string;
  language: string;
  targetAudience: string;
  contentType: string;
  mainPrompt: string;
  writingStylePrompt: string;
  scriptStructure: string;
  tone: string;
  defaultModel: string;
  defaultVoiceId: string | null;
  videoFormat: string;
  captionStyle: string;
  updatedAt: string;
}

export interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio' | 'bgm' | 'sfx';
  url: string;
  sizeBytes: number;
  duration?: number;
  width?: number;
  height?: number;
  source?: 'upload' | 'fish-audio';
  createdAt: string;
}

export type TransitionType =
  | 'none'
  | 'crossfade'
  | 'fade-black'
  | 'zoom-in'
  | 'slide-up'
  | 'slide-left'
  | 'blur-dissolve'
  | 'wipe-left'
  | 'cinematic';

export type MotionPreset =
  | 'none'
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'zoom-pan'
  | 'ken-burns';

export type AutoStyleId = 'cinematic' | 'dynamic' | 'documentary' | 'social' | 'minimal' | 'creative';
export type StyleIntensity = 'subtle' | 'balanced' | 'strong';

export interface AutoStyleOptions {
  applyToImages: boolean;
  applyToVisualClips: boolean;
  applyTransitions: boolean;
  applyCaptions: boolean;
  applyVisualEffects: boolean;
  imageMotionMode: 'alternating' | MotionPreset;
}

export type CaptionAnimation =
  | 'none'
  | 'pop'
  | 'bounce'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'typewriter'
  | 'karaoke-fill'
  | 'word-highlight'
  | 'spring'
  | 'shake'
  | 'flip'
  | 'glow'
  | 'blur-to-sharp'
  | 'scale-punch';

export type CaptionVisualEffect =
  | 'none'
  | 'neon'
  | 'glow'
  | 'stroke'
  | 'shadow'
  | 'gradient'
  | '3d-depth'
  | 'highlight-marker'
  | 'color-pop'
  | 'retro'
  | 'glitch'
  | 'blur'
  | 'glass';

export type CaptionGroupingMode =
  | '1-word'
  | '2-words'
  | '3-words'
  | '4-words'
  | 'auto-pauses'
  | 'sentence'
  | 'manual';

export type CaptionPosition = 'top' | 'upper-middle' | 'middle' | 'lower-middle' | 'bottom';
export type SafeZonePlatform = 'none' | 'tiktok' | 'reels' | 'shorts';

export interface CaptionWord {
  word: string;
  startMs: number;
  endMs: number;
  isPauseBreak?: boolean;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  sourceMediaId?: string;
  sourceUrl?: string;
  title?: string;
  volume?: number;
  trimStart?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  fadeIn?: number;
  fadeOut?: number;
  speed?: number;
  transition?: TransitionType;
  transitionDuration?: number;
  motionPreset?: MotionPreset;
  motionIntensity?: number;
  autoStyled?: boolean;
  autoStyleId?: AutoStyleId;
  cropTop?: number;
  cropBottom?: number;
  cropLeft?: number;
  cropRight?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  temperature?: number;
  vignette?: number;
  filmGrain?: number;
  sharpen?: number;
  filterPreset?: string;
  fontFamily?: string;
  textColor?: string;
  bgColor?: string;
  outlineColor?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  captionId?: string;
  captionAnimation?: CaptionAnimation;
}

export interface TimelineTrack {
  id: string;
  type: 'video' | 'overlay' | 'audio' | 'caption' | 'text';
  name: string;
  muted?: boolean;
  solo?: boolean;
  hidden?: boolean;
  locked?: boolean;
  clips: TimelineClip[];
}

export interface CaptionItem {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  words?: CaptionWord[];
  wordSyncAvailable?: boolean;
  styleOverride?: Partial<CaptionStyle>;
}

export interface CaptionStyle {
  fontFamily: string;
  fontWeight?: number;
  fontSize: number;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  italic?: boolean;
  align?: 'left' | 'center' | 'right';

  color: string;
  activeWordColor?: string;
  highlightBgColor?: string;
  secondaryWordColor?: string;
  outlineColor?: string;
  shadowColor?: string;
  gradientEnabled?: boolean;
  gradientFrom?: string;
  gradientTo?: string;

  highlightMode?: 'current-word' | 'keywords' | 'numbers' | 'phrases' | 'none';
  highlightKeywords?: string;
  highlightNumbers?: boolean;
  autoEmphasis?: boolean;

  animation?: CaptionAnimation;
  lineEntrance?: CaptionAnimation;
  lineExit?: CaptionAnimation;
  activeWordAnimation?: CaptionAnimation;
  animDurationMs?: number;
  animIntensity?: number;
  animDelayMs?: number;
  animEasing?: 'ease-out' | 'spring' | 'linear' | 'ease-in-out';

  bgMode?: 'none' | 'solid' | 'semi' | 'rounded' | 'word-boxes' | 'marker' | 'glass' | 'blur';
  backgroundColor: string;
  bgOpacity?: number;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  outlineThickness?: number;
  shadowBlur?: number;
  glowIntensity?: number;
  visualEffect?: CaptionVisualEffect;

  groupingMode?: CaptionGroupingMode;
  maxWordsPerLine?: number;
  maxLines?: number;

  position: CaptionPosition;
  manualX?: number;
  manualY?: number;
  safeZoneGuide?: SafeZonePlatform;

  presetId?: string;
  presetName?: string;
}

export interface CustomCaptionPreset {
  id: string;
  name: string;
  category: string;
  isDefault?: boolean;
  style: CaptionStyle;
  createdAt: string;
}

export interface ExportJob {
  renderId: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  downloadUrl?: string;
  srtUrl?: string;
  vttUrl?: string;
  fileSizeBytes?: number;
  fileSizeMb?: number;
  createdAt: string;
}

export type WorkspacePreset = 'editing' | 'preview' | 'timeline';

export interface EditorWorkspaceState {
  activePreset?: WorkspacePreset;
  timelineHeight?: number;
  leftPanelOpen?: boolean;
  captionDesignerOpen?: boolean;
  rightPanelOpen?: boolean;
  leftDrawerWidth?: number;
  captionDesignerWidth?: number;
  inspectorWidth?: number;
  trackHeightPx?: number;
  zoomPct?: number;
  previewQuality?: 'full' | 'half' | 'draft';
}

export interface Project {
  id: string;
  title: string;
  channelId: string | null;
  channelSnapshot: Channel | null;
  scriptText: string;
  scriptVersions: { id: string; title: string; text: string; createdAt: string }[];
  voiceSettings: { voiceId: string | null; speed: number; volume: number };
  audioRecordId: string | null;
  audioUrl: string | null;
  mediaItems: MediaItem[];
  timeline: { tracks: TimelineTrack[] };
  captions: CaptionItem[];
  captionStyle?: CaptionStyle;
  exportSettings: { resolution: string; aspectRatio: string; fps: number; quality: string; burnCaptions: boolean };
  exportHistory: ExportJob[];
  workspaceState?: EditorWorkspaceState;
  lastAutoStyle?: {
    styleId: AutoStyleId;
    intensity: StyleIntensity;
    appliedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type FishAudioModel = 's2.1-pro' | 's2.1-pro-free' | 's2-pro' | 's1';

export type AudioFormat = 'mp3' | 'wav' | 'opus' | 'pcm';

export type LatencyMode = 'normal' | 'balanced';

export interface GenerationParams {
  model: FishAudioModel;
  format: AudioFormat;
  mp3_bitrate: 64 | 128 | 192;
  opus_bitrate: 24 | 32 | 48 | 64 | -1000;
  sample_rate: number | null;
  speed: number;
  volume: number;
  temperature: number;
  top_p: number;
  repetition_penalty: number;
  chunk_length: number;
  normalize: boolean;
  latency: LatencyMode;
  continuous_narration: boolean;
  segment_pause_ms: 0 | 150 | 350;
  parallel_concurrency: 1 | 2 | 3;
}

export interface GenerationProgress {
  phase: 'splitting' | 'generating' | 'stitching';
  currentSegment: number;
  completedSegments?: number;
  totalSegments: number;
  segmentText?: string;
}

export interface DirectedSegment {
  id: string;
  text: string;
  emotionTag: string;
  speed: number | null;
  voiceMode: 'global' | 'default' | 'custom';
  voiceId: string | null;
  voiceName?: string;
}

export interface DirectedSegmentPayload {
  text: string;
  emotionTag?: string;
  speed?: number | null;
  voiceId?: string | null;
}

export interface VoiceSample {
  title?: string;
  text?: string;
  task_id?: string;
  audio: string;
}

export interface VoiceAuthor {
  _id?: string;
  nickname?: string;
  avatar?: string;
}

export interface VoiceModel {
  _id: string;
  title: string;
  description?: string;
  cover_image?: string;
  tags?: string[];
  languages?: string[];
  visibility?: string;
  task_count?: number;
  like_count?: number;
  created_at?: string;
  author?: VoiceAuthor;
  samples?: VoiceSample[];
}

export type TranscriptSource = 'segment-exact' | 'fish-asr' | 'gemini-ai' | 'acoustic-align';

export type TranscriptFormat = 'srt' | 'vtt' | 'txt' | 'json';

export interface TranscriptCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  words?: CaptionWord[];
  wordSyncAvailable?: boolean;
}

export interface GenerationRecord {
  id: string;
  text: string;
  voiceId: string | null;
  voiceName: string;
  voiceAuthor?: string;
  model: FishAudioModel;
  format: AudioFormat;
  sampleRate: number | null;
  bitrate: number | null;
  speed: number;
  volume: number;
  temperature: number;
  topP: number;
  repetitionPenalty: number;
  latency: LatencyMode;
  normalize: boolean;
  chunkLength: number;
  segmentCount?: number;
  durationSeconds?: number;
  transcript?: TranscriptCue[];
  transcriptSource?: TranscriptSource;
  fileSizeBytes: number;
  createdAt: string;
  audioUrl: string;
  downloadUrl: string;
}

export interface ApiConfigStatus {
  configured: boolean;
  source: 'env' | 'user' | 'none';
  maskedKey: string | null;
  credit: number | null;
  updatedAt: string | null;
}

export interface UserPreferences {
  uiLanguage: UILanguage;
  defaultParams: GenerationParams;
  selectedVoice: VoiceModel | null;
  customCaptionPresets?: CustomCaptionPreset[];
}

export const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  model: 's2.1-pro-free',
  format: 'mp3',
  mp3_bitrate: 128,
  opus_bitrate: 32,
  sample_rate: 44100,
  speed: 1.0,
  volume: 0.0,
  temperature: 0.7,
  top_p: 0.7,
  repetition_penalty: 1.2,
  chunk_length: 200,
  normalize: true,
  latency: 'balanced',
  continuous_narration: true,
  segment_pause_ms: 150,
  parallel_concurrency: 3,
};
