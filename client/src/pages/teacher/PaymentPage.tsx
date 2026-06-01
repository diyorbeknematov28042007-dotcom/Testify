import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, CheckCircle, Upload, Loader2,
  MessageSquare, Star, ChevronRight, Tag, X, Image as ImageIcon
} from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

type Step = 'tariff' | 'card' | 'upload' | 'success';

const TARIFF_ICONS: Record<string, string> = {
  'Testify Ufq': '🌅',
  'Testify Nihol': '🌱',
  "Testify Cho'qqi": '🏔',
  'Testify Dargoh': '🏛',
  'Testify Samo': '🌌',
};

function fmt(n: number) {
  return n.toLocaleString('uz-UZ');
}

export default function PaymentPage() {
  const [, setLoc] = useLocation();
  const [step, setStep] = useState<Step>('tariff');
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: tariffs = [], isLoading: tariffsLoading } = useQuery({
    queryKey: ['public-tariffs'],
    queryFn: api.getPublicTariffs,
  });

  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['public-cards'],
    queryFn: api.getPublicCards,
    enabled: step === 'card' || step === 'upload',
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('tariffId', selectedTariff.id);
      fd.append('cardId', selectedCard.id);
      if (screenshot) fd.append('screenshot', screenshot);
      if (promoCode) fd.append('promoCode', promoCode);
      return api.submitPayment(fd);
    },
    onSuccess: () => {
      setChecking(false);
      setStep('success');
    },
    onError: (e: any) => {
      setChecking(false);
      toast(e.message || "Xato yuz berdi", 'error');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!screenshot) { toast("Screenshot yuklang", 'error'); return; }
    setChecking(true);
    // 2 soniya "tekshirilmoqda" animatsiyasi, keyin so'rov
    setTimeout(() => submitMut.mutate(), 2000);
  };

  // ── STEP 1: Tarif tanlash ──
  if (step === 'tariff') {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav role="teacher" />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => setLoc('/teacher/dashboard')} className="btn-ghost text-sm flex items-center gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" />Orqaga
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Limit olish</h1>
            <p className="text-slate-500 mt-1">Kerakli tarifni tanlang</p>
          </div>

          {tariffsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-28" />)}
            </div>
          ) : tariffs.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Hozircha tariflar mavjud emas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tariffs.map((tariff: any) => (
                <button
                  key={tariff.id}
                  onClick={() => { setSelectedTariff(tariff); setStep('card'); }}
                  className="w-full text-left card hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">
                        {TARIFF_ICONS[tariff.name] || '📦'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {tariff.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">{tariff.description}</p>
                        <div className="flex gap-3 mt-2">
                          <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            +{tariff.publicLimit} ommaviy
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                            +{tariff.privateLimit} shaxsiy
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg text-slate-900">{fmt(tariff.price)}</p>
                        <p className="text-xs text-slate-400">so'm</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 2: Karta tanlash ──
  if (step === 'card') {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav role="teacher" />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => setStep('tariff')} className="btn-ghost text-sm flex items-center gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" />Orqaga
          </button>

          {/* Tanlangan tarif xulosa */}
          <div className="card mb-6 bg-indigo-50 border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{TARIFF_ICONS[selectedTariff?.name] || '📦'}</span>
                <div>
                  <p className="font-bold text-indigo-900">{selectedTariff?.name}</p>
                  <p className="text-sm text-indigo-600">+{selectedTariff?.publicLimit} ommaviy / +{selectedTariff?.privateLimit} shaxsiy</p>
                </div>
              </div>
              <p className="font-bold text-xl text-indigo-900">{fmt(selectedTariff?.price)} so'm</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900">To'lov kartasi</h2>
            <p className="text-slate-500 mt-1">Qaysi kartaga to'lov qilishni tanlang</p>
          </div>

          {/* Promokod */}
          <div className="card mb-6">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-indigo-500" />
              Promokod (ixtiyoriy)
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1 uppercase"
                placeholder="PROMO kod"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
                disabled={promoApplied}
              />
              {promoApplied ? (
                <div className="flex items-center gap-2 px-3 text-emerald-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Qo'llanildi
                </div>
              ) : (
                <button
                  onClick={() => { if (promoCode) setPromoApplied(true); }}
                  className="btn-outline px-4 text-sm"
                >
                  Tekshirish
                </button>
              )}
            </div>
            {promoApplied && (
              <p className="text-xs text-emerald-600 mt-2">+1 ommaviy test limiti qo'shiladi!</p>
            )}
          </div>

          {/* Kartalar */}
          {cardsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="card animate-pulse h-24" />)}
            </div>
          ) : cards.length === 0 ? (
            <div className="card text-center py-8 text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Karta mavjud emas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card: any) => (
                <button
                  key={card.id}
                  onClick={() => { setSelectedCard(card); setStep('upload'); }}
                  className={cn(
                    'w-full text-left rounded-2xl p-5 border-2 transition-all group',
                    selectedCard?.id === card.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                  )}
                >
                  {/* Bank kartasi UI */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">{card.bankName}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <p className="font-mono text-lg font-bold text-slate-800 tracking-widest">
                    {card.cardNumberFull}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{card.cardHolder}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 3: Screenshot yuklash ──
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav role="teacher" />
        <div className="max-w-md mx-auto px-4 py-8">
          <button onClick={() => setStep('card')} className="btn-ghost text-sm flex items-center gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" />Orqaga
          </button>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">To'lov tasdiqlash</h2>
            <p className="text-slate-500 mt-1 text-sm">To'lov screenshotini yuklang</p>
          </div>

          {/* Xulosa */}
          <div className="card mb-5 bg-slate-50 border-slate-200">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Tarif</span>
              <span className="font-semibold text-slate-800">{selectedTariff?.name}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Karta</span>
              <span className="font-semibold text-slate-800">{selectedCard?.bankName}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Karta raqami</span>
              <span className="font-mono font-bold text-slate-800">{selectedCard?.cardNumberFull}</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Promokod</span>
                <span className="font-semibold text-emerald-600">{promoCode} ✓</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
              <span className="font-semibold text-slate-700">Jami</span>
              <span className="font-bold text-lg text-indigo-600">{fmt(selectedTariff?.price)} so'm</span>
            </div>
          </div>

          {/* Screenshot yuklash */}
          <div className="card mb-5">
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              To'lov screenshotini yuklang
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {screenshotPreview ? (
              <div className="relative">
                <img
                  src={screenshotPreview}
                  alt="Screenshot"
                  className="w-full rounded-xl object-cover max-h-60 border border-slate-200"
                />
                <button
                  onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                <Upload className="w-8 h-8 text-slate-300 group-hover:text-indigo-400 mx-auto mb-2 transition-colors" />
                <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600">
                  Rasmni yuklash uchun bosing
                </p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — max 5MB</p>
              </button>
            )}
          </div>

          {/* Yuborish tugmasi */}
          {checking ? (
            <div className="card text-center py-6 border-amber-200 bg-amber-50">
              <Loader2 className="w-8 h-8 text-amber-500 mx-auto mb-3 animate-spin" />
              <p className="font-semibold text-amber-800">To'lov tekshirilmoqda...</p>
              <p className="text-xs text-amber-600 mt-1">Iltimos kuting</p>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!screenshot || submitMut.isPending}
              className={cn(
                'w-full py-3.5 rounded-xl font-bold text-sm transition-all',
                screenshot
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              To'lovni tasdiqlash
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 4: Muvaffaqiyat ──
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="card text-center">
          {/* Animatsiya */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-40" />
            <div className="relative w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">To'lov tasdiqlandi!</h2>
          <p className="text-slate-500 text-sm mb-6">
            <span className="font-semibold text-slate-800">{selectedTariff?.name}</span> tarifi muvaffaqiyatli faollashtirildi.
            Limitingiz yangilandi.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Qo'shildi</span>
              <span className="font-semibold text-indigo-600">
                +{selectedTariff?.publicLimit} ommaviy / +{selectedTariff?.privateLimit} shaxsiy
              </span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Promokod bonusi</span>
                <span className="font-semibold text-emerald-600">+1 ommaviy</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setLoc('/teacher/dashboard')}
              className="btn-primary w-full"
            >
              Dashboardga qaytish
            </button>
            <button
              onClick={() => {
                const msg = encodeURIComponent(`Assalomu alaykum! Testify bo'yicha savolim bor.`);
                window.open(`https://t.me/testifyN3_bot?start=support`, '_blank');
              }}
              className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Savol bo'lsa adminga yozing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
