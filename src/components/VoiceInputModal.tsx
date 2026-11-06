import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const isBrowserSpeechSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindow;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
};

const SAMPLE_PHRASES = [
  'शर्मा जी 30 रुपये उधार',
  'रमेश 50 जमा',
  'कोल्ड ड्रिंक 40 नकद',
  'गुप्ता जी 120 उधार',
  '2 कटिंग चाय 20 नकद',
];

const VoiceInputModalContent: React.FC = () => {
  const { closeVoiceModal, language, soundEnabled } = useAppStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedVoiceResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speechSupported] = useState(isBrowserSpeechSupported);

  const recognitionRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const commitVoiceTransactionRef = useRef<(result?: ParsedVoiceResult | null) => Promise<void>>(
    () => Promise.resolve()
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setCountdown(null);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        recognitionRef.current.start();
        playSound('beep');
        triggerHaptic('tap');
      } catch {
        // Recognition error or already active
      }
    }
  }, [language]);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(null);
    playSound('beep');
  }, []);

  const commitVoiceTransaction = useCallback(
    async (resultToCommit = parsed) => {
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
    },
    [parsed, language, soundEnabled, closeVoiceModal]
  );

  useEffect(() => {
    commitVoiceTransactionRef.current = commitVoiceTransaction;
  }, [commitVoiceTransaction]);

  const startAutoConfirmTimer = useCallback((result: ParsedVoiceResult) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(3);

    let timeLeft = 3;
    countdownTimerRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownTimerRef.current);
        commitVoiceTransactionRef.current(result);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
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
    startListening();
    return () => {
      stopListening();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [startListening, stopListening]);

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
  }, [transcript, startAutoConfirmTimer]);

  const handleTestPhrase = (phrase: string) => {
    stopListening();
    setTranscript(phrase);
    playSound('beep');
  };

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
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <span>{getTranslation(language, 'voiceInputPrompt')}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  AI
                </span>
              </h2>
              <p className="text-[11px] text-stone-500 font-medium">
                {language === 'hi'
                  ? 'बोलकर खाता, उधार या बिक्री दर्ज करें'
                  : 'Speak customer, amount and udhar/jama'}
              </p>
            </div>
          </div>
          <button
            onClick={closeVoiceModal}
            className="w-8 h-8 rounded-md bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Unsupported Warning */}
        {!speechSupported && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
            <span>
              ⚠️{' '}
              {language === 'hi'
                ? 'आपके ब्राउज़र में आवाज़ पहचान समर्थित नहीं है। नीचे दिए गए उदाहरणों पर टैप करें।'
                : 'Speech recognition is not supported in this browser. Tap sample phrases below.'}
            </span>
          </div>
        )}

        {/* Mic Visualizer / Waveform Box */}
        <div className="p-6 bg-stone-50 flex flex-col items-center justify-center border-b border-stone-200">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
              isListening
                ? 'bg-rose-700 text-white ring-8 ring-rose-100 scale-105'
                : 'bg-white border-2 border-stone-300 text-stone-700 hover:border-stone-400'
            }`}
          >
            {isListening ? (
              <Mic size={36} className="animate-pulse" />
            ) : (
              <MicOff size={32} className="text-stone-400" />
            )}
          </button>

          <div className="mt-3 text-center">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isListening ? 'text-rose-700' : 'text-stone-500'
              }`}
            >
              {isListening
                ? language === 'hi'
                  ? 'सुन रहा हूँ... बोलिए'
                  : 'Listening... speak now'
                : language === 'hi'
                  ? 'माइक दबाकर बोलें'
                  : 'Tap mic to speak'}
            </span>
          </div>

          {/* Realtime Transcript */}
          <div className="mt-4 w-full min-h-[48px] p-3 rounded-md bg-white border border-stone-200 shadow-xs flex items-center justify-center text-center">
            {transcript ? (
              <p className="text-sm font-semibold text-stone-900 leading-snug">
                "{transcript}"
              </p>
            ) : (
              <p className="text-xs text-stone-400 italic">
                {language === 'hi'
                  ? 'उदा: "रमेश 50 जमा" या "शर्मा जी 40 उधार"'
                  : 'e.g. "Ramesh 50 jama" or "Sharma ji 40 udhar"'}
              </p>
            )}
          </div>
        </div>

        {/* Quick Sample Chips */}
        <div className="p-3 bg-white border-b border-stone-200">
          <div className="text-[11px] font-bold text-stone-600 mb-2 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={13} className="text-amber-600" />
            <span>
              {language === 'hi' ? 'बोलने के उदाहरण (टेस्ट करने के लिए दबाएं):' : 'Try saying:'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleTestPhrase(phrase)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-colors cursor-pointer"
              >
                "{phrase}"
              </button>
            ))}
          </div>
        </div>

        {/* Parsed Result Card (If Available) */}
        {parsed && parsed.amount > 0 && (
          <div className="p-4 bg-emerald-50/60 border-t border-emerald-200 animate-slideUp">
            <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-700 stroke-[3]" />
                  <span>
                    {language === 'hi' ? 'समझ आ गया (Parsed Result)' : 'Understood Entry'}
                  </span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono">
                  {(parsed.confidence * 100).toFixed(0)}% Match
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

export const VoiceInputModal: React.FC = () => {
  const { isVoiceModalOpen } = useAppStore();
  if (!isVoiceModalOpen) return null;
  return <VoiceInputModalContent />;
};
