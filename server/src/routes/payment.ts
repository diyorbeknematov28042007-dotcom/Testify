import { Router } from 'express';
import { db } from '../db';
import { paymentCards, tariffs, payments, teachers, promocodes } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { teacherAuth, adminAuth } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const paymentRouter = Router();

// Screenshot upload papkasi
const uploadDir = path.join(process.cwd(), 'uploads', 'screenshots');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pay_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── PUBLIC: Tariflar ro'yxati ──
paymentRouter.get('/tariffs', async (_req, res) => {
  try {
    const all = await db.query.tariffs.findMany({
      where: eq(tariffs.isActive, true),
      orderBy: (t, { asc }) => [asc(t.price)],
    });
    res.json(all);
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── PUBLIC: Kartalari ro'yxati (raqam yashirilgan) ──
paymentRouter.get('/cards', async (_req, res) => {
  try {
    const all = await db.query.paymentCards.findMany({
      where: eq(paymentCards.isActive, true),
    });
    res.json(all.map(c => ({
      id: c.id,
      bankName: c.bankName,
      cardHolder: c.cardHolder,
      // Faqat oxirgi 4 raqam ko'rsatiladi
      cardNumber: '**** **** **** ' + c.cardNumber.replace(/\s/g, '').slice(-4),
      cardNumberFull: c.cardNumber, // To'lov sahifasida ko'rsatish uchun
    })));
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── TEACHER: To'lov yaratish (screenshot bilan) ──
paymentRouter.post(
  '/submit',
  teacherAuth,
  upload.single('screenshot'),
  async (req: any, res) => {
    try {
      const { tariffId, cardId, promoCode } = req.body;
      const teacherId = req.teacher.id;

      if (!req.file) {
        return res.status(400).json({ error: "Screenshot yuklanmadi" });
      }
      if (!tariffId || !cardId) {
        return res.status(400).json({ error: "Tarif va karta tanlang" });
      }

      const tariff = await db.query.tariffs.findFirst({
        where: and(eq(tariffs.id, parseInt(tariffId)), eq(tariffs.isActive, true)),
      });
      if (!tariff) return res.status(404).json({ error: "Tarif topilmadi" });

      const card = await db.query.paymentCards.findFirst({
        where: and(eq(paymentCards.id, parseInt(cardId)), eq(paymentCards.isActive, true)),
      });
      if (!card) return res.status(404).json({ error: "Karta topilmadi" });

      // Promo kod tekshiruv
      let promoDiscount = 0;
      if (promoCode) {
        const promo = await db.query.promocodes.findFirst({
          where: eq(promocodes.code, promoCode.toUpperCase()),
        });
        if (!promo) return res.status(400).json({ error: "Promokod noto'g'ri" });
        promoDiscount = 1; // Promo kod bilan 1 ta qo'shimcha limit
      }

      const screenshotUrl = `/uploads/screenshots/${req.file.filename}`;

      const [payment] = await db.insert(payments).values({
        teacherId,
        tariffId: parseInt(tariffId),
        cardId: parseInt(cardId),
        screenshotUrl,
        promoCode: promoCode || null,
        amount: tariff.price,
        status: 'pending',
      }).returning();

      // Avto-tasdiqlash: to'lov yaratilishi bilanoq limit beriladi
      await autoApprovePayment(payment.id, teacherId, tariff, promoDiscount);

      res.json({ ok: true, paymentId: payment.id });
    } catch (e: any) {
      console.error('Payment error:', e);
      res.status(500).json({ error: 'Server xatosi: ' + e.message });
    }
  }
);

// Avto tasdiqlash funksiyasi
async function autoApprovePayment(
  paymentId: number,
  teacherId: number,
  tariff: any,
  promoDiscount: number
) {
  // Limit qo'shish
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, teacherId),
  });
  if (!teacher) return;

  await db.update(teachers).set({
    publicTestLimit: teacher.publicTestLimit + tariff.publicLimit + (promoDiscount > 0 ? 1 : 0),
    privateTestLimit: teacher.privateTestLimit + tariff.privateLimit,
    currentTariff: tariff.name,
  }).where(eq(teachers.id, teacherId));

  // To'lovni tasdiqlangan deb belgilash
  await db.update(payments).set({
    status: 'approved',
    updatedAt: new Date(),
  }).where(eq(payments.id, paymentId));
}

// ── TEACHER: O'z to'lovlari ──
paymentRouter.get('/my', teacherAuth, async (req: any, res) => {
  try {
    const myPayments = await db.query.payments.findMany({
      where: eq(payments.teacherId, req.teacher.id),
      with: { tariff: true, card: true },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
    res.json(myPayments);
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ═══════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════

// ── ADMIN: Barcha to'lovlar ──
paymentRouter.get('/admin/all', adminAuth, async (_req, res) => {
  try {
    const all = await db.query.payments.findMany({
      with: {
        teacher: { columns: { name: true, teacherId: true } },
        tariff: { columns: { name: true, price: true } },
        card: { columns: { bankName: true, cardNumber: true } },
      },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
    res.json(all);
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── ADMIN: To'lov statistikasi ──
paymentRouter.get('/admin/stats', adminAuth, async (_req, res) => {
  try {
    const all = await db.query.payments.findMany({
      where: eq(payments.status, 'approved'),
      with: { card: { columns: { bankName: true, cardNumber: true } } },
    });

    const totalRevenue = all.reduce((sum, p) => sum + p.amount, 0);

    // Karta bo'yicha statistika
    const byCard: Record<string, { bankName: string; cardNumber: string; total: number; count: number }> = {};
    for (const p of all) {
      const key = String(p.cardId);
      if (!byCard[key]) {
        byCard[key] = {
          bankName: (p as any).card?.bankName || '—',
          cardNumber: (p as any).card?.cardNumber || '—',
          total: 0,
          count: 0,
        };
      }
      byCard[key].total += p.amount;
      byCard[key].count += 1;
    }

    res.json({
      totalRevenue,
      totalPayments: all.length,
      byCard: Object.values(byCard),
    });
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── ADMIN: Kartalar CRUD ──
paymentRouter.get('/admin/cards', adminAuth, async (_req, res) => {
  try {
    const all = await db.query.paymentCards.findMany({
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });
    res.json(all);
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

paymentRouter.post('/admin/cards', adminAuth, async (req, res) => {
  try {
    const { bankName, cardNumber, cardHolder } = req.body;
    if (!bankName || !cardNumber || !cardHolder) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
    }
    const [card] = await db.insert(paymentCards).values({ bankName, cardNumber, cardHolder }).returning();
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

paymentRouter.patch('/admin/cards/:id', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    await db.update(paymentCards).set({ isActive }).where(eq(paymentCards.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

paymentRouter.delete('/admin/cards/:id', adminAuth, async (req, res) => {
  try {
    await db.delete(paymentCards).where(eq(paymentCards.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── ADMIN: Tariflar CRUD ──
paymentRouter.get('/admin/tariffs', adminAuth, async (_req, res) => {
  try {
    const all = await db.query.tariffs.findMany({
      orderBy: (t, { asc }) => [asc(t.price)],
    });
    res.json(all);
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

paymentRouter.post('/admin/tariffs', adminAuth, async (req, res) => {
  try {
    const { name, description, price, publicLimit, privateLimit } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "Ism va narx kerak" });
    }
    const [tariff] = await db.insert(tariffs).values({
      name, description: description || '', price: parseInt(price),
      publicLimit: parseInt(publicLimit) || 0,
      privateLimit: parseInt(privateLimit) || 0,
    }).returning();
    res.json(tariff);
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

paymentRouter.patch('/admin/tariffs/:id', adminAuth, async (req, res) => {
  try {
    const { name, description, price, publicLimit, privateLimit, isActive } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = parseInt(price);
    if (publicLimit !== undefined) update.publicLimit = parseInt(publicLimit);
    if (privateLimit !== undefined) update.privateLimit = parseInt(privateLimit);
    if (isActive !== undefined) update.isActive = isActive;
    await db.update(tariffs).set(update).where(eq(tariffs.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

paymentRouter.delete('/admin/tariffs/:id', adminAuth, async (req, res) => {
  try {
    await db.delete(tariffs).where(eq(tariffs.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Screenshot fayllarini serve qilish uchun
export { uploadDir };
