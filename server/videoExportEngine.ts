import { execFile, spawn } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface MediaProbeResult {
  duration?: number;
  width?: number;
  height?: number;
  hasAudio: boolean;
}

export function resolveMediaExtension(mimeType: string, originalName: string): string {
  const mime = mimeType.toLowerCase().split(';')[0].trim();
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
    'video/x-msvideo': 'avi',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/flac': 'flac',
  };
  if (mimeMap[mime]) return mimeMap[mime];

  const ext = path.extname(originalName || '').replace(/^\./, '').toLowerCase();
  if (/^[a-z0-9]{2,5}$/.test(ext)) return ext;

  if (mime.startsWith('video/')) return 'mp4';
  if (mime.startsWith('audio/')) return 'mp3';
  return 'png';
}

export function resolveMediaKind(mimeType: string, explicitType?: string): 'video' | 'image' | 'audio' | 'bgm' | 'sfx' {
  if (explicitType === 'video' || explicitType === 'image' || explicitType === 'audio' || explicitType === 'bgm' || explicitType === 'sfx') {
    return explicitType;
  }
  const mime = mimeType.toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'image';
}

export async function probeMediaFile(filePath: string): Promise<MediaProbeResult> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
      { maxBuffer: 1024 * 1024 }
    );
    const parsed = JSON.parse(stdout) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; width?: number; height?: number; duration?: string }>;
    };
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const videoStream = streams.find((s) => s.codec_type === 'video');
    const audioStream = streams.find((s) => s.codec_type === 'audio');
    const rawDuration = Number(parsed.format?.duration || videoStream?.duration || audioStream?.duration);
    return {
      duration: Number.isFinite(rawDuration) && rawDuration > 0 ? Number(rawDuration.toFixed(2)) : undefined,
      width: typeof videoStream?.width === 'number' ? videoStream.width : undefined,
      height: typeof videoStream?.height === 'number' ? videoStream.height : undefined,
      hasAudio: Boolean(audioStream),
    };
  } catch {
    return { hasAudio: false };
  }
}

function formatSrtTime(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const hours = Math.floor(safe / 3600000);
  const mins = Math.floor((safe % 3600000) / 60000);
  const secs = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function formatAssTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe - Math.floor(safe)) * 100);
  return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

function hexToAssBgr(hex?: string, alphaByte = '00'): string {
  const cleaned = (hex || '#FFFFFF').replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    const r = cleaned.slice(0, 2);
    const g = cleaned.slice(2, 4);
    const b = cleaned.slice(4, 6);
    return `&H${alphaByte}${b}${g}${r}`.toUpperCase();
  }
  return `&H${alphaByte}FFFFFF`;
}

function escapeAssText(text: string): string {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\N')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
}

