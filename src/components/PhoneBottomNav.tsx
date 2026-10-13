import React from 'react';
import {
  FileText,
  Globe,
  ListOrdered,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';
import { AppSettings, MobileNavTab } from '../types';

interface PhoneBottomNavProps {
  activeMobileTab: MobileNavTab;
  savedCount: number;
  onSelectMobileTab: (tab: MobileNavTab) => void;
  settings: AppSettings;
}

export const PhoneBottomNav: React.FC<PhoneBottomNavProps> = ({
  activeMobileTab,
  savedCount,
  onSelectMobileTab,
  settings,
}) => {
  const isDark = settings.theme === 'dark';

  const items: Array<{
    id: MobileNavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { id: 'briefing', label: 'Briefing', icon: <FileText className="w-4 h-4" /> },
    { id: 'map', label: 'Map', icon: <Globe className="w-4 h-4" /> },
    { id: 'top10', label: 'Top 10', icon: <ListOrdered className="w-4 h-4" /> },
    { id: 'ask', label: 'Ask', icon: <MessageSquare className="w-4 h-4" /> },
    {
      id: 'more',
      label: 'More',
      icon: <MoreHorizontal className="w-4 h-4" />,
      badge: savedCount > 0 ? savedCount : undefined,
    },
  ];

  return (
    <nav
      aria-label="Phone bottom navigation"
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t grid grid-cols-5 no-print ${
        isDark
          ? 'bg-[#050B16]/95 border-cyan-500/25 text-[#E6F1FF]'
          : 'bg-[#F0F6FC]/95 border-cyan-700/25 text-[#050B16]'
      } backdrop-blur-xl`}
    >
      {items.map((item) => {
        const isActive =
          activeMobileTab === item.id ||
          (item.id === 'briefing' && activeMobileTab === 'home');
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectMobileTab(item.id)}
            className={`min-h-[56px] flex flex-col items-center justify-center gap-1 text-[11px] font-mono-tabular relative transition-colors cursor-pointer ${
              isActive
                ? 'text-[#22D3EE] font-bold'
                : isDark
                ? 'text-[#8FA5C2] hover:text-[#22D3EE]'
                : 'text-[#475569] hover:text-[#0284C7]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="absolute top-1.5 right-3.5 px-1.5 py-0.2 rounded-full bg-[#22D3EE] text-[#050B16] text-[9px] font-bold shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
