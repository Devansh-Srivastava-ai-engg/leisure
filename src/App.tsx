import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { initializeDatabase } from './db/db';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LedgerView } from './components/LedgerView';
import { CounterView } from './components/CounterView';
import { CashDrawerView } from './components/CashDrawerView';
import { DaySummaryView } from './components/DaySummaryView';
import { VendorsView } from './components/VendorsView';
import { VoiceInputModal } from './components/VoiceInputModal';

export const App: React.FC = () => {
  const {
    activeTab,
    sunlightMode,
    setIsOnline,
    loadInitialSettings,
  } = useAppStore();

  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        await loadInitialSettings();
      } catch (err) {
        console.warn('Database initialization error:', err);
      } finally {
        setIsDbReady(true);
      }
    }
    init();

    // Online / Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline, loadInitialSettings]);

  if (!isDbReady) {
    return (
      <div className="h-screen w-screen bg-stone-50 flex flex-col items-center justify-center text-stone-800">
        <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-xl text-white shadow-xs">
          ₹
        </div>
        <p className="mt-3 font-bold text-sm tracking-tight text-stone-900">
          दुकान खाता (DukaanKhata)
        </p>
        <span className="text-xs text-stone-500 font-medium mt-0.5">लोड हो रहा है...</span>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-stone-50 text-stone-900 flex flex-col transition-colors ${
        sunlightMode ? 'sunlight-mode' : ''
      }`}
    >
      {/* Top Header */}
      <Header />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto overflow-x-hidden">
        {activeTab === 'ledger' && <LedgerView />}
        {activeTab === 'counter' && <CounterView />}
        {activeTab === 'drawer' && <CashDrawerView />}
        {activeTab === 'summary' && <DaySummaryView />}
        {activeTab === 'vendors' && <VendorsView />}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav />

      {/* Global Voice-to-Ledger Hands-Free Entry Modal */}
      <VoiceInputModal />
    </div>
  );
};

export default App;
