import React, { useState } from 'react';
import {
  Sun,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  WifiOff,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { syncOutboxNow } from '../db/operations';
import { playSound } from '../utils/audio';

export const Header: React.FC = () => {
  const {
    language,
    toggleLanguage,
    sunlightMode,
    toggleSunlightMode,
    soundEnabled,
    toggleSound,
    isOnline,
    pendingSyncCount,
    settings,
  } = useAppStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncOutboxNow();
      if (!res.serverOnline) {
        setSyncSuccessMsg(
          language === 'hi'
            ? 'सर्वर ऑफलाइन (स्थानीय रूप से सुरक्षित)'
            : 'Server offline (Saved locally)'
        );
      } else {
        setSyncSuccessMsg(
          language === 'hi'
            ? `${res.syncedCount} बदलाव सुरक्षित सिंक हुए`
            : `${res.syncedCount} changes synced`
        );
      }
      setTimeout(() => setSyncSuccessMsg(''), 2500);
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200 px-3 sm:px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Clean Shop Name + Status Dot */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white shrink-0 font-bold text-sm">
            ₹
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-stone-900 truncate leading-snug">
              {settings.shopName || getTranslation(language, 'appName')}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-stone-600">
              {isOnline ? (
                <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  {getTranslation(language, 'online')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-stone-700 font-medium">
                  <WifiOff size={11} />
                  {getTranslation(language, 'offline')}
                </span>
              )}

              {/* Discreet Sync Status */}
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer pl-1"
                title="Tap to sync outbox"
              >
                {isSyncing ? (
                  <RefreshCw size={11} className="animate-spin text-slate-900" />
                ) : pendingSyncCount > 0 ? (
                  <span className="flex items-center gap-1 text-stone-800 font-mono font-semibold bg-stone-100 border border-stone-300 px-1.5 py-0.5 rounded text-[10px]">
                    <AlertCircle size={10} className="text-rose-700" />
                    {pendingSyncCount} {language === 'hi' ? 'पेंडिंग' : 'pending'}
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-emerald-700 font-medium text-[10px]">
                    <CheckCircle2 size={11} />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Clean, Understated Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Understated Language Toggle */}
          <button
            onClick={() => {
              playSound('beep');
              toggleLanguage();
            }}
            className="h-8 px-2.5 rounded-md bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 font-semibold text-xs border border-stone-200 flex items-center gap-1 transition-colors"
            title="Toggle Language / भाषा बदलें"
          >
            <span className="text-stone-500 font-normal text-[10px]">भाषा:</span>
            <span className="text-slate-900 font-bold">
              {language === 'hi' ? 'English' : 'हिंदी'}
            </span>
          </button>

          {/* Clean Sunlight Mode Toggle */}
          <button
            onClick={() => {
              playSound('beep');
              toggleSunlightMode();
            }}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              sunlightMode
                ? 'bg-stone-200 text-stone-900 border border-stone-400'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
            }`}
            title="Toggle Outdoor Contrast / धूप मोड"
          >
            <Sun size={15} />
          </button>

          {/* Clean Audio Toggle */}
          <button
            onClick={() => {
              playSound('beep');
              toggleSound();
            }}
            className="w-8 h-8 rounded-md flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors"
            title="Audio feedback toggle"
          >
            {soundEnabled ? <Volume2 size={15} className="text-stone-800" /> : <VolumeX size={15} className="text-stone-400" />}
          </button>
        </div>
      </div>

      {syncSuccessMsg && (
        <div className="max-w-4xl mx-auto mt-2 text-center text-xs text-stone-800 font-medium bg-stone-100 border border-stone-300 py-1 px-2 rounded-md">
          {syncSuccessMsg}
        </div>
      )}
    </header>
  );
};
