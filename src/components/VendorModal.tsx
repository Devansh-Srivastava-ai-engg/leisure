import React, { useState } from 'react';
import { X, Truck, Save } from 'lucide-react';
import { db } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { playSound } from '../utils/audio';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VendorModal: React.FC<VendorModalProps> = ({ isOpen, onClose }) => {
  const { language } = useAppStore();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [balanceOwed, setBalanceOwed] = useState('0');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await db.vendors.add({
      id: `vend-${Date.now()}`,
      name: name.trim(),
      company: company.trim(),
      phone: phone.trim(),
      balanceOwed: parseFloat(balanceOwed) || 0,
      lastPaymentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    playSound('beep');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50 animate-fadeIn">
      <div className="w-full max-w-md bg-white border-t sm:border border-stone-300 sm:rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-200 text-stone-800 flex items-center justify-center shadow-xs">
              <Truck size={18} />
            </div>
            <h2 className="text-base font-bold text-stone-900">
              {language === 'hi' ? 'नया सप्लायर / थोक व्यापारी' : 'Add Wholesale Supplier'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 bg-white">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {language === 'hi' ? 'सप्लायर का नाम' : 'Supplier Name'} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="उदा: आईटीसी डिस्ट्रीब्यूटर"
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-bold text-sm focus:outline-none focus:border-stone-700 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {language === 'hi' ? 'एजेंसी / कंपनी का नाम' : 'Company / Agency'}
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="उदा: ITC Ltd"
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-xs focus:outline-none focus:border-stone-700 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {language === 'hi' ? 'मोबाइल नंबर' : 'Phone Number'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9811122233"
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-medium text-xs focus:outline-none focus:border-stone-700 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {language === 'hi' ? 'शुरुआती बकाया बाकी (₹)' : 'Initial Balance Owed (₹)'}
            </label>
            <input
              type="number"
              value={balanceOwed}
              onChange={(e) => setBalanceOwed(e.target.value)}
              placeholder="0"
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-bold text-sm focus:outline-none focus:border-stone-700 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm border border-stone-300 transition-colors cursor-pointer"
            >
              {getTranslation(language, 'cancel')}
            </button>
            <button
              type="submit"
              className="h-10 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save size={18} />
              <span>{getTranslation(language, 'save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
