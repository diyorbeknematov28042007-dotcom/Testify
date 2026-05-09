import { Link, useLocation } from 'wouter';
import { GraduationCap, LogOut, BookOpen, LayoutDashboard, Plus, Shield, Headphones } from 'lucide-react';
import { api } from '../../lib/api';

type Role = 'teacher' | 'admin' | 'student';

export function TopNav({ role }: { role: Role }) {
  const [loc, setLoc] = useLocation();

  const handleTeacherLogout = async () => {
    await api.teacherLogout().catch(() => {});
    localStorage.removeItem('teacherToken');
    setLoc('/teacher/login');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setLoc('/admin/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-indigo-600">
            <GraduationCap className="w-7 h-7" />
            <span>Testify</span>
          </Link>

          <div className="flex items-center gap-1">
            {role === 'teacher' && (
              <>
                <Link href="/teacher/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${loc === '/teacher/dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link href="/teacher/create"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${loc === '/teacher/create' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Yangi test</span>
                </Link>
                <a
                  href="https://t.me/testifyN3_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Headphones className="w-4 h-4" />
                  <span className="hidden sm:inline">Support</span>
                </a>
                <button onClick={handleTeacherLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors ml-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Chiqish</span>
                </button>
              </>
            )}
            {role === 'admin' && (
              <>
                <Link href="/admin/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${loc === '/admin/dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin panel</span>
                </Link>
                <button onClick={handleAdminLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors ml-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Chiqish</span>
                </button>
              </>
            )}
            {role === 'student' && (
              <>
                <Link href="/" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Bosh sahifa</span>
                </Link>
                <a
                  href="https://t.me/testifyN3_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Headphones className="w-4 h-4" />
                  <span className="hidden sm:inline">Support</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
