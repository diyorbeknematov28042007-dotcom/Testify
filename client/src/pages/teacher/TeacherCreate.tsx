import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Upload, X, ChevronDown } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { SUBJECTS, parseTestFromText } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
}

function emptyQ(): Question {
  return { text: '', options: ['', '', '', ''], correctAnswer: 0 };
}

export default function TeacherCreate() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [, setLoc] = useLocation();

  const [form, setForm] = useState({
    title: '', subject: 'Matematika', type: 'public' as 'public' | 'private',
    scoringType: 'simple' as 'simple' | 'dtm', description: '',
    durationHours: 0, durationMinutes: 20,
  });
  const [questions, setQuestions] = useState<Question[]>([emptyQ()]);
  const [loading, setLoading] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const { data: existing } = useQuery({
    queryKey: ['teacher-test', id],
    queryFn: () => api.getTest(parseInt(id!)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      const dur = existing.durationSeconds;
      setForm({
        title: existing.title, subject: existing.subject, type: existing.type,
        scoringType: existing.scoringType, description: existing.description || '',
        durationHours: Math.floor(dur / 3600), durationMinutes: Math.floor((dur % 3600) / 60),
      });
      if (existing.questions?.length > 0) {
        setQuestions(existing.questions.map((q: any) => ({
          text: q.text, options: q.options, correctAnswer: q.correctAnswer, imageUrl: q.imageUrl,
        })));
      }
    }
  }, [existing]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast('Sarlavha kerak', 'error');
    if (questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))) {
      return toast('Barcha savol va variantlarni to\'ldiring', 'error');
    }
    const durationSeconds = form.durationHours * 3600 + form.durationMinutes * 60;
    if (durationSeconds < 60) return toast('Kamida 1 daqiqa', 'error');

    setLoading(true);
    try {
      if (isEdit) {
        await api.updateTest(parseInt(id!), { ...form, durationSeconds, questions });
        toast('Test yangilandi', 'success');
      } else {
        await api.createTest({ ...form, durationSeconds, questions });
        toast('Test yaratildi', 'success');
      }
      setLoc('/teacher/dashboard');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const qs = parseTestFromText(importText);
    if (qs.length === 0) return toast("Format noto'g'ri", 'error');
    setQuestions(prev => [...prev.filter(q => q.text.trim()), ...qs]);
    setImportModal(false);
    setImportText('');
    toast(`${qs.length} ta savol qo'shildi`, 'success');
  };

  const addQ = () => setQuestions(prev => [...prev, emptyQ()]);
  const removeQ = (i: number) => setQuestions(prev => prev.filter((_, j) => j !== i));
  const updateQ = (i: number, field: string, val: any) => setQuestions(prev => prev.map((q, j) => j === i ? { ...q, [field]: val } : q));
  const updateOpt = (qi: number, oi: number, val: string) => setQuestions(prev => prev.map((q, j) => j === qi ? { ...q, options: q.options.map((o, k) => k === oi ? val : o) } : q));

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="teacher" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Testni tahrirlash' : 'Yangi test yaratish'}</h1>
          <button onClick={() => setLoc('/teacher/dashboard')} className="btn-ghost text-sm">← Orqaga</button>
        </div>

        <div className="card mb-4">
          <h2 className="font-semibold text-slate-800 mb-4">Umumiy ma'lumot</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Sarlavha *</label>
              <input className="input" placeholder="Test sarlavhasi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Fan</label>
                <select className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Tur</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                  <option value="public">Ommaviy</option>
                  <option value="private">Shaxsiy</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Baholash turi</label>
                <select className="input" value={form.scoringType} onChange={e => setForm(f => ({ ...f, scoringType: e.target.value as any }))}>
                  <option value="simple">Oddiy (1 ball)</option>
                  <option value="dtm">DTM (1.1/2.1/3.1)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Davomiylik</label>
                <div className="flex gap-2">
                  <input type="number" min={0} max={5} className="input text-center" placeholder="soat" value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: parseInt(e.target.value) || 0 }))} />
                  <span className="flex items-center text-slate-500">:</span>
                  <input type="number" min={0} max={59} className="input text-center" placeholder="daq" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Tavsif (ixtiyoriy)</label>
              <textarea className="input" rows={2} placeholder="Test haqida qisqacha..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Savollar ({questions.length})</h2>
          <button onClick={() => setImportModal(true)} className="btn-outline text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4" />Matndan import
          </button>
        </div>

        <div className="space-y-4 mb-4">
          {questions.map((q, i) => (
            <div key={i} className="card border-2 border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-700">{i + 1}-savol</span>
                {questions.length > 1 && (
                  <button onClick={() => removeQ(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                className="input mb-3"
                rows={2}
                placeholder="Savol matni..."
                value={q.text}
                onChange={e => updateQ(i, 'text', e.target.value)}
              />
              <div className="space-y-2 mb-3">
                {q.options.map((opt, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correctAnswer === j}
                      onChange={() => updateQ(i, 'correctAnswer', j)}
                      className="w-4 h-4 accent-indigo-600 shrink-0"
                    />
                    <span className="text-sm font-bold text-slate-500 w-5">{['A', 'B', 'C', 'D'][j]})</span>
                    <input
                      className="input text-sm"
                      placeholder={`${['A', 'B', 'C', 'D'][j]} varianti`}
                      value={opt}
                      onChange={e => updateOpt(i, j, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">* To'g'ri javobni radio tugma bilan belgilang</p>
            </div>
          ))}
        </div>

        <button onClick={addQ} className="btn-outline w-full mb-6 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />Savol qo'shish
        </button>

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : 'Test yaratish'}
        </button>
      </div>

      {/* Import modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Matndan import</h3>
              <button onClick={() => setImportModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono text-slate-600 mb-3">
              {`Savol matni?\n\nA) Variant 1\nB) Variant 2\nC) Variant 3\nD) Variant 4\n\nJavob: B\n\n(Bo'sh qator - keyingi savol)`}
            </div>
            <textarea
              className="input mb-4"
              rows={10}
              placeholder="Savollarni shu formatda joylashtiring..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setImportModal(false)} className="btn-ghost flex-1">Bekor</button>
              <button onClick={handleImport} className="btn-primary flex-1">Import qilish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
