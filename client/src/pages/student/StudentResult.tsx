import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Home, Eye } from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

export function StudentResult() {
  const { code } = useParams<{ code: string }>();
  const [, setLoc] = useLocation();
  const result = JSON.parse(localStorage.getItem(`test_result_${code}`) || 'null');

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav role="student" />
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <p className="text-slate-500">Natija topilmadi</p>
          <button onClick={() => setLoc('/')} className="btn-primary mt-4">Bosh sahifa</button>
        </div>
      </div>
    );
  }

  const pct = Math.round((result.correctAnswers / result.totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="student" />
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="card text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-3xl font-extrabold text-white">{pct}%</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Natijangiz</h2>
          <p className="text-4xl font-extrabold text-indigo-600 mb-4">{result.score} ball</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-emerald-600">{result.correctAnswers}</p>
              <p className="text-xs text-emerald-600">To'g'ri</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-500">{result.totalQuestions - result.correctAnswers}</p>
              <p className="text-xs text-red-500">Noto'g'ri</p>
            </div>
          </div>
          {result.wrongAnswers?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
              <p className="text-xs font-semibold text-amber-700 mb-1">Noto'g'ri javoblar:</p>
              <p className="text-sm text-amber-800">{result.wrongAnswers.join(', ')}-savollar</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setLoc(`/student/test/${code}/review`)} className="btn-outline flex-1 flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" />Ko'rib chiqish
            </button>
            <button onClick={() => setLoc('/')} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />Bosh sahifa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentReview() {
  const { code } = useParams<{ code: string }>();
  const [, setLoc] = useLocation();

  const savedAnswers = JSON.parse(localStorage.getItem(`test_answers_${code}`) || '[]');
  const savedQuestions = JSON.parse(localStorage.getItem(`test_questions_${code}`) || '[]');

  const { data: reviewData = [], isLoading } = useQuery({
    queryKey: ['review', code],
    queryFn: () => api.getReview(code!),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="student" />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        {[1,2,3].map(i => <div key={i} className="card animate-pulse h-40" />)}
      </div>
    </div>
  );

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav role="student" />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Javoblarni ko'rib chiqish</h2>
          <button onClick={() => setLoc(`/student/test/${code}/result`)} className="btn-ghost text-sm">← Natijaga</button>
        </div>
        <div className="space-y-4">
          {savedQuestions.map((q: any, i: number) => {
            const correct = reviewData[i]?.correctAnswer ?? -1;
            const userAns = savedAnswers[i] ?? -1;
            const isCorrect = userAns === correct;

            return (
              <div key={i} className={cn('card border-2', isCorrect ? 'border-emerald-200' : 'border-red-200')}>
                <div className="flex gap-3 mb-4">
                  <span className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0', isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                    {i + 1}
                  </span>
                  <p className="font-medium text-slate-800 pt-1">{q.text}</p>
                </div>
                {q.imageUrl && <img src={q.imageUrl} alt="" className="rounded-lg mb-4 max-h-40 object-contain" />}
                <div className="space-y-2">
                  {(q.options as string[]).map((opt: string, j: number) => {
                    const isCorrectOpt = j === correct;
                    const isUserOpt = j === userAns;
                    return (
                      <div key={j} className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2',
                        isCorrectOpt && isUserOpt && 'border-emerald-400 bg-emerald-50',
                        isCorrectOpt && !isUserOpt && 'border-emerald-300 bg-emerald-50',
                        !isCorrectOpt && isUserOpt && 'border-amber-400 bg-amber-50',
                        !isCorrectOpt && !isUserOpt && 'border-slate-100 bg-white',
                      )}>
                        <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                          isCorrectOpt ? 'bg-emerald-500 text-white' : isUserOpt ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500')}>
                          {letters[j]}
                        </span>
                        <span className="text-sm flex-1">{opt}</span>
                        {isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {!isCorrectOpt && isUserOpt && <XCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
