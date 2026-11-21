/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AutoStyleId,
  AutoStyleOptions,
  CaptionStyle,
  MediaItem,
  MotionPreset,
  StyleIntensity,
  TimelineClip,
  TimelineTrack,
  TransitionType,
} from '../types';
import { CAPTION_PRESETS, DEFAULT_CAPTION_STYLE } from './captionPresets';

export interface AutoStyleDefinition {
  id: AutoStyleId;
  name: string;
  tagline: string;
  accentHex: string;
  motionSequence: MotionPreset[];
  transitionSequence: TransitionType[];
  captionPresetId: string;
  captionOverrides?: Partial<CaptionStyle>;
  visualGrade: {
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
    vignette: number;
    filmGrain: number;
    sharpen: number;
    filterPreset: string;
  };
}

export const AUTO_STYLE_PRESETS: AutoStyleDefinition[] = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'Ken Burns motion, film dissolves, vignette & clean subtitles',
    accentHex: '#F59E0B',
    motionSequence: ['ken-burns', 'zoom-in', 'pan-right', 'zoom-out', 'zoom-pan', 'pan-left'],
    transitionSequence: ['cinematic', 'crossfade', 'fade-black', 'blur-dissolve'],
    captionPresetId: 'cinematic-subtitle',
    captionOverrides: {
      fontFamily: 'Poppins',
      fontSize: 22,
      color: '#F8FAFC',
      animation: 'fade',
      bgMode: 'none',
      highlightMode: 'none',
      position: 'bottom',
    },
    visualGrade: {
      brightness: 96,
      contrast: 118,
      saturation: 90,
      temperature: -8,
      vignette: 38,
      filmGrain: 14,
      sharpen: 12,
      filterPreset: 'cinematic',
    },
  },
  {
    id: 'dynamic',
    name: 'Dynamic',
    tagline: 'Energetic zoom-pans, punchy slides & pop word highlighting',
    accentHex: '#38BDF8',
    motionSequence: ['zoom-in', 'zoom-pan', 'pan-left', 'zoom-out', 'pan-right'],
    transitionSequence: ['zoom-in', 'slide-left', 'wipe-left', 'slide-up'],
    captionPresetId: 'word-pop',
    captionOverrides: {
      fontFamily: 'Montserrat',
      fontWeight: 900,
      fontSize: 30,
      textTransform: 'uppercase',
      color: '#FFFFFF',
      activeWordColor: '#38BDF8',
      highlightMode: 'current-word',
      animation: 'pop',
      position: 'lower-middle',
    },
    visualGrade: {
      brightness: 103,
      contrast: 116,
      saturation: 122,
      temperature: 4,
      vignette: 14,
      filmGrain: 0,
      sharpen: 22,
      filterPreset: 'vivid',
    },
  },
  {
    id: 'documentary',
    name: 'Documentary',
    tagline: 'Steady pans, measured dissolves & editorial amber captions',
    accentHex: '#FDE047',
    motionSequence: ['pan-right', 'zoom-in', 'pan-left', 'zoom-out', 'ken-burns'],
    transitionSequence: ['crossfade', 'fade-black', 'crossfade', 'wipe-left'],
    captionPresetId: 'documentary-style',
    captionOverrides: {
      fontFamily: 'Noto Sans',
      fontWeight: 700,
      fontSize: 23,
      color: '#FDE047',
      activeWordColor: '#FFFFFF',
      bgMode: 'semi',
      backgroundColor: '#000000',
      bgOpacity: 75,
      highlightMode: 'keywords',
      animation: 'fade',
      position: 'bottom',
    },
    visualGrade: {
      brightness: 98,
      contrast: 112,
      saturation: 94,
      temperature: -4,
      vignette: 24,
      filmGrain: 8,
      sharpen: 15,
      filterPreset: 'cinematic',
    },
  },
  {
    id: 'social',
    name: 'Social Media',
    tagline: 'Short-form punch zooms, snappy transitions & bold active-word boxes',
    accentHex: '#22C55E',
    motionSequence: ['zoom-pan', 'zoom-in', 'ken-burns', 'zoom-out'],
    transitionSequence: ['zoom-in', 'slide-up', 'slide-left', 'blur-dissolve'],
    captionPresetId: 'tiktok-bold',
    captionOverrides: {
      fontFamily: 'Montserrat',
      fontWeight: 900,
      fontSize: 31,
      textTransform: 'uppercase',
      color: '#FFFFFF',
      activeWordColor: '#FDE047',
      highlightBgColor: '#2563EB',
      bgMode: 'word-boxes',
      backgroundColor: '#0F172A',
      bgOpacity: 75,
      highlightMode: 'current-word',
      animation: 'scale-punch',
      position: 'lower-middle',
    },
    visualGrade: {
      brightness: 104,
      contrast: 120,
      saturation: 128,
      temperature: 6,
      vignette: 10,
      filmGrain: 0,
      sharpen: 28,
      filterPreset: 'vivid',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Gentle zooms, quiet crossfades & crisp white captions',
    accentHex: '#E2E8F0',
    motionSequence: ['zoom-in', 'zoom-out'],
    transitionSequence: ['crossfade', 'fade-black'],
    captionPresetId: 'minimal-white',
    captionOverrides: {
      fontFamily: 'Nunito Sans',
      fontWeight: 700,
      fontSize: 21,
      color: '#FFFFFF',
      bgMode: 'none',
      highlightMode: 'none',
      animation: 'slide-up',
      position: 'bottom',
    },
    visualGrade: {
      brightness: 100,
      contrast: 104,
      saturation: 98,
      temperature: 0,
      vignette: 6,
      filmGrain: 0,
      sharpen: 8,
      filterPreset: 'none',
    },
  },
  {
    id: 'creative',
    name: 'Creative',
    tagline: 'Alternating Ken Burns, blur dissolves, warm grain & neon glow',
    accentHex: '#22D3EE',
    motionSequence: ['ken-burns', 'pan-left', 'zoom-pan', 'pan-right', 'zoom-out'],
    transitionSequence: ['blur-dissolve', 'wipe-left', 'zoom-in', 'slide-up'],
    captionPresetId: 'neon-glow',
    captionOverrides: {
      fontFamily: 'Montserrat',
      fontWeight: 800,
      fontSize: 29,
      color: '#E0F2FE',
      activeWordColor: '#22D3EE',
      highlightMode: 'current-word',
      visualEffect: 'neon',
      glowIntensity: 80,
      animation: 'glow',
      position: 'middle',
    },
    visualGrade: {
      brightness: 102,
      contrast: 114,
      saturation: 118,
      temperature: 16,
      vignette: 30,
      filmGrain: 24,
      sharpen: 14,
      filterPreset: 'warm',
    },
  },
];

