/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Sparkles, FileText, Wand2, Copy, Check, Clock, RefreshCcw, ArrowRight, Upload } from 'lucide-react';
import type { Channel, Project } from '../types';
import { api } from '../lib/api';

interface ScriptStudioViewProps {
  currentProject: Project | null;
  channels: Channel[];
  onUpdateProjectScript: (scriptText: string) => Promise<void>;
  onProceedToVoice: () => void;
}

export function ScriptStudioView({
  currentProject,
  channels,
  onUpdateProjectScript,
  onProceedToVoice,
}: ScriptStudioViewProps) {
  const [mode, setMode] = useState<'ai' | 'ready'>('ai');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [targetDuration, setTargetDuration] = useState('3 minutes');
  const [language, setLanguage] = useState(currentProject?.channelSnapshot?.language || 'en');
  const [selectedChannelId, setSelectedChannelId] = useState(currentProject?.channelId || channels[0]?.id || '');
  const [draftText, setDraftText] = useState(currentProject?.scriptText || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftText(currentProject?.scriptText || '');
  }, [currentProject?.id, currentProject?.scriptText]);

  useEffect(() => {
    if (currentProject?.channelId) {
      setSelectedChannelId(currentProject.channelId);
    } else if (!selectedChannelId && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
    if (currentProject?.channelSnapshot?.language) {
      setLanguage(currentProject.channelSnapshot.language);
    }
  }, [currentProject?.id, currentProject?.channelId, currentProject?.channelSnapshot?.language, channels, selectedChannelId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleDraftChange = (nextText: string) => {
    setDraftText(nextText);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void onUpdateProjectScript(nextText);
    }, 450);
  };

  const handleProceed = async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (draftText !== (currentProject?.scriptText || '')) {
      await onUpdateProjectScript(draftText);
    }
    onProceedToVoice();
  };

  const handleScriptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      setDraftText(text);
      await onUpdateProjectScript(text);
      setMode('ready');
    } catch {
      setError('Unable to read the selected script file.');
    }
  };

  const handleGenerateAiScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.generateScript({
        topic: topic.trim(),
        description: description.trim(),
        targetDuration,
        language,
        channelId: selectedChannelId,
      });
      if (res?.scriptText) {
        setDraftText(res.scriptText);
        await onUpdateProjectScript(res.scriptText);
        setMode('ready');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI script generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const wordCount = draftText.trim() ? draftText.trim().split(/\s+/).length : 0;
  const charCount = draftText.length;
  const estSeconds = Math.round(wordCount / 2.5); // ~150 words per minute
  const estMinutesStr = `${Math.floor(estSeconds / 60)}m ${estSeconds % 60}s`;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Script Studio</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Generate professional video scripts using AI or compose and organize your ready-made scripts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'ai' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
            AI Generator
          </button>
          <button
            type="button"
            onClick={() => setMode('ready')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'ready' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            Ready Script Editor
          </button>
        </div>
      </div>

      {!currentProject && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
          ⚠️ Note: No active project is open. Edits will be saved locally once you open or create a project from Projects management.
        </div>
      )}

      {mode === 'ai' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl bg-[#0c101b] border border-white/[0.08] p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-400" />
              <span>AI Script Parameters</span>
            </h2>

            <form onSubmit={handleGenerateAiScript} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Content Channel</label>
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} ({ch.niche})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Video Topic / Title *</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The Untold Secrets of Quantum Computing"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description & Key Points</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cover qubit superposition, error correction, and real-world impact..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Duration</label>
                  <select
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1 minute">1 Minute (Shorts)</option>
                    <option value="3 minutes">3 Minutes</option>
                    <option value="5 minutes">5 Minutes</option>
                    <option value="10 minutes">10 Minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>

              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    <span>Generating Script via Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Script</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 rounded-2xl bg-[#0c101b] border border-white/[0.08] p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white">Generated Script Preview</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{estMinutesStr} est.</span>
                </div>
              </div>

              <div className="min-h-[350px] max-h-[500px] overflow-y-auto p-4 rounded-xl bg-black/40 border border-white/10 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {draftText || 'Configure parameters on the left and click "Generate Script" to produce an AI-powered video script tailored to your channel prompt rules.'}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode('ready')}
                className="text-xs font-semibold text-indigo-400 hover:underline"
              >
                Switch to Editor to Refine →
              </button>
              <button
                type="button"
                disabled={!draftText}
                onClick={handleProceed}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <span>Proceed to Voice Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0c101b] border border-white/[0.08] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Ready-Made Script Editor</h2>
              <p className="text-xs text-slate-400">Edit, upload, or format your script before generating voiceover.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 cursor-pointer font-sans font-medium">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Upload .txt/.md</span>
                <input type="file" accept=".txt,.md,text/plain" onChange={handleScriptFileUpload} className="hidden" />
              </label>
              <span className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">{wordCount} words</span>
              <span className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">{charCount} chars</span>
              <span className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {estMinutesStr}
              </span>
            </div>
          </div>

          <textarea
            rows={14}
            value={draftText}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="Type or paste your professional video script here..."
            className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(draftText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Script'}</span>
            </button>

            <button
              type="button"
              disabled={!draftText.trim()}
              onClick={handleProceed}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <span>Proceed to Voice Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
