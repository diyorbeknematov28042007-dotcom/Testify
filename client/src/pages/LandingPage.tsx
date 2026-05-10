import { Link } from 'wouter';
import { BookOpen, Users, Clock, Award, ArrowRight, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5 font-bold text-xl text-indigo-600">
            <GraduationCap className="w-7 h-7" />
            <span>Testify</span>
          </div>
          <Link href="/teacher/login" className="btn-outline text-sm">O'qituvchi</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
            Bilimni sinashning{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              eng zamonaviy
            </span>{' '}
            usuli
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
            O'qituvchilar uchun test yaratish, talabalar uchun qulay ishlash. Hamma narsa bir platformada.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/student" className="btn-primary text-base px-8 py-3 flex items-center justify-center gap-2">
              Test ishlashni boshlash
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/teacher/login" className="btn-outline text-base px-8 py-3">
              O'qituvchi sifatida kirish
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: BookOpen, title: 'Oson test yaratish', desc: "Matndan import yoki qo'lda yaratish", color: 'bg-indigo-100 text-indigo-600' },
            { icon: Users, title: "Ko'p talaba", desc: 'Bir vaqtda yuzlab talaba test ishlaydi', color: 'bg-violet-100 text-violet-600' },
            { icon: Clock, title: 'Avtomatik hisob', desc: "Vaqt tugaganda avtomatik topshiriladi", color: 'bg-emerald-100 text-emerald-600' },
            { icon: Award, title: 'Batafsil natija', desc: "Xato va to'g'ri javoblarni ko'ring", color: 'bg-amber-100 text-amber-600' },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="card hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color} mb-4`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Yashirin admin kirish */}
      <a
        href="/admin/login"
        style={{ position: 'fixed', bottom: '4px', right: '4px', fontSize: '8px', opacity: 0.01, color: 'transparent', userSelect: 'none' }}
      >
        .
      </a>
    </div>
  );
}
