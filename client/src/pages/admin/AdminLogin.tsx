import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../hooks/useToast';

export default function AdminLogin() {
  const [, setLoc] = useLocation();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) return;
    setLoading(true);
    try {
      const data = await api.adminLogin(username.trim());
      localStorage.setItem('adminToken', data.token);
      toast('Admin paneliga xush kelibsiz!', 'success');
      setLoc('/admin/dashboard');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">Testify boshqaruv tizimi</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <label className="text-sm font-medium text-slate-700 block mb-1">Admin username</label>
          <input
            className="input mb-4"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} disabled={loading || !username.trim()} className="btn-primary w-full py-3">
            {loading ? 'Yuklanmoqda...' : 'Kirish'}
          </button>
        </div>
      </div>
    </div>
  );
}
