import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Minus,
  ShoppingCart,
  QrCode,
  Banknote,
  UserCheck,
  AlertTriangle,
  Search,
  Mic,
  TrendingUp,
} from 'lucide-react';
import { db } from '../db/db';
import type { Customer } from '../types';
import { useAppStore } from '../store/useAppStore';
import { getTranslation } from '../utils/i18n';
import { recordCounterSale } from '../db/operations';
import { ItemModal } from './ItemModal';
import { SelectCustomerModal } from './SelectCustomerModal';
import { playSound, triggerHaptic } from '../utils/audio';

export const CounterView: React.FC = () => {
  const {
    language,
    cart,
    addToCart,
    decrementCartItem,
    clearCart,
    soundEnabled,
    openVoiceModal,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSelectCustomerOpen, setIsSelectCustomerOpen] = useState(false);
  const [selectedUnitType, setSelectedUnitType] = useState<'loose' | 'sub' | 'parent'>('loose');

  // Live inventory from Dexie
  const items = useLiveQuery(() => db.inventory.toArray()) || [];

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart totals
  const totalBill = cart.reduce((sum, c) => {
    let unitPrice = c.item.looseSellingPrice;
    if (c.unitType === 'sub') {
      unitPrice = c.item.subSellingPrice || c.item.looseSellingPrice * c.item.unitsPerSub;
    } else if (c.unitType === 'parent') {
      unitPrice = c.item.subSellingPrice
        ? c.item.subSellingPrice * c.item.unitsPerParent
        : c.item.looseSellingPrice * (c.item.unitsPerParent * c.item.unitsPerSub);
    }
    return sum + unitPrice * c.quantity;
  }, 0);

  const totalItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Quick Sell Cash
  const handleSellCash = async () => {
    if (cart.length === 0) return;
    playSound('coin');
    triggerHaptic('success');
    await recordCounterSale({
      items: cart,
      paymentMethod: 'CASH',
      lang: language,
      soundEnabled,
    });
    clearCart();
  };

  // Quick Sell UPI
  const handleSellUpi = async () => {
    if (cart.length === 0) return;
    playSound('coin');
    triggerHaptic('success');
    await recordCounterSale({
      items: cart,
      paymentMethod: 'UPI',
      lang: language,
      soundEnabled,
    });
    clearCart();
  };

  // Add to Customer Udhar
  const handleCustomerSelectedForUdhar = async (customer: Customer) => {
    setIsSelectCustomerOpen(false);
    if (cart.length === 0) return;
    await recordCounterSale({
      items: cart,
      paymentMethod: 'CREDIT',
      customerId: customer.id,
      lang: language,
      soundEnabled,
    });
    clearCart();
  };

  return (
    <div className="pb-36 pt-2 px-3 max-w-4xl mx-auto space-y-3">
      {/* Header controls: Search & Add Item */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getTranslation(language, 'searchItems')}
            className="w-full h-10 pl-9 pr-4 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-sm placeholder-stone-400 focus:outline-none focus:border-stone-700"
          />
        </div>

        <button
          onClick={() => {
            playSound('beep');
            setIsItemModalOpen(true);
          }}
          className="h-10 px-3.5 rounded-md bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs sm:text-sm tracking-wide flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          <span>{getTranslation(language, 'addItem')}</span>
        </button>
      </div>

      {/* Loose Unit Mode Selector (Loose / Sub Pack / Box) */}
      <div className="p-1 rounded-md bg-white border border-stone-200 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-600 pl-2">
          {language === 'hi' ? 'बिक्री यूनिट मोड:' : 'Selling Unit:'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedUnitType('loose')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              selectedUnitType === 'loose'
                ? 'bg-slate-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {language === 'hi' ? 'खुला (Stick/Cup)' : 'Loose Unit'}
          </button>
          <button
            onClick={() => setSelectedUnitType('sub')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              selectedUnitType === 'sub'
                ? 'bg-slate-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {language === 'hi' ? 'पैकेट (Pack)' : 'Sub Pack'}
          </button>
          <button
            onClick={() => setSelectedUnitType('parent')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              selectedUnitType === 'parent'
                ? 'bg-slate-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {language === 'hi' ? 'डिब्बा (Box)' : 'Box / Carton'}
          </button>
        </div>
      </div>

      {/* Preset Item Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filteredItems.map((item) => {
          const isLowStock = item.stockInLooseUnits <= item.lowStockThresholdLoose;

          // Find current cart quantity for this item
          const cartEntry = cart.find(
            (c) => c.item.id === item.id && c.unitType === selectedUnitType
          );
          const currentCount = cartEntry ? cartEntry.quantity : 0;

          // Unit selling price depending on current unit mode
          let displayPrice = item.looseSellingPrice;
          let displayUnitName = item.looseUnitName;
          if (selectedUnitType === 'sub') {
            displayPrice = item.subSellingPrice || item.looseSellingPrice * item.unitsPerSub;
            displayUnitName = item.subUnitName;
          } else if (selectedUnitType === 'parent') {
            displayPrice = item.subSellingPrice
              ? item.subSellingPrice * item.unitsPerParent
              : item.looseSellingPrice * (item.unitsPerParent * item.unitsPerSub);
            displayUnitName = item.parentUnitName;
          }

          // Granular loose unit conversion & stock breakdown
          const totalLooseInParent = item.unitsPerParent * item.unitsPerSub;
          const boxesRemaining = Math.floor(item.stockInLooseUnits / totalLooseInParent);
          const looseAfterBoxes = item.stockInLooseUnits % totalLooseInParent;
          const packsRemaining = Math.floor(looseAfterBoxes / item.unitsPerSub);
          const sticksRemaining = looseAfterBoxes % item.unitsPerSub;

          // Profit Margin
          const costPerLoose =
            totalLooseInParent > 0 ? item.parentCostPrice / totalLooseInParent : 0;
          const profitMargin =
            item.looseSellingPrice > 0
              ? (((item.looseSellingPrice - costPerLoose) / item.looseSellingPrice) * 100).toFixed(0)
              : '0';

          return (
            <div
              key={item.id}
              className={`p-3 rounded-md bg-white border flex flex-col justify-between transition-colors ${
                isLowStock
                  ? 'border-amber-300 bg-amber-50/20'
                  : currentCount > 0
                  ? 'border-emerald-600 ring-1 ring-emerald-600'
                  : 'border-stone-200 hover:border-stone-400'
              }`}
            >
              {/* Top row: Low-stock badge & Profit margin */}
              <div className="flex items-center justify-between gap-1 mb-1">
                {isLowStock ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                    <AlertTriangle size={10} />
                    {getTranslation(language, 'lowStock')}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                    <TrendingUp size={10} className="text-emerald-700" />
                    <span>{profitMargin}% मार्जिन</span>
                  </span>
                )}

                <span className="text-[11px] font-mono text-stone-600">
                  {item.stockInLooseUnits} {item.looseUnitName}
                </span>
              </div>

              {/* Item Name & Price */}
              <div className="my-1.5">
                <h3 className="text-sm font-bold text-stone-900 leading-tight">
                  {language === 'hi' ? item.nameHi || item.name : item.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-mono font-bold text-stone-900 tracking-tight">₹{displayPrice}</span>
                  <span className="text-[11px] text-stone-500 font-medium truncate">
                    / {displayUnitName}
                  </span>
                </div>
              </div>

              {/* Granular loose breakdown pill */}
              <div className="text-[10px] font-medium font-mono text-stone-600 bg-stone-50 p-1.5 rounded border border-stone-200 mb-2 truncate">
                {boxesRemaining > 0 && `${boxesRemaining} ${item.parentUnitName} `}
                {packsRemaining > 0 && `${packsRemaining} ${item.subUnitName} `}
                <span>{sticksRemaining} {item.looseUnitName}</span>
              </div>

              {/* Tap Grid Stepper (+ / - Buttons) */}
              <div className="flex items-center gap-1.5">
                {currentCount > 0 && (
                  <button
                    onClick={() => {
                      triggerHaptic('tap');
                      playSound('beep');
                      decrementCartItem(item.id, selectedUnitType);
                    }}
                    className="h-9 w-9 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center shrink-0 border border-stone-300 transition-colors cursor-pointer"
                    title="Remove 1"
                  >
                    <Minus size={16} className="stroke-[2.5]" />
                  </button>
                )}

                <button
                  onClick={() => {
                    triggerHaptic('tap');
                    playSound('beep');
                    addToCart(item, selectedUnitType);
                  }}
                  className={`h-9 flex-1 rounded-md font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    currentCount > 0
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300'
                  }`}
                >
                  <Plus size={15} className="stroke-[2.5]" />
                  <span>{currentCount > 0 ? `${currentCount} जोड़ा` : '+ जोड़ें'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart & Sales Drawer */}
      {cart.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-stone-200 p-3 shadow-md">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Bill summary info */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-md bg-stone-100 text-stone-800 border border-stone-300 flex items-center justify-center font-bold">
                  <ShoppingCart size={17} />
                </div>
                <div>
                  <div className="text-xs text-stone-600 font-medium">
                    {totalItemCount} {getTranslation(language, 'itemsCount')}
                  </div>
                  <div className="text-xl font-mono font-bold text-stone-900 tracking-tight">
                    ₹{totalBill}
                  </div>
                </div>
              </div>

              <button
                onClick={clearCart}
                className="text-xs font-medium text-rose-700 hover:text-rose-800 underline cursor-pointer"
              >
                {getTranslation(language, 'clearCart')}
              </button>
            </div>

            {/* Quick 1-Tap Action Buttons */}
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto shrink-0">
              {/* Cash Sale (Green) */}
              <button
                onClick={handleSellCash}
                className="h-11 px-3.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <Banknote size={15} />
                  <span>{language === 'hi' ? 'नकद (Cash)' : 'Cash Sale'}</span>
                </div>
                <span className="text-[10px] text-emerald-100 font-mono font-medium">₹{totalBill} प्राप्त</span>
              </button>

              {/* UPI Sale (Slate) */}
              <button
                onClick={handleSellUpi}
                className="h-11 px-3.5 rounded-md bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <QrCode size={15} />
                  <span>UPI बिक्री</span>
                </div>
                <span className="text-[10px] text-stone-200 font-medium">ऑनलाइन</span>
              </button>

              {/* Add to Udhar (Red) */}
              <button
                onClick={() => setIsSelectCustomerOpen(true)}
                className="h-11 px-3.5 rounded-md bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs sm:text-sm flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <UserCheck size={15} />
                  <span>उधार जोड़ें</span>
                </div>
                <span className="text-[10px] text-rose-100 font-medium">ग्राहक चुनें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Microphone Button */}
      <div className="fixed bottom-18 right-4 z-30">
        <button
          onClick={() => {
            playSound('beep');
            openVoiceModal();
          }}
          className="w-12 h-12 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-md flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          title="Voice Entry"
        >
          <Mic size={22} />
        </button>
      </div>

      {/* Modals */}
      <ItemModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} />
      <SelectCustomerModal
        isOpen={isSelectCustomerOpen}
        onClose={() => setIsSelectCustomerOpen(false)}
        onSelectCustomer={handleCustomerSelectedForUdhar}
        totalAmount={totalBill}
      />
    </div>
  );
};
