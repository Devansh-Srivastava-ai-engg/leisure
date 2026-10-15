import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, ArrowDownLeft, ArrowUpRight, Calendar, Star, Edit, Trash2, QrCode, MessageSquareShare } from 'lucide-react';
import type { Customer } from '../types';
import { db } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { togglePinCustomer } from '../db/operations';
import { playSound } from '../utils/audio';

interface CustomerHistoryDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenKeypad: (customer: Customer, type: 'UDHAR_GIVEN' | 'JAMA_RECEIVED') => void;
  onEditCustomer: (customer: Customer) => void;
  onOpenQr: (customer: Customer) => void;
}

export const CustomerHistoryDrawer: React.FC<CustomerHistoryDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  onOpenKeypad,
  onEditCustomer,
  onOpenQr,
}) => {
  const { language, settings } = useAppStore();

  const transactions = useLiveQuery(
    async () => {
      if (!customer) return [];
      return await db.transactions
        .where('customerId')
        .equals(customer.id)
        .reverse()
        .sortBy('timestamp');
    },
    [customer?.id]
  );

  if (!isOpen || !customer) return null;

  const handleWhatsApp = () => {
    playSound('beep');
    const shopName = settings.shopName || 'DukaanKhata';
    const merchantUpi = settings.merchantUpi || '9876543210@paytm';
    const amount = customer.balance;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(
      shopName
    )}&am=${amount}&cu=INR`;

    const msg =
      language === 'hi'
        ? `नमस्ते ${customer.name} जी! आपका ${shopName} पर कुल बकाया उधार ₹${amount} है। कृपया भुगतान करें:\n${upiUrl}`
        : `Hello ${customer.name}, your outstanding credit at ${shopName} is ₹${amount}. Please pay via UPI:\n${upiUrl}`;

    const phone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDeleteCustomer = async () => {
    if (window.confirm(language === 'hi' ? 'क्या आप इस ग्राहक को हटाना चाहते हैं?' : 'Delete this customer?')) {
      await db.customers.delete(customer.id);
      playSound('beep');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50">
      <div className="w-full max-w-lg bg-white border-t sm:border border-stone-300 sm:rounded-lg overflow-hidden flex flex-col max-h-[90vh] shadow-xl">
        {/* Customer Header */}
        <div className="p-3.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-full ${
                customer.avatarColor || 'bg-stone-200 text-stone-800'
              } flex items-center justify-center font-bold text-base shrink-0 border border-stone-300`}
            >
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-stone-900 truncate">{customer.name}</h2>
                <button
                  onClick={() => togglePinCustomer(customer.id)}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    customer.isPinned ? 'text-amber-600' : 'text-stone-400 hover:text-stone-600'
                  }`}
                  title="Toggle Pin"
                >
                  <Star size={15} fill={customer.isPinned ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="text-xs font-mono text-stone-600">
                {customer.phone || (language === 'hi' ? 'फोन नंबर नहीं' : 'No phone')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditCustomer(customer)}
              className="p-1.5 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors cursor-pointer"
              title="Edit"
            >
              <Edit size={15} />
            </button>
            <button
              onClick={handleDeleteCustomer}
              className="p-1.5 rounded-md bg-stone-200 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Balance & Quick Actions Bar */}
        <div className="p-3.5 bg-white flex items-center justify-between border-b border-stone-200">
          <div>
            <div className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
              {getTranslation(language, 'balanceDue')}
            </div>
            <div
              className={`text-2xl font-mono font-bold tracking-tight ${
                customer.balance > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              ₹{customer.balance}
            </div>
            {customer.balance > (customer.creditLimit || 500) && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 inline-block mt-0.5">
                ⚠️ {getTranslation(language, 'creditLimitExceeded')} (&gt; ₹{customer.creditLimit})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenQr(customer)}
              className="px-3 py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs flex items-center gap-1 border border-stone-300 transition-colors cursor-pointer"
            >
              <QrCode size={14} className="text-stone-700" />
              <span>QR Pay</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <MessageSquareShare size={14} />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Big Action Buttons */}
        <div className="p-2.5 bg-stone-50 grid grid-cols-2 gap-2 border-b border-stone-200">
          <button
            onClick={() => onOpenKeypad(customer, 'JAMA_RECEIVED')}
            className="h-10 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowDownLeft size={16} className="stroke-[2.5]" />
            <span>+ {language === 'hi' ? 'जमा (Jama)' : 'Jama (Received)'}</span>
          </button>
          <button
            onClick={() => onOpenKeypad(customer, 'UDHAR_GIVEN')}
            className="h-10 rounded-md bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowUpRight size={16} className="stroke-[2.5]" />
            <span>+ {language === 'hi' ? 'उधार (Udhar)' : 'Udhar (Given)'}</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-stone-50">
          <h4 className="text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
            {getTranslation(language, 'transactionHistory')}
          </h4>

          {(!transactions || transactions.length === 0) && (
            <div className="text-center py-6 text-stone-400 text-xs italic">
              {getTranslation(language, 'noTransactions')}
            </div>
          )}

          {transactions?.map((tx) => {
            const isUdhar = tx.type === 'UDHAR_GIVEN';
            const dateStr = new Date(tx.timestamp).toLocaleString(
              language === 'hi' ? 'hi-IN' : 'en-IN',
              {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }
            );

            return (
              <div
                key={tx.id}
                className="p-2.5 rounded-md bg-white border border-stone-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center border ${
                      isUdhar
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isUdhar ? (
                      <ArrowUpRight size={14} className="stroke-[2.5]" />
                    ) : (
                      <ArrowDownLeft size={14} className="stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-stone-900">
                      {isUdhar
                        ? language === 'hi'
                          ? 'उधार दिया'
                          : 'Credit Given'
                        : language === 'hi'
                        ? 'जमा मिला'
                        : 'Payment Received'}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                      <Calendar size={10} />
                      <span>{dateStr}</span>
                      {tx.note && <span className="text-stone-700 font-sans font-medium">· {tx.note}</span>}
                    </div>
                  </div>
                </div>

                <div
                  className={`text-sm font-mono font-bold tracking-tight ${
                    isUdhar ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {isUdhar ? '+' : '-'}₹{tx.amount}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
