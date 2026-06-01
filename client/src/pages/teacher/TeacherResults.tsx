import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Trophy, User, Clock, Download } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { formatDate, cn } from '../../lib/utils';
import { PdfHelpModal } from '../../components/ui/PdfHelpModal';

export default function TeacherResults() {
  const { id } = useParams<{ id: string }>();
  const [, setLoc] = useLocation();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'score' | 'name' | 'date'>('score');
  const [dir, setDir] = useState<'desc' | 'asc'>('desc');
  const [showPdfModal, setShowPdfModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['test-results', id],
    queryFn: () => api.getTestResults(parseInt(id!)),
  });

  const filtered = (data?.results || [])
    .filter((r: any) => r.studentName.toLowerCase().includes(search.toLowerCase()) || r.telegram?.includes(search))
    .sort((a: any, b: any) => {
      let v = 0;
      if (sort === 'score') v = parseFloat(b.score) - parseFloat(a.score);
      else if (sort === 'name') v = a.studentName.localeCompare(b.studentName);
      else v = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return dir === 'desc' ? v : -v;
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="teacher" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => setLoc('/teacher/dashboard')} className="btn-ghost text-sm flex items-center gap-2 mb-6">
          <ArrowLeft className="w-4 h-4" />Orqaga
        </button>

        {data?.test && (
          <div className="card mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">{data.test.title}</h1>
                <div className="flex gap-4 text-sm text-slate-500">
                  <span className="font-mono text-indigo-600 font-bold">{data.test.code}</span>
                  <span>{data.results?.length || 0} urinish</span>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        )}

        <PdfHelpModal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {[['score', 'Ball'], ['name', 'Ism'], ['date', 'Sana']].map(([s, l]) => (
              <button key={s} onClick={() => { if (sort === s) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(s as any); setDir('desc'); } }}
                className={cn('px-3 py-2 rounded-xl text-xs font-medium border', sort === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600')}>
                {l} {sort === s ? (dir === 'asc' ? '↑' : '↓') : ''}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="card animate-pulse h-64" />
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Hali natija yo'q</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">F.I.SH</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Telegram</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ball</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">To'g'ri/Jami</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Xato savollar</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Sana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r: any, i: number) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-800">{r.studentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 hidden sm:table-cell">{r.telegram || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-indigo-600">{parseFloat(r.score).toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                        <span className="text-emerald-600 font-medium">{r.correctAnswers}</span>
                        <span className="text-slate-400">/{r.totalQuestions}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell max-w-xs">
                        {r.wrongAnswers?.length > 0 ? r.wrongAnswers.slice(0, 8).join(', ') + (r.wrongAnswers.length > 8 ? '...' : '') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
