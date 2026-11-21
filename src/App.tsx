/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Globe, Menu } from 'lucide-react';
import { ApiConfigView } from './components/ApiConfigView';
import { FavoritesView } from './components/FavoritesView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { StudioView } from './components/StudioView';
import { VoiceLibraryView } from './components/VoiceLibraryView';
import { DashboardView } from './components/DashboardView';
import { ProjectsView } from './components/ProjectsView';
import { ChannelsView } from './components/ChannelsView';
import { WorkflowPipelineView } from './components/WorkflowPipelineView';
import { ScriptStudioView } from './components/ScriptStudioView';
import { VideoEditorView } from './components/VideoEditorView';
import { TRANSLATIONS } from './i18n/translations';
import { api, ApiError } from './lib/api';
import {
  DEFAULT_GENERATION_PARAMS,
  type ApiConfigStatus,
  type Channel,
  type DirectedSegment,
  type DirectedSegmentPayload,
  type GenerationParams,
  type GenerationProgress,
  type GenerationRecord,
  type NavSection,
  type Project,
  type UILanguage,
  type VoiceModel,
} from './types';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editorSidebarOpen, setEditorSidebarOpen] = useState(false);

  const isVideoEditor = activeSection === 'video-editor';

  const handleSelectSection = (section: NavSection) => {
    setActiveSection(section);
    if (section === 'video-editor') {
      setEditorSidebarOpen(false);
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'video-editor') {
      setEditorSidebarOpen(false);
      setMobileMenuOpen(false);
    }
  }, [activeSection]);

  const [uiLanguage, setUiLanguage] = useState<UILanguage>(() => {
    const saved = localStorage.getItem('voice_studio_lang');
    return saved === 'ar' ? 'ar' : 'en';
  });

  const [configStatus, setConfigStatus] = useState<ApiConfigStatus | null>(null);
  const [defaultParams, setDefaultParams] = useState<GenerationParams>(DEFAULT_GENERATION_PARAMS);
  const [studioParams, setStudioParams] = useState<GenerationParams>(DEFAULT_GENERATION_PARAMS);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const [scriptText, setScriptText] = useState(
    'Welcome to AI Creator Studio. Enter or paste any script here to synthesize natural, expressive speech powered by Fish Audio.'
  );
  const [directorMode, setDirectorMode] = useState(false);
  const [directedSegments, setDirectedSegments] = useState<DirectedSegment[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceModel | null>(null);
  const [favorites, setFavorites] = useState<VoiceModel[]>([]);
  const [history, setHistory] = useState<GenerationRecord[]>([]);

  const [currentRecord, setCurrentRecord] = useState<GenerationRecord | null>(null);
  const [historyActiveRecord, setHistoryActiveRecord] = useState<GenerationRecord | null>(null);
  const [autoPlaySignal, setAutoPlaySignal] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);

  const t = TRANSLATIONS[uiLanguage];

  // Sync HTML dir and lang attributes for seamless RTL/LTR switching
  useEffect(() => {
    document.documentElement.lang = uiLanguage;
    document.documentElement.dir = uiLanguage === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('voice_studio_lang', uiLanguage);
  }, [uiLanguage]);

  // Initial Hydration from backend
  useEffect(() => {
    async function bootstrap() {
      try {
        const [statusRes, prefsRes, favRes, histRes, channelsRes, projectsRes] = await Promise.all([
          api.getConfigStatus(),
          api.getPreferences(),
          api.getFavorites(),
          api.getHistory(),
          api.getChannels(),
          api.getProjects(),
        ]);

        setConfigStatus(statusRes);
        if (prefsRes?.uiLanguage === 'en' || prefsRes?.uiLanguage === 'ar') {
          setUiLanguage(prefsRes.uiLanguage);
        }
        const safeParams = {
          ...DEFAULT_GENERATION_PARAMS,
          ...(prefsRes?.defaultParams || {}),
        };
        setDefaultParams(safeParams);
        setStudioParams(safeParams);
        setSelectedVoice(prefsRes?.selectedVoice ?? null);

        const safeFavs = Array.isArray(favRes?.items) ? favRes.items.filter((f): f is VoiceModel => Boolean(f && f._id)) : [];
        const safeHist = Array.isArray(histRes?.items) ? histRes.items.filter((h): h is GenerationRecord => Boolean(h && h.id)) : [];
        let activeChannels = Array.isArray(channelsRes?.items) ? channelsRes.items : [];
        let activeProjects = Array.isArray(projectsRes?.items) ? projectsRes.items : [];

        setFavorites(safeFavs);
        setHistory(safeHist);

        if (activeChannels.length === 0) {
          try {
            const defaultChan = await api.createChannel({
              name: 'Default Channel',
              niche: 'Technology & AI',
              description: 'General technology and video content channel',
            });
            activeChannels = [defaultChan];
          } catch {
            // ignore
          }
        }
        setChannels(activeChannels);

        if (activeProjects.length === 0) {
          try {
            const initialProject = await api.createProject({
              title: 'My First Video Project',
              channelId: activeChannels[0]?.id || null,
              scriptText,
            });
            if (initialProject?.id) {
              activeProjects = [initialProject];
            }
          } catch {
            // ignore
          }
        }

        setProjects(activeProjects);
        if (activeProjects.length > 0) {
          setCurrentProject(activeProjects[0]);
          if (activeProjects[0].scriptText) {
            setScriptText(activeProjects[0].scriptText);
          }
        }

        if (safeHist.length > 0) {
          setCurrentRecord(safeHist[0]);
        }
      } catch {
        // Non-fatal startup fallback
      }
    }
    bootstrap();
  }, []);

  const handleLanguageChange = async (nextLang: UILanguage) => {
    setUiLanguage(nextLang);
    try {
      await api.updatePreferences({ uiLanguage: nextLang });
    } catch {
      // ignore
    }
  };

  const handleSelectVoice = async (voice: VoiceModel | null) => {
    setSelectedVoice(voice);
    try {
      await api.updatePreferences({ selectedVoice: voice });
    } catch {
      // ignore
    }
  };

  const handleToggleFavorite = async (voice: VoiceModel) => {
    const exists = favorites.some((f) => f._id === voice._id);
    if (exists) {
      const res = await api.removeFavorite(voice._id);
      if (Array.isArray(res?.items)) {
        setFavorites(res.items.filter((f): f is VoiceModel => Boolean(f && f._id)));
      }
    } else {
      const res = await api.addFavorite(voice);
      if (Array.isArray(res?.items)) {
        setFavorites(res.items.filter((f): f is VoiceModel => Boolean(f && f._id)));
      }
    }
  };

  const handleCancelGenerate = () => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
  };

  const handleGenerate = async () => {
    setStudioError(null);
    const activeDirected: DirectedSegmentPayload[] | undefined =
      directorMode && directedSegments.length > 0
        ? directedSegments
            .filter((seg) => seg.text.trim() || seg.emotionTag.trim())
            .map((seg) => ({
              text: seg.text.trim(),
              emotionTag: seg.emotionTag.trim() || undefined,
              speed: seg.speed ?? undefined,
              voiceId:
                seg.voiceMode === 'default'
                  ? null
                  : seg.voiceMode === 'custom'
                    ? seg.voiceId
                    : selectedVoice?._id || null,
            }))
        : undefined;

    const trimmed = scriptText.trim();
    if (!trimmed && (!activeDirected || activeDirected.length === 0)) {
      setStudioError(t.studio.emptyTextError);
      return;
    }

    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;

    setIsGenerating(true);
    setGenerationProgress(null);
    try {
      const res = await api.generateSpeechStream(
        {
          text: trimmed || activeDirected!.map((s) => s.text).join('\n'),
          voiceId: selectedVoice?._id || null,
          voiceName: selectedVoice?.title || t.studio.defaultVoiceTitle,
          voiceAuthor: selectedVoice?.author?.nickname,
          segments: activeDirected,
          ...studioParams,
        },
        {
          signal: controller.signal,
          onProgress: (prog) => setGenerationProgress(prog),
        }
      );

      if (!res?.record?.id) {
        throw new Error('Speech synthesis completed without a valid audio record.');
      }

      setHistory((prev) => [res.record, ...prev]);
      setCurrentRecord(res.record);
      setAutoPlaySignal((n) => n + 1);

      if (currentProject) {
        const updatedTracks = (currentProject.timeline?.tracks || []).map((tr) => {
          if (tr.id !== 'a1') return tr;
          const dur = res.record.durationSeconds && res.record.durationSeconds > 0 ? res.record.durationSeconds : 15;
          const nextClip = {
            id: crypto.randomUUID(),
            trackId: 'a1',
            startTime: 0,
            duration: dur,
            sourceMediaId: `fish-${res.record.id}`,
            sourceUrl: res.record.audioUrl,
            title: `Voiceover: ${res.record.voiceName}`,
          };
          const filtered = tr.clips.filter((c) => c.sourceMediaId !== `fish-${res.record.id}`);
          return { ...tr, clips: [...filtered, nextClip] };
        });

        const nextCaptions =
          currentProject.captions?.length === 0 && Array.isArray(res.record.transcript) && res.record.transcript.length > 0
            ? res.record.transcript.map((cue) => ({
                id: crypto.randomUUID(),
                startMs: cue.startMs,
                endMs: cue.endMs,
                text: cue.text,
              }))
            : currentProject.captions;

        const updated = await api.updateProject(currentProject.id, {
          audioRecordId: res.record.id,
          audioUrl: res.record.audioUrl,
          timeline: { tracks: updatedTracks },
          captions: nextCaptions,
        });
        setCurrentProject(updated);
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Cancelled
      } else if (err instanceof ApiError && err.code === 'API_KEY_MISSING') {
        setStudioError(err.message);
      } else {
        setStudioError(err instanceof Error ? err.message : 'Speech generation failed.');
      }
    } finally {
      if (generationAbortRef.current === controller) {
        generationAbortRef.current = null;
      }
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await api.deleteHistoryItem(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (currentRecord?.id === id) setCurrentRecord(null);
  };

  const handleClearHistory = async () => {
    await api.clearHistory();
    setHistory([]);
    setCurrentRecord(null);
  };

  const handleRecordUpdated = (updated: GenerationRecord) => {
    setHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    if (currentRecord?.id === updated.id) setCurrentRecord(updated);
  };

  const handleLoadInStudio = (record: GenerationRecord) => {
    setScriptText(record.text);
    setDirectorMode(false);
    setDirectedSegments([]);
    setStudioParams({
      ...studioParams,
      model: record.model,
      format: record.format,
      sample_rate: record.sampleRate,
      speed: record.speed,
      volume: record.volume,
      temperature: record.temperature,
      top_p: record.topP,
      repetition_penalty: record.repetitionPenalty,
      latency: record.latency,
      normalize: record.normalize,
      chunk_length: record.chunkLength,
    });
    if (record.voiceId) {
      setSelectedVoice({
        _id: record.voiceId,
        title: record.voiceName,
        author: record.voiceAuthor ? { nickname: record.voiceAuthor } : undefined,
      });
    } else {
      setSelectedVoice(null);
    }
    setCurrentRecord(record);
    setActiveSection('studio');
  };

  const handleSaveDefaultParams = async (next: GenerationParams) => {
    setDefaultParams(next);
    setStudioParams(next);
    await api.updatePreferences({ defaultParams: next });
  };

  // Creator Studio handlers
  const handleCreateProject = async (title?: string, channelId?: string) => {
    try {
      const res = await api.createProject({
        title: title || 'Untitled Video Project',
        channelId: channelId || channels[0]?.id || null,
        scriptText,
      });
      setProjects((prev) => [res, ...prev]);
      setCurrentProject(res);
      setActiveSection('script-studio');
    } catch {
      // ignore
    }
  };

  const handleDeleteProject = async (id: string) => {
    await api.deleteProject(id);
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (currentProject?.id === id) {
        setCurrentProject(remaining[0] || null);
      }
      return remaining;
    });
  };

  const handleDuplicateProject = async (id: string) => {
    const res = await api.duplicateProject(id);
    if (res?.id) {
      setProjects((prev) => [res, ...prev]);
    }
  };

  const handleUpdateCurrentProject = async (patch: Partial<Project>) => {
    try {
      let target: Project;
      if (!currentProject) {
        const created = (await api.createProject({
          title: patch.title || 'Untitled Video Project',
          channelId: channels[0]?.id || null,
          scriptText: patch.scriptText ?? scriptText,
        })) as Project;
        target = created;
        setProjects((prev) => [created, ...prev]);
        setCurrentProject(created);
      } else {
        target = currentProject;
      }
      const updated = (await api.updateProject(target.id, patch)) as Project;
      setCurrentProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (typeof patch.scriptText === 'string') {
        setScriptText(patch.scriptText);
      }
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  };

  const handleSaveChannel = async (channel: Channel) => {
    if (channel.id) {
      const updated = await api.updateChannel(channel.id, channel);
      setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      const created = await api.createChannel(channel);
      setChannels((prev) => [created, ...prev]);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    await api.deleteChannel(id);
    setChannels((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDuplicateChannel = async (id: string) => {
    const dup = await api.duplicateChannel(id);
    if (dup?.id) {
      setChannels((prev) => [dup, ...prev]);
    }
  };

  const sectionTitleMap: Record<NavSection, string> = {
    dashboard: 'Creator Studio Dashboard',
    projects: 'Projects Management',
    channels: 'Content Channels',
    workflow: '10-Stage Narrative Workflow Pipeline',
    'script-studio': 'Script Studio (AI & Custom)',
    studio: t.nav.studio,
    'video-editor': 'Unified Professional Video Editor',
    library: t.nav.library,
    history: t.nav.history,
    favorites: t.nav.favorites,
    settings: t.nav.settings,
    'api-config': t.nav.apiConfig,
  };

  return (
    <div className="min-h-screen bg-[#070910] text-slate-100 flex">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        configStatus={configStatus}
        historyCount={history.length}
        favoritesCount={favorites.length}
        projectsCount={projects.length}
        channelsCount={channels.length}
        mobileOpen={isVideoEditor ? editorSidebarOpen : mobileMenuOpen}
        overlayOnly={isVideoEditor}
        onCloseMobile={() => {
          setMobileMenuOpen(false);
          setEditorSidebarOpen(false);
        }}
        t={t}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header (hidden in Video Editor for fullscreen workspace) */}
        {!isVideoEditor && (
          <header className="h-16 border-b border-white/[0.08] bg-[#070910]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={t.header.openMenu}
                className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06]"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm font-bold text-white">{sectionTitleMap[activeSection]}</span>
                {currentProject && activeSection !== 'dashboard' && activeSection !== 'projects' && (
                  <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30 truncate max-w-[200px]">
                    Project: {currentProject.title}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleLanguageChange(uiLanguage === 'en' ? 'ar' : 'en')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#0c101b] hover:bg-white/[0.06] text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.header.languageToggle}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('api-config')}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#0c101b] hover:border-indigo-400/40 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
              >
                <span>{configStatus?.configured ? t.apiConfig.connected : t.header.configureApiKey}</span>
              </button>
            </div>
          </header>
        )}

        {/* Main Viewport */}
        <main
          className={
            isVideoEditor
              ? 'flex-1 w-full min-w-0 h-screen p-0 overflow-hidden'
              : 'flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto'
          }
        >
          {activeSection === 'dashboard' && (
            <DashboardView
              projects={projects}
              channels={channels}
              onSelectSection={setActiveSection}
              onOpenProject={(proj) => {
                setCurrentProject(proj);
                if (proj.scriptText) setScriptText(proj.scriptText);
                setActiveSection('script-studio');
              }}
              onCreateProject={() => handleCreateProject()}
            />
          )}

          {activeSection === 'projects' && (
            <ProjectsView
              projects={projects}
              channels={channels}
              onOpenProject={(proj) => {
                setCurrentProject(proj);
                if (proj.scriptText) setScriptText(proj.scriptText);
                setActiveSection('script-studio');
              }}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
            />
          )}

          {activeSection === 'channels' && (
            <ChannelsView
              channels={channels}
              onSaveChannel={handleSaveChannel}
              onDeleteChannel={handleDeleteChannel}
              onDuplicateChannel={handleDuplicateChannel}
            />
          )}

          {activeSection === 'workflow' && (
            <WorkflowPipelineView
              currentProject={currentProject}
              channels={channels}
              onUpdateProject={handleUpdateCurrentProject}
              onNavigateSection={setActiveSection}
            />
          )}

          {activeSection === 'script-studio' && (
            <ScriptStudioView
              currentProject={currentProject}
              channels={channels}
              onUpdateProjectScript={async (text) => {
                setScriptText(text);
                if (currentProject) {
                  await handleUpdateCurrentProject({ scriptText: text });
                }
              }}
              onProceedToVoice={() => setActiveSection('studio')}
            />
          )}

          {activeSection === 'studio' && (
            <StudioView
              text={scriptText}
              onTextChange={setScriptText}
              directorMode={directorMode}
              onDirectorModeChange={setDirectorMode}
              directedSegments={directedSegments}
              onDirectedSegmentsChange={setDirectedSegments}
              selectedVoice={selectedVoice}
              favorites={favorites}
              onClearVoice={() => handleSelectVoice(null)}
              onBrowseVoices={() => setActiveSection('library')}
              params={studioParams}
              onParamsChange={setStudioParams}
              onGenerate={handleGenerate}
              onCancelGenerate={handleCancelGenerate}
              isGenerating={isGenerating}
              progress={generationProgress}
              error={studioError}
              onDismissError={() => setStudioError(null)}
              currentRecord={currentRecord}
              onRecordUpdated={handleRecordUpdated}
              autoPlaySignal={autoPlaySignal}
              configStatus={configStatus}
              onOpenApiConfig={() => setActiveSection('api-config')}
              uiLanguage={uiLanguage}
              t={t}
            />
          )}

          {isVideoEditor && (
            <VideoEditorView
              currentProject={currentProject}
              history={history}
              onUpdateProject={handleUpdateCurrentProject}
              onOpenVoiceStudio={() => handleSelectSection('studio')}
              appSidebarOpen={editorSidebarOpen}
              onToggleAppSidebar={() => setEditorSidebarOpen((o) => !o)}
            />
          )}

          {activeSection === 'library' && (
            <VoiceLibraryView
              selectedVoice={selectedVoice}
              onSelectVoice={(voice) => {
                handleSelectVoice(voice);
                setActiveSection('studio');
              }}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              configStatus={configStatus}
              onOpenApiConfig={() => setActiveSection('api-config')}
              t={t}
            />
          )}

          {activeSection === 'history' && (
            <HistoryView
              items={history}
              activeRecord={historyActiveRecord}
              onPlayRecord={setHistoryActiveRecord}
              onRecordUpdated={handleRecordUpdated}
              onLoadInStudio={handleLoadInStudio}
              onDeleteItem={handleDeleteHistoryItem}
              onClearAll={handleClearHistory}
              onGoToStudio={() => setActiveSection('studio')}
              uiLanguage={uiLanguage}
              t={t}
            />
          )}

          {activeSection === 'favorites' && (
            <FavoritesView
              favorites={favorites}
              selectedVoice={selectedVoice}
              onUseVoice={(voice) => {
                handleSelectVoice(voice);
                setActiveSection('studio');
              }}
              onRemoveFavorite={handleToggleFavorite}
              onBrowseLibrary={() => setActiveSection('library')}
              t={t}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              uiLanguage={uiLanguage}
              onChangeLanguage={handleLanguageChange}
              defaultParams={defaultParams}
              onSaveDefaultParams={handleSaveDefaultParams}
              t={t}
            />
          )}

          {activeSection === 'api-config' && (
            <ApiConfigView
              status={configStatus}
              onStatusUpdated={setConfigStatus}
              t={t}
            />
          )}
        </main>
      </div>
    </div>
  );
}
