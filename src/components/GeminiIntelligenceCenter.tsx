import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  Compass,
  Copy,
  Download,
  Flame,
  Globe,
  Headphones,
  Info,
  Loader2,
  Mic,
  MicOff,
  Play,
  RotateCw,
  Search,
  Send,
  Sparkles,
  Square,
  TrendingUp,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  ChatMessage,
  ChatModel,
  ChatRole,
  checkVeoStatus,
  generateVeoVideo,
  getVeoDownloadUrl,
  sendChatMessage,
  sendVoiceDialogue,
  transcribeAudioBlob,
} from '../services/geminiFeatures';
import { AppSettings, Story } from '../types';

interface GeminiIntelligenceCenterProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  stories: Story[];
  initialMode?: 'chat' | 'transcribe' | 'video' | 'voice';
}

export const GeminiIntelligenceCenter: React.FC<GeminiIntelligenceCenterProps> = ({
  isOpen,
  onClose,
  settings,
  stories,
  initialMode = 'chat',
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'transcribe' | 'video' | 'voice'>(initialMode);
  const isDark = settings.theme === 'dark';

  // --- CHAT STATE ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Welcome to the WorldPulse Gemini Situation Room. Select an expert intelligence persona below, choose your model capability, and toggle Google Search Grounding for live web verification.',
      timestamp: Date.now(),
      modelUsed: 'gemini-3.8-flash',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatRole, setChatRole] = useState<ChatRole>('analyst');
  const [chatModel, setChatModel] = useState<ChatModel>('gemini-3.8-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- TRANSCRIBE STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- VEO 3 VIDEO STATE ---
  const [videoPrompt, setVideoPrompt] = useState(
    'High-resolution satellite view of the globe showing active geopolitical crisis hotspots, shipping corridors, and seismic fault lines with glowing telemetry HUD.'
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoOpName, setVideoOpName] = useState<string | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoStatusText, setVideoStatusText] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // --- VOICE LIVE STATE ---
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceLogs, setVoiceLogs] = useState<Array<{ sender: 'user' | 'live'; text: string }>>([
    {
      sender: 'live',
      text: 'Voice Dispatch active. Tap the microphone to speak a verbal query directly into the Situation Room.',
    },
  ]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialMode) setActiveTab(initialMode);
  }, [initialMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Clean up media recorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  // --- Chat Handlers ---
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const history = [...chatMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendChatMessage(history, chatRole, chatModel, useSearchGrounding);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: res.reply || 'No response generated.',
        timestamp: Date.now(),
        sources: res.sources,
        modelUsed: res.modelUsed,
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `Error: ${err.message || 'Failed to complete query. Please check connectivity or quota.'}`,
        timestamp: Date.now(),
        modelUsed: chatModel,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // --- Audio Recording & Transcribe Handlers ---
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Auto transcribe with gemini-3.5-transcribe
        setIsTranscribing(true);
        try {
          const res = await transcribeAudioBlob(audioBlob);
          setAudioTranscript(res.transcript);
        } catch (err: any) {
          setAudioTranscript(`Transcription failed: ${err.message || 'Unknown error'}`);
        } finally {
          setIsTranscribing(false);
        }

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      alert(`Microphone access failed: ${err.message || 'Please check mic permissions'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendTranscriptToChat = () => {
    if (audioTranscript) {
      setChatInput(audioTranscript);
      setActiveTab('chat');
    }
  };

  // --- Veo 3 Video Handlers ---
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() || isVideoGenerating) return;

    setIsVideoGenerating(true);
    setVideoStatusText('Submitting prompt to Veo 3 (veo-3.1-fast-generate-preview)...');
    setGeneratedVideoUrl(null);

    try {
      const res = await generateVeoVideo(videoPrompt, videoAspectRatio);
      setVideoOpName(res.operationName);
      setVideoStatusText('Synthesizing frames with Veo 3. This typically takes 60–90 seconds...');

      // Start status polling every 5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const status = await checkVeoStatus(res.operationName);
          if (status.done) {
            clearInterval(pollInterval);
            setIsVideoGenerating(false);
            if (status.error) {
              setVideoStatusText(`Video generation error: ${status.error}`);
            } else {
              setVideoStatusText('Video generated successfully!');
              setGeneratedVideoUrl(getVeoDownloadUrl(res.operationName));
            }
          } else {
            setVideoStatusText('Rendering video frames and depth maps with Veo 3 (processing)...');
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setIsVideoGenerating(false);
          setVideoStatusText(`Polling error: ${pollErr.message}`);
        }
      }, 5000);
    } catch (err: any) {
      setIsVideoGenerating(false);
      setVideoStatusText(`Failed to initialize video generation: ${err.message}`);
    }
  };

  // --- Voice Live Handlers ---
  const handleVoicePushToTalk = async () => {
    try {
      setIsVoiceListening(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        setIsVoiceListening(false);
        setIsVoiceProcessing(true);
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        try {
          const res = await sendVoiceDialogue(audioBlob, undefined, chatRole);
          setVoiceLogs((prev) => [
            ...prev,
            { sender: 'user', text: res.userPrompt },
            { sender: 'live', text: res.reply },
          ]);

          // Play audio response if present
          if (res.audioBase64) {
            const audioSrc = `data:audio/wav;base64,${res.audioBase64}`;
            if (audioElementRef.current) {
              audioElementRef.current.src = audioSrc;
              audioElementRef.current.play();
              setIsPlayingAudio(true);
            }
          } else if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(res.reply);
            window.speechSynthesis.speak(utterance);
          }
        } catch (err: any) {
          setVoiceLogs((prev) => [
            ...prev,
            { sender: 'live', text: `Voice connection error: ${err.message}` },
          ]);
        } finally {
          setIsVoiceProcessing(false);
        }
      };

      recorder.start();

      // Automatically record for 4 seconds then stop, or let user click stop
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 4500);
    } catch (err: any) {
      setIsVoiceListening(false);
      alert(`Microphone permission needed: ${err.message}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gemini-center-title"
    >
      <div
        className={`w-full max-w-4xl h-[92vh] max-h-[850px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-[#050B16] border-cyan-500/30 text-[#E6F1FF]'
            : 'bg-white border-cyan-700/25 text-[#0F172A]'
        }`}
      >
        {/* Header with Title & Feature Tabs */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'border-cyan-500/20 bg-[#0A1830]' : 'border-cyan-700/15 bg-cyan-50/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="gemini-center-title" className="text-base sm:text-lg font-bold font-editorial">
                  Gemini Intelligence &amp; Studio Suite
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-tabular uppercase tracking-wider bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-semibold">
                  Multi-Modal
                </span>
              </div>
              <p className="text-xs text-[#8FA5C2]">
                Chatbot, Audio Transcription, Veo 3 Video Generation &amp; Live Voice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Gemini Intelligence Center"
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'border-cyan-500/25 text-[#8FA5C2] hover:text-white hover:bg-white/5'
                  : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div
          className={`px-4 sm:px-6 py-2 border-b flex items-center gap-1 sm:gap-2 overflow-x-auto ${
            isDark ? 'border-cyan-500/20 bg-[#071120]' : 'border-cyan-700/15 bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-cyan-500 text-[#050B16] shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                : isDark
                ? 'text-[#8FA5C2] hover:text-cyan-300 hover:bg-white/5'
                : 'text-slate-600 hover:text-cyan-700 hover:bg-cyan-50'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Chatbot &amp; Search Grounding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transcribe')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'transcribe'
                ? 'bg-cyan-500 text-[#050B16] shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                : isDark
                ? 'text-[#8FA5C2] hover:text-cyan-300 hover:bg-white/5'
                : 'text-slate-600 hover:text-cyan-700 hover:bg-cyan-50'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Transcribe Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'video'
                ? 'bg-cyan-500 text-[#050B16] shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                : isDark
                ? 'text-[#8FA5C2] hover:text-cyan-300 hover:bg-white/5'
                : 'text-slate-600 hover:text-cyan-700 hover:bg-cyan-50'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Veo 3 Video Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-cyan-500 text-[#050B16] shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                : isDark
                ? 'text-[#8FA5C2] hover:text-cyan-300 hover:bg-white/5'
                : 'text-slate-600 hover:text-cyan-700 hover:bg-cyan-50'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Voice Dispatch (Live API)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: GEMINI CHATBOT & GOOGLE SEARCH GROUNDING */}
        {/* ========================================================================= */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Control Bar: Role, Model, Search Toggle */}
            <div
              className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono-tabular ${
                isDark ? 'border-cyan-500/15 bg-[#091526]' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {/* Persona selection */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#8FA5C2] uppercase tracking-wider text-[11px] font-semibold">
                  Role:
                </span>
                <select
                  value={chatRole}
                  onChange={(e) => setChatRole(e.target.value as ChatRole)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                    isDark
                      ? 'bg-[#050B16] border-cyan-500/30 text-cyan-300'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="analyst">Senior Geopolitical Analyst</option>
                  <option value="crisis">Rapid Crisis &amp; Disaster Specialist</option>
                  <option value="macro">Macroeconomic &amp; Trade Strategist</option>
                  <option value="factchecker">Neutral Global Fact Checker</option>
                </select>
              </div>

              {/* Model selection */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#8FA5C2] uppercase tracking-wider text-[11px] font-semibold">
                  Model:
                </span>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value as ChatModel)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                    isDark
                      ? 'bg-[#050B16] border-cyan-500/30 text-cyan-300'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (General)</option>
                  <option value="gemini-4-argon">gemini-4-argon (Complex Reasoning)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
                </select>
              </div>

              {/* Google Search Grounding Toggle */}
              <button
                type="button"
                onClick={() => setUseSearchGrounding((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  useSearchGrounding
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : isDark
                    ? 'border-cyan-500/20 text-[#8FA5C2] hover:text-white'
                    : 'border-slate-300 text-slate-600 hover:text-slate-900'
                }`}
                title="Enable Google Search Grounding to anchor responses in live web sources"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Search Grounding: {useSearchGrounding ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-cyan-600 text-white rounded-br-none shadow-[0_0_15px_rgba(8,145,178,0.3)]'
                        : isDark
                        ? 'bg-[#0A1830] border border-cyan-500/25 text-[#E6F1FF] rounded-bl-none shadow-sm'
                        : 'bg-slate-100 border border-slate-200 text-slate-900 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {/* Role / Model header for assistant */}
                    {msg.role === 'model' && (
                      <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-cyan-500/15 text-[11px] font-mono-tabular">
                        <span className="text-cyan-400 font-bold flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" />
                          <span>WorldPulse Situation Room</span>
                        </span>
                        {msg.modelUsed && (
                          <span className="text-[#8FA5C2] bg-cyan-500/10 px-2 py-0.5 rounded text-[10px]">
                            {msg.modelUsed}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Grounded Web Sources Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-cyan-500/15">
                        <div className="flex items-center gap-1 text-[11px] font-mono-tabular text-emerald-400 font-semibold mb-1.5">
                          <Globe className="w-3 h-3" />
                          <span>Google Search Grounding Sources ({msg.sources.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, idx) => (
                            <a
                              key={idx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded bg-black/30 border border-emerald-400/30 text-[11px] text-cyan-300 hover:text-white hover:border-cyan-400 flex items-center gap-1 transition-colors"
                            >
                              <span className="truncate max-w-[200px]">{src.title}</span>
                              <span className="text-[9px] text-[#8FA5C2]">↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Copy and Timestamp Action */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#8FA5C2] pt-1">
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex items-center gap-2 p-3 text-sm text-cyan-400 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing response with {chatModel}...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendChat}
              className={`p-3 border-t flex items-center gap-2 ${
                isDark ? 'border-cyan-500/20 bg-[#071120]' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {/* Quick Microphone Button to dictate into chat */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('transcribe');
                }}
                title="Dictate with microphone (gemini-3.5-transcribe)"
                className="p-2.5 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/15 cursor-pointer transition-colors shrink-0"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about geopolitical shifts, strategic corridors, disaster triage, or macroeconomic data..."
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                  isDark
                    ? 'bg-[#050B16] border-cyan-500/30 text-white focus:border-cyan-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
                }`}
              />

              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                aria-label="Send message"
                className="wp-btn-primary px-4 py-2.5 text-xs font-mono-tabular font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-40 cursor-pointer"
              >
                {isChatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: AUDIO TRANSCRIBE (gemini-3.5-transcribe) */}
        {/* ========================================================================= */}
        {activeTab === 'transcribe' && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.25)]">
              <Mic className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold font-editorial">Audio Speech Transcription Studio</h3>
              <p className="text-sm text-[#8FA5C2] mt-1">
                Powered by model <span className="font-mono text-cyan-300">gemini-3.5-transcribe</span>.
                Record from your microphone to generate accurate, verbatim transcripts for situation reports.
              </p>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-col items-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-[#050B16] font-bold text-sm font-mono-tabular flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Microphone Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-6 py-3 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm font-mono-tabular flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse transition-all cursor-pointer"
                >
                  <Square className="w-5 h-5" />
                  <span>Stop &amp; Transcribe Now</span>
                </button>
              )}

              {isRecording && (
                <div className="text-xs text-rose-400 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Recording audio from microphone...</span>
                </div>
              )}

              {isTranscribing && (
                <div className="text-xs text-cyan-400 font-mono flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing speech with gemini-3.5-transcribe...</span>
                </div>
              )}
            </div>

            {/* Audio Playback of Recorded Clip */}
            {recordedAudioUrl && (
              <div className="w-full">
                <audio controls src={recordedAudioUrl} className="w-full mt-2" />
              </div>
            )}

            {/* Transcript Output Box */}
            {audioTranscript && (
              <div
                className={`w-full text-left p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-[#0A1830] border-cyan-500/25' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono-tabular">
                  <span className="text-cyan-400 font-bold uppercase tracking-wider">
                    Transcript Result (gemini-3.5-transcribe):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(audioTranscript);
                      alert('Copied transcript to clipboard!');
                    }}
                    className="text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{audioTranscript}</p>

                <div className="pt-2 border-t border-cyan-500/15 flex justify-end">
                  <button
                    type="button"
                    onClick={sendTranscriptToChat}
                    className="wp-btn-primary px-3 py-1.5 text-xs font-mono-tabular font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Gemini Chatbot</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: VEO 3 VIDEO GENERATOR (veo-3.1-fast-generate-preview) */}
        {/* ========================================================================= */}
        {activeTab === 'video' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-3xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-wider text-cyan-400 font-bold mb-1">
                <Video className="w-4 h-4" />
                <span>Veo 3 Video Generation (veo-3.1-fast-generate-preview)</span>
              </div>
              <h3 className="text-xl font-bold font-editorial">
                Situation Room Visual Broadcast Studio
              </h3>
              <p className="text-xs text-[#8FA5C2] mt-1">
                Generate high-fidelity situational videos from text prompts with aspect ratio options (16:9 landscape or 9:16 portrait).
              </p>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono-tabular uppercase tracking-wider text-[#8FA5C2] font-semibold">
                Video Prompt
              </label>
              <textarea
                rows={3}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Describe the geopolitical visual scene, satellite map sweep, or disaster fly-through..."
                className={`w-full p-3 rounded-xl border text-sm outline-none transition-colors ${
                  isDark
                    ? 'bg-[#050B16] border-cyan-500/30 text-white focus:border-cyan-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
                }`}
              />

              {/* Sample Prompts */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="text-[#8FA5C2] text-[11px] self-center">Presets:</span>
                {[
                  'Satellite radar sweep over Indo-Pacific shipping lanes with glowing naval telemetry',
                  'Seismic epicenter tremor visualization across tectonic plates with altitude heatmap',
                  'Global financial exchange ticker board flashing green and red with Tokyo-London-NYC clocks',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setVideoPrompt(sample)}
                    className="px-2 py-1 rounded border border-cyan-500/20 text-[11px] text-[#8FA5C2] hover:text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer text-left truncate max-w-[280px]"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-4 text-xs font-mono-tabular">
              <span className="text-[#8FA5C2] uppercase tracking-wider font-semibold">
                Aspect Ratio:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVideoAspectRatio('16:9')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                    videoAspectRatio === '16:9'
                      ? 'bg-cyan-500 text-[#050B16] border-cyan-400 font-bold'
                      : isDark
                      ? 'border-cyan-500/20 text-[#8FA5C2]'
                      : 'border-slate-300 text-slate-600'
                  }`}
                >
                  16:9 (Landscape Desktop)
                </button>
                <button
                  type="button"
                  onClick={() => setVideoAspectRatio('9:16')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                    videoAspectRatio === '9:16'
                      ? 'bg-cyan-500 text-[#050B16] border-cyan-400 font-bold'
                      : isDark
                      ? 'border-cyan-500/20 text-[#8FA5C2]'
                      : 'border-slate-300 text-slate-600'
                  }`}
                >
                  9:16 (Portrait Mobile)
                </button>
              </div>
            </div>

            {/* Generate Action Button */}
            <div>
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={!videoPrompt.trim() || isVideoGenerating}
                className="wp-btn-primary px-6 py-3 text-sm font-mono-tabular font-bold flex items-center gap-2 disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              >
                {isVideoGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                <span>Generate Veo 3 Video</span>
              </button>
            </div>

            {/* Status Message */}
            {videoStatusText && (
              <div
                className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-3 ${
                  isVideoGenerating
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : isDark
                    ? 'bg-[#0A1830] border-cyan-500/20 text-[#8FA5C2]'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {isVideoGenerating && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>{videoStatusText}</span>
              </div>
            )}

            {/* Video Player */}
            {generatedVideoUrl && (
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#0A1830] border-cyan-500/30' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-emerald-400">
                    Generated Veo 3 Video Ready
                  </span>
                  <a
                    href={generatedVideoUrl}
                    download="worldpulse-veo-video.mp4"
                    className="wp-btn-secondary px-3 py-1.5 text-xs font-mono-tabular flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download MP4</span>
                  </a>
                </div>
                <video
                  controls
                  autoPlay
                  loop
                  src={generatedVideoUrl}
                  className={`w-full rounded-xl bg-black ${
                    videoAspectRatio === '9:16' ? 'max-w-[340px] mx-auto aspect-[9/16]' : 'aspect-video'
                  }`}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: VOICE DISPATCH (Live API gemini-3.8-live) */}
        {/* ========================================================================= */}
        {activeTab === 'voice' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-2xl mx-auto flex flex-col items-center justify-between text-center space-y-6">
            <audio ref={audioElementRef} className="hidden" onEnded={() => setIsPlayingAudio(false)} />

            <div>
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-[0_0_25px_rgba(34,211,238,0.25)]">
                <Headphones className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-editorial">
                Real-Time Voice Dispatch (Live API)
              </h3>
              <p className="text-sm text-[#8FA5C2] mt-1">
                Powered by model <span className="font-mono text-cyan-300">gemini-3.8-live</span>.
                Speak your query; receive low-latency spoken situation room briefings directly from the intelligence engine.
              </p>
            </div>

            {/* Push to Talk Button */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleVoicePushToTalk}
                disabled={isVoiceListening || isVoiceProcessing}
                className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  isVoiceListening
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_35px_rgba(244,63,94,0.6)] animate-pulse'
                    : isVoiceProcessing
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
                    : isDark
                    ? 'bg-[#0A1830] border-cyan-500/40 text-cyan-400 hover:border-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)]'
                    : 'bg-white border-cyan-600/40 text-cyan-700 hover:border-cyan-600 shadow-md'
                }`}
              >
                {isVoiceListening ? (
                  <>
                    <Mic className="w-8 h-8 text-rose-400 animate-bounce" />
                    <span className="text-[11px] font-mono-tabular font-bold">Listening...</span>
                  </>
                ) : isVoiceProcessing ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-[11px] font-mono-tabular font-bold">Thinking...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8" />
                    <span className="text-[11px] font-mono-tabular font-bold">Push to Talk</span>
                  </>
                )}
              </button>

              <div className="text-xs text-[#8FA5C2] font-mono">
                {isVoiceListening
                  ? 'Listening to microphone... Speak clearly.'
                  : isVoiceProcessing
                  ? 'Synthesizing voice response...'
                  : isPlayingAudio
                  ? 'Broadcasting audio dispatch...'
                  : 'Tap to speak a live verbal query'}
              </div>
            </div>

            {/* Conversation Log */}
            <div
              className={`w-full text-left p-4 rounded-xl border max-h-[220px] overflow-y-auto space-y-2.5 ${
                isDark ? 'bg-[#0A1830] border-cyan-500/25' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <div className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-400 font-bold mb-1">
                Live Verbal Dispatch Log:
              </div>
              {voiceLogs.map((log, idx) => (
                <div key={idx} className="text-xs leading-relaxed">
                  <span
                    className={`font-mono font-bold ${
                      log.sender === 'user' ? 'text-cyan-300' : 'text-emerald-400'
                    }`}
                  >
                    {log.sender === 'user' ? 'You: ' : 'Live Dispatch: '}
                  </span>
                  <span className={isDark ? 'text-[#E6F1FF]' : 'text-slate-900'}>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
