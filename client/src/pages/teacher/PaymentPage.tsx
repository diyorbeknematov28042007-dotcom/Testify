import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, CheckCircle, Upload, Loader2,
  MessageSquare, Star, ChevronRight, Tag, X, Image as ImageIcon,
  Copy, Wifi, Clock
} from 'lucide-react';
import { TopNav } from '../../components/layout/TopNav';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

type Step = 'tariff' | 'card' | 'upload' | 'success';
type PayMethod = 'card' | 'click' | 'payme';

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

// Karta ranglari bank nomiga qarab
function cardGradient(bankName: string) {
  const name = bankName?.toLowerCase() || '';
  if (name.includes('kapital')) return 'from-blue-600 to-blue-800';
  if (name.includes('uzcard') || name.includes('uz card')) return 'from-green-600 to-emerald-800';
  if (name.includes('humo')) return 'from-orange-500 to-red-600';
  if (name.includes('payme')) return 'from-cyan-500 to-blue-600';
  if (name.includes('click')) return 'from-violet-600 to-purple-800';
  if (name.includes('ipak')) return 'from-yellow-500 to-amber-600';
  if (name.includes('hamkor')) return 'from-teal-500 to-teal-700';
  return 'from-indigo-600 to-violet-700';
}

// Karta raqamini formatlash: 8600123456781234 → 8600 1234 5678 1234
function formatCardNumber(num: string) {
  const clean = num.replace(/\s/g, '');
  return clean.match(/.{1,4}/g)?.join(' ') || num;
}

// Click ikonkasi SVG
function ClickIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#1A1A2E"/>
      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">click</text>
    </svg>
  );
}

// Payme ikonkasi SVG
function PaymeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#00AAFF"/>
      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">payme</text>
    </svg>
  );
}

