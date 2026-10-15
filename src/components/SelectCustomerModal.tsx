import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Search, UserCheck } from 'lucide-react';
import { db } from '../db/db';
import type { Customer } from '../types';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { playSound } from '../utils/audio';

interface SelectCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  totalAmount: number;
}

export const SelectCustomerModal: React.FC<SelectCustomerModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  totalAmount,
}) => {
  const { language } = useAppStore();
  const [query, setQuery] = useState('');

  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  if (!isOpen) return null;

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.phone && c.phone.includes(query))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50 animate-fadeIn">
      <div className="w-full max-w-md bg-white border-t sm:border border-stone-300 sm:rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {language === 'hi' ? 'उधार के लिए ग्राहक चुनें' : 'Select Customer for Udhar'}
            </h2>
            <p className="text-xs text-rose-700 font-mono font-bold">
              {language === 'hi' ? 'कुल बिल रकम:' : 'Bill Amount:'} ₹{totalAmount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-stone-200 bg-white">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-stone-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={getTranslation(language, 'searchCustomer')}
              className="w-full h-10 pl-9 pr-3 rounded-md bg-stone-50 border border-stone-300 text-stone-900 font-medium text-xs focus:outline-none focus:border-stone-700 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-stone-50">
          {filtered.map((cust) => (
            <button
              key={cust.id}
              onClick={() => {
                playSound('beep');
                onSelectCustomer(cust);
              }}
              className="w-full p-3 rounded-md bg-white hover:bg-stone-100 border border-stone-200 flex items-center justify-between text-left shadow-xs transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-md ${
                    cust.avatarColor || 'bg-stone-200 text-stone-800'
                  } flex items-center justify-center font-bold text-sm border border-stone-300`}
                >
                  {cust.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">{cust.name}</div>
                  <div className="text-xs text-stone-600">
                    {language === 'hi' ? 'वर्तमान बाकी:' : 'Current Due:'}{' '}
                    <span className="font-mono font-bold text-rose-700">₹{cust.balance}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-300 flex items-center gap-1">
                <span>चुनें</span>
                <UserCheck size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
