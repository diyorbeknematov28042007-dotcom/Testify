import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Upload, X, Image, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { SUBJECTS } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  imageBase64?: string;
}

function emptyQ(): Question {
  return { text: '', options: ['', '', '', ''], correctAnswer: 0 };
}

function parseOneQuestion(text: string): Question | null {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;
  const qText = lines[0];
  const opts: string[] = [];
  let correctAnswer = -1;
  const labels = ['A)', 'B)', 'C)', 'D)'];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const idx = labels.findIndex(l => line.toUpperCase().startsWith(l));
    if (idx !== -1) opts.push(line.substring(2).trim());
    else if (line.toLowerCase().startsWith('javob:')) {
      const ans = line.split(':')[1]?.trim().toUpperCase();
      correctAnswer = ['A', 'B', 'C', 'D'].indexOf(ans);
    }
  }
  if (opts.length === 4 && correctAnswer !== -1) {
    return { text: qText, options: opts, correctAnswer };
  }
  return null;
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
  const [importIndex, setImportIndex] = useState<number | null>(null); // null = bulk import

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
      return toast("Barcha savol va variantlarni to'ldiring", 'error');
    }
    const durationSeconds = form.durationHours * 3600 + form.durationMinutes * 60;
    if (durationSeconds < 60) return toast('Kamida 1 daqiqa', 'error');

    setLoading(true);
    try {
      const qs = questions.map(q => ({
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        imageUrl: q.imageBase64 || q.imageUrl || null,
      }));

      if (isEdit) {
        await api.updateTest(parseInt(id!), { ...form, durationSeconds, questions: qs });
        toast('Test yangilandi', 'success');
      } else {
        await api.createTest({ ...form, durationSeconds, questions: qs });
        toast('Test yaratildi', 'success');
      }
      setLoc('/teacher/dashboard');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bulk import
  const handleBulkImport = () => {
    const blocks = importText.trim().split(/\n\s*\n/);
    const parsed: Question[] = [];
    for (const block of blocks) {
      const q = parseOneQuestion(block);
      if (q) parsed.push(q);
    }
    if (parsed.length === 0) return toast("Format noto'g'ri", 'error');
    setQuestions(prev => [...prev.filter(q => q.text.trim()), ...parsed]);
    setImportModal(false);
    setImportText('');
    toast(`${parsed.length} ta savol qo'shildi`, 'success');
  };

  // Single question import
  const handleSingleImport = () => {
    const q = parseOneQuestion(importText);
    if (!q) return toast("Format noto'g'ri", 'error');
    if (importIndex !== null) {
      setQuestions(prev => prev.map((item, i) => i === importIndex ? { ...item, ...q } : item));
    }
    setImportModal(false);
    setImportText('');
    setImportIndex(null);
    toast('Savol import qilindi', 'success');
  };

  const openImport = (index: number | null) => {
    setImportIndex(index);
    setImportText('');
    setImportModal(true);
  };

  // Image upload
  const handleImageUpload = (index: number, file: File) => {
    if (file.size > 2 * 1024 * 1024) return toast("Rasm 2MB dan kichik bo'lishi kerak", 'error');
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setQuestions(prev => prev.map((q, i) => i === index ? { ...q, imageBase64: base64, imageUrl: undefined } : q));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, imageBase64: undefined, imageUrl: undefined } : q));
  };

  const addQ = () => setQuestions(prev => [...prev, emptyQ()]);
  const removeQ = (i: number) => setQuestions(prev => prev.filter((_, j) => j !== i));
  const updateQ = (i: number, field: string, val: any) =>
    setQuestions(prev => prev.map((q, j) => j === i ? { ...q, [field]: val } : q));
  const updateOpt = (qi: number, oi: number, val: string) =>
    setQuestions(prev => prev.map((q, j) => j === qi ? { ...q, options: q.options.map((o, k) => k === oi ? val : o) } : q));

  const importFormat = `Savol matni?\n\nA) Birinchi variant\nB) Ikkinchi variant\nC) Uchinchi variant\nD) To'g'ri javob\n\nJavob: D`;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="teacher" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Testni tahrirlash' : 'Yangi test yaratish'}</h1>
          <button onClick={() => setLoc('/teacher/dashboard')} className="btn-ghost text-sm">← Orqaga</button>
        </div>

        {/* General info */}
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
                <div className="flex gap-2 items-center">
                  <input type="number" min={0} max={5} className="input text-center" placeholder="soat" value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: parseInt(e.target.value) || 0 }))} />
                  <span className="text-slate-500 font-bold">:</span>
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

        {/* Questions header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Savollar ({questions.length})</h2>
          <button onClick={() => openImport(null)} className="btn-outline text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4" />Barchasini import
          </button>
        </div>

        {/* Questions */}
        <div className="space-y-4 mb-4">
          {questions.map((q, i) => (
            <div key={i} className="card border-2 border-slate-100">
              {/* Question header */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-700">{i + 1}-savol</span>
                <div className="flex gap-1.5">
                  {/* Import button for single question */}
                  <button
                    onClick={() => openImport(i)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors"
                    title="Matndan import"
                  >
                    <FileText className="w-3.5 h-3.5" />Import
                  </button>
                  {questions.length > 1 && (
                    <button onClick={() => removeQ(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Question text */}
              <textarea
                className="input mb-3"
                rows={2}
                placeholder="Savol matni..."
                value={q.text}
                onChange={e => updateQ(i, 'text', e.target.value)}
              />

              {/* Image upload */}
              <div className="mb-3">
                {q.imageBase64 || q.imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={q.imageBase64 || q.imageUrl}
                      alt=""
                      className="max-h-40 rounded-xl object-contain border border-slate-200"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer text-slate-500 hover:text-indigo-600 transition-colors w-fit text-sm">
                    <Image className="w-4 h-4" />
                    <span>Rasm qo'shish (ixtiyoriy)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleImageUpload(i, e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 mb-2">
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
              <h3 className="font-bold text-lg">
                {importIndex !== null ? `${importIndex + 1}-savolni import` : 'Barcha savollarni import'}
              </h3>
              <button onClick={() => { setImportModal(false); setImportIndex(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono text-slate-600 mb-3 whitespace-pre">
              {importIndex !== null ? importFormat : importFormat + '\n\n2. Ikkinchi savol?\n\nA) ...\n...'}
            </div>

            <textarea
              className="input mb-4"
              rows={10}
              placeholder="Savolni shu formatda yozing..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setImportModal(false); setImportIndex(null); }} className="btn-ghost flex-1">Bekor</button>
              <button
                onClick={importIndex !== null ? handleSingleImport : handleBulkImport}
                className="btn-primary flex-1"
              >
                Import qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
