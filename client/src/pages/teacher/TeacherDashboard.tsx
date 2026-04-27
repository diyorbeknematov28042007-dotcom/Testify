import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Copy, StopCircle, PlayCircle, Trash2, Edit, BarChart2, Download, BookOpen, Users, Key, Eye, EyeOff } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { formatDate, downloadDocxFile, cn } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

export default function TeacherDashboard() {
  const [, setLoc] = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'date' | 'name'>('date');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [showPassModal, setShowPassModal] = useState(false);
  const [passForm, setPassForm] = useState({ old: '', next: '', confirm: '' });
  const [showPassVis, setShowPassVis] = useState({ old: false, next: false });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: me } = useQuery({ queryKey: ['teacher-me'], queryFn: api.getMe });
  const { data: tests = [], isLoading } = useQuery({ queryKey: ['teacher-tests'], queryFn: api.getMyTests });

  const deleteMut = useMutation({
    mutationFn: api.deleteTest,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-tests'] }); qc.invalidateQueries({ queryKey: ['teacher-me'] }); toast("Test o'chirildi", 'success'); setDeleteId(null); },
    onError: (e: any) => toast(e.message, 'error'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => active ? api.stopTest(id) : api.restartTest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-tests'] }),
  });

  const cloneMut = useMutation({
    mutationFn: api.cloneTest,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-tests'] }); toast('Test nusxalandi', 'success'); },
  });

  const passMut = useMutation({
    mutationFn: () => api.changePassword(passForm.old, passForm.next),
    onSuccess: () => { toast('Parol o\'zgartirildi', 'success'); setShowPassModal(false); setPassForm({ old: '', next: '', confirm: '' }); },
    onError: (e: any) => toast(e.message, 'error'),
  });

  const handleDocx = async (id: number) => {
    try {
      const res = await api.downloadDocx(id);
      await downloadDocxFile(res as any, `test-${id}.docx`);
    } catch { toast('DOCX yuklab olishda xato', 'error'); }
  };

  const filtered = tests
    .filter((t: any) => t.title.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      if (sort === 'name') return sortDir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      return sortDir === 'asc' ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="teacher" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Xush kelibsiz, {me?.name}!</h1>
            <p className="text-slate-500 text-sm">Testlaringizni boshqaring</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPassModal(true)} className="btn-ghost flex items-center gap-1.5 text-sm"><Key className="w-4 h-4" /><span className="hidden sm:inline">Parol</span></button>
            <button onClick={() => setLoc('/teacher/create')} className="btn-primary flex items-center gap-1.5 text-sm"><Plus className="w-4 h-4" />Yangi test</button>
          </div>
        </div>

        {/* Stats */}
        {me && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Jami testlar', value: me.publicCount + me.privateCount, color: 'from-indigo-500 to-violet-600' },
              { label: 'Ommaviy', value: `${me.publicCount}/${me.publicTestLimit}`, color: 'from-emerald-500 to-teal-600' },
              { label: 'Shaxsiy', value: `${me.privateCount}/${me.privateTestLimit}`, color: 'from-amber-500 to-orange-600' },
              { label: 'Jami urinishlar', value: tests.reduce((s: number, t: any) => s + t.attemptCount, 0), color: 'from-violet-500 to-purple-600' },
            ].map((s, i) => (
              <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs opacity-80 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search & sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Test qidirish..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['name', 'date'].map(s => (
              <button key={s} onClick={() => { if (sort === s) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(s as any); setSortDir('desc'); } }}
                className={cn('px-3 py-2 rounded-xl text-sm font-medium border transition-colors', sort === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600')}>
                {s === 'name' ? 'Nom' : 'Sana'} {sort === s ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Tests grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card animate-pulse h-48" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Hali test yo'q. Yangi test yarating!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t: any) => (
              <div key={t.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className={t.type === 'public' ? 'badge-public' : 'badge-private'}>{t.type === 'public' ? 'Ommaviy' : 'Shaxsiy'}</span>
                    <span className={t.isActive ? 'badge-active' : 'badge-stopped'}>{t.isActive ? 'Faol' : "To'xtatilgan"}</span>
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 mb-0.5 line-clamp-2">{t.title}</h3>
                <p className="text-xs text-slate-500 mb-2">{t.subject}</p>
                <div className="font-mono text-xs bg-slate-100 rounded-lg px-2.5 py-1.5 text-indigo-700 font-semibold tracking-widest mb-3 flex items-center justify-between">
                  {t.code}
                  <button onClick={() => { navigator.clipboard.writeText(t.code); toast('Kod nusxalandi', 'success'); }} className="ml-2 text-slate-400 hover:text-indigo-600"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex gap-3 text-xs text-slate-500 mb-4">
                  <span><BookOpen className="inline w-3.5 h-3.5 mr-0.5" />{t.questionCount}</span>
                  <span><Users className="inline w-3.5 h-3.5 mr-0.5" />{t.attemptCount}</span>
                  <span className="ml-auto">{formatDate(t.createdAt)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setLoc(`/teacher/test/${t.id}/results`)} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5" />Natijalar</button>
                  <button onClick={() => setLoc(`/teacher/edit/${t.id}`)} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1"><Edit className="w-3.5 h-3.5" />Tahrir</button>
                  <button onClick={() => cloneMut.mutate(t.id)} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1"><Copy className="w-3.5 h-3.5" />Nusxa</button>
                  <button onClick={() => handleDocx(t.id)} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1"><Download className="w-3.5 h-3.5" />DOCX</button>
                  <button onClick={() => toggleMut.mutate({ id: t.id, active: t.isActive })} className={cn('text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors', t.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50')}>
                    {t.isActive ? <><StopCircle className="w-3.5 h-3.5" />To'xtat</> : <><PlayCircle className="w-3.5 h-3.5" />Yoqish</>}
                  </button>
                  <button onClick={() => setDeleteId(t.id)} className="text-red-500 hover:bg-red-50 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><Trash2 className="w-3.5 h-3.5" />O'chirish</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Testni o'chirish</h3>
            <p className="text-slate-500 text-sm mb-6">Bu amalni bekor qilib bo'lmaydi. Barcha natijalar ham o'chadi.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1">Bekor</button>
              <button onClick={() => deleteMut.mutate(deleteId)} className="btn-danger flex-1">O'chirish</button>
            </div>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">Parolni o'zgartirish</h3>
            <div className="space-y-3">
              {[['old', 'Eski parol', 'showPassVis.old'], ['next', 'Yangi parol', ''], ['confirm', 'Yangi parol (tasdiq)', '']].map(([field, label]) => (
                <div key={field}>
                  <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                  <input className="input" type="password" value={(passForm as any)[field]} onChange={e => setPassForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              {passForm.next && passForm.confirm && passForm.next !== passForm.confirm && (
                <p className="text-xs text-red-500">Parollar mos emas</p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPassModal(false)} className="btn-ghost flex-1">Bekor</button>
                <button
                  onClick={() => passMut.mutate()}
                  disabled={!passForm.old || !passForm.next || passForm.next !== passForm.confirm || passMut.isPending}
                  className="btn-primary flex-1"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
