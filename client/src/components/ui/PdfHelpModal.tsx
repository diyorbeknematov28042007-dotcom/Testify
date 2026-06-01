import { useState } from 'react';
import { X, Printer, Monitor, Apple, Info } from 'lucide-react';

interface PdfHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PdfHelpModal({ isOpen, onClose }: PdfHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">PDF yuklab olish</h3>
              <p className="text-xs text-slate-500 mt-0.5">Vaqtinchalik muqobil usul</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Uzr xabari */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                PDF yuklash funksiyasini yanada yaxshilash ustida ish olib boryapmiz.
                Hozircha fayllarni saqlab olish uchun quyidagi qulay usuldan foydalanib turishingiz mumkin.
              </p>
            </div>
          </div>

          {/* Qadamlar */}
          <p className="text-sm font-semibold text-slate-700 mb-3">Qanday saqlash mumkin:</p>

          <div className="space-y-3">
            {/* Windows/Linux */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Monitor className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Windows / Linux</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-700">Ctrl</kbd>
                  {' + '}
                  <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-700">P</kbd>
                  {' → "Printer" → '}
                  <span className="font-medium text-slate-700">Save as PDF</span>
                  {' → Save'}
                </p>
              </div>
            </div>

            {/* macOS */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                <Apple className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">macOS</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-700">Cmd</kbd>
                  {' + '}
                  <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-700">P</kbd>
                  {' → "Printer" → '}
                  <span className="font-medium text-slate-700">Save as PDF</span>
                  {' → Save'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center leading-relaxed">
            Sabrli bo'lganingiz uchun rahmat, tez orada funksiya to'liq ishga tushadi! 🙏
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full btn-primary py-2.5 text-sm font-semibold"
          >
            Tushundim
          </button>
        </div>
      </div>
    </div>
  );
}
