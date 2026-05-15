import { useState } from 'react';
import { useLocation } from 'wouter';
import { GraduationCap, Eye, EyeOff, Copy, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../hooks/useToast';

type Tab = 'login' | 'register';

export default function TeacherLogin() {
  const [, setLoc] = useLocation();
  const [tab, setTab] = useState<Tab>('login');
  const [form, setForm] = useState({ login: '', password: '', name: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verifikatsiya holati
  const [verifyState, setVerifyState] = useState<{
    show: boolean;
    code: string;
    teacherId: string;
    login: string;
    copied: boolean;
  }>({ show: false, code: '', teacherId: '', login: '', copied: false });

  const handleSubmit = async () => {
    if (!form.login.trim() || !form.password.trim()) {
      toast("Login va parolni kiriting", 'error');
      return;
    }
    if (tab === 'register' && !form.name.trim()) {
      toast("Ismingizni kiriting", 'error');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const data = await api.teacherLogin(form.login, form.password);
        localStorage.setItem('teacherToken', data.token);
        toast(`Xush kelibsiz, ${data.teacher.name}!`, 'success');
        setLoc('/teacher/dashboard');
      } else {
        const data = await api.teacherRegister(form.login, form.password, form.name);
        setVerifyState({
          show: true,
          code: data.verifyCode,
          teacherId: data.teacherId,
          login: form.login,
          copied: false,
        });
      }
    } catch (e: any) {
      // 403 — Akkaunt tasdiqlanmagan
      if (e.needsVerification === true) {
        setVerifyState({
          show: true,
          code: e.verifyCode || '',
          teacherId: e.teacherId || '',
          login: e.login || form.login,
          copied: false,
        });
        return;
      }
      toast(e.message || 'Xato yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyState.code);
    setVerifyState(s => ({ ...s, copied: true }));
    toast('Kod nusxalandi!', 'success');
    setTimeout(() => setVerifyState(s => ({ ...s, copied: false })), 2000);
  };

  const handleResend = async () => {
    try {
      const data = await api.resendVerifyCode(verifyState.login);
      setVerifyState(s => ({ ...s, code: data.verifyCode, copied: false }));
      toast('Yangi kod yaratildi!', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  // ── VERIFIKATSIYA EKRANI ──
  if (verifyState.show) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Testify</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Akkauntni tasdiqlang</h2>
              <p className="text-indigo-200 text-sm mt-1">Ro'yxatdan o'tdingiz!</p>
            </div>

            <div className="p-6">

              {/* Qadamlar */}
              <div className="space-y-3 mb-6">
                {[
                  { num: '1', text: 'Quyidagi kodni nusxalab oling' },
                  { num: '2', text: '@testifyN3_bot ga o\'ting' },
                  { num: '3', text: 'Kodni botga yuboring' },
                  { num: '4', text: 'Saytga kiring' },
                ].map(step => (
                  <div key={step.num} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold flex items-center justify-center shrink-0">
                      {step.num}
                    </div>
                    <p className="text-sm text-slate-600">{step.text}</p>
                  </div>
                ))}
              </div>

              {/* Kod */}
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-2xl p-5 mb-4">
                <p className="text-xs text-indigo-500 font-medium text-center mb-3 uppercase tracking-wider">
                  Tasdiqlash kodi
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-center">
                    <p className="text-4xl font-extrabold font-mono tracking-[0.3em] text-indigo-700">
                      {verifyState.code}
                    </p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all ${
                      verifyState.copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {verifyState.copied
                      ? <CheckCircle className="w-5 h-5" />
                      : <Copy className="w-5 h-5" />
                    }
                    <span className="text-xs font-medium">
                      {verifyState.copied ? 'Nusxalandi!' : 'Nusxalash'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Teacher ID */}
              {verifyState.teacherId && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Sizning Teacher ID</p>
                    <p className="font-mono font-bold text-slate-800 tracking-widest">{verifyState.teacherId}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(verifyState.teacherId); toast('ID nusxalandi', 'success'); }}
                    className="text-slate-400 hover:text-indigo-600 p-1"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Botga o'tish */}
              <a
                href="https://t.me/testifyN3_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity mb-3"
              >
                <ExternalLink className="w-5 h-5" />
                Botga o'tish
              </a>

              {/* Yangi kod */}
              <button
                onClick={handleResend}
                className="flex items-center justify-center gap-2 w-full text-slate-500 hover:text-indigo-600 text-sm py-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Yangi kod olish
              </button>

              {/* Kirish */}
              <div className="border-t border-slate-100 mt-4 pt-4 text-center">
                <p className="text-sm text-slate-500 mb-2">Tasdiqlangandan so'ng:</p>
                <button
                  onClick={() => { setVerifyState(s => ({ ...s, show: false })); setTab('login'); }}
                  className="text-indigo-600 font-semibold text-sm hover:underline"
                >
                  Kirish sahifasiga o'tish →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LOGIN / REGISTER EKRANI ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Testify</h1>
          <p className="text-slate-500 text-sm mt-1">O'qituvchilar platformasi</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {[['login', 'Kirish'], ['register', "Ro'yxatdan o'tish"]].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setTab(v as Tab)}
                className={`flex-1 py-4 text-sm font-semibold transition-all ${
                  tab === v
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">

            {/* Name (faqat register uchun) */}
            {tab === 'register' && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Ism Familiya
                </label>
                <input
                  className="input"
                  placeholder="Abdullayev Akbar"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
            )}

            {/* Login */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Login</label>
              <input
                className="input"
                placeholder="akbar123"
                value={form.login}
                onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Parol</label>
              <div className="relative">
                <input
                  className="input pr-12"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base font-semibold mt-2"
            >
              {loading
                ? 'Yuklanmoqda...'
                : tab === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"
              }
            </button>

            {tab === 'register' && (
              <p className="text-xs text-slate-400 text-center">
                Ro'yxatdan o'tgandan so'ng Telegram bot orqali tasdiqlash talab qilinadi
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
