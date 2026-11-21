/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Link as LinkIcon,
  Sparkles,
  Sliders,
  FileText,
  Mic,
  Layers,
  Image as ImageIcon,
  Upload,
  Video,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Play,
} from 'lucide-react';
import type { Project, Channel, NavSection } from '../types';

interface WorkflowPipelineViewProps {
  currentProject: Project | null;
  channels: Channel[];
  onUpdateProject: (patch: Partial<Project>) => Promise<void>;
  onNavigateSection: (section: NavSection) => void;
}

export function WorkflowPipelineView({
  currentProject,
  channels,
  onUpdateProject,
  onNavigateSection,
}: WorkflowPipelineViewProps) {
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [urlInput, setUrlInput] = useState('');
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [tonePreset, setTonePreset] = useState<'Documentary' | 'Cinematic' | 'Mystery' | 'Explainer'>('Documentary');
  const [scriptDraft, setScriptDraft] = useState(currentProject?.scriptText || '');

  const stages = [
    { id: 1, name: 'Reference', icon: LinkIcon, desc: 'URL & Transcript Analysis' },
    { id: 2, name: 'Concept', icon: Sparkles, desc: 'Hook-driven Video Concepts' },
    { id: 3, name: 'Configure', icon: Sliders, desc: 'Audience & Tone Presets' },
    { id: 4, name: 'Scriptwriting', icon: FileText, desc: 'Multi-chapter Timed Script' },
    { id: 5, name: 'Audio & Timing', icon: Mic, desc: 'Fish Audio Voiceover & Waveform' },
    { id: 6, name: 'Scene Breakdown', icon: Layers, desc: 'Timed Scene Segments' },
    { id: 7, name: 'Image Prompts', icon: ImageIcon, desc: 'Midjourney / Flux Generators' },
    { id: 8, name: 'Media Ingest', icon: Upload, desc: 'Drop MP4 Video & Images' },
    { id: 9, name: 'Timeline Editor', icon: Video, desc: 'Advanced NLE Multi-track' },
    { id: 10, name: 'SEO & Packaging', icon: CheckCircle2, desc: 'Titles, Chapters & Thumbnail' },
  ];

  const handleAnalyzeReference = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setAnalysisNote('Please enter a reference URL or research topic first.');
      return;
    }
    setAnalysisNote(`Reference captured: "${trimmed}". Tone: ${tonePreset} (${channels[0]?.name || 'Default Channel'}).`);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header & Stage Progress Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-[#0c101b] border border-indigo-500/20 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <Wand2 className="w-3.5 h-3.5" />
              <span>AutoEditor / Universal YouTube Narrative Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              10-Stage End-to-End Workflow Pipeline
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Produce cinema-grade YouTube documentary and narrative videos seamlessly from raw concept to rendered MP4.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-indigo-300">
              Stage {currentStage} of 10
            </span>
          </div>
        </div>

        {/* Horizontal Stepper Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-2">
          {stages.map((st) => {
            const Icon = st.icon;
            const isCurrent = currentStage === st.id;
            const isPassed = currentStage > st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setCurrentStage(st.id)}
                className={`p-2.5 rounded-xl border text-start transition-all flex flex-col justify-between h-20 ${
                  isCurrent
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                    : isPassed
                    ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold">#{st.id}</span>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] font-bold truncate">{st.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STAGE CONTENT CONTAINER */}
      <div className="rounded-2xl bg-[#0c101b] border border-white/[0.08] p-6 sm:p-8 space-y-6 min-h-[420px] flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
                Stage {currentStage} of 10
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">{stages[currentStage - 1].name}</h2>
              <p className="text-xs text-slate-400">{stages[currentStage - 1].desc}</p>
            </div>
          </div>

          {/* STAGE 1: Reference */}
          {currentStage === 1 && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">YouTube Reference URL or Topic Prompt</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or enter research topic"
                    className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAnalyzeReference}
                    className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-colors"
                  >
                    Analyze Reference
                  </button>
                </div>
              </div>
              {analysisNote && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs">
                  {analysisNote}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Capture reference topic or URL, then step through concept, tone, scriptwriting, Fish Audio narration, and timeline editing.
              </p>
            </div>
          )}

          {/* STAGE 2: Concept */}
          {currentStage === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Hook-Driven Concepts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'The Quantum Paradox That Broke Physics', hook: 'What if everything we know about reality is a simulation error?' },
                  { title: 'Inside the Secret Silicon Valley AI Vaults', hook: 'The training data they never wanted the public to inspect.' },
                  { title: 'The Lost Ancient Technology of Acoustic Levitation', hook: 'How did builders lift 100-ton blocks with sound waves?' },
                ].map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onUpdateProject({ title: c.title });
                      setCurrentStage(3);
                    }}
                    className="text-start p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 hover:border-blue-500/50 cursor-pointer transition-colors"
                  >
                    <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">Concept #{i + 1}</span>
                    <h4 className="text-sm font-bold text-white">{c.title}</h4>
                    <p className="text-xs text-slate-400 italic">"{c.hook}"</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 3: Configure */}
          {currentStage === 3 && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tone & Atmosphere Preset</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Documentary', 'Cinematic', 'Mystery', 'Explainer'] as const).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setTonePreset(tone)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                        tonePreset === tone ? 'bg-blue-600 text-white border-blue-400 shadow-md' : 'bg-black/40 border-white/10 text-slate-400'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: Scriptwriting */}
          {currentStage === 4 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Multi-Chapter Timed Narrative Script</h3>
                <button
                  type="button"
                  onClick={() => onNavigateSection('script-studio')}
                  className="text-xs font-semibold text-indigo-400 hover:underline"
                >
                  Open AI Script Studio →
                </button>
              </div>
              <textarea
                rows={8}
                value={scriptDraft}
                onChange={(e) => setScriptDraft(e.target.value)}
                onBlur={() => {
                  if (scriptDraft !== (currentProject?.scriptText || '')) {
                    void onUpdateProject({ scriptText: scriptDraft });
                  }
                }}
                placeholder="Write or refine your multi-chapter narrative script..."
                className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm leading-relaxed focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>
          )}

          {/* STAGE 5: Audio & Timing */}
          {currentStage === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Fish Audio Voiceover & Waveform Analysis</h3>
              <div className="p-6 rounded-xl bg-black/40 border border-white/10 text-center space-y-3">
                <Mic className="w-10 h-10 text-indigo-400 mx-auto" />
                <div className="text-sm font-semibold text-white">Voiceover Synced & Waveform Ready</div>
                <p className="text-xs text-slate-400">Silence trimming and WSOLA pitch-preserving time-stretching active.</p>
                <button
                  type="button"
                  onClick={() => onNavigateSection('studio')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                >
                  Open Voice Studio (Fish Audio)
                </button>
              </div>
            </div>
          )}

          {/* STAGE 6: Scene Breakdown */}
          {currentStage === 6 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Auto-Segmented Timed Scenes</h3>
              <div className="space-y-2">
                {['Scene 1 (0:00 - 0:15) - Cinematic Drone Shot over Research Lab', 'Scene 2 (0:15 - 0:45) - Macro Close-up on Quantum Processor', 'Scene 3 (0:45 - 1:20) - Dramatic Archive Footage Montage'].map((sc, i) => (
                  <div key={i} className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                    <span>{sc}</span>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">Timed</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 7: Image Prompts */}
          {currentStage === 7 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Midjourney / Flux AI Prompts per Scene</h3>
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-300 space-y-2">
                <div>/imagine prompt: Cinematic documentary still, dark atmospheric laboratory, volumetric neon blue lighting, photorealistic --ar 16:9 --v 6.0</div>
              </div>
            </div>
          )}

          {/* STAGE 8: Media Assets Ingest */}
          {currentStage === 8 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Media Assets Ingest</h3>
              <div className="p-8 rounded-xl bg-black/40 border border-dashed border-white/20 text-center space-y-3">
                <Upload className="w-10 h-10 text-blue-400 mx-auto" />
                <div className="text-sm font-semibold text-white">Drag & Drop MP4 Video Clips or Images</div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('video-editor')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
                >
                  Open in Video Editor
                </button>
              </div>
            </div>
          )}

          {/* STAGE 9: Timeline Editor */}
          {currentStage === 9 && (
            <div className="space-y-4 text-center py-8">
              <Video className="w-12 h-12 text-blue-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Advanced Non-Linear Timeline Editor (NLE)</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Multi-track timeline, visual effects, Ken Burns motion, transitions, and color grading.
              </p>
              <button
                type="button"
                onClick={() => onNavigateSection('video-editor')}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all inline-flex items-center gap-2"
              >
                <span>Launch Video Editor Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STAGE 10: SEO & Packaging */}
          {currentStage === 10 && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Click-Worthy YouTube Title</label>
                <input
                  type="text"
                  defaultValue="The Quantum Secret They Didn't Want You to Know"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description & Video Chapters</label>
                <textarea
                  rows={3}
                  defaultValue="0:00 Introduction\n3:15 The Anomaly\n7:45 Conclusion"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            type="button"
            disabled={currentStage === 1}
            onClick={() => setCurrentStage((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous Stage</span>
          </button>

          <button
            type="button"
            disabled={currentStage === 10}
            onClick={() => setCurrentStage((s) => Math.min(10, s + 1))}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 disabled:opacity-40 transition-all"
          >
            <span>Next Stage</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