// Animatsiyali kredit karta komponenti
function BankCard({ card, selected, onClick }: { card: any; selected: boolean; onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  const formatted = formatCardNumber(card.cardNumberFull);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(card.cardNumberFull.replace(/\s/g, ''));
    setCopied(true);
    toast('Karta raqami nusxalandi!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative w-full cursor-pointer transition-all duration-300',
        selected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
      )}
    >
      {/* Karta tanlanganlik belgisi */}
      {selected && (
        <div className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Asosiy karta */}
      <div className={cn(
        'relative rounded-2xl p-5 text-white overflow-hidden shadow-lg border-2 transition-all',
        `bg-gradient-to-br ${cardGradient(card.bankName)}`,
        selected ? 'border-indigo-400 shadow-indigo-200 shadow-xl' : 'border-transparent'
      )}>
        {/* Fon dizayn elementlari */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white opacity-5 -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white opacity-5 translate-y-10 -translate-x-6" />

        {/* Yuqori qator: bank nomi + chip */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-wide">{card.bankName}</span>
          </div>
          {/* Chip */}
          <div className="w-9 h-6 rounded bg-yellow-300/80 flex items-center justify-center">
            <div className="w-5 h-4 rounded-sm border border-yellow-500/40 grid grid-cols-2 gap-0.5 p-0.5">
              <div className="bg-yellow-500/40 rounded-sm" />
              <div className="bg-yellow-500/40 rounded-sm" />
              <div className="bg-yellow-500/40 rounded-sm" />
              <div className="bg-yellow-500/40 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Karta raqami — bir qatorda, barcha raqamlar */}
        <div className="mb-4 relative z-10">
          <p className="font-mono text-base sm:text-lg font-bold tracking-[0.2em] text-white/95 whitespace-nowrap">
            {formatted}
          </p>
        </div>

        {/* Karta egasi */}
        <div className="relative z-10">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-0.5">Karta egasi</p>
          <p className="font-semibold text-sm tracking-wide uppercase">{card.cardHolder}</p>
        </div>

        {/* Wifi belgisi (contactless) */}
        <div className="absolute bottom-5 right-5 opacity-30">
          <Wifi className="w-6 h-6 text-white rotate-90" />
        </div>
      </div>

      {/* Nusxa olish tugmasi — kartadan tashqarida pastda */}
      <button
        onClick={handleCopy}
        className={cn(
          'mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all',
          copied
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-300'
        )}
      >
        {copied ? (
          <><CheckCircle className="w-3.5 h-3.5" /> Nusxalandi!</>
        ) : (
          <><Copy className="w-3.5 h-3.5" /> Karta raqamini nusxalash</>
        )}
      </button>
    </div>
  );
}

// Click/Payme tez kunda modali
function ComingSoonModal({ method, onClose }: { method: 'click' | 'payme'; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className={cn(
          'p-6 text-center',
          method === 'click' ? 'bg-gradient-to-br from-[#1A1A2E] to-[#16213E]' : 'bg-gradient-to-br from-[#00AAFF] to-[#0077CC]'
        )}>
          <div className="flex justify-center mb-3">
            {method === 'click' ? <ClickIcon /> : <PaymeIcon />}
          </div>
          <h3 className="text-white font-bold text-lg">
            {method === 'click' ? 'Click' : 'Payme'} orqali to'lov
          </h3>
          <p className="text-white/70 text-sm mt-1">Tez kunda!</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Integratsiya jarayonlari davom etmoqda</p>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                {method === 'click' ? 'Click' : 'Payme'} to'lov tizimi bilan ulanish ishlari olib borilmoqda.
                Tez orada bu imkoniyat ham faollashtiriladi!
              </p>
            </div>
          </div>

          <p className="text-slate-600 text-sm text-center mb-5">
            Hozircha <span className="font-semibold text-slate-800">karta orqali to'lov</span> amalga oshiring — bu tez va qulay!
          </p>

          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            Karta orqali to'lash
          </button>
        </div>
      </div>
    </div>
  );
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
  const [comingSoon, setComingSoon] = useState<'click' | 'payme' | null>(null);
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
                      <div className="text-3xl">{TARIFF_ICONS[tariff.name] || '📦'}</div>
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

  // ── STEP 2: To'lov usuli tanlash ──
  if (step === 'card') {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav role="teacher" />
        <div className="max-w-lg mx-auto px-4 py-8">
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

          {/* To'lov turini tanlang */}
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-700 mb-3">To'lov turini tanlang</h2>
            <div className="grid grid-cols-3 gap-3">
              {/* Karta */}
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-indigo-500 bg-indigo-50 cursor-default">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-indigo-700">Karta</span>
                <span className="text-[10px] text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">Faol</span>
              </div>

              {/* Click */}
              <button
                onClick={() => setComingSoon('click')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-all group relative"
              >
                <ClickIcon />
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800">Click</span>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Tez kunda</span>
              </button>

              {/* Payme */}
              <button
                onClick={() => setComingSoon('payme')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-all group"
              >
                <PaymeIcon />
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800">Payme</span>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Tez kunda</span>
              </button>
            </div>
          </div>

          {/* Kartalar ro'yxati */}
          <div>
            <h2 className="text-base font-bold text-slate-700 mb-3">Kartani tanlang</h2>
            {cardsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-36 rounded-2xl animate-pulse bg-slate-200" />)}
              </div>
            ) : cards.length === 0 ? (
              <div className="card text-center py-8 text-slate-400">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Karta mavjud emas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((card: any) => (
                  <BankCard
                    key={card.id}
                    card={card}
                    selected={selectedCard?.id === card.id}
                    onClick={() => setSelectedCard(card)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Davom etish */}
          {selectedCard && (
            <button
              onClick={() => setStep('upload')}
              className="w-full mt-6 bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Davom etish <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Coming soon modal */}
        {comingSoon && (
          <ComingSoonModal method={comingSoon} onClose={() => setComingSoon(null)} />
        )}
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

          {/* Tanlangan karta mini ko'rinishi */}
          <div className="mb-5">
            <BankCard
              card={selectedCard}
              selected={false}
              onClick={() => {}}
            />
          </div>

          {/* Xulosa */}
          <div className="card mb-5 bg-slate-50 border-slate-200">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Tarif</span>
              <span className="font-semibold text-slate-800">{selectedTariff?.name}</span>
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
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {screenshotPreview ? (
              <div className="relative">
                <img src={screenshotPreview} alt="Screenshot" className="w-full rounded-xl object-cover max-h-60 border border-slate-200" />
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
                <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600">Rasmni yuklash uchun bosing</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — max 5MB</p>
              </button>
            )}
          </div>

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
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-40" />
            <div className="relative w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">To'lov tasdiqlandi!</h2>
          <p className="text-slate-500 text-sm mb-6">
            <span className="font-semibold text-slate-800">{selectedTariff?.name}</span> tarifi muvaffaqiyatli faollashtirildi. Limitingiz yangilandi.
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
            <button onClick={() => setLoc('/teacher/dashboard')} className="btn-primary w-full">
              Dashboardga qaytish
            </button>
            <button
              onClick={() => window.open('https://t.me/testifyN3_bot?start=support', '_blank')}
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
