import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, BookOpen, BarChart2, Plus, Trash2, Edit2, Eye, EyeOff, Copy, Download, StopCircle, PlayCircle, X } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { formatDate, cn, downloadDocxFile } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'stats' | 'teachers' | 'tests'>('stats');
  const [showPassMap, setShowPassMap] = useState<Record<number, boolean>>({});
  const [addModal, setAddModal] = useState(false);
  const [limitModal, setLimitModal] = useState<any>(null);
  const [addForm, setAddForm] = useState({ login: '', password: '', name: '' });
  const [limitForm, setLimitForm] = useState({ pub: 10, priv: 5 });
  const [deleteTeacher, setDeleteTeacher] = useState<number | null>(null);
  const [deleteTest, setDeleteTest] = useState<number | null>(null);

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: api.getStats });
  const { data: teachers = [] } = useQuery({ queryKey: ['admin-teachers'], queryFn: api.getTeachers, enabled: tab === 'teachers' });
  const { data: tests = [] } = useQuery({ queryKey: ['admin-tests'], queryFn: api.getAllTests, enabled: tab === 'tests' });

  const addMut = useMutation({
    mutationFn: () => api.addTeacher(addForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast("O'qituvchi qo'shildi", 'success'); setAddModal(false); setAddForm({ login: '', password: '', name: '' }); },
    onError: (e: any) => toast(e.message, 'error'),
  });

  const delTeacherMut = useMutation({
    mutationFn: api.deleteTeacher,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast("O'qituvchi o'chirildi", 'success'); setDeleteTeacher(null); },
  });

  const limitMut = useMutation({
    mutationFn: ({ id }: { id: number }) => api.updateLimits(id, limitForm.pub, limitForm.priv),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); toast('Limit yangilandi', 'success'); setLimitModal(null); },
  });

  const toggleTestMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => active ? api.adminStopTest(id) : api.adminRestartTest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tests'] }),
  });

  const delTestMut = useMutation({
    mutationFn: api.adminDeleteTest,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tests'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast("Test o'chirildi", 'success'); setDeleteTest(null); },
  });

  const handleDocx = async (id: number) => {
    try {
      const res = await api.downloadDocx(id, true);
      await downloadDocxFile(res as any, `test-${id}.docx`);
    } catch { toast('DOCX xatosi', 'error'); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="admin" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 mb-6 gap-1 w-full sm:w-auto sm:inline-flex">
          {[['stats', 'Statistika'], ['teachers', "O'qituvchilar"], ['tests', 'Testlar']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v as any)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === v ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Stats tab */}
        {tab === 'stats' && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "O'qituvchilar", value: stats.teacherCount, color: 'from-blue-500 to-blue-600' },
              { label: 'Testlar', value: stats.testCount, color: 'from-indigo-500 to-violet-600' },
              { label: 'Urinishlar', value: stats.attemptCount, color: 'from-violet-500 to-purple-600' },
              { label: 'Ommaviy', value: stats.publicCount, color: 'from-emerald-500 to-teal-600' },
              { label: 'Shaxsiy', value: stats.privateCount, color: 'from-amber-500 to-orange-600' },
              { label: 'Faol', value: stats.activeCount, color: 'from-green-500 to-emerald-600' },
            ].map((s, i) => (
              <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white`}>
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-xs opacity-80 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Teachers tab */}
        {tab === 'teachers' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />O'qituvchi qo'shish
              </button>
            </div>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['F.I.SH', 'Login', 'Parol', 'Ommaviy', 'Shaxsiy', 'Sana', 'Amallar'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{t.name}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{t.login}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-mono">{showPassMap[t.id] ? t.password : '••••••'}</span>
                            <button onClick={() => setShowPassMap(m => ({ ...m, [t.id]: !m[t.id] }))} className="text-slate-400 hover:text-slate-600">
                              {showPassMap[t.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(t.password); toast('Nusxalandi', 'success'); }} className="text-slate-400 hover:text-slate-600">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={cn('font-semibold', t.publicCount >= t.publicTestLimit ? 'text-red-500' : 'text-slate-700')}>{t.publicCount}</span>
                          <span className="text-slate-400">/{t.publicTestLimit}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={cn('font-semibold', t.privateCount >= t.privateTestLimit ? 'text-red-500' : 'text-slate-700')}>{t.privateCount}</span>
                          <span className="text-slate-400">/{t.privateTestLimit}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(t.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setLimitModal(t); setLimitForm({ pub: t.publicTestLimit, priv: t.privateTestLimit }); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Limit"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteTeacher(t.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tests tab */}
        {tab === 'tests' && (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Test nomi', "O'qituvchi", 'Kod', 'Tur', 'Qo\'shilgan', 'Holat', 'Amallar'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800 max-w-xs truncate">{t.title}</p>
                        <p className="text-xs text-slate-500">{t.subject}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{t.teacherName}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 bg-indigo-50 rounded">{t.code}</td>
                      <td className="px-4 py-3">
                        <span className={t.type === 'public' ? 'badge-public' : 'badge-private'}>{t.type === 'public' ? 'Ommaviy' : 'Shaxsiy'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={t.isActive ? 'badge-active' : 'badge-stopped'}>{t.isActive ? 'Faol' : "To'xtatilgan"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleDocx(t.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title="DOCX"><Download className="w-4 h-4" /></button>
                          <button onClick={() => toggleTestMut.mutate({ id: t.id, active: t.isActive })} className={cn('p-1.5 rounded-lg', t.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50')}>
                            {t.isActive ? <StopCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setDeleteTest(t.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add teacher modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">O'qituvchi qo'shish</h3>
              <button onClick={() => setAddModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[['name', 'Ism Familiya', 'Abdullayev Akbar'], ['login', 'Login', 'akbar123'], ['password', 'Parol', '••••']].map(([f, l, p]) => (
                <div key={f}>
                  <label className="text-sm font-medium text-slate-700 block mb-1">{l}</label>
                  <input className="input" placeholder={p} value={(addForm as any)[f]} onChange={e => setAddForm(x => ({ ...x, [f]: e.target.value }))} />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAddModal(false)} className="btn-ghost flex-1">Bekor</button>
                <button onClick={() => addMut.mutate()} disabled={addMut.isPending} className="btn-primary flex-1">Qo'shish</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Limit modal */}
      {limitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{limitModal.name} — Limit</h3>
              <button onClick={() => setLimitModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Ommaviy test limit</label>
                <input type="number" min={0} className="input" value={limitForm.pub} onChange={e => setLimitForm(f => ({ ...f, pub: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Shaxsiy test limit</label>
                <input type="number" min={0} className="input" value={limitForm.priv} onChange={e => setLimitForm(f => ({ ...f, priv: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setLimitModal(null)} className="btn-ghost flex-1">Bekor</button>
                <button onClick={() => limitMut.mutate({ id: limitModal.id })} className="btn-primary flex-1">Saqlash</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirms */}
      {deleteTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">O'qituvchini o'chirish</h3>
            <p className="text-slate-500 text-sm mb-6">Barcha testlari va natijalari ham o'chadi!</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTeacher(null)} className="btn-ghost flex-1">Bekor</button>
              <button onClick={() => delTeacherMut.mutate(deleteTeacher)} className="btn-danger flex-1">O'chirish</button>
            </div>
          </div>
        </div>
      )}

      {deleteTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Testni o'chirish</h3>
            <p className="text-slate-500 text-sm mb-6">Barcha natijalar ham o'chadi.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTest(null)} className="btn-ghost flex-1">Bekor</button>
              <button onClick={() => delTestMut.mutate(deleteTest)} className="btn-danger flex-1">O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
