/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CaptionGroupingMode,
  CaptionItem,
  CaptionStyle,
  CaptionWord,
  TimelineClip,
} from '../types';

/**
 * Ensures a caption cue exposes word-level entries.
 * If real speech alignment timestamps exist on `caption.words`, preserves them verbatim.
 * Otherwise builds fallback word spans and marks `wordSyncAvailable = false` cleanly.
 */
export function ensureCaptionWords(caption: CaptionItem): {
  words: CaptionWord[];
  wordSyncAvailable: boolean;
} {
  if (Array.isArray(caption.words) && caption.words.length > 0) {
    return {
      words: caption.words,
      wordSyncAvailable: caption.wordSyncAvailable !== false,
    };
  }
  const tokens = String(caption.text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    return { words: [], wordSyncAvailable: false };
  }
  const startMs = caption.startMs || 0;
  const endMs = Math.max(startMs + 250, caption.endMs || startMs + 1000);
  const totalWeight = tokens.reduce((acc, w) => acc + Math.max(1, w.length), 0);
  let cursor = startMs;
  const words: CaptionWord[] = tokens.map((word, idx) => {
    const share = Math.round(((Math.max(1, word.length) / Math.max(1, totalWeight)) * (endMs - startMs)));
    const wStart = cursor;
    const wEnd = idx === tokens.length - 1 ? endMs : Math.min(endMs, wStart + Math.max(60, share));
    cursor = wEnd;
    return {
      word,
      startMs: wStart,
      endMs: Math.max(wStart + 40, wEnd),
      isPauseBreak: idx === 0,
    };
  });
  return { words, wordSyncAvailable: false };
}

/**
 * Regroups captions deterministically according to the selected Word Grouping mode
 * while preserving exact spoken word timestamps (`CaptionWord[]`).
 */
export function regroupCaptions(
  captions: CaptionItem[],
  mode: CaptionGroupingMode,
  maxWordsPerLine = 4,
  maxLines = 2
): CaptionItem[] {
  if (captions.length === 0 || mode === 'manual') return captions;

  const allWords: CaptionWord[] = [];
  let hasRealSync = captions.some((c) => c.wordSyncAvailable !== false && Array.isArray(c.words) && c.words.length > 0);

  for (const cap of captions) {
    const { words, wordSyncAvailable } = ensureCaptionWords(cap);
    if (wordSyncAvailable) hasRealSync = true;
    for (let i = 0; i < words.length; i++) {
      allWords.push({
        ...words[i],
        isPauseBreak: words[i].isPauseBreak || i === 0,
      });
    }
  }

  if (allWords.length === 0) return captions;

  const groups: CaptionWord[][] = [];
  const fixedLimit =
    mode === '1-word' ? 1 : mode === '2-words' ? 2 : mode === '3-words' ? 3 : mode === '4-words' ? 4 : null;

  if (fixedLimit !== null) {
    for (let i = 0; i < allWords.length; i += fixedLimit) {
      groups.push(allWords.slice(i, i + fixedLimit));
    }
  } else if (mode === 'auto-pauses') {
    const maxCap = Math.max(2, maxWordsPerLine * maxLines);
    let current: CaptionWord[] = [];
    for (let i = 0; i < allWords.length; i++) {
      const w = allWords[i];
      const prev = current[current.length - 1];
      const acousticGap = prev ? w.startMs - prev.endMs >= 180 : false;
      const endsClause = prev ? /[.,!?;:،؟۔]$/.test(prev.word) : false;
      const pauseMarked = Boolean(prev && w.isPauseBreak && current.length >= 2);
      if (current.length > 0 && (acousticGap || endsClause || pauseMarked || current.length >= maxCap)) {
        groups.push(current);
        current = [];
      }
      current.push(w);
    }
    if (current.length > 0) groups.push(current);
  } else {
    // sentence grouping
    const maxSentenceWords = Math.max(4, maxWordsPerLine * maxLines * 2);
    let current: CaptionWord[] = [];
    for (const w of allWords) {
      current.push(w);
      if (/[.?!؟۔]$/.test(w.word) || current.length >= maxSentenceWords) {
        groups.push(current);
        current = [];
      }
    }
    if (current.length > 0) groups.push(current);
  }

  return groups.map((grp) => {
    const startMs = grp[0].startMs;
    const endMs = Math.max(startMs + 220, grp[grp.length - 1].endMs);
    return {
      id: crypto.randomUUID(),
      startMs,
      endMs,
      text: grp.map((w) => w.word).join(' '),
      words: grp,
      wordSyncAvailable: hasRealSync,
    };
  });
}

