import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  Mic,
} from 'lucide-react';
import { db } from '../db/db';
import type { Customer } from '../types';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { QuickKeypadModal } from './QuickKeypadModal';
import { CustomerModal } from './CustomerModal';
import { UpiQrModal } from './UpiQrModal';
import { CustomerHistoryDrawer } from './CustomerHistoryDrawer';
import { playSound, triggerHaptic } from '../utils/audio';

export const LedgerView: React.FC = () => {
  const { language, openVoiceModal } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerForKeypad, setSelectedCustomerForKeypad] = useState<Customer | null>(null);
  const [keypadType, setKeypadType] = useState<'UDHAR_GIVEN' | 'JAMA_RECEIVED'>('UDHAR_GIVEN');
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [customerForQr, setCustomerForQr] = useState<Customer | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const [customerForHistory, setCustomerForHistory] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Live queries from Dexie
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // Pinned Regulars
  const pinnedRegulars = useMemo(() => {
    return customers.filter((c) => c.isPinned);
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Open Quick Keypad
  const handleOpenKeypad = (customer: Customer, type: 'UDHAR_GIVEN' | 'JAMA_RECEIVED') => {
    playSound('beep');
    triggerHaptic('tap');
    setSelectedCustomerForKeypad(customer);
    setKeypadType(type);
    setIsKeypadOpen(true);
  };

  const handleOpenQr = (customer: Customer) => {
    playSound('beep');
    setCustomerForQr(customer);
    setIsQrModalOpen(true);
  };

  const handleOpenHistory = (customer: Customer) => {
    playSound('beep');
    setCustomerForHistory(customer);
    setIsHistoryOpen(true);
  };

  const totalMarketCredit = filteredCustomers.reduce((acc, c) => acc + (c.balance || 0), 0);

  return (
    <div className="pb-24 pt-3 px-3 sm:px-4 max-w-4xl mx-auto space-y-3.5">
      {/* Search & Add Customer Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getTranslation(language, 'searchCustomer')}
            className="w-full h-10 pl-9 pr-8 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-sm placeholder-stone-400 focus:outline-none focus:border-stone-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Add Customer Button */}
        <button
          onClick={() => {
            playSound('beep');
            setCustomerToEdit(null);
            setIsCustomerModalOpen(true);
          }}
          className="h-10 px-3.5 rounded-md bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs sm:text-sm tracking-wide flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <UserPlus size={15} />
          <span>{getTranslation(language, 'addCustomer')}</span>
        </button>
      </div>

      {/* Pinned Regulars: Clean Horizontal Contact Strip */}
      {pinnedRegulars.length > 0 && !searchQuery && (
        <div className="bg-white rounded-md border border-stone-200 p-3">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
              {getTranslation(language, 'pinnedRegulars')}
            </span>
            <span className="text-[11px] text-stone-500">
              {language === 'hi' ? 'टैप करके खाता खोलें' : 'Tap to open'}
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar py-0.5 px-0.5">
            {pinnedRegulars.map((cust) => {
              const isOverLimit = cust.balance > (cust.creditLimit || 500);
              const firstName = cust.name.split(' ')[0];

              return (
                <button
                  key={cust.id}
                  onClick={() => handleOpenKeypad(cust, 'UDHAR_GIVEN')}
                  className="flex flex-col items-center shrink-0 w-16 text-center cursor-pointer active:scale-95 transition-transform"
                >
                  {/* Clean circular avatar with neutral border */}
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border ${
                      cust.avatarColor || 'bg-stone-100 text-stone-800 border-stone-300'
                    } ${isOverLimit ? 'ring-2 ring-rose-600' : ''}`}
                  >
                    {cust.name.charAt(0)}
                  </div>

                  {/* Customer name */}
                  <span className="text-xs font-semibold text-stone-800 truncate w-full mt-1.5 leading-tight">
                    {firstName}
                  </span>

                  {/* Clean balance badge */}
                  <span
                    className={`text-[11px] font-mono tracking-tight font-bold mt-0.5 ${
                      cust.balance > 0 ? 'text-rose-700' : 'text-stone-500 font-medium'
                    }`}
                  >
                    ₹{cust.balance}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Customers List */}
      <div className="space-y-1.5">
        {/* List Header */}
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-semibold text-stone-600 uppercase tracking-wider">
            {getTranslation(language, 'allCustomers')} ({filteredCustomers.length})
          </span>
          <span className="text-stone-600 font-medium">
            {language === 'hi' ? 'कुल बकाया:' : 'Total Due:'}{' '}
            <strong className="text-rose-700 font-mono font-bold text-sm tracking-tight">₹{totalMarketCredit}</strong>
          </span>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="p-8 text-center bg-white rounded-md border border-stone-200 text-stone-500 text-sm">
            {getTranslation(language, 'noCustomersFound')}
          </div>
        )}

        {/* Customer Cards (Pure white, clean borders, dense) */}
        <div className="space-y-1.5">
          {filteredCustomers.map((cust) => {
            const isOverLimit = cust.balance > (cust.creditLimit || 500);

            return (
              <div
                key={cust.id}
                onClick={() => handleOpenHistory(cust)}
                className="p-3 bg-white rounded-md border border-stone-200 hover:border-stone-400 flex items-center justify-between gap-3 cursor-pointer transition-colors active:bg-stone-50"
              >
                {/* Left: Avatar + Customer Name + Phone */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-stone-200 ${
                      cust.avatarColor || 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    {cust.name.charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-stone-900 truncate leading-snug">
                        {cust.name}
                      </h3>
                      {isOverLimit && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          सीमा पार
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-600 mt-0.5 flex items-center gap-1 font-mono">
                      {cust.phone ? (
                        <span>{cust.phone}</span>
                      ) : (
                        <span className="text-stone-400 font-sans">
                          {language === 'hi' ? 'फोन नहीं' : 'No phone'}
                        </span>
                      )}
                      {cust.notes && (
                        <span className="text-stone-500 font-sans truncate max-w-[120px]">
                          · {cust.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Large Outstanding Balance + 2 Simple Action Buttons */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Balance */}
                  <div className="text-right">
                    <div className="text-[10px] font-medium text-stone-500 uppercase leading-none">
                      {cust.balance > 0
                        ? language === 'hi'
                          ? 'बाकी'
                          : 'Due'
                        : language === 'hi'
                        ? 'चुकता'
                        : 'Settled'}
                    </div>
                    <div
                      className={`text-base font-mono font-bold mt-0.5 leading-snug tracking-tight ${
                        cust.balance > 0 ? 'text-rose-700' : 'text-stone-500'
                      }`}
                    >
                      ₹{cust.balance}
                    </div>
                  </div>

                  {/* 2 Clean Compact Action Buttons: Jama (Green) and Udhar (Red) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenKeypad(cust, 'JAMA_RECEIVED');
                      }}
                      className="h-8 px-2.5 rounded-md bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Jama"
                    >
                      <ArrowDownLeft size={13} className="stroke-[2.5]" />
                      <span>{language === 'hi' ? 'जमा' : 'Jama'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenKeypad(cust, 'UDHAR_GIVEN');
                      }}
                      className="h-8 px-2.5 rounded-md bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Udhar"
                    >
                      <ArrowUpRight size={13} className="stroke-[2.5]" />
                      <span>{language === 'hi' ? 'उधार' : 'Udhar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button (Voice Mic): Utilitarian slate box */}
      <div className="fixed bottom-18 right-4 z-30">
        <button
          onClick={() => {
            playSound('beep');
            openVoiceModal();
          }}
          className="w-12 h-12 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-md active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          title="बोलकर लिखें / Voice Entry"
        >
          <Mic size={22} />
        </button>
      </div>

      {/* Modals & Slide-overs */}
      <QuickKeypadModal
        customer={selectedCustomerForKeypad}
        initialType={keypadType}
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        customerToEdit={customerToEdit}
        onClose={() => setIsCustomerModalOpen(false)}
      />

      <UpiQrModal
        customer={customerForQr}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      <CustomerHistoryDrawer
        customer={customerForHistory}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onOpenKeypad={handleOpenKeypad}
        onEditCustomer={(cust) => {
          setIsHistoryOpen(false);
          setCustomerToEdit(cust);
          setIsCustomerModalOpen(true);
        }}
        onOpenQr={(cust) => {
          setIsHistoryOpen(false);
          handleOpenQr(cust);
        }}
      />
    </div>
  );
};
