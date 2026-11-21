/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import type { MediaItem, TimelineClip, TimelineTrack } from '../../types';

interface ClipVisualContentProps {
  clip: TimelineClip;
  track: TimelineTrack;
  media?: MediaItem;
}

export function ClipVisualContent({ clip, track, media }: ClipVisualContentProps) {
  // Deterministic waveform bars seeded from clip id so audio clips display crisp waveforms
  const waveformBars = useMemo(() => {
    const seedStr = clip.id + (clip.title || '');
    let hash = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      hash ^= seedStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const bars: number[] = [];
    const count = 48;
    for (let i = 0; i < count; i++) {
      hash ^= hash << 13;
      hash ^= hash >>> 17;
      hash ^= hash << 5;
      const val = ((hash >>> 0) % 72) + 20;
      bars.push(val);
    }
    return bars;
  }, [clip.id, clip.title]);

  if (track.type === 'audio') {
    return (
      <div className="relative w-full h-full flex items-center overflow-hidden">
        <svg
          viewBox="0 0 192 32"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full opacity-55 pointer-events-none"
        >
          {waveformBars.map((h, i) => {
            const barH = (h / 100) * 26;
            const y = (32 - barH) / 2;
            return (
              <rect
                key={i}
                x={i * 4 + 0.5}
                y={y}
                width={2.5}
                height={barH}
                rx={1}
                fill={track.id === 'a1' ? '#34d399' : track.id === 'a2' ? '#60a5fa' : '#c084fc'}
              />
            );
          })}
        </svg>
        <span className="relative z-10 px-2 text-[11px] font-medium text-white truncate drop-shadow">
          {clip.title || 'Audio Clip'}
        </span>
      </div>
    );
  }

  if (track.type === 'caption') {
    return (
      <div className="w-full h-full flex items-center px-2 overflow-hidden">
        <span className="text-[11px] font-medium text-amber-100 truncate">
          {clip.title || 'Caption'}
        </span>
      </div>
    );
  }

  if (track.type === 'text') {
    return (
      <div className="w-full h-full flex items-center px-2 overflow-hidden">
        <span className="text-[11px] font-semibold text-violet-100 truncate">
          T · {clip.title || 'Title'}
        </span>
      </div>
    );
  }

  const thumbUrl = clip.sourceUrl || media?.url;
  const isVideo = media?.type === 'video' || (thumbUrl ? /\.(mp4|mov|webm|mkv|avi)$/i.test(thumbUrl) : false);

  return (
    <div className="relative w-full h-full flex items-center overflow-hidden">
      {thumbUrl && !isVideo && (
        <div
          className="absolute inset-0 opacity-60 pointer-events-none bg-repeat-x bg-center"
          style={{
            backgroundImage: `url("${thumbUrl}")`,
            backgroundSize: 'auto 100%',
          }}
        />
      )}
      {thumbUrl && isVideo && (
        <video
          src={`${thumbUrl}#t=0.5`}
          muted
          playsInline
          preload="metadata"
          className="h-full aspect-video object-cover opacity-85 shrink-0 pointer-events-none border-r border-white/10"
        />
      )}
      <div className="relative z-10 px-2 py-0.5 flex items-center gap-1.5 min-w-0 bg-gradient-to-r from-black/70 via-black/45 to-transparent w-full h-full">
        <span className="text-[11px] font-medium text-white truncate drop-shadow">
          {clip.title || 'Media Clip'}
        </span>
        {clip.motionPreset && clip.motionPreset !== 'none' && (
          <span className="text-[9px] font-mono text-amber-300 shrink-0">
            · {clip.motionPreset}
          </span>
        )}
        {clip.transition && clip.transition !== 'none' && (
          <span className="text-[9px] font-mono text-sky-300 shrink-0">
            · {clip.transition}
          </span>
        )}
      </div>
    </div>
  );
}
