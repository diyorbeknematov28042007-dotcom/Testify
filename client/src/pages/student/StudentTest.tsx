import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { Clock, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { formatTime, cn } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

type Step = 'join' | 'test' | 'done';

export default function StudentTest() {
  const { code } = useParams<{ code: string }>();
  const [, setLoc] = useLocation();
  const [step, setStep] = useState<Step>('join');
  const [studentName, setStudentName] = useState('');
  const [telegram, setTelegram] = useState('');
  const [testData, setTestData] = useState<any>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [warning5, setWarning5] = useState(false);
  const [warning1, setWarning1] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  const isSubmittingRef = useRef(false);
  const submittedRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const answersRef = useRef<(number | null)[]>([]);
  const testDataRef = useRef<any>(null);
  const warning5Shown = useRef(false);
  const warning1Shown = useRef(false);

  const storageKey = `test_session_${code}`;

  // Keep refs in sync
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { testDataRef.current = testData; }, [testData]);

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { session, answers: savedAnswers, startTime, testData: td } = JSON.parse(saved);
        if (session && td && startTime) {
          setTestData({ ...td, sessionId: session });
          setAnswers(savedAnswers || new Array(td.questions.length).fill(null));
          startTimeRef.current = startTime;
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = td.test.durationSeconds - elapsed;
          if (remaining > 0) {
            setTimeLeft(remaining);
            setStep('test');
          } else {
            // Time already expired — auto submit
            handleAutoSubmit(savedAnswers, { ...td, sessionId: session });
          }
        }
      } catch {}
    }
  }, []);

  // Timer
  useEffect(() => {
    if (step !== 'test') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        // 5 daqiqa eslatma
        if (prev === 300 && !warning5Shown.current) {
          warning5Shown.current = true;
          setWarning5(true);
          setTimeout(() => setWarning5(false), 8000);
        }
        // 1 daqiqa eslatma
        if (prev === 60 && !warning1Shown.current) {
          warning1Shown.current = true;
          setWarning1(true);
          setTimeout(() => setWarning1(false), 8000);
        }
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit(answersRef.current, testDataRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Anti-cheat
  useEffect(() => {
    if (step !== 'test') return;
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('selectstart', prevent);
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('selectstart', prevent);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [step]);

  const saveSession = (newAnswers: (number | null)[]) => {
    if (!testDataRef.current) return;
    localStorage.setItem(storageKey, JSON.stringify({
      session: testDataRef.current.sessionId,
      answers: newAnswers,
      startTime: startTimeRef.current,
      testData: testDataRef.current,
    }));
  };

  const handleJoin = async () => {
    if (!studentName.trim()) return;
    setLoading(true);
    try {
      const data = await api.joinTest(code!, studentName.trim(), telegram.trim() || undefined);
      const initialAnswers = new Array(data.questions.length).fill(null);
      startTimeRef.current = Date.now();
      const td = { ...data, sessionId: data.sessionId };
      setTestData(td);
      testDataRef.current = td;
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
      setTimeLeft(data.test.durationSeconds);
      localStorage.setItem(storageKey, JSON.stringify({
        session: data.sessionId,
        answers: initialAnswers,
        startTime: startTimeRef.current,
        testData: data,
      }));
      setStep('test');
    } catch (e: any) {
      toast(e.message || 'Xato', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qIdx: number, ans: number) => {
    const newAnswers = [...answersRef.current];
    newAnswers[qIdx] = ans;
    setAnswers(newAnswers);
    answersRef.current = newAnswers;
    saveSession(newAnswers);
  };

  // Auto submit — vaqt tugaganda
  const handleAutoSubmit = async (currentAnswers: (number | null)[], currentTestData: any) => {
    if (isSubmittingRef.current || submittedRef.current) return;
    if (!currentTestData?.sessionId) return;

    isSubmittingRef.current = true;
    submittedRef.current = true;
    setAutoSaved(true);

    const submit = async (attempt = 0): Promise<any> => {
      try {
        return await api.submitTest(code!, currentTestData.sessionId, currentAnswers);
      } catch (e: any) {
        if (e.message === 'Allaqachon topshirilgan') return null;
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
          return submit(attempt + 1);
        }
        throw e;
      }
    };

    try {
      const result = await submit();
      localStorage.removeItem(storageKey);
      if (result) {
        localStorage.setItem(`test_result_${code}`, JSON.stringify({ ...result, autoSubmitted: true }));
        localStorage.setItem(`test_answers_${code}`, JSON.stringify(currentAnswers));
        if (currentTestData.questions) {
          localStorage.setItem(`test_questions_${code}`, JSON.stringify(currentTestData.questions));
        }
      }
      setLoc(`/student/test/${code}/result`);
    } catch (e: any) {
      isSubmittingRef.current = false;
      submittedRef.current = false;
      setAutoSaved(false);
    }
  };

  const handleSubmit = async (auto = false) => {
    if (isSubmittingRef.current || submittedRef.current) return;
    if (!auto && !confirmSubmit) {
      const unanswered = answersRef.current.filter(a => a === null).length;
      if (unanswered > 0) {
        setConfirmSubmit(true);
        return;
      }
    }

    isSubmittingRef.current = true;
    submittedRef.current = true;
    setConfirmSubmit(false);

    const submit = async (attempt = 0): Promise<any> => {
      try {
        return await api.submitTest(code!, testDataRef.current.sessionId, answersRef.current);
      } catch (e: any) {
        if (e.message === 'Allaqachon topshirilgan') return null;
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
          return submit(attempt + 1);
        }
        throw e;
      }
    };

    try {
      const result = await submit();
      localStorage.removeItem(storageKey);
      if (result) {
        localStorage.setItem(`test_result_${code}`, JSON.stringify(result));
        localStorage.setItem(`test_answers_${code}`, JSON.stringify(answersRef.current));
        if (testDataRef.current?.questions) {
          localStorage.setItem(`test_questions_${code}`, JSON.stringify(testDataRef.current.questions));
        }
      }
      setLoc(`/student/test/${code}/result`);
    } catch (e: any) {
      toast('Yuborishda xato', 'error');
      isSubmittingRef.current = false;
      submittedRef.current = false;
    }
  };

  const answered = answers.filter(a => a !== null).length;
  const total = testData?.questions?.length || 0;
  const progress = total > 0 ? (answered / total) * 100 : 0;
  const timerColor = timeLeft > 300 ? 'text-indigo-600' : timeLeft > 60 ? 'text-amber-500' : 'text-red-600';
  const timerPulse = timeLeft <= 300;

  if (step === 'join') {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav role="student" />
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="card">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Test boshlash</h2>
            <p className="text-slate-500 text-sm mb-6">Kod: <span className="font-mono font-bold text-indigo-600">{code}</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">F.I.SH *</label>
                <input className="input" placeholder="Ismingizni kiriting" value={studentName} onChange={e => setStudentName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Telegram (ixtiyoriy)</label>
                <input className="input" placeholder="@username" value={telegram} onChange={e => setTelegram(e.target.value)} />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ⚠️ Sahifa yangilansa javoblar saqlanadi. Nusxa olish bloklangan.
              </div>
              <button onClick={handleJoin} disabled={!studentName.trim() || loading} className="btn-primary w-full py-3">
                {loading ? 'Yuklanmoqda...' : 'Testni boshlash'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 select-none">

      {/* 5 daqiqa eslatma */}
      {warning5 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold text-sm">⚠️ Diqqat! 5 daqiqa qoldi!</p>
            <p className="text-xs opacity-90">Javoblaringizni tekshiring va yakunlang</p>
          </div>
        </div>
      )}

      {/* 1 daqiqa eslatma */}
      {warning1 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold text-sm">🚨 1 daqiqa qoldi!</p>
            <p className="text-xs opacity-90">Tezda yakunlash tugmasini bosing!</p>
          </div>
        </div>
      )}

      {/* Avtomatik saqlash */}
      {autoSaved && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
          <CheckCircle className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold text-sm">Vaqt tugadi — avtomatik saqlanmoqda...</p>
            <p className="text-xs opacity-90">Javoblaringiz saqlanib, natija ko'rsatiladi</p>
          </div>
        </div>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900 text-sm line-clamp-1">{testData?.test?.title}</p>
            <p className="text-xs text-slate-500">{answered}/{total} javob berildi</p>
          </div>
          <div className={cn('flex items-center gap-1.5 font-mono font-bold text-lg', timerColor, timerPulse && 'animate-pulse')}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-24">
        {testData?.questions?.map((q: any, i: number) => (
          <div key={q.id} className={cn('card', answers[i] !== null && 'border-indigo-200')}>
            <div className="flex items-start gap-3 mb-4">
              <span className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0', answers[i] !== null ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600')}>
                {i + 1}
              </span>
              <p className="font-medium text-slate-800 pt-1">{q.text}</p>
            </div>
            {q.imageUrl && <img src={q.imageUrl} alt="" className="rounded-lg mb-4 max-h-48 object-contain" />}
            <div className="space-y-2">
              {(q.options as string[]).map((opt, j) => (
                <label key={j} className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', answers[i] === j ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50')}>
                  <input type="radio" name={`q-${i}`} value={j} checked={answers[i] === j} onChange={() => handleAnswer(i, j)} className="sr-only" />
                  <span className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0', answers[i] === j ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-slate-500')}>
                    {['A', 'B', 'C', 'D'][j]}
                  </span>
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{answered}</span>/{total} javob
          </div>
          {confirmSubmit ? (
            <div className="flex gap-2">
              <button onClick={() => setConfirmSubmit(false)} className="btn-ghost text-sm">Bekor</button>
              <button onClick={() => handleSubmit(false)} className="btn-danger text-sm">
                Ha, topshirish ({total - answered} javobsiz)
              </button>
            </div>
          ) : (
            <button onClick={() => handleSubmit(false)} className="btn-primary">
              Testni yakunlash
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
