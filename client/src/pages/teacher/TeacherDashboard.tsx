import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Copy, StopCircle, Trash2, Edit, BarChart2, BookOpen, Users, Key, FileText, Hash, AlertTriangle, Download } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { formatDate, cn } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

export default function TeacherDashboard() {
  const [, setLoc] = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'date' | 'name'>('date');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [showPassModal, setShowPassModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [passForm, setPassForm] = useState({ old: '', next: '', confirm: '' });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [stopId, setStopId] = useState<number | null>(null);

  const { data: me } = useQuery({ queryKey: ['teacher-me'], queryFn: api.getMe });
  const { data: tests = [], isLoading } = useQuery({ queryKey: ['teacher-tests'], queryFn: api.getMyTests });
  const { data: promo, refetch: refetchPromo } = useQuery({ queryKey: ['teacher-promo'], queryFn: api.getPromocode });

  const deleteMut = useMutation({
    mutationFn: api.deleteTest,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-tests'] }); toast("Test o'chirildi", 'success'); setDeleteId(null); },
    onError: (e: any) => toast(e.message, 'error'),
  });

  const stopMut = useMutation({
    mutationFn: api.stopTest,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-tests'] }); toast("Test to'xtatildi. 48 soat ichida o'chiriladi!", 'info'); setStopId(null); },
  });

  const cloneMut = useMutation({
    mutationFn: api.cloneTest,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-tests'] }); toast('Test nusxalandi', 'success'); },
  });

  const createPromoMut = useMutation({
    mutationFn: api.createPromocode,
    onSuccess: () => { refetchPromo(); toast('Promokod yaratildi!', 'success'); },
  });

  const passMut = useMutation({
    mutationFn: () => api.changePassword(passForm.old, passForm.next),
    onSuccess: () => { toast("Parol o'zgartirildi", 'success'); setShowPassModal(false); setPassForm({ old: '', next: '', confirm: '' }); },
    onError: (e: any) => toast(e.message, 'error'),
  });

  const handlePdf = async (id: number, type: 'test' | 'results') => {
    try {
      await api.downloadPdf(`/api/teachers/tests/${id}/${type === 'test' ? 'docx' : 'results/docx'}`, `${type}-${id}.docx`);
    } catch { toast('PDF xatosi', 'error'); }
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Xush kelibsiz, {me?.name}!</h1>
            <p className="text-slate-500 text-sm">Testlaringizni boshqaring</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPromoModal(true)} className="btn-ghost flex items-center gap-1.5 text-sm"><Hash className="w-4 h-4" /><span className="hidden sm:inline">Promokod</span></button>
            <button onClick={() => setShowPassModal(true)} className="btn-ghost flex items-center gap-1.5 text-sm"><Key className="w-4 h-4" /><span className="hidden sm:inline">Parol</span></button>
            <button onClick={() => setLoc('/teacher/payment')} className="btn-outline flex items-center gap-1.5 text-sm border-indigo-300 text-indigo-600 hover:bg-indigo-50"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Limit olish</span></button>
            <button onClick={() => setLoc('/teacher/create')} className="btn-primary flex items-center gap-1.5 text-sm"><Plus className="w-4 h-4" />Yangi test</button>
          </div>
        </div>

        {me && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-4 text-white col-span-2 sm:col-span-1">
              <p className="text-xs opacity-70 mb-1">Sizning ID</p>
              <p className="text-xl font-bold font-mono tracking-widest">{me.teacherId}</p>
              <button onClick={() => { navigator.clipboard.writeText(me.teacherId); toast("ID nusxalandi", 'success'); }} className="mt-1 text-xs opacity-70 hover:opacity-100 flex items-center gap-1">
                <Copy className="w-3 h-3" /> Nusxalash
              </button>
            </div>
            <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-4 text-white">
              <p className="text-xs opacity-70 mb-1">Tarif</p>
              <p className="text-sm font-bold leading-tight">{me.currentTariff || 'Testify Ufq'}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
              <p className="text-2xl font-bold">{me.publicCount}/{me.publicTestLimit}</p>
              <p className="text-xs opacity-80 mt-0.5">Ommaviy</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white">
              <p className="text-2xl font-bold">{me.privateCount}/{me.privateTestLimit}</p>
              <p className="text-xs opacity-80 mt-0.5">Shaxsiy</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-white">
              <p className="text-2xl font-bold">{tests.reduce((s: number, t: any) => s + t.attemptCount, 0)}</p>
              <p className="text-xs opacity-80 mt-0.5">Urinishlar</p>
            </div>
          </div>
        )}

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

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="card animate-pulse h-48" />)}</div>
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
                  <button onClick={() => handlePdf(t.id, 'test')} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Yuklab olish</button>
                  <button onClick={() => handlePdf(t.id, 'results')} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1"><Download className="w-3.5 h-3.5" />Natijalar</button>
                  {t.isActive && (
                    <button onClick={() => setStopId(t.id)} className="text-amber-600 hover:bg-amber-50 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <StopCircle className="w-3.5 h-3.5" />To'xtat
                    </button>
                  )}
                  <button onClick={() => setDeleteId(t.id)} className="text-red-500 hover:bg-red-50 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><Trash2 className="w-3.5 h-3.5" />O'chirish</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stop confirm */}
      {stopId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3"><AlertTriangle className="w-6 h-6 text-amber-500" /><h3 className="font-bold text-lg">Testni to'xtatish</h3></div>
            <p className="text-slate-500 text-sm mb-2">⚠️ Diqqat!</p>
            <ul className="text-sm text-slate-600 mb-4 space-y-1">
              <li>• Qayta yoqib bo'lmaydi</li>
              <li>• <b>48 soat</b> ichida avtomatik o'chiriladi</li>
              <li>• Barcha natijalar ham o'chadi</li>
            </ul>
            <div className="flex gap-3">
              <button onClick={() => setStopId(null)} className="btn-ghost flex-1">Bekor</button>
              <button onClick={() => stopMut.mutate(stopId)} className="btn-danger flex-1">Ha, to'xtatish</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Testni o'chirish</h3>
            <p className="text-slate-500 text-sm mb-6">Bu amalni bekor qilib bo'lmaydi.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1">Bekor</button>
              <button onClick={() => deleteMut.mutate(deleteId)} className="btn-danger flex-1">O'chirish</button>
            </div>
          </div>
        </div>
      )}

      {/* Promo modal */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">🎟 Promokod</h3>
            {promo ? (
              <div className="space-y-3">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold font-mono tracking-widest text-indigo-600">{promo.code}</p>
                  <button onClick={() => { navigator.clipboard.writeText(promo.code); toast('Nusxalandi!', 'success'); }} className="text-xs text-indigo-400 mt-1 flex items-center gap-1 mx-auto"><Copy className="w-3 h-3" />Nusxalash</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-slate-800">{promo.usageCount}</p>
                    <p className="text-xs text-slate-500">Ishlatildi</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">+{promo.publicLimitEarned}</p>
                    <p className="text-xs text-slate-500">Limit ishlandi</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center">Promokodingizni tarqating — kimdir ishlatsa sizga +1 ommaviy +1 shaxsiy test beriladi!</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-500 text-sm mb-4">Sizda hali promokod yo'q</p>
                <button onClick={() => createPromoMut.mutate()} disabled={createPromoMut.isPending} className="btn-primary">Promokod yaratish</button>
              </div>
            )}
            <button onClick={() => setShowPromoModal(false)} className="btn-ghost w-full mt-3">Yopish</button>
          </div>
        </div>
      )}

      {/* Password modal */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">Parolni o'zgartirish</h3>
            <div className="space-y-3">
              {[['old', 'Eski parol'], ['next', 'Yangi parol'], ['confirm', 'Yangi parol (tasdiq)']].map(([field, label]) => (
                <div key={field}>
                  <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                  <input className="input" type="password" value={(passForm as any)[field]} onChange={e => setPassForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              {passForm.next && passForm.confirm && passForm.next !== passForm.confirm && <p className="text-xs text-red-500">Parollar mos emas</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPassModal(false)} className="btn-ghost flex-1">Bekor</button>
                <button onClick={() => passMut.mutate()} disabled={!passForm.old || !passForm.next || passForm.next !== passForm.confirm || passMut.isPending} className="btn-primary flex-1">Saqlash</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
