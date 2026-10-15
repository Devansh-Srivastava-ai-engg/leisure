import React from 'react';
import { BookOpen, ShoppingBag, Banknote, BarChart3, Truck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import type { ActiveTab } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useAppStore();

  const navItems: Array<{
    id: ActiveTab;
    labelKey: 'ledgerTab' | 'counterTab' | 'drawerTab' | 'summaryTab' | 'vendorsTab';
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    {
      id: 'ledger',
      labelKey: 'ledgerTab',
      icon: BookOpen,
    },
    {
      id: 'counter',
      labelKey: 'counterTab',
      icon: ShoppingBag,
    },
    {
      id: 'drawer',
      labelKey: 'drawerTab',
      icon: Banknote,
    },
    {
      id: 'summary',
      labelKey: 'summaryTab',
      icon: BarChart3,
    },
    {
      id: 'vendors',
      labelKey: 'vendorsTab',
      icon: Truck,
    },
  ];

  const handleTabClick = (tab: ActiveTab) => {
    playSound('beep');
    triggerHaptic('tap');
    setActiveTab(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 px-2 select-none">
      <div className="max-w-4xl mx-auto grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const label = getTranslation(language, item.labelKey);

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`min-h-[48px] h-[50px] rounded-md flex flex-col items-center justify-center transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-slate-900 font-bold'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              {/* Subtle top indicator bar */}
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-slate-900" />
              )}
              <Icon
                size={20}
                className={isActive ? 'text-slate-900 stroke-[2.2]' : 'text-stone-600 stroke-[1.7]'}
              />
              <span className={`text-[11px] mt-0.5 leading-none truncate px-0.5 ${isActive ? 'font-bold text-slate-900' : 'text-stone-600'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
