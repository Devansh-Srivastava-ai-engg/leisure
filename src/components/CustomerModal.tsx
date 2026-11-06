import React, { useState } from 'react';
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

const CustomerModalForm: React.FC<Omit<CustomerModalProps, 'isOpen'>> = ({
  customerToEdit,
  onClose,
}) => {
  const { language } = useAppStore();

  const [name, setName] = useState(customerToEdit?.name || '');
  const [phone, setPhone] = useState(customerToEdit?.phone || '');
  const [creditLimit, setCreditLimit] = useState(String(customerToEdit?.creditLimit || 500));
  const [isPinned, setIsPinned] = useState(customerToEdit ? customerToEdit.isPinned : false);
  const [notes, setNotes] = useState(customerToEdit?.notes || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(language === 'hi' ? 'कृपया ग्राहक का नाम दर्ज करें' : 'Please enter customer name');
      return;
    }

    try {
      setIsSubmitting(true);
      await saveCustomer({
        id: customerToEdit?.id,
        name: name.trim(),
        phone: phone.trim(),
        creditLimit: parseFloat(creditLimit) || 500,
        isPinned,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(language === 'hi' ? 'ग्राहक सहेजने में त्रुटि' : 'Error saving customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-stone-900 text-white flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <h2 className="text-sm font-bold text-stone-900">
              {customerToEdit
                ? (language === 'hi' ? 'ग्राहक विवरण बदलें' : 'Edit Customer')
                : getTranslation(language, 'addCustomer')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {getTranslation(language, 'customerName')} <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'hi' ? 'उदा: रमेश चायवाला' : 'e.g. Ramesh Kumar'}
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-700 placeholder-stone-400 font-medium"
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {getTranslation(language, 'phone')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Phone size={14} />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full h-10 pl-8 pr-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono text-sm focus:outline-none focus:border-stone-700 placeholder-stone-400 font-medium"
              />
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
              disabled={isSubmitting}
              className="h-10 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-300 transition-colors cursor-pointer"
            >
              {getTranslation(language, 'cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  customerToEdit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <CustomerModalForm
      key={customerToEdit ? customerToEdit.id : 'new'}
      customerToEdit={customerToEdit}
      onClose={onClose}
    />
  );
};
