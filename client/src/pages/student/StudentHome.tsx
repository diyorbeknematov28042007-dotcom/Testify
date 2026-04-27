import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, BookOpen, Users, ChevronRight, Hash } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { SUBJECTS } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

export default function StudentHome() {
  const [, setLoc] = useLocation();
  const [tab, setTab] = useState<'code' | 'public'>('code');
  const [code, setCode] = useState('');
  const [subject, setSubject] = useState('all');

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['public-tests', subject],
    queryFn: () => api.getPublicTests(subject),
    enabled: tab === 'public',
  });

  const handleCode = () => {
    if (!code.trim()) return;
    setLoc(`/student/test/${code.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="student" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Test ishlash</h1>
          <p className="text-slate-500">Kod orqali yoki ommaviy testlar ro'yxatidan tanlang</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 mb-6 gap-1">
          {[['code', 'Kod orqali'], ['public', 'Ommaviy testlar']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val as any)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === val ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'code' ? (
          <div className="card text-center py-10">
            <Hash className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Test kodini kiriting</h2>
            <p className="text-slate-500 text-sm mb-6">O'qituvchi sizga 8 belgili kod beradi</p>
            <div className="max-w-xs mx-auto flex gap-2">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleCode()}
                placeholder="XXXXXXXX"
                maxLength={8}
                className="input text-center text-2xl font-mono tracking-widest uppercase"
              />
            </div>
            <button onClick={handleCode} disabled={!code.trim()} className="btn-primary mt-4 px-8">
              Davom etish <ChevronRight className="inline w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Subject filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['all', ...SUBJECTS].map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${subject === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                >
                  {s === 'all' ? 'Barchasi' : s}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="card animate-pulse h-40" />)}
              </div>
            ) : tests.length === 0 ? (
              <div className="card text-center py-12 text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Hech qanday test topilmadi</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {tests.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setLoc(`/student/test/${t.code}`)}
                    className="card hover:shadow-md cursor-pointer transition-all hover:border-indigo-300 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="badge-public">{t.subject}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-1 line-clamp-2">{t.title}</h3>
                    <p className="text-sm text-slate-500 mb-3">{t.teacherName}</p>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{t.questionCount} savol</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{t.attemptCount} urinish</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor(t.durationSeconds / 60)} daq</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
