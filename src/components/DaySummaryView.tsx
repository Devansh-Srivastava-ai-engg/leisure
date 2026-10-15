import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart3,
  TrendingUp,
  Banknote,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  MessageSquareShare,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { db, getTodayDateString } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { exportDatabaseToJson } from '../db/operations';
import { playSound } from '../utils/audio';

export const DaySummaryView: React.FC = () => {
  const { language, settings } = useAppStore();

  const today = getTodayDateString();
  const register = useLiveQuery(() => db.dailyRegisters.get(today), [today]);
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  // Filter today's transactions
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.timestamp.startsWith(today));
  }, [transactions, today]);

  // Total Market Credit (Across all customers)
  const totalMarketCredit = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [customers]);

  // Aggregate items sold today
  const topItemsSold = useMemo(() => {
    const itemMap: Record<string, { name: string; count: number; revenue: number }> = {};
    todayTransactions.forEach((tx) => {
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item) => {
          if (!itemMap[item.itemId]) {
            itemMap[item.itemId] = { name: item.name, count: 0, revenue: 0 };
          }
          itemMap[item.itemId].count += item.quantity;
          itemMap[item.itemId].revenue += item.total;
        });
      }
    });
    return Object.values(itemMap).sort((a, b) => b.count - a.count);
  }, [todayTransactions]);

  const cashSales = register?.cashSales || 0;
  const upiSales = register?.upiSales || 0;
  const totalTurnover = cashSales + upiSales;
  const jamaRecovered = register?.jamaCash || 0;
  const udharGiven = register?.udharGiven || 0;
  const cashExpenses = register?.cashExpenses || 0;
  const cashInDrawer = register?.countedCash || register?.startingCash || 0;

  // 1-Click WhatsApp Daily Summary Sharing
  const handleShareWhatsApp = () => {
    playSound('beep');
    const shop = settings.shopName || 'DukaanKhata';
    const text =
      language === 'hi'
        ? `📊 *दैनिक व्यापार रिपोर्ट - ${shop}*\n📅 तारीख: ${today}\n\n` +
          `💰 कुल बिक्री (टर्नओवर): ₹${totalTurnover}\n` +
          `💵 नकद बिक्री: ₹${cashSales}\n` +
          `📱 UPI बिक्री: ₹${upiSales}\n` +
          `📥 उधारी वसूली (जमा): ₹${jamaRecovered}\n` +
          `📤 आज का उधार दिया: ₹${udharGiven}\n` +
          `🧾 दुकान खर्चे: ₹${cashExpenses}\n` +
          `🏦 गल्ले में नकद: ₹${cashInDrawer}\n` +
          `👥 बाज़ार में कुल बकाया उधार: ₹${totalMarketCredit}\n\n` +
          `_रिपोर्ट जनरेटेड वाया दुकान खाता (DukaanKhata PWA)_`
        : `📊 *Daily Business Summary - ${shop}*\n📅 Date: ${today}\n\n` +
          `💰 Total Sales: ₹${totalTurnover}\n` +
          `💵 Cash Sales: ₹${cashSales}\n` +
          `📱 UPI Sales: ₹${upiSales}\n` +
          `📥 Credit Recovered (Jama): ₹${jamaRecovered}\n` +
          `📤 Credit Given (Udhar): ₹${udharGiven}\n` +
          `🧾 Expenses: ₹${cashExpenses}\n` +
          `🏦 Cash in Drawer: ₹${cashInDrawer}\n` +
          `👥 Total Outstanding Credit: ₹${totalMarketCredit}\n\n` +
          `_Generated via DukaanKhata PWA_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Download Offline Backup JSON
  const handleDownloadBackup = async () => {
    playSound('beep');
    try {
      const result = await exportDatabaseToJson();
      if (!result.success || !result.data) {
        console.warn('Backup export failed:', result.error);
        return;
      }
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DukaanKhata-Backup-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Backup download error:', err);
    }
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-4xl mx-auto space-y-3">
      {/* Title & Today's Date Banner */}
      <div className="p-3.5 rounded-md bg-white border border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-stone-100 text-stone-800 border border-stone-300 flex items-center justify-center">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              {getTranslation(language, 'daySummaryTitle')}
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-mono text-stone-500 mt-0.5">
              <Calendar size={12} />
              <span>{today}</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Share Button */}
        <button
          onClick={handleShareWhatsApp}
          className="h-9 px-3 rounded-md bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <MessageSquareShare size={15} />
          <span>WhatsApp रिपोर्ट</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {/* Total Turnover */}
        <div className="p-3 rounded-md bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-700 font-semibold uppercase">
            <span>{getTranslation(language, 'totalTurnover')}</span>
            <TrendingUp size={15} className="text-emerald-700" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-stone-900 mt-1 tracking-tight">
            ₹{totalTurnover}
          </div>
          <div className="text-[11px] font-mono text-stone-600 mt-0.5 flex items-center gap-2">
            <span>नकद: ₹{cashSales}</span>
            <span>·</span>
            <span>UPI: ₹{upiSales}</span>
          </div>
        </div>

        {/* Cash in Drawer */}
        <div className="p-3 rounded-md bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-700 font-semibold uppercase">
            <span>{getTranslation(language, 'cashInHand')}</span>
            <Banknote size={15} className="text-stone-600" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-stone-900 mt-1 tracking-tight">
            ₹{cashInDrawer}
          </div>
          <div className="text-[11px] font-mono text-stone-500 mt-0.5">
            शुरुआत: ₹{register?.startingCash || 2000}
          </div>
        </div>

        {/* UPI Received */}
        <div className="p-3 rounded-md bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-700 font-semibold uppercase">
            <span>{getTranslation(language, 'upiReceived')}</span>
            <QrCode size={15} className="text-stone-700" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-stone-900 mt-1 tracking-tight">
            ₹{upiSales}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">सीधे बैंक खाता</div>
        </div>

        {/* Todays Udhar Given */}
        <div className="p-3 rounded-md bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-rose-800 font-semibold uppercase">
            <span>{getTranslation(language, 'todaysUdhar')}</span>
            <ArrowUpRight size={15} className="text-rose-700" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-rose-700 mt-1 tracking-tight">
            ₹{udharGiven}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">ग्राहकों के खाते में जुड़ा</div>
        </div>

        {/* Todays Recovery */}
        <div className="p-3 rounded-md bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold uppercase">
            <span>{getTranslation(language, 'todaysRecovery')}</span>
            <ArrowDownLeft size={15} className="text-emerald-700" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-700 mt-1 tracking-tight">
            ₹{jamaRecovered}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">पुराना उधार वापस मिला</div>
        </div>

        {/* Total Market Credit Owed */}
        <div className="p-3 rounded-md bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-800 font-semibold uppercase">
            <span>{getTranslation(language, 'totalMarketCredit')}</span>
            <Users size={15} className="text-stone-700" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-stone-900 mt-1 tracking-tight">
            ₹{totalMarketCredit}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {customers.filter((c) => c.balance > 0).length} ग्राहकों पर बाकी
          </div>
        </div>
      </div>

      {/* Top Items Sold Section */}
      <div className="p-3.5 rounded-md bg-white border border-stone-200 space-y-2.5">
        <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-stone-600" />
          <span>{getTranslation(language, 'topItemsSold')}</span>
        </h3>

        {topItemsSold.length === 0 ? (
          <div className="text-center py-5 text-stone-400 text-xs italic">
            आज काउंटर से अभी कोई सामान बिक्री दर्ज नहीं हुई है।
          </div>
        ) : (
          <div className="space-y-1.5">
            {topItemsSold.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-md bg-stone-50 border border-stone-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-stone-900">{item.name}</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-stone-600 font-medium">{item.count} पीस</span>
                  <span className="font-mono font-bold text-stone-900">₹{item.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offline Database Backup & Security Card */}
      <div className="p-3.5 rounded-md bg-white border border-stone-200 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              {language === 'hi' ? 'ऑफलाइन डेटा बैकअप' : 'Offline Data Backup'}
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {language === 'hi'
                ? 'आपका पूरा डेटा आपके फोन/ब्राउज़र में 100% सुरक्षित है।'
                : 'All your ledger records are 100% offline-first and safe.'}
            </p>
          </div>
          <button
            onClick={handleDownloadBackup}
            className="h-9 px-3 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>{getTranslation(language, 'backupDatabase')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
