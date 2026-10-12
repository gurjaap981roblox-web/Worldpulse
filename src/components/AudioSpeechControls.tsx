import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { AppLanguage, AppSettings } from '../types';
import { UI_TRANSLATIONS } from '../utils/sanitize';

interface AudioSpeechControlsProps {
  text: string;
  settings: AppSettings;
  compact?: boolean;
  label?: string;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

export const AudioSpeechControls: React.FC<AudioSpeechControlsProps> = ({
  text,
  settings,
  compact = false,
  label,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState<number>(1);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [showControls, setShowControls] = useState<boolean>(!compact);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices() || [];
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const handlePageHide = () => {
      window.speechSynthesis.cancel();
    };
    window.addEventListener('beforeunload', handlePageHide);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handlePageHide);
      window.removeEventListener('pagehide', handlePageHide);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filter voices matching current language (preferring en-IN, hi-IN, pa-IN)
  const matchingVoices = useMemo(() => {
    const langPrefix =
      settings.language === 'hi' ? 'hi' : settings.language === 'pa' ? 'pa' : 'en';
    const preferredLocale =
      settings.language === 'hi'
        ? 'hi-in'
        : settings.language === 'pa'
        ? 'pa-in'
        : 'en-in';

    const exactOrPrefix = voices.filter((v) =>
      v.lang.toLowerCase().startsWith(langPrefix)
    );

    return [...exactOrPrefix].sort((a, b) => {
      const aScore = a.lang.toLowerCase().includes(preferredLocale) ? 0 : 1;
      const bScore = b.lang.toLowerCase().includes(preferredLocale) ? 0 : 1;
      return aScore - bScore;
    });
  }, [voices, settings.language]);

  useEffect(() => {
    if (matchingVoices.length > 0) {
      setSelectedVoiceURI(matchingVoices[0].voiceURI);
      setFallbackNote(null);
    } else if (voices.length > 0) {
      setSelectedVoiceURI(voices[0].voiceURI);
      const langLabel =
        settings.language === 'pa'
          ? 'Punjabi (pa-IN)'
          : settings.language === 'hi'
          ? 'Hindi (hi-IN)'
          : 'English (en-IN)';
      setFallbackNote(
        `No native ${langLabel} voice found on this device — using default system voice.`
      );
    } else {
      setSelectedVoiceURI('');
      setFallbackNote(null);
    }
  }, [matchingVoices, voices, settings.language]);

  const startSpeaking = (newRate = rate) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const chosenVoice =
      voices.find((v) => v.voiceURI === selectedVoiceURI) || matchingVoices[0];

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang =
        settings.language === 'hi'
          ? 'hi-IN'
          : settings.language === 'pa'
          ? 'pa-IN'
          : 'en-IN';
    }

    utterance.rate = newRate;
    utterance.onend = () => setStatus('idle');
    utterance.onerror = () => setStatus('idle');

