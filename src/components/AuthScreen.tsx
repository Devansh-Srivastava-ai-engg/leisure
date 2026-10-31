import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/useAppStore';
import { apiPost } from '../services/api';
import { Lock, Mail, User, ArrowRight, Store, AlertCircle, Loader2 } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { language } = useAppStore();
  const { login } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHindi = language === 'hi';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side quick validation
    if (!email.trim() || !password) {
      setError(isHindi ? 'कृपया ईमेल और पासवर्ड भरें' : 'Please enter both email and password');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError(isHindi ? 'कृपया अपना नाम दर्ज करें' : 'Please enter your name');
        return;
      }
      if (password.length < 6) {
        setError(isHindi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'register'
        ? { name: name.trim(), email: email.trim().toLowerCase(), password }
        : { email: email.trim().toLowerCase(), password };

      const res = await apiPost<{
        token: string;
        user: { id: string; name: string; email: string };
      }>(endpoint, payload);

      await login(res.token, res.user);
    } catch (err: any) {
      const rawMsg = err?.message || '';
      if (rawMsg.includes('Invalid email or password')) {
        setError(isHindi ? 'गलत ईमेल या पासवर्ड' : 'Invalid email or password');
      } else if (rawMsg.includes('Conflict: an account with this email already exists')) {
        setError(isHindi ? 'इस ईमेल से खाता पहले से मौजूद है' : 'An account with this email already exists');
      } else {
        setError(rawMsg || (isHindi ? 'लॉगिन में त्रुटि हुई' : 'An authentication error occurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Brand Card Header */}
      <div className="w-full max-w-md bg-white border border-stone-200 shadow-sm rounded-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-slate-900 text-white p-6 text-center relative">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl mx-auto shadow-md mb-3">
            ₹
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {isHindi ? 'दुकान खाता' : 'DukaanKhata'}
          </h1>
          <p className="text-xs text-stone-300 mt-1 flex items-center justify-center gap-1">
            <Store size={14} className="text-emerald-400" />
            {isHindi ? 'स्मार्ट भारतीय खुदरा खाता प्रणाली' : 'Smart Retail Ledger & POS'}
          </p>
        </div>

        {/* Toggle Bar */}
        <div className="grid grid-cols-2 p-1.5 bg-stone-100 border-b border-stone-200">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {isHindi ? 'लॉगिन (Sign In)' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {isHindi ? 'नया खाता (Register)' : 'Register'}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {isHindi ? 'आपका नाम (Shop Owner Name)' : 'Full Name'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isHindi ? 'उदा. राकेश कुमार' : 'e.g. Rajesh Kumar'}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-stone-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {isHindi ? 'ईमेल पता (Email Address)' : 'Email Address'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dukandar@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {isHindi ? 'पासवर्ड (Password)' : 'Password'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-stone-900"
              />
            </div>
            {mode === 'register' && (
              <p className="text-[11px] text-stone-400 mt-1">
                {isHindi ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isHindi ? 'कृपया प्रतीक्षा करें...' : 'Please wait...'}</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'login'
                    ? isHindi
                      ? 'लॉगिन करें'
                      : 'Sign In'
                    : isHindi
                      ? 'खाता बनाएं'
                      : 'Create Account'}
                </span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security / Privacy Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-500 font-medium">
            🔒 {isHindi ? 'आपका डेटा 100% सुरक्षित और केवल आपके लिए है' : 'Multi-tenant encrypted cloud ledger'}
          </p>
        </div>
      </div>
    </div>
  );
};