export function splitCaptionCue(captions: CaptionItem[], captionId: string): CaptionItem[] {
  const idx = captions.findIndex((c) => c.id === captionId);
  if (idx === -1) return captions;
  const target = captions[idx];
  const { words, wordSyncAvailable } = ensureCaptionWords(target);
  if (words.length < 2) return captions;

  const mid = Math.max(1, Math.floor(words.length / 2));
  const leftWords = words.slice(0, mid);
  const rightWords = words.slice(mid);

  const leftCue: CaptionItem = {
    id: target.id,
    startMs: leftWords[0].startMs,
    endMs: Math.max(leftWords[0].startMs + 150, leftWords[leftWords.length - 1].endMs),
    text: leftWords.map((w) => w.word).join(' '),
    words: leftWords,
    wordSyncAvailable,
    styleOverride: target.styleOverride,
  };
  const rightCue: CaptionItem = {
    id: crypto.randomUUID(),
    startMs: rightWords[0].startMs,
    endMs: Math.max(rightWords[0].startMs + 150, rightWords[rightWords.length - 1].endMs),
    text: rightWords.map((w) => w.word).join(' '),
    words: rightWords,
    wordSyncAvailable,
    styleOverride: target.styleOverride,
  };

  return [...captions.slice(0, idx), leftCue, rightCue, ...captions.slice(idx + 1)];
}

export function mergeNextCaptionCue(captions: CaptionItem[], captionId: string): CaptionItem[] {
  const idx = captions.findIndex((c) => c.id === captionId);
  if (idx === -1 || idx >= captions.length - 1) return captions;
  const a = captions[idx];
  const b = captions[idx + 1];
  const wa = ensureCaptionWords(a);
  const wb = ensureCaptionWords(b);
  const combinedWords = [...wa.words, ...wb.words];
  const merged: CaptionItem = {
    id: a.id,
    startMs: a.startMs,
    endMs: Math.max(a.endMs, b.endMs),
    text: `${a.text.trim()} ${b.text.trim()}`.trim(),
    words: combinedWords,
    wordSyncAvailable: wa.wordSyncAvailable || wb.wordSyncAvailable,
    styleOverride: a.styleOverride,
  };
  return [...captions.slice(0, idx), merged, ...captions.slice(idx + 2)];
}

export interface RenderedWordState {
  word: string;
  rawWord: string;
  isActive: boolean;
  isSpoken: boolean;
  isKeyword: boolean;
  isNumber: boolean;
  isPhraseMatch: boolean;
  isHighlighted: boolean;
  isVisible: boolean;
}