export const DEFAULT_AUTO_STYLE_OPTIONS: AutoStyleOptions = {
  applyToImages: true,
  applyToVisualClips: true,
  applyTransitions: true,
  applyCaptions: true,
  applyVisualEffects: true,
  imageMotionMode: 'alternating',
};

export interface AutoStylePlanSummary {
  imagesStyled: number;
  videosStyled: number;
  transitionsApplied: number;
  effectsApplied: number;
  captionsStyled: boolean;
  skippedManualClips: number;
}

export function getIntensityMultipliers(intensity: StyleIntensity) {
  if (intensity === 'subtle') {
    return {
      motionIntensity: 0.45,
      transitionDuration: 0.85,
      effectStrength: 0.45,
      captionAnimIntensity: 45,
      captionAnimDurationMs: 280,
    };
  }
  if (intensity === 'strong') {
    return {
      motionIntensity: 1.65,
      transitionDuration: 0.34,
      effectStrength: 1.45,
      captionAnimIntensity: 120,
      captionAnimDurationMs: 130,
    };
  }
  return {
    motionIntensity: 1.0,
    transitionDuration: 0.55,
    effectStrength: 1.0,
    captionAnimIntensity: 75,
    captionAnimDurationMs: 200,
  };
}

function isClipImage(clip: TimelineClip, mediaItems: MediaItem[]): boolean {
  const media = mediaItems.find((m) => m.id === clip.sourceMediaId);
  if (media) return media.type === 'image';
  const url = clip.sourceUrl || '';
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(url);
}

