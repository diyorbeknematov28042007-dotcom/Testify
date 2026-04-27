import { useState } from 'react';
import { useLocation } from 'wouter';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../hooks/useToast';

export default function TeacherLogin() {
  const [, setLoc] = useLocation();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ login: '', password: '', name: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = tab === 'login'
        ? await api.teacherLogin(form.login, form.password)
        : await api.teacherRegister(form.login, form.password, form.name);
      localStorage.setItem('teacherToken', data.token);
      toast(`Xush kelibsiz, ${data.name}!`, 'success');
      setLoc('/teacher/dashboard');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Testify</h1>
          <p className="text-slate-500 text-sm">O'qituvchilar platformasi</p>
        </div>

        <div className="card">
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6 gap-1">
            {[['login', 'Kirish'], ['register', "Ro'yxatdan o'tish"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTab(val as any)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === val ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Ism Familiya</label>
                <input className="input" placeholder="Abdullayev Akbar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Login</label>
              <input className="input" placeholder="login123" value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Parol</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Yuklanmoqda...' : tab === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
