import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Truck,
  Plus,
  ArrowDownLeft,
  Phone,
  MessageSquareShare,
  X,
} from 'lucide-react';
import { db } from '../db/db';
import type { Vendor } from '../types';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { recordVendorTransaction } from '../db/operations';
import { VendorModal } from './VendorModal';
import { playSound, triggerHaptic } from '../utils/audio';

export const VendorsView: React.FC = () => {
  const { language } = useAppStore();

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendorForTx, setSelectedVendorForTx] = useState<Vendor | null>(null);
  const [txType, setTxType] = useState<'BILL_RECEIVED' | 'PAYMENT_MADE'>('BILL_RECEIVED');
  const [amountStr, setAmountStr] = useState('');
  const [noteStr, setNoteStr] = useState('');

  const vendors = useLiveQuery(() => db.vendors.toArray()) || [];

  const totalPayables = vendors.reduce((sum, v) => sum + (v.balanceOwed || 0), 0);

  const handleOpenTx = (vendor: Vendor, type: 'BILL_RECEIVED' | 'PAYMENT_MADE') => {
    playSound('beep');
    triggerHaptic('tap');
    setSelectedVendorForTx(vendor);
    setTxType(type);
    setAmountStr('');
    setNoteStr('');
  };

  const handleSaveVendorTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorForTx) return;
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) return;

    await recordVendorTransaction({
      vendorId: selectedVendorForTx.id,
      type: txType,
      amount,
      note: noteStr,
    });

    setSelectedVendorForTx(null);
  };

  const handleWhatsAppVendor = (vendor: Vendor) => {
    playSound('beep');
    const msg =
      language === 'hi'
        ? `नमस्ते ${vendor.name} जी, हमारे खाते का हिसाब देखना था। आपका बकाया ₹${vendor.balanceOwed} दर्ज है।`
        : `Hello ${vendor.name}, checking our wholesale account balance: ₹${vendor.balanceOwed}.`;
    const phone = vendor.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-4xl mx-auto space-y-3">
      {/* Header Banner */}
      <div className="p-3.5 rounded-md bg-white border border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-stone-100 text-stone-800 border border-stone-300 flex items-center justify-center">
            <Truck size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              {getTranslation(language, 'vendorTitle')}
            </h2>
            <div className="text-xs text-rose-700 font-mono font-bold mt-0.5 tracking-tight">
              {getTranslation(language, 'totalPayables')}: ₹{totalPayables}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            playSound('beep');
            setIsVendorModalOpen(true);
          }}
          className="h-9 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={15} />
          <span>{getTranslation(language, 'addVendor')}</span>
        </button>
      </div>

      {/* Vendors List */}
      <div className="space-y-1.5">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className="p-3 rounded-md bg-white border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            {/* Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900 truncate">{vendor.name}</h3>
                {vendor.company && (
                  <span className="text-[11px] font-semibold text-stone-500 truncate">
                    ({vendor.company})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-600 mt-0.5">
                {vendor.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone size={11} />
                    {vendor.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Payables & Action Buttons */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-stone-500 font-semibold uppercase block">
                  देना बाकी (Owed)
                </span>
                <span className="text-base font-mono font-bold text-rose-700 tracking-tight">
                  ₹{vendor.balanceOwed}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {vendor.phone && (
                  <button
                    onClick={() => handleWhatsAppVendor(vendor)}
                    className="w-8 h-8 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 flex items-center justify-center transition-colors cursor-pointer"
                    title="WhatsApp"
                  >
                    <MessageSquareShare size={15} />
                  </button>
                )}

                {/* Bill Received Button */}
                <button
                  onClick={() => handleOpenTx(vendor, 'BILL_RECEIVED')}
                  className="h-8 px-2.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold text-xs flex items-center gap-1 border border-rose-300 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{language === 'hi' ? 'माल आया' : '+ Bill'}</span>
                </button>

                {/* Payment Made Button */}
                <button
                  onClick={() => handleOpenTx(vendor, 'PAYMENT_MADE')}
                  className="h-8 px-2.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowDownLeft size={14} className="stroke-[2.5]" />
                  <span>{language === 'hi' ? 'भुगतान किया' : '- Paid'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Record Bill / Payment Drawer Modal */}
      {selectedVendorForTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50">
          <div className="w-full max-w-md bg-white border-t sm:border border-stone-300 sm:rounded-lg overflow-hidden p-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {selectedVendorForTx.name}
                </h3>
                <span className="text-xs text-stone-500 font-medium">
                  {txType === 'BILL_RECEIVED'
                    ? language === 'hi'
                      ? 'माल आया (+ सप्लायर बकाया बढ़ेगा)'
                      : 'Stock Bill Received (+ Due)'
                    : language === 'hi'
                    ? 'सप्लायर को पेमेंट दिया (- सप्लायर बकाया घटेगा)'
                    : 'Payment Made (- Due)'}
                </span>
              </div>
              <button
                onClick={() => setSelectedVendorForTx(null)}
                className="w-8 h-8 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveVendorTx} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {language === 'hi' ? 'रकम (₹)' : 'Amount (₹)'} *
                </label>
                <input
                  type="number"
                  autoFocus
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="उदा: 1500"
                  className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-bold text-xl focus:outline-none focus:border-stone-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {language === 'hi' ? 'सामान / इनवॉइस नंबर' : 'Invoice / Details'}
                </label>
                <input
                  type="text"
                  value={noteStr}
                  onChange={(e) => setNoteStr(e.target.value)}
                  placeholder="उदा: सिगरेट कार्टन बिल"
                  className="w-full h-9 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-xs focus:outline-none focus:border-stone-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVendorForTx(null)}
                  className="h-10 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-300 transition-colors cursor-pointer"
                >
                  {getTranslation(language, 'cancel')}
                </button>
                <button
                  type="submit"
                  className={`h-10 rounded-md font-semibold text-xs text-white transition-colors cursor-pointer ${
                    txType === 'PAYMENT_MADE'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {getTranslation(language, 'save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Creation Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
      />
    </div>
  );
};
