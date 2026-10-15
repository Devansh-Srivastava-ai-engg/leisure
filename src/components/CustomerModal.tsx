import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, Save } from 'lucide-react';
import type { Customer } from '../types';
import { useAppStore } from '../store/useAppStore';
import { saveCustomer } from '../db/operations';
import { getTranslation } from '../utils/i18n';

interface CustomerModalProps {
  isOpen: boolean;
  customerToEdit?: Customer | null;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  customerToEdit,
  onClose,
}) => {
  const { language } = useAppStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState('500');
  const [isPinned, setIsPinned] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setName(customerToEdit.name);
        setPhone(customerToEdit.phone);
        setCreditLimit(String(customerToEdit.creditLimit || 500));
        setIsPinned(customerToEdit.isPinned);
        setNotes(customerToEdit.notes || '');
      } else {
        setName('');
        setPhone('');
        setCreditLimit('500');
        setIsPinned(false);
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, customerToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(language === 'hi' ? 'कृपया ग्राहक का नाम दर्ज करें' : 'Please enter customer name');
      return;
    }

    try {
      await saveCustomer({
        id: customerToEdit?.id,
        name: name.trim(),
        phone: phone.trim(),
        creditLimit: parseFloat(creditLimit) || 500,
        isPinned,
        notes: notes.trim(),
        balance: customerToEdit ? customerToEdit.balance : 0,
      });
      onClose();
    } catch (err) {
      console.warn('Failed to save customer:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50">
      <div className="w-full max-w-md bg-white border-t sm:border border-stone-300 sm:rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-stone-200 text-stone-800 flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <h2 className="text-sm font-bold text-stone-900">
              {customerToEdit
                ? language === 'hi'
                  ? 'ग्राहक विवरण बदलें'
                  : 'Edit Customer'
                : language === 'hi'
                ? 'नया ग्राहक जोड़ें'
                : 'Add New Customer'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 rounded-md bg-rose-50 border border-rose-300 text-xs text-rose-800 font-semibold">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {getTranslation(language, 'customerName')} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'hi' ? 'उदा: शर्मा जी (मास्टर साहब)' : 'e.g. Ramesh Kumar'}
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-sm focus:outline-none focus:border-stone-700 placeholder-stone-400"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {getTranslation(language, 'phone')} (WhatsApp)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-medium text-sm focus:outline-none focus:border-stone-700 placeholder-stone-400"
              />
              <Phone size={15} className="absolute right-3 top-2.5 text-stone-400" />
            </div>
          </div>

          {/* Credit Limit */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {getTranslation(language, 'creditLimit')}
            </label>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="500"
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-medium text-sm focus:outline-none focus:border-stone-700 placeholder-stone-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {language === 'hi' ? 'पहचान / नोट (वैकल्पिक)' : 'Notes / Landmark (Optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'hi' ? 'उदा: सामने वाली गली, शाम को चाय' : 'e.g. Regular morning tea'}
              className="w-full h-9 px-3 rounded-md bg-white border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-700 placeholder-stone-400 font-medium"
            />
          </div>

          {/* Pinned regular checkbox */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-stone-50 border border-stone-200 cursor-pointer">
            <input
              type="checkbox"
              id="isPinnedCheck"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 accent-slate-900 cursor-pointer"
            />
            <label htmlFor="isPinnedCheck" className="text-xs font-semibold text-stone-800 cursor-pointer">
              ⭐ {getTranslation(language, 'pinnedRegulars')}
            </label>
          </div>

          {/* Buttons */}
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
              className="h-10 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
