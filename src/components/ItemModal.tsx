import React, { useState } from 'react';
import { X, PackagePlus, Sparkles } from 'lucide-react';
import type { InventoryItem } from '../types';
import { db } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import { playSound } from '../utils/audio';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ isOpen, onClose }) => {
  const { language } = useAppStore();

  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [category, setCategory] = useState<InventoryItem['category']>('chai');
  const [parentUnitName, setParentUnitName] = useState('डिब्बा (Box)');
  const [subUnitName, setSubUnitName] = useState('पैकेट (Pack)');
  const [looseUnitName, setLooseUnitName] = useState('पीस (Stick)');
  const [unitsPerParent, setUnitsPerParent] = useState('10');
  const [unitsPerSub, setUnitsPerSub] = useState('10');
  const [initialStockLoose, setInitialStockLoose] = useState('100');
  const [looseSellingPrice, setLooseSellingPrice] = useState('10');
  const [parentCostPrice, setParentCostPrice] = useState('600');
  const [lowStockThreshold, setLowStockThreshold] = useState('20');

  if (!isOpen) return null;

  // Real-time profit margin calculation
  const totalLooseInParent = (parseFloat(unitsPerParent) || 1) * (parseFloat(unitsPerSub) || 1);
  const costPerLoose = totalLooseInParent > 0 ? (parseFloat(parentCostPrice) || 0) / totalLooseInParent : 0;
  const sellPrice = parseFloat(looseSellingPrice) || 0;
  const profitPerLoose = Math.max(0, sellPrice - costPerLoose);
  const marginPercent = sellPrice > 0 ? (profitPerLoose / sellPrice) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: name.trim(),
      nameHi: nameHi.trim() || name.trim(),
      category,
      parentUnitName,
      subUnitName,
      looseUnitName,
      unitsPerParent: parseFloat(unitsPerParent) || 1,
      unitsPerSub: parseFloat(unitsPerSub) || 1,
      stockInLooseUnits: parseFloat(initialStockLoose) || 0,
      looseSellingPrice: parseFloat(looseSellingPrice) || 10,
      parentCostPrice: parseFloat(parentCostPrice) || 0,
      lowStockThresholdLoose: parseFloat(lowStockThreshold) || 20,
      quickPreset: true,
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
      icon: 'Package',
    };

    await db.inventory.add(newItem);
    playSound('beep');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50 animate-fadeIn">
      <div className="w-full max-w-lg bg-white border-t sm:border border-stone-300 sm:rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-200 text-stone-800 flex items-center justify-center shadow-xs">
              <PackagePlus size={18} />
            </div>
            <h2 className="text-base font-bold text-stone-900">
              {language === 'hi' ? 'नया सामान व यूनिट सेटअप' : 'Add New Inventory Item'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 bg-white">
          {/* Name in Hindi and English */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {language === 'hi' ? 'सामान का नाम (हिन्दी)' : 'Name (Hindi)'} *
              </label>
              <input
                type="text"
                required
                value={nameHi}
                onChange={(e) => setNameHi(e.target.value)}
                placeholder="उदा: गोल्ड फ्लेक"
                className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-xs focus:outline-none focus:border-stone-700 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Name (English) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gold Flake Kings"
                className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-xs focus:outline-none focus:border-stone-700 shadow-xs"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">कैटेगरी (Category)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-medium text-xs focus:outline-none focus:border-stone-700 shadow-xs"
            >
              <option value="chai">चाय / नाश्ता (Chai & Snacks)</option>
              <option value="cigarette">सिगरेट / बीड़ी (Cigarette)</option>
              <option value="pan_masala">पान मसाला / गुटखा (Pan Masala)</option>
              <option value="beverage">कोल्ड ड्रिंक / पानी (Beverage)</option>
              <option value="snacks">बिस्कुट / चिप्स (Snacks)</option>
              <option value="other">अन्य (Other)</option>
            </select>
          </div>

          {/* Parent to Child Loose Unit Breakdown Card */}
          <div className="p-3 rounded-md bg-stone-50 border border-stone-200">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-stone-700" />
              <span>{language === 'hi' ? 'खुला सामान कन्वर्शन नियम' : 'Loose Unit Breakdown'}</span>
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  1. थोक पैक (Parent)
                </label>
                <input
                  type="text"
                  value={parentUnitName}
                  onChange={(e) => setParentUnitName(e.target.value)}
                  placeholder="डिब्बा (Box)"
                  className="w-full h-9 px-2 rounded-md bg-white border border-stone-300 text-xs font-bold text-stone-900 shadow-xs focus:outline-none focus:border-stone-700"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  2. सब-यूनिट (Sub)
                </label>
                <input
                  type="text"
                  value={subUnitName}
                  onChange={(e) => setSubUnitName(e.target.value)}
                  placeholder="पैकेट (Pack)"
                  className="w-full h-9 px-2 rounded-md bg-white border border-stone-300 text-xs font-bold text-stone-900 shadow-xs focus:outline-none focus:border-stone-700"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  3. खुली यूनिट (Loose)
                </label>
                <input
                  type="text"
                  value={looseUnitName}
                  onChange={(e) => setLooseUnitName(e.target.value)}
                  placeholder="पीस / स्टिक"
                  className="w-full h-9 px-2 rounded-md bg-white border border-stone-300 text-xs font-bold text-stone-900 shadow-xs focus:outline-none focus:border-stone-700"
                />
              </div>
            </div>

            {/* Quantities in Parent and Sub */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  1 {parentUnitName} = कितने {subUnitName}?
                </label>
                <input
                  type="number"
                  value={unitsPerParent}
                  onChange={(e) => setUnitsPerParent(e.target.value)}
                  className="w-full h-9 px-2 rounded-md bg-white border border-stone-300 text-xs font-bold text-stone-900 font-mono shadow-xs focus:outline-none focus:border-stone-700"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  1 {subUnitName} = कितने {looseUnitName}?
                </label>
                <input
                  type="number"
                  value={unitsPerSub}
                  onChange={(e) => setUnitsPerSub(e.target.value)}
                  className="w-full h-9 px-2 rounded-md bg-white border border-stone-300 text-xs font-bold text-stone-900 font-mono shadow-xs focus:outline-none focus:border-stone-700"
                />
              </div>
            </div>

            <div className="mt-2 text-xs font-semibold text-stone-800 bg-white p-2 rounded-md border border-stone-200 font-mono shadow-xs">
              💡 1 {parentUnitName} = {totalLooseInParent} {looseUnitName}
            </div>
          </div>

          {/* Pricing & Margins */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {parentUnitName} खरीद भाव (₹)
              </label>
              <input
                type="number"
                value={parentCostPrice}
                onChange={(e) => setParentCostPrice(e.target.value)}
                placeholder="600"
                className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-bold text-sm shadow-xs focus:outline-none focus:border-stone-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                1 {looseUnitName} बिक्री दर (₹)
              </label>
              <input
                type="number"
                value={looseSellingPrice}
                onChange={(e) => setLooseSellingPrice(e.target.value)}
                placeholder="10"
                className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-emerald-800 font-mono font-bold text-sm shadow-xs focus:outline-none focus:border-stone-700"
              />
            </div>
          </div>

          {/* Profit preview badge */}
          <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-mono font-semibold">
            <span className="text-emerald-800">
              लागत: ₹{costPerLoose.toFixed(2)} / {looseUnitName}
            </span>
            <span className="text-emerald-950 font-bold">
              मुनाफा: {marginPercent.toFixed(1)}% (₹{profitPerLoose.toFixed(2)}/पीस)
            </span>
          </div>

          {/* Initial stock and alert threshold */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                मौजूदा खुला स्टॉक ({looseUnitName})
              </label>
              <input
                type="number"
                value={initialStockLoose}
                onChange={(e) => setInitialStockLoose(e.target.value)}
                placeholder="100"
                className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-bold text-sm shadow-xs focus:outline-none focus:border-stone-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                कम स्टॉक चेतावनी सीमा
              </label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="20"
                className="w-full h-10 px-3 rounded-md bg-white border border-stone-300 text-stone-900 font-mono font-bold text-sm shadow-xs focus:outline-none focus:border-stone-700"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-11 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'सामान सेव करें' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