function formatVttTime(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const hours = Math.floor(safe / 3600000);
  const mins = Math.floor((safe % 3600000) / 60000);
  const secs = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function generateSrtContent(captions: Array<{ startMs: number; endMs: number; text: string }>): string {
  return captions
    .filter((c) => c && typeof c.text === 'string' && c.text.trim())
    .map((c, idx) => {
      const start = formatSrtTime(c.startMs || 0);
      const end = formatSrtTime(Math.max((c.startMs || 0) + 500, c.endMs || 0));
      return `${idx + 1}\n${start} --> ${end}\n${c.text.trim()}\n`;
    })
    .join('\n');
}

export function generateVttContent(captions: Array<{ startMs: number; endMs: number; text: string }>): string {
  const cues = captions
    .filter((c) => c && typeof c.text === 'string' && c.text.trim())
    .map((c, idx) => {
      const start = formatVttTime(c.startMs || 0);
      const end = formatVttTime(Math.max((c.startMs || 0) + 500, c.endMs || 0));
      return `${idx + 1}\n${start} --> ${end}\n${c.text.trim()}`;
    })
    .join('\n\n');
  return `WEBVTT\n\n${cues}\n`;
}

function getTargetDimensions(resolution: string, aspectRatio: string): { width: number; height: number } {
  const baseShort = resolution === '4K' || resolution === '4k' ? 2160 : resolution === '720p' ? 720 : 1080;
  let w = Math.round((baseShort * 16) / 9);
  let h = baseShort;

  if (aspectRatio === '9:16') {
    w = baseShort;
    h = Math.round((baseShort * 16) / 9);
  } else if (aspectRatio === '1:1') {
    w = baseShort;
    h = baseShort;
  }

  // Ensure even dimensions for libx264 yuv420p
  return {
    width: w % 2 === 0 ? w : w + 1,
    height: h % 2 === 0 ? h : h + 1,
  };
}

export interface RenderExportInput {
  project: any;
  settings: {
    resolution?: string;
    aspectRatio?: string;
    fps?: number;
    quality?: string;
    burnCaptions?: boolean;
  };
  historyItems: Array<{ id: string; format: string }>;
  mediaDir: string;
  audioDir: string;
  tmpDir: string;
  fontsDir?: string;
  outputMp4Path: string;
  outputSrtPath: string;
  outputVttPath?: string;
  onProgress?: (progress: number) => void;
}

function resolveLocalAssetPath(
  clip: any,
  mediaItems: any[],
  historyItems: Array<{ id: string; format: string }>,
  mediaDir: string,
  audioDir: string
): string | null {
  const candidates: string[] = [];
  if (typeof clip.sourceUrl === 'string' && clip.sourceUrl) candidates.push(clip.sourceUrl);
  const mediaItem = mediaItems.find((m) => m.id === clip.sourceMediaId);
  if (mediaItem?.url) candidates.push(mediaItem.url);

  for (const url of candidates) {
    if (url.startsWith('/api/media/file/')) {
      const filename = path.basename(url.split('?')[0]);
      return path.join(mediaDir, filename);
    }
    const histMatch = url.match(/^\/api\/history\/([^/]+)\/audio/);
    if (histMatch) {
      const recId = decodeURIComponent(histMatch[1]);
      const rec = historyItems.find((h) => h.id === recId);
      const ext = rec?.format || 'mp3';
      return path.join(audioDir, `${recId}.${ext}`);
    }
  }
  return null;
}

export async function renderProjectToMp4(input: RenderExportInput): Promise<{ fileSizeBytes: number; durationSeconds: number }> {
  const { project, settings, historyItems, mediaDir, audioDir, tmpDir, fontsDir, outputMp4Path, outputSrtPath, outputVttPath, onProgress } = input;
  const resolution = settings?.resolution || project?.exportSettings?.resolution || '1080p';
  const aspectRatio = settings?.aspectRatio || project?.exportSettings?.aspectRatio || '16:9';
  const fps = Math.min(60, Math.max(15, Number(settings?.fps || project?.exportSettings?.fps || 30)));
  const quality = settings?.quality || project?.exportSettings?.quality || 'high';
  const burnCaptions = settings?.burnCaptions ?? project?.exportSettings?.burnCaptions ?? true;

  const { width, height } = getTargetDimensions(resolution, aspectRatio);
  const tracks: any[] = Array.isArray(project?.timeline?.tracks) ? project.timeline.tracks : [];
  const mediaItems: any[] = Array.isArray(project?.mediaItems) ? project.mediaItems : [];
  const captions: any[] = Array.isArray(project?.captions) ? project.captions : [];
  const captionStyle = project?.captionStyle || {};

  // Write SRT & VTT artifacts regardless of burnCaptions so user can always download subtitles
  const srtText = generateSrtContent(captions);
  await fsp.writeFile(outputSrtPath, srtText, 'utf8');
  if (outputVttPath) {
    const vttText = generateVttContent(captions);
    await fsp.writeFile(outputVttPath, vttText, 'utf8');
  }

  // Determine sequence duration
  let maxEnd = 0;
  for (const tr of tracks) {
    for (const cl of tr.clips || []) {
      const end = Number(cl.startTime || 0) + Number(cl.duration || 0);
      if (end > maxEnd) maxEnd = end;
    }
  }
  for (const cap of captions) {
    const end = Number(cap.endMs || 0) / 1000;
    if (end > maxEnd) maxEnd = end;
  }
  const totalDuration = Math.max(2, Math.min(1800, Number(maxEnd.toFixed(3)) || 5));

  const layerOrder = ['v1', 'v3', 'v2'];
  const visualClips: Array<{ clip: any; mediaType: 'image' | 'video'; filePath: string; hasAudio: boolean }> = [];

  for (const trackId of layerOrder) {
    const track = tracks.find((t) => t.id === trackId);
    if (!track || track.hidden) continue;
    const sorted = [...(track.clips || [])].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    for (const clip of sorted) {
      const filePath = resolveLocalAssetPath(clip, mediaItems, historyItems, mediaDir, audioDir);
      if (!filePath) continue;
      try {
        await fsp.access(filePath);
      } catch {
        continue;
      }
      const mediaItem = mediaItems.find((m) => m.id === clip.sourceMediaId);
      const ext = path.extname(filePath).toLowerCase();
      const isVideo = mediaItem?.type === 'video' || ['.mp4', '.mov', '.webm', '.mkv', '.avi'].includes(ext);
      const probe = await probeMediaFile(filePath);
      visualClips.push({
        clip,
        mediaType: isVideo ? 'video' : 'image',
        filePath,
        hasAudio: isVideo && probe.hasAudio,
      });
    }
  }

  // Gather audio clips from a1, a2, a3 (respecting track.solo if any audio track is soloed)
  const audioTracks = tracks.filter((t) => t.id === 'a1' || t.id === 'a2' || t.id === 'a3');
  const hasSoloAudio = audioTracks.some((t) => Boolean(t.solo));
  const audioClips: Array<{ clip: any; filePath: string; inputIdx?: number }> = [];
  for (const track of audioTracks) {
    if (track.muted) continue;
    if (hasSoloAudio && !track.solo) continue;
    for (const clip of track.clips || []) {
      const filePath = resolveLocalAssetPath(clip, mediaItems, historyItems, mediaDir, audioDir);
      if (!filePath) continue;
      try {
        await fsp.access(filePath);
        audioClips.push({ clip, filePath });
      } catch {
        continue;
      }
    }
  }

  // Generate ASS file for burned-in captions & T2 text overlays
  const t1Track = tracks.find((t) => t.id === 't1');
  const t2Track = tracks.find((t) => t.id === 't2');
  const t2Clips = !t2Track?.hidden && Array.isArray(t2Track?.clips) ? t2Track.clips : [];
  const activeCaptions = burnCaptions && !t1Track?.hidden ? captions : [];

  const assPath = path.join(tmpDir, `${path.basename(outputMp4Path, '.mp4')}.ass`);
  let useAssFilter = false;

  if (activeCaptions.length > 0 || t2Clips.length > 0) {
    useAssFilter = true;
    const resolveAssAlignment = (pos: string | undefined, align: string | undefined): number => {
      const hOffset = align === 'left' ? 0 : align === 'right' ? 2 : 1; // 1,2,3 bottom; 4,5,6 mid; 7,8,9 top
      if (pos === 'top' || pos === 'upper-middle') return 7 + hOffset;
      if (pos === 'middle') return 4 + hOffset;
      return 1 + hOffset;
    };
    const resolveAssY = (pos: string | undefined, manualY: number | undefined): number => {
      const baseRatio =
        pos === 'top'
          ? 0.12
          : pos === 'upper-middle'
          ? 0.28
          : pos === 'middle'
          ? 0.5
          : pos === 'lower-middle'
          ? 0.72
          : 0.87;
      return Math.round(height * baseRatio + ((Number(manualY) || 0) / 100) * (height / 2));
    };

    const baseFont = captionStyle.fontFamily || 'Plus Jakarta Sans';
    const baseFontSize = Math.max(20, Math.round((Number(captionStyle.fontSize) || 26) * (height / 540)));
    const baseBold = (captionStyle.fontWeight ?? 700) >= 700 ? -1 : 0;
    const baseItalic = captionStyle.italic ? -1 : 0;
    const baseAlignment = resolveAssAlignment(captionStyle.position, captionStyle.align);
    const baseColor = hexToAssBgr(captionStyle.color || '#FDE047', '00');
    const baseOutline = hexToAssBgr(captionStyle.outlineColor || '#000000', '00');
    const bgAlphaHex = (() => {
      const op = typeof captionStyle.bgOpacity === 'number' ? captionStyle.bgOpacity : 75;
      const assAlpha = Math.max(0, Math.min(255, Math.round(((100 - op) / 100) * 255)));
      return assAlpha.toString(16).padStart(2, '0').toUpperCase();
    })();
    const baseBg = hexToAssBgr(captionStyle.backgroundColor || '#000000', bgAlphaHex);
    const borderStyle =
      captionStyle.bgMode === 'none'
        ? 1
        : captionStyle.bgMode === 'word-boxes' ||
          captionStyle.bgMode === 'solid' ||
          captionStyle.bgMode === 'semi' ||
          captionStyle.bgMode === 'rounded' ||
          captionStyle.bgMode === 'marker' ||
          captionStyle.bgMode === 'glass'
        ? 3
        : captionStyle.backgroundColor && !captionStyle.backgroundColor.endsWith(',0)') && !captionStyle.backgroundColor.endsWith(', 0)')
        ? 3
        : 1;
    const outlineWidth = Number(captionStyle.outlineThickness ?? 2);
    const shadowDepth = Math.min(8, Math.round(Number(captionStyle.shadowBlur ?? 2) / 3));
    const marginV = Math.round(height * 0.08);

    const assLines: string[] = [
      '[Script Info]',
      'ScriptType: v4.00+',
      `PlayResX: ${width}`,
      `PlayResY: ${height}`,
      'WrapStyle: 0',
      'ScaledBorderAndShadow: yes',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      `Style: Caption,${baseFont},${baseFontSize},${baseColor},&H000000FF,${baseOutline},${baseBg},${baseBold},${baseItalic},0,0,100,100,${Number(captionStyle.letterSpacing || 0)},0,${borderStyle},${outlineWidth},${shadowDepth},${baseAlignment},48,48,${marginV},1`,
      `Style: TitleText,Plus Jakarta Sans,${Math.round(height * 0.065)},&H00FFFFFF,&H000000FF,&H00000000,&H66000000,-1,0,0,0,100,100,0,0,1,2,1,5,30,30,30,1`,
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ];

    for (const cap of activeCaptions) {
      if (!cap?.text?.trim()) continue;
      const eff = { ...captionStyle, ...(cap.styleOverride || {}) };
      const startMs = Number(cap.startMs || 0);
      const endMs = Math.max(startMs + 300, Number(cap.endMs || 0));
      const startSec = startMs / 1000;
      const endSec = endMs / 1000;
      const anim = eff.animation || 'none';
      const animDur = Math.max(80, Math.min(600, Number(eff.animDurationMs ?? 200)));
      const intensity = Math.max(0.2, Math.min(2, Number(eff.animIntensity ?? 75) / 75));

      const capFont = eff.fontFamily || baseFont;
      const capFs = Math.max(20, Math.round((Number(eff.fontSize) || 26) * (height / 540)));
      const capBoldFlag = (eff.fontWeight ?? 700) >= 700 ? 1 : 0;
      const capItalicFlag = eff.italic ? 1 : 0;
      const capPrim = hexToAssBgr(eff.gradientEnabled && eff.gradientFrom ? eff.gradientFrom : eff.color || '#FDE047', '00');
      const activeWordCol = hexToAssBgr(eff.activeWordColor || eff.color || '#FDE047', '00');
      const capOutCol = hexToAssBgr(
        eff.visualEffect === 'neon' || eff.visualEffect === 'glow' ? eff.activeWordColor || eff.color || '#38BDF8' : eff.outlineColor || '#000000',
        '00'
      );
      const glowBlur = eff.visualEffect === 'neon' || eff.visualEffect === 'glow' ? Math.max(4, Math.round((Number(eff.glowIntensity ?? 60) / 10))) : 0;
      const posX = Math.round(
        (eff.align === 'left' ? width * 0.08 : eff.align === 'right' ? width * 0.92 : width * 0.5) +
          ((Number(eff.manualX) || 0) / 100) * (width / 2)
      );
      const posY = resolveAssY(eff.position, eff.manualY);
      const effAlign = resolveAssAlignment(eff.position, eff.align);

      const tags: string[] = [
        `\\fn${capFont}`,
        `\\fs${capFs}`,
        `\\b${capBoldFlag}`,
        `\\i${capItalicFlag}`,
        `\\fsp${Number(eff.letterSpacing || 0)}`,
        `\\an${effAlign}`,
        `\\1c${capPrim}`,
        `\\3c${capOutCol}`,
      ];
      if (glowBlur > 0) tags.push(`\\blur${glowBlur}`);

      if (anim === 'slide-up') {
        const dy = Math.round(28 * intensity);
        tags.push(`\\move(${posX},${posY + dy},${posX},${posY},0,${animDur})\\fad(${Math.round(animDur * 0.7)},100)`);
      } else if (anim === 'slide-down') {
        const dy = Math.round(28 * intensity);
        tags.push(`\\move(${posX},${posY - dy},${posX},${posY},0,${animDur})\\fad(${Math.round(animDur * 0.7)},100)`);
      } else {
        tags.push(`\\pos(${posX},${posY})`);
        if (anim === 'fade') {
          tags.push(`\\fad(${animDur},120)`);
        } else if (anim === 'pop' || anim === 'scale-punch' || anim === 'spring') {
          const peak = Math.round(100 + 16 * intensity);
          const half = Math.round(animDur * 0.55);
          tags.push(`\\fscx76\\fscy76\\t(0,${half},\\fscx${peak}\\fscy${peak})\\t(${half},${animDur},\\fscx100\\fscy100)`);
        } else if (anim === 'bounce') {
          const peak = Math.round(100 + 20 * intensity);
          const half = Math.round(animDur * 0.5);
          tags.push(`\\fscx80\\fscy120\\t(0,${half},\\fscx${peak}\\fscy${peak})\\t(${half},${animDur},\\fscx100\\fscy100)`);
        } else if (anim === 'zoom-in') {
          tags.push(`\\fscx65\\fscy65\\t(0,${animDur},\\fscx100\\fscy100)\\fad(${Math.round(animDur * 0.5)},0)`);
        } else if (anim === 'zoom-out') {
          tags.push(`\\fscx130\\fscy130\\t(0,${animDur},\\fscx100\\fscy100)\\fad(${Math.round(animDur * 0.5)},0)`);
        } else if (anim === 'blur-to-sharp') {
          tags.push(`\\blur8\\t(0,${animDur},\\blur0)\\fad(${Math.round(animDur * 0.6)},0)`);
        } else if (anim === 'flip') {
          tags.push(`\\frx-60\\t(0,${animDur},\\frx0)`);
        } else if (anim === 'shake') {
          const step = Math.max(40, Math.round(animDur / 3));
          tags.push(`\\frz-3\\t(0,${step},\\frz3)\\t(${step},${step * 2},\\frz-2)\\t(${step * 2},${step * 3},\\frz0)`);
        } else if (anim === 'glow') {
          tags.push(`\\blur6\\t(0,${animDur},\\blur2)`);
        }
      }

      const transformTextCase = (raw: string) =>
        eff.textTransform === 'uppercase'
          ? raw.toUpperCase()
          : eff.textTransform === 'lowercase'
          ? raw.toLowerCase()
          : raw;

      const words: Array<{ word: string; startMs: number; endMs: number }> = Array.isArray(cap.words) ? cap.words : [];
      const useWordHighlight =
        words.length > 0 &&
        (eff.highlightMode === 'current-word' ||
          anim === 'karaoke-fill' ||
          anim === 'word-highlight' ||
          anim === 'typewriter');

      let bodyAss = '';
      if (useWordHighlight) {
        const keywordSet = new Set(
          String(eff.highlightKeywords || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        );
        bodyAss = words
          .map((w, idx) => {
            const wText = escapeAssText(transformTextCase(w.word));
            const relStart = Math.max(0, Math.round(w.startMs - startMs));
            const relEnd = Math.max(relStart + 50, Math.round(w.endMs - startMs));
            const isKw = keywordSet.has(w.word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
            const isNum = Boolean(eff.highlightNumbers && /\d/.test(w.word));
            const baseCol = isKw || isNum ? activeWordCol : capPrim;
            if (anim === 'typewriter') {
              return `{\\1a&HFF&\\3a&HFF&\\t(${relStart},${Math.min(relEnd, relStart + 40)},\\1a&H00&\\3a&H00&\\1c${activeWordCol})}${wText}${idx < words.length - 1 ? ' ' : ''}`;
            }
            if (eff.highlightMode === 'current-word' || anim === 'karaoke-fill' || anim === 'word-highlight') {
              return `{\\1c${baseCol}\\t(${relStart},${relStart + 25},\\1c${activeWordCol})\\t(${relEnd},${relEnd + 25},\\1c${baseCol})}${wText}${idx < words.length - 1 ? ' ' : ''}`;
            }
            return `{\\1c${baseCol}}${wText}${idx < words.length - 1 ? ' ' : ''}`;
          })
          .join('');
      } else {
        bodyAss = escapeAssText(transformTextCase(cap.text));
      }

      assLines.push(
        `Dialogue: 2,${formatAssTime(startSec)},${formatAssTime(endSec)},Caption,,0,0,0,,{${tags.join('')}}${bodyAss}`
      );
    }

    for (const tClip of t2Clips) {
      const txt = String(tClip.title || '').trim();
      if (!txt) continue;
      const startSec = Number(tClip.startTime || 0);
      const endSec = startSec + Math.max(0.5, Number(tClip.duration || 3));
      const fontSize = Math.max(18, Math.round((Number(tClip.fontSize) || 40) * (height / 540)));
      const primaryColor = hexToAssBgr(tClip.textColor || '#FFFFFF', '00');
      const font = tClip.fontFamily || 'Plus Jakarta Sans';
      const posX = Math.round(width / 2 + ((Number(tClip.x) || 0) / 100) * (width / 2));
      const posY = Math.round(height / 2 + ((Number(tClip.y) || 0) / 100) * (height / 2));
      const override = `{\\fn${font}\\pos(${posX},${posY})\\fs${fontSize}\\c${primaryColor}}`;
      assLines.push(
        `Dialogue: 3,${formatAssTime(startSec)},${formatAssTime(endSec)},TitleText,,0,0,0,,${override}${escapeAssText(txt)}`
      );
    }

    await fsp.writeFile(assPath, assLines.join('\n'), 'utf8');
  }

  // Build FFmpeg command inputs and filter_complex
  const args: string[] = ['-y'];
  // Input 0: black base canvas
  args.push('-f', 'lavfi', '-i', `color=c=black:s=${width}x${height}:r=${fps}:d=${totalDuration}`);
  // Input 1: silent base audio
  args.push('-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`);

  let nextInputIdx = 2;
  const visualInputs: Array<{ item: typeof visualClips[number]; inputIdx: number }> = [];
  for (const item of visualClips) {
    const clipDur = Math.max(0.2, Number(item.clip.duration || 5));
    const trimStart = Math.max(0, Number(item.clip.trimStart || 0));
    const speed = Math.max(0.25, Math.min(4, Number(item.clip.speed || 1)));
    const hasMotion = Boolean(item.clip.motionPreset && item.clip.motionPreset !== 'none');
    if (item.mediaType === 'image') {
      if (hasMotion) {
        args.push('-i', item.filePath);
      } else {
        args.push('-loop', '1', '-t', String(clipDur), '-i', item.filePath);
      }
    } else {
      args.push('-ss', String(trimStart), '-t', String(clipDur * speed), '-i', item.filePath);
    }
    visualInputs.push({ item, inputIdx: nextInputIdx++ });
  }

  const standaloneAudioInputs: Array<{ item: typeof audioClips[number]; inputIdx: number }> = [];
  for (const item of audioClips) {
    const clipDur = Math.max(0.2, Number(item.clip.duration || 5));
    const trimStart = Math.max(0, Number(item.clip.trimStart || 0));
    args.push('-ss', String(trimStart), '-t', String(clipDur), '-i', item.filePath);
    standaloneAudioInputs.push({ item, inputIdx: nextInputIdx++ });
  }

  const filterParts: string[] = [];
  let currentVideoLabel = '[0:v]';

  visualInputs.forEach(({ item, inputIdx }, idx) => {
    const clip = item.clip;
    const start = Math.max(0, Number(clip.startTime || 0));
    const dur = Math.max(0.2, Number(clip.duration || 5));
    const end = start + dur;
    const scalePct = Math.max(10, Math.min(300, Number(clip.scale ?? 100))) / 100;
    const targetW = Math.max(16, Math.round((width * scalePct) / 2) * 2);
    const targetH = Math.max(16, Math.round((height * scalePct) / 2) * 2);
    const opacity = Math.max(0, Math.min(1, Number(clip.opacity ?? 100) / 100));
    const speed = Math.max(0.25, Math.min(4, Number(clip.speed || 1)));
    const motionPreset = clip.motionPreset || 'none';
    const mInt = Math.max(0.25, Math.min(2.0, Number(clip.motionIntensity ?? 1)));

    const chain: string[] = [];
    const cropL = Math.max(0, Math.min(45, Number(clip.cropLeft || 0))) / 100;
    const cropR = Math.max(0, Math.min(45, Number(clip.cropRight || 0))) / 100;
    const cropT = Math.max(0, Math.min(45, Number(clip.cropTop || 0))) / 100;
    const cropB = Math.max(0, Math.min(45, Number(clip.cropBottom || 0))) / 100;
    if (cropL > 0 || cropR > 0 || cropT > 0 || cropB > 0) {
      const wFactor = Math.max(0.1, 1 - cropL - cropR).toFixed(3);
      const hFactor = Math.max(0.1, 1 - cropT - cropB).toFixed(3);
      chain.push(`crop=iw*${wFactor}:ih*${hFactor}:iw*${cropL.toFixed(3)}:ih*${cropT.toFixed(3)}`);
    }

    if (motionPreset !== 'none') {
      const totalFrames = Math.max(2, Math.round(dur * fps));
      const fVar = item.mediaType === 'image' ? 'on' : 'in';
      const denom = Math.max(1, totalFrames - 1);
      const pExpr = `min(1,${fVar}/${denom})`;
      const zDelta = Number((0.14 * mInt).toFixed(3));
      const panZ = Number((1 + 0.1 * mInt).toFixed(3));

      let zExpr = `'1'`;
      let xExpr = `'iw/2-(iw/zoom/2)'`;
      let yExpr = `'ih/2-(ih/zoom/2)'`;

      if (motionPreset === 'zoom-in') {
        zExpr = `'1+${zDelta}*${pExpr}'`;
      } else if (motionPreset === 'zoom-out') {
        zExpr = `'${(1 + zDelta).toFixed(3)}-${zDelta}*${pExpr}'`;
      } else if (motionPreset === 'pan-left') {
        zExpr = `'${panZ}'`;
        xExpr = `'(iw-iw/zoom)*(1-${pExpr})'`;
      } else if (motionPreset === 'pan-right') {
        zExpr = `'${panZ}'`;
        xExpr = `'(iw-iw/zoom)*${pExpr}'`;
      } else if (motionPreset === 'zoom-pan') {
        zExpr = `'1+${zDelta}*${pExpr}'`;
        xExpr = `'(iw-iw/zoom)*${pExpr}'`;
      } else if (motionPreset === 'ken-burns') {
        zExpr = `'1+${zDelta}*${pExpr}'`;
        xExpr = `'(iw-iw/zoom)*(0.15+0.7*${pExpr})'`;
        yExpr = `'(ih-ih/zoom)*(0.15+0.6*${pExpr})'`;
      }

      const dParam = item.mediaType === 'image' ? totalFrames : 1;
      chain.push(`scale=${targetW * 2}:${targetH * 2}:force_original_aspect_ratio=decrease`);
      chain.push(`pad=${targetW * 2}:${targetH * 2}:(ow-iw)/2:(oh-ih)/2:color=black@0`);
      chain.push(`zoompan=z=${zExpr}:x=${xExpr}:y=${yExpr}:d=${dParam}:s=${targetW}x${targetH}:fps=${fps}`);
      chain.push(`setpts=PTS-STARTPTS+${start}/TB`);
    } else {
      chain.push(`setpts=(PTS-STARTPTS)/${speed}+${start}/TB`);
      chain.push(`fps=${fps}`);
      chain.push(`scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`);
      chain.push(`pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black@0`);
    }

    chain.push('format=rgba');

    // Color adjustments
    const brightness = Math.max(-1, Math.min(1, ((Number(clip.brightness ?? 100) - 100) / 100)));
    const contrast = Math.max(0, Math.min(3, Number(clip.contrast ?? 100) / 100));
    const saturation = Math.max(0, Math.min(3, Number(clip.saturation ?? 100) / 100));
    if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
      chain.push(`eq=brightness=${brightness.toFixed(2)}:contrast=${contrast.toFixed(2)}:saturation=${saturation.toFixed(2)}`);
    }

    const temp = Number(clip.temperature || 0);
    if (temp !== 0) {
      const shift = Math.max(-0.5, Math.min(0.5, temp / 100));
      chain.push(`colorbalance=rs=${shift.toFixed(2)}:bs=${(-shift).toFixed(2)}`);
    }

    const sharpen = Number(clip.sharpen || 0);
    if (sharpen > 0) {
      const amt = Math.min(2.0, (sharpen / 50) * 1.2).toFixed(2);
      chain.push(`unsharp=5:5:${amt}:5:5:0.0`);
    }

    const blur = Number(clip.blur || 0);
    if (blur > 0) {
      chain.push(`gblur=sigma=${Math.min(20, blur)}`);
    }

    const vignette = Number(clip.vignette || 0);
    if (vignette > 0) {
      const angle = (Math.PI / 5) * Math.min(1, vignette / 100);
      chain.push(`vignette=${angle.toFixed(3)}`);
    }

    const filmGrain = Number(clip.filmGrain || 0);
    if (filmGrain > 0) {
      chain.push(`noise=alls=${Math.min(40, Math.round(filmGrain * 0.4))}:allf=t+u`);
    }

    if (opacity < 1) {
      chain.push(`colorchannelmixer=aa=${opacity.toFixed(2)}`);
    }

    const trType = clip.transition || 'none';
    const trDur = Math.max(0, Math.min(dur * 0.45, Number(clip.transitionDuration || (trType !== 'none' ? 0.5 : 0))));
    const fadeIn = Math.max(
      0,
      Number(
        clip.fadeIn ??
          (trType === 'fade-black' || trType === 'crossfade' || trType === 'cinematic' || trType === 'blur-dissolve' || trType === 'zoom-in'
            ? trDur
            : 0)
      )
    );
    const fadeOut = Math.max(0, Number(clip.fadeOut || 0));

    if (trType === 'blur-dissolve' && trDur > 0.1) {
      chain.push(`gblur=sigma=10:enable='between(t,${start.toFixed(3)},${(start + trDur * 0.7).toFixed(3)})'`);
    }
    if (trType === 'wipe-left' && trDur > 0.1) {
      chain.push(
        `crop=w='if(lt(t-${start.toFixed(3)},${trDur.toFixed(3)}),max(2,trunc(iw*(t-${start.toFixed(3)})/${trDur.toFixed(3)}/2)*2),iw)':h=ih:x=0:y=0`
      );
    }

    if (fadeIn > 0 && fadeIn < dur) {
      chain.push(`fade=t=in:st=${start}:d=${fadeIn}:alpha=1`);
    }
    if (fadeOut > 0 && fadeOut < dur) {
      chain.push(`fade=t=out:st=${Math.max(start, end - fadeOut)}:d=${fadeOut}:alpha=1`);
    }

    const vPrepLabel = `[vprep_${idx}]`;
    const vOutLabel = `[vstage_${idx}]`;
    filterParts.push(`[${inputIdx}:v]${chain.join(',')}${vPrepLabel}`);

    const offsetX = Math.round(((Number(clip.x) || 0) / 100) * (width / 2));
    const offsetY = Math.round(((Number(clip.y) || 0) / 100) * (height / 2));
    let overlayX = `(W-w)/2+(${offsetX})`;
    let overlayY = `(H-h)/2+(${offsetY})`;

    if (trType === 'wipe-left' && trDur > 0.1) {
      overlayX = `(W-${targetW})/2+(${offsetX})`;
    } else if (trType === 'slide-left' && trDur > 0.1) {
      overlayX = `'if(lt(t-${start.toFixed(3)},${trDur.toFixed(3)}),(W-w)/2+(${offsetX})+W*(1-(t-${start.toFixed(3)})/${trDur.toFixed(3)}),(W-w)/2+(${offsetX}))'`;
    } else if (trType === 'slide-up' && trDur > 0.1) {
      overlayY = `'if(lt(t-${start.toFixed(3)},${trDur.toFixed(3)}),(H-h)/2+(${offsetY})+H*(1-(t-${start.toFixed(3)})/${trDur.toFixed(3)}),(H-h)/2+(${offsetY}))'`;
    }

    filterParts.push(
      `${currentVideoLabel}${vPrepLabel}overlay=x=${overlayX}:y=${overlayY}:enable='between(t,${start.toFixed(3)},${end.toFixed(3)})':eof_action=pass${vOutLabel}`
    );
    currentVideoLabel = vOutLabel;
  });

  if (useAssFilter) {
    const escapedAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
    const fontsDirOpt = fontsDir
      ? `:fontsdir='${fontsDir.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")}'`
      : '';
    filterParts.push(`${currentVideoLabel}ass='${escapedAss}'${fontsDirOpt}:shaping=complex[vfinal]`);
    currentVideoLabel = '[vfinal]';
  } else if (currentVideoLabel === '[0:v]') {
    filterParts.push(`[0:v]null[vfinal]`);
    currentVideoLabel = '[vfinal]';
  }

  // Audio graph
  const audioStreamLabels: string[] = ['[1:a]'];
  let audioIdxCounter = 0;

  // Embedded audio from video clips on unmuted visual tracks
  for (const { item, inputIdx } of visualInputs) {
    if (!item.hasAudio || hasSoloAudio) continue;
    const tr = tracks.find((t) => t.id === item.clip.trackId);
    if (tr?.muted) continue;
    const db = Number(item.clip.volume ?? 0);
    if (db <= -59) continue;
    const vol = Math.pow(10, db / 20);
    const delayMs = Math.max(0, Math.round(Number(item.clip.startTime || 0) * 1000));
    const dur = Math.max(0.2, Number(item.clip.duration || 5));
    const label = `[aud_${audioIdxCounter++}]`;
    filterParts.push(
      `[${inputIdx}:a]atrim=0:${dur.toFixed(3)},asetpts=PTS-STARTPTS,volume=${vol.toFixed(3)},adelay=${delayMs}|${delayMs}${label}`
    );
    audioStreamLabels.push(label);
  }

  for (const { item, inputIdx } of standaloneAudioInputs) {
    const c = item.clip;
    const db = Number(c.volume ?? 0);
    if (db <= -59) continue;
    const vol = Math.pow(10, db / 20);
    const delayMs = Math.max(0, Math.round(Number(c.startTime || 0) * 1000));
    const dur = Math.max(0.2, Number(c.duration || 5));
    const fadeIn = Math.max(0, Number(c.fadeIn || 0));
    const fadeOut = Math.max(0, Number(c.fadeOut || 0));
    const parts = [
      `atrim=0:${dur.toFixed(3)}`,
      'asetpts=PTS-STARTPTS',
      'aformat=sample_rates=44100:channel_layouts=stereo',
      `volume=${vol.toFixed(3)}`,
    ];
    if (fadeIn > 0 && fadeIn < dur) {
      parts.push(`afade=t=in:st=0:d=${fadeIn}`);
    }
    if (fadeOut > 0 && fadeOut < dur) {
      parts.push(`afade=t=out:st=${Math.max(0, dur - fadeOut).toFixed(3)}:d=${fadeOut}`);
    }
    parts.push(`adelay=${delayMs}|${delayMs}`);
    const label = `[aud_${audioIdxCounter++}]`;
    filterParts.push(`[${inputIdx}:a]${parts.join(',')}${label}`);
    audioStreamLabels.push(label);
  }

  if (audioStreamLabels.length === 1) {
    filterParts.push(`[1:a]atrim=0:${totalDuration.toFixed(3)}[afinal]`);
  } else {
    filterParts.push(
      `${audioStreamLabels.join('')}amix=inputs=${audioStreamLabels.length}:duration=longest:normalize=0,atrim=0:${totalDuration.toFixed(3)}[afinal]`
    );
  }

  const crf = quality === 'lossless' || quality === 'ultra' ? '16' : quality === 'medium' ? '23' : '19';
  args.push(
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    currentVideoLabel,
    '-map',
    '[afinal]',
    '-t',
    String(totalDuration),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    crf,
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    outputMp4Path
  );

  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderrLog = '';

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderrLog += text;
      if (stderrLog.length > 16000) {
        stderrLog = stderrLog.slice(-16000);
      }
      const match = text.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (match && onProgress) {
        const currentSec = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
        const pct = Math.min(96, Math.max(10, Math.round((currentSec / totalDuration) * 95)));
        onProgress(pct);
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderrLog.slice(-500)}`));
      }
    });
  }).finally(async () => {
    if (useAssFilter) {
      await fsp.unlink(assPath).catch(() => undefined);
    }
  });

  const stat = await fsp.stat(outputMp4Path);
  if (!stat.size || stat.size < 100) {
    throw new Error('Rendered MP4 output was empty or invalid.');
  }

  return {
    fileSizeBytes: stat.size,
    durationSeconds: totalDuration,
  };
}
