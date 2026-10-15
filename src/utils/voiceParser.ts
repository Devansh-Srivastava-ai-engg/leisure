import type { TransactionType } from '../types';

export interface ParsedVoiceResult {
  customerName: string;
  amount: number;
  type: TransactionType;
  rawText: string;
  note: string;
  confidence: number;
}

// Convert Devanagari numerals (०-९) to Western digits (0-9)
function normalizeDevanagariNumerals(str: string): string {
  const devanagariMap: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  return str.replace(/[०-९]/g, (w) => devanagariMap[w] || w);
}

// Ordered strictly from longer/larger phrases to single words to prevent substring clipping
const HINDI_WORD_NUMBERS: Array<[RegExp, number]> = [
  [/\b(?:paanch\s*hazar|पांच\s*हजार|पाँच\s*हज़ार)\b/i, 5000],
  [/\b(?:do\s*hazar|दो\s*हजार|दो\s*हज़ार)\b/i, 2000],
  [/\b(?:ek\s*hazar|hazar|हजार|हज़ार)\b/i, 1000],
  [/\b(?:paanch\s*sau|panch\s*sau|पांच\s*सौ|पाँच\s*सौ)\b/i, 500],
  [/\b(?:char\s*sau|चार\s*सौ)\b/i, 400],
  [/\b(?:teen\s*sau|तीन\s*सौ)\b/i, 300],
  [/\b(?:dedh\s*sau|डेढ़\s*सौ)\b/i, 150],
  [/\b(?:do\s*sau|दो\s*सौ)\b/i, 200],
  [/\b(?:dhhai\s*sau|ढाई\s*सौ)\b/i, 250],
  [/\b(?:ek\s*sau|sau|सौ)\b/i, 100],
  [/\b(?:nabbey|नब्बे)\b/i, 90],
  [/\b(?:assi|अस्सी)\b/i, 80],
  [/\b(?:sattar|सत्तर)\b/i, 70],
  [/\b(?:saath|साठ)\b/i, 60],
  [/\b(?:pachas|pachaas|पचास)\b/i, 50],
  [/\b(?:chalis|चालीस)\b/i, 40],
  [/\b(?:paintis|पैंतीस)\b/i, 35],
  [/\b(?:tees|तीस)\b/i, 30],
  [/\b(?:pacchis|पच्चीस)\b/i, 25],
  [/\b(?:bees|बीस)\b/i, 20],
  [/\b(?:pandrah|पंद्रह)\b/i, 15],
  [/\b(?:barah|बारह)\b/i, 12],
  [/\b(?:gyarah|ग्यारह)\b/i, 11],
  [/\b(?:das|दस)\b/i, 10],
  [/\b(?:nau|नौ)\b/i, 9],
  [/\b(?:aath|आठ)\b/i, 8],
  [/\b(?:saat|सात)\b/i, 7],
  [/\b(?:chhah|छह|छे)\b/i, 6],
  [/\b(?:paanch|panch|पांच|पाँच)\b/i, 5],
  [/\b(?:chaar|char|चार)\b/i, 4],
  [/\b(?:teen|तीन)\b/i, 3],
  [/\b(?:do|दो)\b/i, 2],
  [/\b(?:ek|एक)\b/i, 1],
];

export function parseVoiceInput(transcript: string, existingCustomers: string[] = []): ParsedVoiceResult {
  const clean = transcript.trim();
  const normalized = normalizeDevanagariNumerals(clean);
  const lower = normalized.toLowerCase();

  // 1. Detect Amount
  let amount = 0;

  // Strip phone numbers so they aren't parsed as currency amounts
  const strippedPhone = lower.replace(/\b[6-9]\d{9}\b/g, '');

  const digitMatch = strippedPhone.match(/(?:(?:rs\.?|inr|rupaye|rupee|₹|रुपये|रुपया)\s*)?(\d+(?:\.\d{1,2})?)/i);
  if (digitMatch && digitMatch[1]) {
    const parsedNum = parseFloat(digitMatch[1]);
    if (parsedNum > 0 && parsedNum <= 500000) {
      amount = parsedNum;
    }
  }

  // Fallback to word numbers if digits not found
  if (amount === 0) {
    for (const [regex, val] of HINDI_WORD_NUMBERS) {
      if (regex.test(strippedPhone)) {
        amount = val;
        break;
      }
    }
  }

  // 2. Detect Transaction Type
  let type: TransactionType = 'UDHAR_GIVEN';

  const isExpense = /\b(?:kharcha|खर्चा|expense|ice|doodh|bijli|petrol)\b/i.test(lower);
  const isJama = /\b(?:jama|जमा|aaye|aaya|mila|vasool|paid|received|wapas)\b/i.test(lower);
  const isCashSale = /\b(?:cash|कैश|nagad|नकद|bikri|बिक्री|counter|sale)\b/i.test(lower);

  if (isExpense) {
    type = 'EXPENSE';
  } else if (isJama) {
    type = 'JAMA_RECEIVED';
  } else if (isCashSale) {
    type = 'CASH_SALE';
  } else {
    type = 'UDHAR_GIVEN';
  }

  // 3. Extract Customer Name
  let customerName = '';
  let note = '';

  // Match against existing database customers first (longest name first)
  const sortedCustomers = [...existingCustomers].sort((a, b) => b.length - a.length);
  for (const name of sortedCustomers) {
    const cleanName = name.trim().toLowerCase();
    if (cleanName.length < 2) continue;

    const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');

    if (regex.test(lower)) {
      customerName = name;
      break;
    }
  }

  // Extract from tokens if no customer matches
  if (!customerName && type !== 'CASH_SALE' && type !== 'EXPENSE') {
    const stripped = clean
      .replace(/[०-९]/g, '')
      .replace(/\b\d+(\.\d+)?\b/g, '')
      .replace(/\b(?:rs\.?|inr|rupaye|rupee|₹|रुपये|रुपया)\b/gi, '')
      .replace(/\b(?:udhar|jama|cash|nagad|mila|likho|likhna|baaki|diya|wapas|उधार|जमा|नकद|कैश|लिखो)\b/gi, '')
      .replace(/\b(?:ji|sahab|bhaiya|bhai|uncle|जी|साहब|भैया|भाई)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (stripped.length >= 2 && !/^(का|को|ki|ko|se|ka)$/i.test(stripped)) {
      customerName = stripped;
    }
  }

  if (type === 'CASH_SALE' || type === 'EXPENSE') {
    note = clean;
  } else if (!customerName) {
    customerName = 'अज्ञात ग्राहक (Walk-in)';
  }

  const confidence = amount > 0 && customerName !== 'अज्ञात ग्राहक (Walk-in)' ? 0.95 : amount > 0 ? 0.8 : 0.5;

  return {
    customerName,
    amount,
    type,
    rawText: clean,
    note: note || clean,
    confidence,
  };
}