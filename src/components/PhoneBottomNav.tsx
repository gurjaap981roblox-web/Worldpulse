import React from 'react';
import { Bookmark, Globe, Home, Search, TrendingUp } from 'lucide-react';
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
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'map', label: 'Map', icon: <Globe className="w-4 h-4" /> },
    { id: 'changes', label: 'Changes', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'search', label: 'Search', icon: <Search className="w-4 h-4" /> },
    {
      id: 'saved',
      label: 'Saved',
      icon: <Bookmark className="w-4 h-4" />,
      badge: savedCount > 0 ? savedCount : undefined,
    },
  ];

  return (
    <nav
      aria-label="Phone bottom navigation"
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t grid grid-cols-5 no-print ${
        isDark
          ? 'bg-[#090A0D]/95 border-[#222631] text-[#F3F2EE]'
          : 'bg-[#F6F3EC]/95 border-[#DCD5C7] text-[#181615]'
      } backdrop-blur-md`}
    >
      {items.map((item) => {
        const isActive = activeMobileTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectMobileTab(item.id)}
            className={`min-h-[56px] flex flex-col items-center justify-center gap-1 text-[11px] font-mono-tabular relative transition-colors cursor-pointer ${
              isActive
                ? 'text-[#E05A2B] font-semibold'
                : isDark
                ? 'text-[#8C93A1] hover:text-[#F3F2EE]'
                : 'text-[#666159] hover:text-[#181615]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="absolute top-1.5 right-4 px-1.5 py-0.2 bg-[#E05A2B] text-white text-[9px] font-bold">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
