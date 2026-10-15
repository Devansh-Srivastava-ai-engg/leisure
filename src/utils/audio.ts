import type { Language, TransactionType } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Haptic feedback with vibration API
export function triggerHaptic(type: 'tap' | 'success' | 'warning' = 'tap') {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      if (type === 'tap') {
        navigator.vibrate(25);
      } else if (type === 'success') {
        navigator.vibrate([40, 30, 60]);
      } else if (type === 'warning') {
        navigator.vibrate([80, 50, 80]);
      }
    } catch {
      // Ignore vibration error if blocked by browser policy
    }
  }
}

// Web Audio API Synthesized Chimes (Zero external network dependencies)
export function playSound(type: 'coin' | 'success' | 'beep' | 'warning') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'coin') {
      // Crisp metallic cash drawer ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'success') {
      // Two-tone cheerful major chord
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.35);
      });
    } else if (type === 'beep') {
      // Short tactile click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'warning') {
      // Alert buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

// Native SpeechSynthesis Spoken Feedback
export function speakConfirmation(
  text: string,
  lang: Language = 'hi',
  enabled: boolean = true
) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech to prevent queue buildup

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (lang === 'hi') {
      utterance.lang = 'hi-IN';
      const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
      if (hiVoice) utterance.voice = hiVoice;
    } else {
      utterance.lang = 'en-IN';
      const enVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

// Standard transaction voice helper
export function announceTransaction(
  type: TransactionType,
  amount: number,
  customerName?: string,
  lang: Language = 'hi',
  enabled: boolean = true
) {
  triggerHaptic('success');
  playSound('coin');

  if (!enabled) return;

  let message = '';
  const customer = customerName ? customerName : '';

  if (lang === 'hi') {
    switch (type) {
      case 'UDHAR_GIVEN':
        message = customer
          ? `${customer} के ${amount} रुपये उधार जुड़ गया`
          : `${amount} रुपये उधार दर्ज हुआ`;
        break;
      case 'JAMA_RECEIVED':
        message = customer
          ? `${customer} से ${amount} रुपये जमा मिला`
          : `${amount} रुपये जमा दर्ज हुआ`;
        break;
      case 'CASH_SALE':
        message = `${amount} रुपये नकद बिक्री दर्ज`;
        break;
      case 'UPI_SALE':
        message = `${amount} रुपये यूपीआई बिक्री दर्ज`;
        break;
      case 'EXPENSE':
        message = `${amount} रुपये खर्चा दर्ज`;
        break;
      case 'VENDOR_PAYMENT':
        message = customer
          ? `${customer} को ${amount} रुपये सप्लायर भुगतान दर्ज`
          : `${amount} रुपये सप्लायर भुगतान दर्ज`;
        break;
    }
  } else {
    switch (type) {
      case 'UDHAR_GIVEN':
        message = customer
          ? `${amount} rupees credit added for ${customer}`
          : `${amount} rupees credit recorded`;
        break;
      case 'JAMA_RECEIVED':
        message = customer
          ? `${amount} rupees received from ${customer}`
          : `${amount} rupees payment received`;
        break;
      case 'CASH_SALE':
        message = `${amount} rupees cash sale recorded`;
        break;
      case 'UPI_SALE':
        message = `${amount} rupees UPI sale recorded`;
        break;
      case 'EXPENSE':
        message = `${amount} rupees expense recorded`;
        break;
      case 'VENDOR_PAYMENT':
        message = customer
          ? `${amount} rupees vendor payment recorded for ${customer}`
          : `${amount} rupees vendor payment recorded`;
        break;
    }
  }

  speakConfirmation(message, lang, enabled);
}