    setStatus('playing');
    if (compact) setShowControls(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePlayOrResume = () => {
    if (!('speechSynthesis' in window)) return;
    if (status === 'paused') {
      window.speechSynthesis.resume();
      setStatus('playing');
      return;
    }
    startSpeaking(rate);
  };

  const handlePause = () => {
    if (!('speechSynthesis' in window)) return;
    if (status === 'playing') {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  };

  const handleStop = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setStatus('idle');
  };

  const handleChangeSpeed = (nextSpeed: number) => {
    setRate(nextSpeed);
    if (status === 'playing' || status === 'paused') {
      startSpeaking(nextSpeed);
    }
  };

  if (!('speechSynthesis' in window)) {
    return null;
  }

  if (compact && !showControls && status === 'idle') {
    return (
      <button
        type="button"
        onClick={handlePlayOrResume}
        aria-label={`Listen to story: ${label || 'Audio'}`}
        title="Listen using browser speech synthesis"
        className={`min-h-[44px] px-3 py-1.5 rounded-full border text-xs font-mono-tabular inline-flex items-center gap-1.5 transition-all cursor-pointer ${
          isDark
            ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/40 text-[#A78BFA] hover:bg-[#8B5CF6]/25'
            : 'bg-[#7C3AED]/10 border-[#7C3AED]/30 text-[#6D28D9] hover:bg-[#7C3AED]/20'
        }`}
      >
        <Volume2 className="w-3.5 h-3.5 shrink-0" />
        <span>{labels.voiceBriefing}</span>
      </button>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-2xl border p-2 transition-colors no-print ${
        isDark
          ? 'bg-[#0B0713]/90 border-[#8B5CF6]/30 text-[#F6F4FF]'
          : 'bg-[#F5F2FF] border-[#7C3AED]/25 text-[#140E24]'
      }`}
      role="region"
      aria-label={label || 'Audio Briefing Player'}
    >
      {/* Play / Resume */}
      {status !== 'playing' ? (
        <button
          type="button"
          onClick={handlePlayOrResume}
          aria-label={status === 'paused' ? 'Resume audio briefing' : 'Play audio briefing'}
          className="min-h-[44px] px-3.5 py-2 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-mono-tabular font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{status === 'paused' ? 'Resume' : labels.voiceBriefing}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePause}
          aria-label="Pause audio briefing"
          className="min-h-[44px] px-3.5 py-2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono-tabular font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pause</span>
        </button>
      )}

      {/* Stop */}
      <button
        type="button"
        onClick={handleStop}
        disabled={status === 'idle'}
        aria-label="Stop audio briefing"
        className={`min-h-[44px] px-3 py-2 rounded-full border text-xs font-mono-tabular inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 ${
          isDark
            ? 'border-[#8B5CF6]/30 bg-[#050309] text-[#C4BDD9] hover:text-white'
            : 'border-[#7C3AED]/25 bg-white text-[#3F3559] hover:text-black'
        }`}
      >
        <Square className="w-3.5 h-3.5" />
        <span>Stop</span>
      </button>

      {/* Speed Selector (0.75x - 1.5x) */}
      <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
        {SPEED_OPTIONS.map((spd) => (
          <button
            key={spd}
            type="button"
            onClick={() => handleChangeSpeed(spd)}
            aria-label={`Set playback speed ${spd}x`}
            className={`min-h-[44px] px-2.5 py-1.5 rounded-full text-[11px] font-mono-tabular font-semibold border transition-colors cursor-pointer ${
              rate === spd
                ? 'bg-[#8B5CF6] border-[#A78BFA] text-white'
                : isDark
                ? 'bg-[#050309] border-[#8B5CF6]/20 text-[#9389B0] hover:text-white'
                : 'bg-white border-[#7C3AED]/20 text-[#625680] hover:text-black'
            }`}
          >
            {spd}x
          </button>
        ))}
      </div>

      {/* Language-Filtered Voice Picker */}
      <select
        aria-label="Select speech synthesis voice"
        value={selectedVoiceURI}
        onChange={(e) => setSelectedVoiceURI(e.target.value)}
        className={`min-h-[44px] max-w-[200px] px-3 py-1.5 rounded-full border text-xs font-mono-tabular truncate cursor-pointer ${
          isDark
            ? 'bg-[#050309] border-[#8B5CF6]/30 text-[#F6F4FF]'
            : 'bg-white border-[#7C3AED]/25 text-[#140E24]'
        }`}
      >
        {(matchingVoices.length > 0 ? matchingVoices : voices).length === 0 ? (
          <option value="">System Default Voice ({settings.language.toUpperCase()})</option>
        ) : (
          (matchingVoices.length > 0 ? matchingVoices : voices).map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))
        )}
      </select>

      {compact && status === 'idle' && (
        <button
          type="button"
          onClick={() => setShowControls(false)}
          aria-label="Collapse audio player"
          className="min-h-[44px] px-2.5 text-xs font-mono-tabular text-[#A78BFA] hover:underline cursor-pointer"
        >
          Hide
        </button>
      )}

      {fallbackNote && (
        <span className="w-full text-[11px] font-mono-tabular text-amber-400 px-1">
          {fallbackNote}
        </span>
      )}
    </div>
  );
};