export function computeCaptionWordStates(
  caption: CaptionItem,
  currentTimeMs: number,
  style: CaptionStyle
): {
  wordStates: RenderedWordState[];
  lines: RenderedWordState[][];
} {
  const { words } = ensureCaptionWords(caption);
  const keywordSet = new Set(
    String(style.highlightKeywords || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  const phraseList = String(style.highlightKeywords || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes(' '));

  const fullTextLower = caption.text.toLowerCase();
  const matchedPhrases = phraseList.filter((p) => fullTextLower.includes(p));

  const formatWord = (raw: string) => {
    if (style.textTransform === 'uppercase') return raw.toUpperCase();
    if (style.textTransform === 'lowercase') return raw.toLowerCase();
    return raw;
  };

  let activeIdx = words.findIndex((w) => currentTimeMs >= w.startMs && currentTimeMs <= w.endMs);
  if (activeIdx === -1 && words.length > 0) {
    // Pick nearest previously started word during tiny inter-word gaps
    for (let i = words.length - 1; i >= 0; i--) {
      if (currentTimeMs >= words[i].startMs) {
        activeIdx = i;
        break;
      }
    }
  }

  const isTypewriter = style.animation === 'typewriter';
  const mode = style.highlightMode || 'current-word';

  const wordStates: RenderedWordState[] = words.map((w, i) => {
    const clean = w.word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const isActive = i === activeIdx;
    const isSpoken = currentTimeMs >= w.startMs;
    const isKeyword = keywordSet.has(clean);
    const isNumber = Boolean(style.highlightNumbers && /\d/.test(w.word));
    const isPhraseMatch =
      mode === 'phrases' && matchedPhrases.some((ph) => ph.split(/\s+/).includes(clean));

    const autoEmphasisHit = Boolean(style.autoEmphasis && (isNumber || w.word.length >= 7 || /[!?]$/.test(w.word)));

    let isHighlighted = false;
    if (mode === 'current-word') {
      isHighlighted = isActive || (isKeyword && !isActive);
    } else if (mode === 'keywords') {
      isHighlighted = isKeyword || autoEmphasisHit;
    } else if (mode === 'numbers') {
      isHighlighted = isNumber;
    } else if (mode === 'phrases') {
      isHighlighted = isPhraseMatch || isKeyword;
    } else if (autoEmphasisHit) {
      isHighlighted = true;
    }

    if (style.animation === 'karaoke-fill' || style.animation === 'word-highlight') {
      isHighlighted = isActive || (style.animation === 'karaoke-fill' && isSpoken);
    }

    const isVisible = !isTypewriter || currentTimeMs >= w.startMs;

    return {
      word: formatWord(w.word),
      rawWord: w.word,
      isActive,
      isSpoken,
      isKeyword,
      isNumber,
      isPhraseMatch,
      isHighlighted,
      isVisible,
    };
  });

  // Wrap lines cleanly respecting maxWordsPerLine and maxLines
  const maxPerLine = Math.max(1, style.maxWordsPerLine || 4);
  const maxLines = Math.max(1, style.maxLines || 2);
  const lines: RenderedWordState[][] = [];
  for (let i = 0; i < wordStates.length; i += maxPerLine) {
    if (lines.length < maxLines - 1) {
      lines.push(wordStates.slice(i, i + maxPerLine));
    } else {
      lines.push(wordStates.slice(i));
      break;
    }
  }

  return { wordStates, lines };
}

export interface LiveCaptionVisualStyle {
  transform: string;
  opacity: number;
  filter: string;
}

function applyEasing(t: number, easing?: CaptionStyle['animEasing']): number {
  const c = Math.max(0, Math.min(1, t));
  if (easing === 'linear') return c;
  if (easing === 'ease-in-out') return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
  if (easing === 'spring') {
    const c4 = (2 * Math.PI) / 3;
    return c === 0 ? 0 : c === 1 ? 1 : Math.pow(2, -10 * c) * Math.sin((c * 10 - 0.75) * c4) + 1;
  }
  // ease-out cubic
  return 1 - Math.pow(1 - c, 3);
}

export function computeCaptionLiveVisuals(
  caption: CaptionItem,
  currentTimeMs: number,
  style: CaptionStyle
): LiveCaptionVisualStyle {
  const anim = style.animation || 'none';
  if (anim === 'none') {
    return { transform: 'none', opacity: 1, filter: 'none' };
  }

  const delay = Math.max(0, style.animDelayMs ?? 0);
  const animDur = Math.max(80, Math.min(800, style.animDurationMs ?? 200));
  const intensity = Math.max(0.15, Math.min(2, (style.animIntensity ?? 75) / 75));
  const elapsed = Math.max(0, currentTimeMs - caption.startMs - delay);
  const remaining = Math.max(0, caption.endMs - currentTimeMs);
  const rawProgress = Math.min(1, elapsed / animDur);
  const p = applyEasing(rawProgress, style.animEasing);

  let transform = 'none';
  let opacity = currentTimeMs < caption.startMs + delay ? 0 : 1;
  let filter = 'none';

  switch (anim) {
    case 'fade':
      opacity = Math.min(p, remaining < 120 ? Math.max(0, remaining / 120) : 1);
      break;
    case 'pop':
    case 'scale-punch': {
      const overshoot = 1 + 0.16 * intensity * Math.sin(p * Math.PI);
      const scale = (0.78 + 0.22 * p) * overshoot;
      transform = `scale(${scale.toFixed(3)})`;
      opacity = Math.min(1, p * 1.6);
      break;
    }
    case 'bounce': {
      const bounceY = -12 * intensity * Math.abs(Math.sin((1 - p) * Math.PI * 1.5)) * (1 - p);
      const scale = 0.85 + 0.15 * p;
      transform = `translateY(${bounceY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      opacity = Math.min(1, p * 1.8);
      break;
    }
    case 'spring': {
      const springP = applyEasing(rawProgress, 'spring');
      const scale = 0.72 + 0.28 * springP;
      transform = `scale(${scale.toFixed(3)})`;
      opacity = Math.min(1, rawProgress * 2);
      break;
    }
    case 'slide-up': {
      const dy = (1 - p) * 22 * intensity;
      transform = `translateY(${dy.toFixed(1)}px)`;
      opacity = p;
      break;
    }
    case 'slide-down': {
      const dy = -(1 - p) * 22 * intensity;
      transform = `translateY(${dy.toFixed(1)}px)`;
      opacity = p;
      break;
    }
    case 'zoom-in': {
      const scale = 1 - 0.32 * intensity * (1 - p);
      transform = `scale(${scale.toFixed(3)})`;
      opacity = p;
      break;
    }
    case 'zoom-out': {
      const scale = 1 + 0.35 * intensity * (1 - p);
      transform = `scale(${scale.toFixed(3)})`;
      opacity = p;
      break;
    }
    case 'shake': {
      const decay = 1 - Math.min(1, elapsed / (animDur * 1.4));
      const deg = Math.sin(elapsed * 0.08) * 3.5 * intensity * decay;
      const dx = Math.cos(elapsed * 0.1) * 4 * intensity * decay;
      transform = `translateX(${dx.toFixed(1)}px) rotate(${deg.toFixed(2)}deg)`;
      break;
    }
    case 'flip': {
      const degX = (1 - p) * -75;
      transform = `perspective(400px) rotateX(${degX.toFixed(1)}deg)`;
      opacity = Math.min(1, p * 1.5);
      break;
    }
    case 'blur-to-sharp': {
      const blurPx = (1 - p) * 8 * intensity;
      filter = blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
      opacity = p;
      break;
    }
    case 'glow': {
      const glowAlpha = Math.round(14 * intensity * (0.4 + 0.6 * Math.sin(p * Math.PI)));
      filter = `drop-shadow(0 0 ${glowAlpha}px ${style.activeWordColor || style.color})`;
      break;
    }
    case 'typewriter':
    case 'karaoke-fill':
    case 'word-highlight':
    default:
      opacity = 1;
      break;
  }

  return { transform, opacity, filter };
}

export function getVideoClipCssFilter(clip: TimelineClip, isDraft = false): string {
  const parts: string[] = [
    `brightness(${clip.brightness ?? 100}%)`,
    `contrast(${clip.contrast ?? 100}%)`,
    `saturate(${clip.saturation ?? 100}%)`,
  ];
  const temp = clip.temperature || 0;
  if (temp > 0) {
    parts.push(`sepia(${Math.min(45, temp * 0.6).toFixed(0)}%)`);
  } else if (temp < 0) {
    parts.push(`hue-rotate(${Math.max(-25, temp * 0.35).toFixed(0)}deg)`);
  }
  if (!isDraft && (clip.blur || 0) > 0) {
    parts.push(`blur(${clip.blur}px)`);
  }
  return parts.join(' ');
}
