import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, X, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { parseVoiceInput } from '../utils/voiceParser';
import type { ParsedVoiceResult } from '../utils/voiceParser';
import { db } from '../db/db';
import { recordCustomerTransaction, recordCounterSale, saveCustomer } from '../db/operations';
import { getTranslation } from '../utils/i18n';
import { playSound, triggerHaptic } from '../utils/audio';

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const VoiceInputModal: React.FC = () => {
  const { isVoiceModalOpen, closeVoiceModal, language, soundEnabled } = useAppStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedVoiceResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  const samplePhrases = [
    'शर्मा जी 30 रुपये उधार',
    'रमेश 50 जमा',
    'कोल्ड ड्रिंक 40 नकद',
    'गुप्ता जी 120 उधार',
    '2 कटिंग चाय 20 नकद',
  ];

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch { }
      }
    };
  }, [language]);

  useEffect(() => {
    if (isVoiceModalOpen) {
      setTranscript('');
      setParsed(null);
      setCountdown(null);
      startListening();
    } else {
      stopListening();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }
  }, [isVoiceModalOpen]);

  useEffect(() => {
    if (!transcript.trim()) return;

    db.customers.toArray().then((customers) => {
      const names = customers.map((c) => c.name);
      const res = parseVoiceInput(transcript, names);
      setParsed(res);

      if (res.amount > 0) {
        startAutoConfirmTimer(res);
      }
    });
  }, [transcript]);

  const startListening = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        recognitionRef.current.start();
        playSound('beep');
        triggerHaptic('tap');
      } catch {
        setIsListening(true);
      }
    } else {
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }
    setIsListening(false);
  };

  const startAutoConfirmTimer = (result: ParsedVoiceResult) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(3);

    let timeLeft = 3;
    countdownTimerRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownTimerRef.current);
        commitVoiceTransaction(result);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(null);
    playSound('beep');
  };

  const commitVoiceTransaction = async (resultToCommit = parsed) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (!resultToCommit || resultToCommit.amount <= 0) return;

    try {
      if (resultToCommit.type === 'CASH_SALE') {
        // Record counter cash sale with the parsed amount
        await recordCounterSale({
          items: [
            {
              id: 'voice-quick-sale',
              name: resultToCommit.note || 'Quick Voice Sale',
              quantity: 1,
              price: resultToCommit.amount,
              unit: 'Piece',
            } as any,
          ],
          paymentMethod: 'CASH',
          lang: language,
          soundEnabled,
        });
      } else {
        // Find existing customer by normalized case-insensitive match
        const searchName = resultToCommit.customerName.trim().toLowerCase();
        const existing = await db.customers
          .filter((c) => c.name.trim().toLowerCase() === searchName)
          .first();

        let customerId = existing?.id;
        if (!customerId) {
          const result = await saveCustomer({
            name: resultToCommit.customerName.trim(),
            balance: 0,
            creditLimit: 500,
            isPinned: false,
          });
          if (!result.success || !result.data) {
            console.warn('Failed to create customer:', result.error);
            return;
          }
          customerId = result.data.id;
        }

        await recordCustomerTransaction({
          customerId,
          type: resultToCommit.type === 'JAMA_RECEIVED' ? 'JAMA_RECEIVED' : 'UDHAR_GIVEN',
          amount: resultToCommit.amount,
          note: `Voice Entry: ${resultToCommit.rawText}`,
          lang: language,
          soundEnabled,
        });
      }

      closeVoiceModal();
    } catch (err) {
      console.warn('Voice transaction commit failed:', err);
    }
  };

  const handleTestPhrase = (phrase: string) => {
    stopListening();
    setTranscript(phrase);
    playSound('beep');
  };

  if (!isVoiceModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50 animate-fadeIn">
      <div className="w-full max-w-lg bg-white border-t sm:border border-stone-300 sm:rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-200 text-stone-800 flex items-center justify-center shadow-xs">
              <Mic size={18} className={isListening ? 'animate-pulse text-rose-700' : ''} />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {language === 'hi' ? 'बोलकर एंट्री करें (Voice-to-Ledger)' : 'Voice-to-Ledger Entry'}
              </h2>
              <p className="text-xs text-stone-600">
                {isListening ? getTranslation(language, 'voiceListening') : getTranslation(language, 'voiceHint')}
              </p>
            </div>
          </div>
          <button
            onClick={closeVoiceModal}
            className="w-8 h-8 rounded-md bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Listening / Microphone Section */}
        <div className="p-5 flex flex-col items-center justify-center text-center bg-stone-50 border-b border-stone-200">
          <div className="my-2">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-md transition-all cursor-pointer relative z-10 ${
                isListening
                  ? 'bg-rose-700 ring-4 ring-rose-200 animate-pulse'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700 ring-2 ring-stone-300'
              }`}
            >
              {isListening ? <Mic size={36} className="text-white" /> : <MicOff size={32} className="text-stone-700" />}
            </button>
          </div>

          <p className="text-xs font-semibold text-stone-700 mt-2">
            {!speechSupported
              ? language === 'hi'
                ? '⚠️ ब्राउज़र माइक समर्थित नहीं (नीचे दिए 1-टैप टेस्ट बोलियां इस्तेमाल करें)'
                : '⚠️ Browser mic unsupported (Use 1-tap test chips below)'
              : isListening
                ? language === 'hi'
                  ? 'माइक चालू है... बोलिए'
                  : 'Listening... Speak phrase now'
                : language === 'hi'
                  ? 'बोलने के लिए माइक दबाएं'
                  : 'Tap mic to speak'}
          </p>

          {/* Transcript Display Box */}
          <div className="w-full mt-3 min-h-[50px] p-3 rounded-md bg-white border border-stone-300 text-stone-900 shadow-xs flex items-center justify-center font-medium text-sm">
            {transcript ? (
              <span className="text-emerald-800 font-mono font-bold">"{transcript}"</span>
            ) : (
              <span className="text-stone-400 italic text-xs">
                {language === 'hi'
                  ? 'उदा: "शर्मा जी 30 रुपये उधार" या "रमेश 50 जमा"'
                  : 'E.g.: "Sharma ji 30 udhar" or "Ramesh 50 jama"'}
              </span>
            )}
          </div>
        </div>

        {/* 1-Tap Preset Voice Simulator Chips */}
        <div className="px-4 py-2.5 bg-stone-100 border-b border-stone-200">
          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold mb-1.5">
            <Sparkles size={13} className="text-stone-700" />
            <span>{language === 'hi' ? '1-टैप टेस्ट बोलियां (Simulator)' : 'Quick Test Phrases'}:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {samplePhrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => handleTestPhrase(phrase)}
                className="shrink-0 text-xs px-2.5 py-1.5 rounded-md bg-white hover:bg-stone-200 active:scale-95 border border-stone-300 text-stone-800 font-medium shadow-xs transition-colors cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>

        {/* Parsed Extraction Result & 3-Second Auto-Confirm Bar */}
        {parsed && parsed.amount > 0 && (
          <div className="p-4 bg-white border-t border-stone-200 flex-1 flex flex-col justify-between">
            <div className="bg-stone-50 rounded-md p-3.5 border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold tracking-wider text-stone-600">
                  {getTranslation(language, 'voiceDetected')}
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-stone-200 text-stone-800 border border-stone-300">
                  {(parsed.confidence * 100).toFixed(0)}% {getTranslation(language, 'voiceConfidence')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Customer */}
                <div className="p-2.5 rounded-md bg-white border border-stone-200 shadow-xs">
                  <div className="text-[11px] text-stone-600 font-medium">
                    {getTranslation(language, 'customerName')}
                  </div>
                  <div className="text-sm font-bold text-stone-900 truncate mt-0.5">
                    {parsed.customerName || 'Walk-in'}
                  </div>
                </div>

                {/* Amount */}
                <div className="p-2.5 rounded-md bg-white border border-stone-200 shadow-xs">
                  <div className="text-[11px] text-stone-600 font-medium">
                    {getTranslation(language, 'enterAmount')}
                  </div>
                  <div className="text-lg font-mono font-bold text-stone-900 mt-0.5">
                    ₹{parsed.amount}
                  </div>
                </div>

                {/* Type */}
                <div className="p-2.5 rounded-md bg-white border border-stone-200 shadow-xs">
                  <div className="text-[11px] text-stone-600 font-medium">Action</div>
                  <div
                    className={`text-xs font-bold px-2 py-1 rounded-md mt-0.5 ${
                      parsed.type === 'UDHAR_GIVEN'
                        ? 'bg-rose-50 text-rose-800 border border-rose-300'
                        : parsed.type === 'JAMA_RECEIVED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-stone-100 text-stone-800 border border-stone-300'
                    }`}
                  >
                    {parsed.type === 'UDHAR_GIVEN'
                      ? 'उधार (Udhar)'
                      : parsed.type === 'JAMA_RECEIVED'
                        ? 'जमा (Jama)'
                        : 'नकद (Cash)'}
                  </div>
                </div>
              </div>

              {/* Countdown Progress Bar */}
              {countdown !== null && (
                <div className="mt-3.5 pt-3 border-t border-stone-200">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold font-mono">
                    <span className="text-emerald-800">
                      ⏳ {getTranslation(language, 'voiceAutoConfirm')} ({countdown}s)
                    </span>
                    <button
                      onClick={cancelCountdown}
                      className="text-stone-600 hover:text-stone-900 underline cursor-pointer text-xs"
                    >
                      {getTranslation(language, 'cancel')}
                    </button>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-700 transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${(countdown / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={cancelCountdown}
                className="h-10 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X size={16} />
                <span>{getTranslation(language, 'editVoice')}</span>
              </button>

              <button
                onClick={() => commitVoiceTransaction(parsed)}
                className="h-10 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={16} />
                <span>{getTranslation(language, 'confirmNow')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};