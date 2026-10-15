import React, { useState } from 'react';
import { X, Receipt, Save } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { recordExpense } from '../db/operations';
import { getTranslation } from '../utils/i18n';
import { playSound } from '../utils/audio';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { language, soundEnabled } = useAppStore();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const quickExpensePresets = [
    'दूध (Milk)',
    'बर्फ (Ice)',
    'नींबू (Lemon)',
    'चाय पत्ती व शक्कर (Tea/Sugar)',
    'दुकान भाड़ा / बिजली',
    'सफाई व नाश्ता',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    await recordExpense({
      amount: val,
      note: note.trim() || 'दुकान खर्चा',
      lang: language,
      soundEnabled,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50">
      <div className="w-full max-w-md bg-white border-t sm:border border-stone-300 sm:rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <Receipt size={16} />
            </div>
            <h2 className="text-sm font-bold text-stone-900">
              {language === 'hi' ? 'दुकान का नकद खर्चा लिखें' : 'Record Cash Expense'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-white">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {language === 'hi' ? 'खर्चा रकम (रुपये)' : 'Expense Amount (₹)'} *
            </label>
            <input
              type="number"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="उदा: 60"
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-bold text-xl focus:outline-none focus:border-stone-700"
            />
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">
              फास्ट चुनिए:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickExpensePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playSound('beep');
                    setNote(preset);
                  }}
                  className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-[11px] font-medium text-stone-800 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {language === 'hi' ? 'खर्चे का विवरण' : 'Expense Details'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="उदा: दूध 1 लीटर"
              className="w-full h-9 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-xs focus:outline-none focus:border-stone-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-300 transition-colors cursor-pointer"
            >
              {getTranslation(language, 'cancel')}
            </button>
            <button
              type="submit"
              className="h-10 rounded-md bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save size={15} />
              <span>{getTranslation(language, 'save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
