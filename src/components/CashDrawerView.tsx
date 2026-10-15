import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import {
  Banknote,
  Plus,
  Minus,
  CheckCircle2,
  Receipt,
  Lock,
  TrendingDown,
  TrendingUp,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { db, getTodayDateString } from '../db/db';
import type { Denominations } from '../types';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import {
  updateDailyRegisterCash,
  closeDayRegister,
} from '../db/operations';
import { ExpenseModal } from './ExpenseModal';
import { playSound, triggerHaptic, speakConfirmation } from '../utils/audio';

const NOTE_DENOMINATIONS: Array<{ key: keyof Denominations; value: number; label: string; color: string }> = [
  { key: 500, value: 500, label: '₹500', color: 'border-stone-200 bg-white text-stone-900' },
  { key: 200, value: 200, label: '₹200', color: 'border-stone-200 bg-white text-stone-900' },
  { key: 100, value: 100, label: '₹100', color: 'border-stone-200 bg-white text-stone-900' },
  { key: 50, value: 50, label: '₹50', color: 'border-stone-200 bg-white text-stone-900' },
  { key: 20, value: 20, label: '₹20', color: 'border-stone-200 bg-white text-stone-900' },
  { key: 10, value: 10, label: '₹10', color: 'border-stone-200 bg-white text-stone-900' },
];

export const CashDrawerView: React.FC = () => {
  const { language, soundEnabled } = useAppStore();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [denoms, setDenoms] = useState<Denominations>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    coins: 0,
  });
  const [startingCash, setStartingCash] = useState<number>(2000);
  const [isClosingConfirm, setIsClosingConfirm] = useState(false);

  const today = getTodayDateString();
  const register = useLiveQuery(() => db.dailyRegisters.get(today), [today]);

  useEffect(() => {
    if (register) {
      setDenoms(
        register.denominations || {
          500: 0,
          200: 0,
          100: 0,
          50: 0,
          20: 0,
          10: 0,
          coins: 0,
        }
      );
      setStartingCash(register.startingCash ?? 2000);
    }
  }, [register]);

  // Handle note change
  const handleNoteChange = (key: keyof Denominations, count: number) => {
    triggerHaptic('tap');
    playSound('beep');
    const updated = {
      ...denoms,
      [key]: Math.max(0, count),
    };
    setDenoms(updated);
    updateDailyRegisterCash({ startingCash, denominations: updated });
  };

  const handleCoinsChange = (val: number) => {
    const updated = {
      ...denoms,
      coins: Math.max(0, val),
    };
    setDenoms(updated);
    updateDailyRegisterCash({ startingCash, denominations: updated });
  };

  const handleStartingCashChange = (val: number) => {
    setStartingCash(val);
    updateDailyRegisterCash({ startingCash: val, denominations: denoms });
  };

  // Calculations
  const countedPhysicalCash =
    denoms[500] * 500 +
    denoms[200] * 200 +
    denoms[100] * 100 +
    denoms[50] * 50 +
    denoms[20] * 20 +
    denoms[10] * 10 +
    (denoms.coins || 0);

  const cashSales = register?.cashSales || 0;
  const jamaCash = register?.jamaCash || 0;
  const cashExpenses = register?.cashExpenses || 0;

  // Expected Cash Formula: Starting Drawer + Cash Sales + Jama Received - Cash Expenses
  const expectedCash = startingCash + cashSales + jamaCash - cashExpenses;
  const discrepancy = countedPhysicalCash - expectedCash;

  // Close Day Register
  const handleCloseDay = async () => {
    try {
      await closeDayRegister();
      setIsClosingConfirm(false);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
      speakConfirmation(
        language === 'hi'
          ? 'आज का गल्ला हिसाब बंद कर दिया गया'
          : 'Day register closed successfully',
        language,
        soundEnabled
      );
    } catch (err) {
      console.warn('Error closing day:', err);
    }
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-4xl mx-auto space-y-3">
      {/* Top Header Card: Physical vs Expected with Discrepancy */}
      <div className="p-3.5 rounded-md border border-stone-200 bg-white">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-stone-100 text-stone-800 border border-stone-300 flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                {getTranslation(language, 'cashDrawerTitle')}
              </h2>
              <span className="text-xs font-mono text-stone-500">
                {today} · {register?.isClosed ? 'बंद (Closed)' : 'चालू (Active)'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              playSound('beep');
              setIsExpenseModalOpen(true);
            }}
            className="h-8 px-3 rounded-md bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 font-semibold text-xs flex items-center gap-1.5 border border-rose-300 transition-colors cursor-pointer"
          >
            <Receipt size={13} />
            <span>{getTranslation(language, 'recordExpense')}</span>
          </button>
        </div>

        {/* Big Numbers Grid: Counted vs Expected */}
        <div className="grid grid-cols-2 gap-2.5 mt-2.5 pt-2.5 border-t border-stone-200">
          <div className="p-3 rounded-md bg-stone-50 border border-stone-200 text-center">
            <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider block">
              {getTranslation(language, 'totalCalculatedCash')}
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-bold text-stone-900 block mt-0.5 tracking-tight">
              ₹{countedPhysicalCash}
            </span>
          </div>

          <div className="p-3 rounded-md bg-stone-50 border border-stone-200 text-center">
            <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider block">
              {getTranslation(language, 'expectedCash')}
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-bold text-stone-900 block mt-0.5 tracking-tight">
              ₹{expectedCash}
            </span>
          </div>
        </div>

        {/* Discrepancy Status Banner */}
        <div
          className={`mt-2.5 p-2.5 rounded-md border flex items-center justify-between text-xs font-semibold ${
            discrepancy === 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : discrepancy > 0
              ? 'bg-stone-100 border-stone-300 text-stone-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {discrepancy === 0 ? (
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
            ) : discrepancy > 0 ? (
              <TrendingUp size={16} className="text-stone-700 shrink-0" />
            ) : (
              <TrendingDown size={16} className="text-rose-700 shrink-0" />
            )}
            <span>
              {discrepancy === 0
                ? getTranslation(language, 'perfectMatch')
                : discrepancy > 0
                ? getTranslation(language, 'cashSurplus')
                : getTranslation(language, 'cashDeficit')}
            </span>
          </div>

          <span className="text-sm font-mono font-bold tracking-tight">
            {discrepancy > 0 ? `+₹${discrepancy}` : discrepancy < 0 ? `-₹${Math.abs(discrepancy)}` : '₹0'}
          </span>
        </div>
      </div>

      {/* Reconciliation Math Breakdown Card */}
      <div className="p-3 rounded-md bg-white border border-stone-200 space-y-2">
        <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
          {getTranslation(language, 'expectedCashFormula')}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Starting Cash */}
          <div className="p-2.5 rounded-md bg-stone-50 border border-stone-200">
            <span className="text-[10px] text-stone-600 font-semibold block">
              {getTranslation(language, 'startingCash')}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-stone-500 font-bold">₹</span>
              <input
                type="number"
                value={startingCash}
                onChange={(e) => handleStartingCashChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-sm font-mono font-bold text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Plus Cash Sales */}
          <div className="p-2.5 rounded-md bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] text-emerald-800 font-semibold block">
              {getTranslation(language, 'plusCashSales')}
            </span>
            <span className="text-sm font-mono font-bold text-emerald-800 block mt-0.5">
              +₹{cashSales}
            </span>
          </div>

          {/* Plus Jama Received */}
          <div className="p-2.5 rounded-md bg-stone-50 border border-stone-200">
            <span className="text-[10px] text-stone-700 font-semibold block">
              {getTranslation(language, 'plusJamaReceived')}
            </span>
            <span className="text-sm font-mono font-bold text-stone-900 block mt-0.5">
              +₹{jamaCash}
            </span>
          </div>

          {/* Minus Cash Expenses */}
          <div className="p-2.5 rounded-md bg-rose-50/60 border border-rose-200">
            <span className="text-[10px] text-rose-800 font-semibold block">
              {getTranslation(language, 'minusCashExpenses')}
            </span>
            <span className="text-sm font-mono font-bold text-rose-800 block mt-0.5">
              -₹{cashExpenses}
            </span>
          </div>
        </div>
      </div>

      {/* Physical Currency Counter Form */}
      <div className="p-3.5 rounded-md bg-white border border-stone-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
            <Banknote size={15} className="text-stone-700" />
            <span>{getTranslation(language, 'denominationCounter')}</span>
          </span>
          <span className="text-[11px] text-stone-500 font-medium">
            {language === 'hi' ? 'गिनकर नोट भरें' : 'Count notes in drawer'}
          </span>
        </div>

        {/* Currency Denominations Rows */}
        <div className="space-y-1.5">
          {NOTE_DENOMINATIONS.map((d) => {
            const count = denoms[d.key] || 0;
            const subtotal = count * d.value;

            return (
              <div
                key={d.key}
                className="p-2 rounded-md border border-stone-200 bg-white flex items-center justify-between gap-2"
              >
                {/* Note Label */}
                <div className="w-16 font-mono font-bold text-sm tracking-tight text-stone-900 shrink-0">
                  {d.label}
                </div>

                {/* Steppers & Direct Input */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleNoteChange(d.key, count - 1)}
                    className="w-8 h-8 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center border border-stone-300 font-bold transition-colors cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>

                  <input
                    type="number"
                    min="0"
                    value={count === 0 ? '' : count}
                    placeholder="0"
                    onChange={(e) =>
                      handleNoteChange(d.key, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-14 h-8 rounded-md bg-white border border-stone-300 text-center font-mono font-bold text-sm text-stone-900 focus:outline-none focus:border-stone-700"
                  />

                  <button
                    type="button"
                    onClick={() => handleNoteChange(d.key, count + 1)}
                    className="w-8 h-8 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center border border-stone-300 font-bold transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="w-20 text-right font-mono font-semibold text-xs text-stone-900 shrink-0">
                  = ₹{subtotal}
                </div>
              </div>
            );
          })}

          {/* Coins input row */}
          <div className="p-2 rounded-md border border-stone-200 bg-white text-stone-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-800">
              <Coins size={16} className="text-stone-600" />
              <span>{language === 'hi' ? 'सिक्के (Coins)' : 'Total Coins'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                value={denoms.coins || ''}
                placeholder="0"
                onChange={(e) => handleCoinsChange(parseFloat(e.target.value) || 0)}
                className="w-20 h-8 rounded-md bg-white border border-stone-300 text-center font-mono font-bold text-sm text-stone-900 focus:outline-none focus:border-stone-700"
              />
            </div>
          </div>
        </div>

        {/* Action: Close Day Register Button */}
        <div className="pt-2">
          {register?.isClosed ? (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 text-center font-semibold text-emerald-800 text-sm flex items-center justify-center gap-2">
              <ShieldCheck size={18} className="text-emerald-700" />
              <span>{getTranslation(language, 'registerClosed')}</span>
            </div>
          ) : (
            <button
              onClick={() => setIsClosingConfirm(true)}
              className="w-full h-11 rounded-md bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock size={16} />
              <span>{getTranslation(language, 'closeDayRegister')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Close Day Register Confirmation Modal */}
      {isClosingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50">
          <div className="w-full max-w-sm bg-white border border-stone-300 rounded-lg p-5 text-center space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-md bg-stone-100 border border-stone-300 text-stone-800 flex items-center justify-center mx-auto">
              <Lock size={22} />
            </div>

            <h3 className="text-base font-bold text-stone-900">
              {language === 'hi' ? 'क्या आज का गल्ला बंद करें?' : 'Close Today’s Register?'}
            </h3>

            <p className="text-xs text-stone-600 font-medium">
              {language === 'hi'
                ? `फिजिकल नकद ₹${countedPhysicalCash} को लॉक करके आज का हिसाब सुरक्षित कर दिया जाएगा।`
                : `Counted cash ₹${countedPhysicalCash} will be locked and saved for today.`}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsClosingConfirm(false)}
                className="h-10 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-300 transition-colors cursor-pointer"
              >
                {getTranslation(language, 'cancel')}
              </button>
              <button
                onClick={handleCloseDay}
                className="h-10 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {language === 'hi' ? 'हाँ, बंद करें' : 'Yes, Close Day'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />
    </div>
  );
};
