/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Plus, Tv, Edit3, Trash2, Copy, Sparkles, Sliders } from 'lucide-react';
import type { Channel } from '../types';

interface ChannelsViewProps {
  channels: Channel[];
  onSaveChannel: (channel: Channel) => Promise<void>;
  onDeleteChannel: (id: string) => Promise<void>;
  onDuplicateChannel: (id: string) => Promise<void>;
}

export function ChannelsView({
  channels,
  onSaveChannel,
  onDeleteChannel,
  onDuplicateChannel,
}: ChannelsViewProps) {
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenCreate = () => {
    setEditingChannel({
      id: '',
      name: 'New Content Channel',
      description: 'Channel description and goals...',
      niche: 'Technology & AI',
      language: 'en',
      targetAudience: 'Tech enthusiasts & professionals',
      contentType: 'Educational Documentary',
      mainPrompt: 'Create captivating, deeply informative narration with strong narrative hooks.',
      writingStylePrompt: 'Use active voice, clear transitions, and compelling insights.',
      scriptStructure: 'Hook (0-15s) -> Intro -> Core Insights -> Summary -> Call to Action',
      tone: 'Engaging, Authoritative & Inspiring',
      defaultModel: 's2.1-pro-free',
      defaultVoiceId: null,
      videoFormat: '16:9 (1080p)',
      captionStyle: 'Modern Yellow Highlight',
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (channel: Channel) => {
    setEditingChannel({ ...channel });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    await onSaveChannel(editingChannel);
    setIsModalOpen(false);
    setEditingChannel(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Channel Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Configure independent content channels with custom AI writing prompts, niches, and formatting presets.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Channel</span>
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-[#0c101b] border border-white/[0.08] p-8">
          <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No channels configured</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Create a content channel to establish writing rules and prompts for automated script generation.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Channel</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="rounded-2xl bg-[#0c101b] border border-white/[0.08] hover:border-indigo-500/40 p-6 flex flex-col justify-between transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{channel.name}</h3>
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {channel.niche}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(channel)}
                      aria-label="Edit Channel"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateChannel(channel.id)}
                      aria-label="Duplicate Channel"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteChannel(channel.id)}
                      aria-label="Delete Channel"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{channel.description}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-400 font-mono bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                  <div>Language: <span className="text-white uppercase">{channel.language}</span></div>
                  <div>Format: <span className="text-white">{channel.videoFormat}</span></div>
                  <div className="col-span-2 truncate">Tone: <span className="text-white">{channel.tone}</span></div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] text-[11px] text-slate-500 flex items-center justify-between">
                <span>AI Prompt Rules Configured</span>
                <span className="text-indigo-400">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Channel Modal */}
      {isModalOpen && editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#0c101b] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingChannel.id ? 'Edit Channel Settings' : 'Create Content Channel'}
                </h3>
                <p className="text-xs text-slate-400">Configure writing style prompts and video presets.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Channel Name</label>
                  <input
                    type="text"
                    required
                    value={editingChannel.name}
                    onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Content Niche</label>
                  <input
                    type="text"
                    required
                    value={editingChannel.niche}
                    onChange={(e) => setEditingChannel({ ...editingChannel, niche: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingChannel.description}
                  onChange={(e) => setEditingChannel({ ...editingChannel, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Language</label>
                  <select
                    value={editingChannel.language}
                    onChange={(e) => setEditingChannel({ ...editingChannel, language: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="en">English (en)</option>
                    <option value="ar">Arabic (ar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Video Format</label>
                  <select
                    value={editingChannel.videoFormat}
                    onChange={(e) => setEditingChannel({ ...editingChannel, videoFormat: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="16:9 (1080p)">16:9 Landscape (YouTube)</option>
                    <option value="9:16 (Shorts)">9:16 Vertical (Shorts / Reels)</option>
                    <option value="1:1 (Square)">1:1 Square (Instagram / LinkedIn)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Caption Style</label>
                  <input
                    type="text"
                    value={editingChannel.captionStyle}
                    onChange={(e) => setEditingChannel({ ...editingChannel, captionStyle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Main AI Script Prompt Instructions</label>
                <textarea
                  rows={3}
                  value={editingChannel.mainPrompt}
                  onChange={(e) => setEditingChannel({ ...editingChannel, mainPrompt: e.target.value })}
                  placeholder="Instructions for AI script generation..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Writing Style & Tone Prompt</label>
                <input
                  type="text"
                  value={editingChannel.writingStylePrompt}
                  onChange={(e) => setEditingChannel({ ...editingChannel, writingStylePrompt: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Script Structure Instructions</label>
                <input
                  type="text"
                  value={editingChannel.scriptStructure}
                  onChange={(e) => setEditingChannel({ ...editingChannel, scriptStructure: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Save Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
