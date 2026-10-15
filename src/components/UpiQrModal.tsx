import React from 'react';
import { X, QrCode, Copy, Check, MessageSquareShare } from 'lucide-react';
import type { Customer } from '../types';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { playSound } from '../utils/audio';

interface UpiQrModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UpiQrModal: React.FC<UpiQrModalProps> = ({ customer, isOpen, onClose }) => {
  const { settings, language } = useAppStore();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !customer) return null;

  const merchantUpi = settings.merchantUpi || '9876543210@paytm';
  const shopName = settings.shopName || 'DukaanKhata';
  const amount = customer.balance;

  // Dynamic UPI payment URL
  const upiUrl = `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(
    shopName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Dukaan bill - ${customer.name}`)}`;

  // QR Code Image URL (using reliable QR server with instant fallback)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    upiUrl
  )}`;

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiUrl);
    setCopied(true);
    playSound('beep');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    playSound('beep');
    const msg =
      language === 'hi'
        ? `नमस्ते ${customer.name} जी! आपका ${shopName} पर कुल बकाया उधार ₹${amount} है। कृपया इस लिंक से UPI द्वारा भुगतान करें:\n${upiUrl}`
        : `Hello ${customer.name}, your outstanding credit at ${shopName} is ₹${amount}. Please pay via UPI using this link:\n${upiUrl}`;

    const phone = customer.phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 animate-fadeIn">
      <div className="w-full max-w-sm bg-white border border-stone-300 rounded-lg shadow-xl overflow-hidden p-5 flex flex-col items-center text-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-sm">
            <QrCode size={18} />
            <span>UPI Instant Pay</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-bold text-stone-900">{customer.name}</h3>
        <div className="text-3xl font-mono font-bold tracking-tight text-rose-700 my-1">₹{amount}</div>
        <p className="text-xs text-stone-600 mb-3">
          {language === 'hi' ? 'दुकानदार का UPI:' : 'Merchant VPA:'}{' '}
          <span className="text-stone-800 font-mono font-bold">{merchantUpi}</span>
        </p>

        {/* QR Code Container */}
        <div className="w-60 h-60 bg-white p-3 rounded-md shadow-xs flex items-center justify-center border border-stone-300">
          <img
            src={qrImageUrl}
            alt="UPI QR Code"
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback placeholder if offline
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <p className="text-xs text-stone-600 mt-3 font-medium">
          {language === 'hi'
            ? 'ग्राहक से कहें: GPay, PhonePe, Paytm से स्कैन करें'
            : 'Scan with any UPI app (GPay, PhonePe, Paytm)'}
        </p>

        {/* Quick action buttons */}
        <div className="w-full grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={handleCopyUpi}
            className="h-10 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-stone-300 transition-colors cursor-pointer"
          >
            {copied ? <Check size={16} className="text-emerald-700" /> : <Copy size={16} />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="h-10 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquareShare size={16} />
            <span>{getTranslation(language, 'whatsappReminder')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
