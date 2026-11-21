/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Plus, FolderKanban, Tv, FileText, Mic, Video, Subtitles, DownloadCloud, Sparkles, ArrowRight, Clock } from 'lucide-react';
import type { Channel, Project, NavSection } from '../types';

interface DashboardViewProps {
  projects: Project[];
  channels: Channel[];
  onSelectSection: (section: NavSection) => void;
  onOpenProject: (project: Project) => void;
  onCreateProject: () => void;
}

export function DashboardView({
  projects,
  channels,
  onSelectSection,
  onOpenProject,
  onCreateProject,
}: DashboardViewProps) {
  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-[#0c101b] border border-indigo-500/20 p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Creator Studio Pro</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Transform Ideas Into Professional Videos
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Unified multi-track video production suite featuring automated AI script generation, Fish Audio voiceover synthesis, multi-track timeline editing, and synchronized captions.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCreateProject}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('channels')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-medium text-sm transition-colors"
            >
              <Tv className="w-4 h-4 text-indigo-400" />
              <span>Manage Channels ({channels.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0c101b] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Total Projects</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{projects.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c101b] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Active Channels</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{channels.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Tv className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c101b] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Workflow Pipeline</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">6 Stages</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c101b] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Audio Engine</div>
            <div className="text-lg font-bold text-purple-400 mt-1">Fish Audio S2</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Mic className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Production Pipeline Navigation */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Production Pipeline Stages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'channels' as NavSection, label: '1. Channels', icon: Tv, desc: 'Niche & Prompts' },
            { id: 'workflow' as NavSection, label: '2. Narrative Pipeline', icon: Sparkles, desc: '10-Stage Flow' },
            { id: 'script-studio' as NavSection, label: '3. Script Studio', icon: FileText, desc: 'AI / Custom Scripts' },
            { id: 'studio' as NavSection, label: '4. Voice Studio', icon: Mic, desc: 'Fish Audio TTS' },
            { id: 'video-editor' as NavSection, label: '5. Video Editor', icon: Video, desc: 'Multi-track Timeline' },
            { id: 'video-editor' as NavSection, label: '6. Captions & Export', icon: DownloadCloud, desc: 'Render & Download MP4' },
          ].map((stage) => {
            const Icon = stage.icon;
            return (
              <button
                key={stage.label}
                type="button"
                onClick={() => onSelectSection(stage.id)}
                className="p-4 rounded-xl bg-[#0c101b] hover:bg-white/[0.04] border border-white/[0.08] hover:border-indigo-500/40 text-start transition-all group flex flex-col justify-between h-32"
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{stage.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{stage.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Recent Projects</h2>
          <button
            type="button"
            onClick={() => onSelectSection('projects')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View All ({projects.length})
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-[#0c101b] border border-white/[0.08] p-8">
            <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No projects created yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Create your first AI video project to start generating scripts, voiceovers, and multi-track timelines.
            </p>
            <button
              type="button"
              onClick={onCreateProject}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                onClick={() => onOpenProject(project)}
                className="p-5 rounded-2xl bg-[#0c101b] hover:bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/40 cursor-pointer transition-all space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-bold">
                    {project.title.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-1 rounded-md text-slate-400">
                    {project.exportSettings?.resolution || '1080p'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {project.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {project.scriptText ? project.scriptText.slice(0, 100) + '...' : 'No script entered yet.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className="text-indigo-400 font-medium group-hover:underline">Open Studio →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
