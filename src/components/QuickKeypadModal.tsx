import React, { useState, useEffect } from 'react';
import { X, Delete, ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import type { Customer } from '../types';
import { useAppStore } from '../store/useAppStore';
import { recordCustomerTransaction } from '../db/operations';
import { getTranslation } from '../utils/i18n';
import { playSound, triggerHaptic } from '../utils/audio';

interface QuickKeypadModalProps {
  customer: Customer | null;
  initialType?: 'UDHAR_GIVEN' | 'JAMA_RECEIVED';
  isOpen: boolean;
  onClose: () => void;
}

export const QuickKeypadModal: React.FC<QuickKeypadModalProps> = ({
  customer,
  initialType = 'UDHAR_GIVEN',
  isOpen,
  onClose,
}) => {
  const { language, soundEnabled } = useAppStore();

  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'UDHAR_GIVEN' | 'JAMA_RECEIVED'>(initialType);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setSelectedType(initialType);
      setNote('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialType]);

  if (!isOpen || !customer) return null;

  const currentAmount = parseFloat(amountStr) || 0;

  // Calculate new balance preview
  const previewBalance =
    selectedType === 'UDHAR_GIVEN'
      ? customer.balance + currentAmount
      : Math.max(0, customer.balance - currentAmount);

  const isOverCreditLimit =
    selectedType === 'UDHAR_GIVEN' &&
    previewBalance > (customer.creditLimit || 500);

  // Keypad actions
  const handleDigit = (digit: string) => {
    triggerHaptic('tap');
    playSound('beep');
    if (amountStr.length >= 6) return; // Prevent unreasonable numbers
    setAmountStr((prev) => (prev === '0' ? digit : prev + digit));
  };

  const handleBackspace = () => {
    triggerHaptic('tap');
    playSound('beep');
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    triggerHaptic('tap');
    playSound('beep');
    setAmountStr('');
  };

  // One-tap quick currency chips: +10, +20, +50, +100, +200, +500
  const handleAddChip = (chipValue: number) => {
    triggerHaptic('tap');
    playSound('coin');
    const existing = parseFloat(amountStr) || 0;
    setAmountStr(String(existing + chipValue));
  };

  const handleSubmit = async (overrideType?: 'UDHAR_GIVEN' | 'JAMA_RECEIVED') => {
    const finalType = overrideType || selectedType;
    const finalAmount = parseFloat(amountStr);
    if (!finalAmount || finalAmount <= 0) {
      playSound('warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordCustomerTransaction({
        customerId: customer.id,
        type: finalType,
        amount: finalAmount,
        note: note.trim(),
        lang: language,
        soundEnabled,
      });
      onClose();
    } catch (err) {
      console.warn('Failed to submit transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50">
      <div className="w-full max-w-md bg-white border-t sm:border border-stone-300 sm:rounded-lg overflow-hidden flex flex-col max-h-[96vh] shadow-xl">
        {/* Customer Header */}
        <div className="p-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-full ${
                customer.avatarColor || 'bg-stone-200 text-stone-800'
              } flex items-center justify-center font-bold text-base shrink-0 border border-stone-300`}
            >
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900 truncate leading-tight">
                {customer.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-stone-600">
                  {language === 'hi' ? 'मौजूदा बाकी:' : 'Current Due:'}
                </span>
                <span
                  className={`font-mono font-bold tracking-tight ${
                    customer.balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  ₹{customer.balance}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Amount Input & Preview Banner */}
        <div className="p-3.5 bg-stone-50 flex flex-col items-center border-b border-stone-200">
          {/* Main Display */}
          <div className="w-full text-center">
            <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
              {getTranslation(language, 'enterAmount')}
            </span>
            <div className="h-14 flex items-center justify-center">
              <span className="text-2xl font-bold text-stone-400 mr-1.5">₹</span>
              <span className="text-4xl font-mono font-bold text-stone-900 tracking-tight">
                {amountStr || '0'}
              </span>
            </div>
          </div>

          {/* New Balance Preview Banner */}
          {currentAmount > 0 && (
            <div
              className={`w-full py-1.5 px-3 rounded-md border text-xs font-semibold flex items-center justify-between mt-1 transition-all ${
                isOverCreditLimit
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-stone-300 text-stone-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {isOverCreditLimit && <AlertTriangle size={14} className="text-amber-700 shrink-0" />}
                {language === 'hi' ? 'एंट्री के बाद बाकी:' : 'New Balance:'}
              </span>
              <span className="text-sm font-mono font-bold text-stone-900 tracking-tight">₹{previewBalance}</span>
            </div>
          )}

          {/* One-Tap Quick Currency Chips (+10, +20, +50, +100, +200, +500) */}
          <div className="w-full grid grid-cols-6 gap-1.5 mt-2.5">
            {[10, 20, 50, 100, 200, 500].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAddChip(val)}
                className="h-8 rounded-md bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-mono font-semibold text-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                +{val}
              </button>
            ))}
          </div>

          {/* Optional Quick Note Input */}
          <div className="w-full mt-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'सामान का नाम लिखें (उदा. 2 चाय, 1 सिगरेट)...'
                  : 'Add note (e.g. 2 chai, 1 cigarette)...'
              }
              className="w-full h-8 px-3 rounded-md bg-white border border-stone-300 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-700 font-medium"
            />
          </div>
        </div>

        {/* Custom Touch Keypad */}
        <div className="p-3 bg-white">
          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => {
              if (k === '⌫') {
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={handleBackspace}
                    className="h-11 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-base flex items-center justify-center border border-stone-300 transition-colors cursor-pointer"
                  >
                    <Delete size={18} />
                  </button>
                );
              }
              if (k === 'C') {
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={handleClear}
                    className="h-11 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs uppercase tracking-wide flex items-center justify-center border border-rose-300 transition-colors cursor-pointer"
                  >
                    CLEAR
                  </button>
                );
              }
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleDigit(k)}
                  className="h-11 rounded-md bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 font-mono font-bold text-xl flex items-center justify-center border border-stone-300 transition-colors cursor-pointer"
                >
                  {k}
                </button>
              );
            })}
          </div>

          {/* Prominent, Distinct Action Buttons: JAMA (Green) & UDHAR (Red) */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            {/* JAMA BUTTON (Received - Green) */}
            <button
              type="button"
              disabled={isSubmitting || currentAmount <= 0}
              onClick={() => handleSubmit('JAMA_RECEIVED')}
              className={`h-12 rounded-md font-semibold text-sm flex flex-col items-center justify-center transition-colors ${
                currentAmount > 0
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                  : 'bg-stone-100 text-stone-400 border border-stone-300 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5 leading-none">
                <ArrowDownLeft size={16} className="stroke-[2.5]" />
                <span>{language === 'hi' ? 'जमा (Jama)' : 'Jama (Received)'}</span>
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${currentAmount > 0 ? 'text-emerald-100' : 'text-stone-400'}`}>
                {language === 'hi' ? 'पैसे मिले (- बाकी)' : 'Paid by Customer'}
              </span>
            </button>

            {/* UDHAR BUTTON (Given - Red) */}
            <button
              type="button"
              disabled={isSubmitting || currentAmount <= 0}
              onClick={() => handleSubmit('UDHAR_GIVEN')}
              className={`h-12 rounded-md font-semibold text-sm flex flex-col items-center justify-center transition-colors ${
                currentAmount > 0
                  ? 'bg-rose-700 hover:bg-rose-800 text-white cursor-pointer'
                  : 'bg-stone-100 text-stone-400 border border-stone-300 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5 leading-none">
                <ArrowUpRight size={16} className="stroke-[2.5]" />
                <span>{language === 'hi' ? 'उधार (Udhar)' : 'Udhar (Given)'}</span>
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${currentAmount > 0 ? 'text-rose-100' : 'text-stone-400'}`}>
                {language === 'hi' ? 'खाते में जोड़ें (+ बाकी)' : 'Add Credit Owed'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
