import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Toast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border pointer-events-auto',
            t.type === 'success' && 'bg-white border-emerald-200 text-emerald-800',
            t.type === 'error' && 'bg-white border-red-200 text-red-800',
            t.type === 'info' && 'bg-white border-blue-200 text-blue-800',
          )}
        >
          {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
          {t.type === 'error' && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
          <span className="text-sm font-medium flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
