import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

export const PWAUpdateBar: React.FC = () => {
  const { needRefresh, reloadToUpdate } = usePWAUpdate();

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      onClick={reloadToUpdate}
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white px-4 py-2.5 text-center text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-110 transition-all select-none border-b border-cyan-300/30"
      title="Click to reload and apply latest updates"
    >
      <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse shrink-0" />
      <span>New version available. Tap to refresh</span>
      <RefreshCw className="w-3.5 h-3.5 text-white/90 animate-spin shrink-0 ml-1" />
    </div>
  );
};