/**
 * Pure deterministic Auto Style transformation over existing timeline tracks and captionStyle.
 * Preserves clip order, clip startTime/duration, audio tracks (A1/A2/A3), and caption text/timing.
 */
export function computeAutoStyleResult(params: {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  captionStyle: CaptionStyle;
  styleId: AutoStyleId;
  intensity: StyleIntensity;
  options: AutoStyleOptions;
  conflictMode?: 'replace-all' | 'preserve-manual';
}): {
  nextTracks: TimelineTrack[];
  nextCaptionStyle: CaptionStyle;
  summary: AutoStylePlanSummary;
} {
  const { tracks, mediaItems, captionStyle, styleId, intensity, options, conflictMode = 'replace-all' } = params;
  const def = AUTO_STYLE_PRESETS.find((s) => s.id === styleId) || AUTO_STYLE_PRESETS[0];
  const mult = getIntensityMultipliers(intensity);

  const summary: AutoStylePlanSummary = {
    imagesStyled: 0,
    videosStyled: 0,
    transitionsApplied: 0,
    effectsApplied: 0,
    captionsStyled: false,
    skippedManualClips: 0,
  };

  let lastMotion: MotionPreset | null = null;
  let lastTransition: TransitionType | null = null;
  let motionCursor = 0;
  let transCursor = 0;

  const pickNonRepeatingMotion = (clipIsImage: boolean): MotionPreset => {
    if (clipIsImage && options.imageMotionMode !== 'alternating') {
      return options.imageMotionMode;
    }
    const pool = def.motionSequence;
    let candidate = pool[motionCursor % pool.length];
    if (pool.length > 1 && candidate === lastMotion) {
      motionCursor += 1;
      candidate = pool[motionCursor % pool.length];
    }
    motionCursor += 1;
    lastMotion = candidate;
    return candidate;
  };

  const pickNonRepeatingTransition = (): TransitionType => {
    const pool = def.transitionSequence;
    let candidate = pool[transCursor % pool.length];
    if (pool.length > 1 && candidate === lastTransition) {
      transCursor += 1;
      candidate = pool[transCursor % pool.length];
    }
    transCursor += 1;
    lastTransition = candidate;
    return candidate;
  };

  const nextTracks: TimelineTrack[] = tracks.map((track) => {
    // Never mutate audio, caption timing, or text tracks' timing/order
    if (track.type !== 'video' && track.type !== 'overlay') {
      return track;
    }
    if (track.locked) {
      return track;
    }

    // Sort visual clips chronologically ONLY to compute alternating transition/motion order,
    // while returning the exact original array order and never altering startTime/duration!
    const chronoIds = [...track.clips]
      .sort((a, b) => a.startTime - b.startTime)
      .map((c) => c.id);

    const clipUpdates = new Map<string, TimelineClip>();

    chronoIds.forEach((clipId, chronoIdx) => {
      const clip = track.clips.find((c) => c.id === clipId);
      if (!clip) return;

      const clipIsImg = isClipImage(clip, mediaItems);
      const eligible =
        (clipIsImg && (options.applyToImages || options.applyToVisualClips)) ||
        (!clipIsImg && options.applyToVisualClips);

      if (!eligible) {
        clipUpdates.set(clip.id, clip);
        return;
      }

      // Check manual edit preservation when re-applying Auto Style
      const hasManualEdits =
        !clip.autoStyled &&
        ((clip.motionPreset && clip.motionPreset !== 'none') ||
          (clip.transition && clip.transition !== 'none') ||
          (clip.filterPreset && clip.filterPreset !== 'none') ||
          (clip.vignette || 0) > 0 ||
          (clip.filmGrain || 0) > 0);

      if (conflictMode === 'preserve-manual' && hasManualEdits) {
        summary.skippedManualClips += 1;
        clipUpdates.set(clip.id, clip);
        return;
      }

      const updated: TimelineClip = { ...clip, autoStyled: true, autoStyleId: styleId };

      // 1. Motion
      if (clipIsImg && options.applyToImages) {
        updated.motionPreset = pickNonRepeatingMotion(true);
        updated.motionIntensity = mult.motionIntensity;
        summary.imagesStyled += 1;
      } else if (!clipIsImg && options.applyToVisualClips) {
        // Apply subtle complementary motion on video clips only at balanced/strong if alternating
        updated.motionPreset = intensity === 'subtle' ? 'none' : pickNonRepeatingMotion(false);
        updated.motionIntensity = Number((mult.motionIntensity * 0.65).toFixed(2));
        summary.videosStyled += 1;
      }

      // 2. Transitions between consecutive visual clips (skip if clip is very short < 0.7s)
      if (options.applyTransitions && clip.duration >= 0.7) {
        if (chronoIdx === 0) {
          // Gentle fade in on opening clip
          updated.transition = styleId === 'minimal' || styleId === 'cinematic' || styleId === 'documentary' ? 'fade-black' : 'crossfade';
          updated.transitionDuration = Math.min(Number((clip.duration * 0.35).toFixed(2)), mult.transitionDuration);
          updated.fadeIn = updated.transitionDuration;
        } else {
          const chosenTr = pickNonRepeatingTransition();
          const trDur = Math.min(Number((clip.duration * 0.35).toFixed(2)), mult.transitionDuration);
          updated.transition = chosenTr;
          updated.transitionDuration = trDur;
          updated.fadeIn = trDur;
        }
        summary.transitionsApplied += 1;
      }

      // 3. Coordinated Visual Effects & Color Grade
      if (options.applyVisualEffects) {
        const g = def.visualGrade;
        const scaleDelta = (val: number, base = 100) =>
          Math.round(base + (val - base) * mult.effectStrength);

        updated.brightness = Math.max(60, Math.min(140, scaleDelta(g.brightness)));
        updated.contrast = Math.max(70, Math.min(150, scaleDelta(g.contrast)));
        updated.saturation = Math.max(0, Math.min(170, scaleDelta(g.saturation)));
        updated.temperature = Math.max(-50, Math.min(50, Math.round(g.temperature * mult.effectStrength)));
        updated.vignette = Math.max(0, Math.min(85, Math.round(g.vignette * mult.effectStrength)));
        updated.filmGrain = Math.max(0, Math.min(65, Math.round(g.filmGrain * mult.effectStrength)));
        updated.sharpen = Math.max(0, Math.min(60, Math.round(g.sharpen * mult.effectStrength)));
        updated.filterPreset = g.filterPreset;
        summary.effectsApplied += 1;
      }

      clipUpdates.set(clip.id, updated);
    });

    return {
      ...track,
      clips: track.clips.map((c) => clipUpdates.get(c.id) || c),
    };
  });

  // 4. Coordinated Caption Styling (preserves user's text, words, grouping, and timing)
  let nextCaptionStyle = captionStyle;
  if (options.applyCaptions) {
    const builtIn = CAPTION_PRESETS.find((p) => p.id === def.captionPresetId);
    nextCaptionStyle = {
      ...DEFAULT_CAPTION_STYLE,
      ...captionStyle,
      ...(builtIn?.style || {}),
      ...(def.captionOverrides || {}),
      animIntensity: mult.captionAnimIntensity,
      animDurationMs: mult.captionAnimDurationMs,
      presetId: `autostyle-${styleId}`,
      presetName: `Auto Style · ${def.name}`,
    };
    summary.captionsStyled = true;
  }

  return { nextTracks, nextCaptionStyle, summary };
}
