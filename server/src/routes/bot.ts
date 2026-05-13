import { Router } from 'express';
import { db } from '../db';
import { teachers, promocodes } from '../db/schema';
import { eq } from 'drizzle-orm';

export const botRouter = Router();

const BOT_SECRET = process.env.BOT_SECRET || '';

function checkSecret(req: any, res: any): boolean {
  const { secret } = req.body;
  if (!secret || secret !== BOT_SECRET) {
    res.status(401).json({ error: "Ruxsat yo'q" });
    return false;
  }
  return true;
}

// ── VERIFIKATSIYA ──
botRouter.post('/verify', async (req, res) => {
  try {
    if (!checkSecret(req, res)) return;
    const { telegramId, verifyCode } = req.body;

    // Telegram ID allaqachon bog'liq o'qituvchi bormi
    const existingByTg = await db.query.teachers.findFirst({
      where: eq(teachers.telegramId, String(telegramId)),
    });
    if (existingByTg) {
      return res.status(400).json({
        error: "Bu Telegram akkaunt boshqa foydalanuvchiga bog`langan",
        alreadyLinked: true,
        teacherName: existingByTg.name,
      });
    }

    // Kod bo'yicha o'qituvchini topish
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.verifyCode, String(verifyCode)),
    });

    if (!teacher) {
      return res.status(404).json({ error: "Kod noto'g'ri yoki muddati o'tgan" });
    }

    if (teacher.isVerified) {
      return res.status(400).json({ error: 'Bu akkaunt allaqachon tasdiqlangan' });
    }

    if (teacher.verifyCodeExpiry && new Date() > new Date(teacher.verifyCodeExpiry)) {
      return res.status(400).json({ error: "Kod muddati o'tgan. Yangi kod oling" });
    }

    // Tasdiqlash
    await db.update(teachers).set({
      isVerified: true,
      telegramId: String(telegramId),
      verifyCode: null,
      verifyCodeExpiry: null,
    }).where(eq(teachers.id, teacher.id));

    res.json({
      ok: true,
      teacherName: teacher.name,
      teacherId: teacher.teacherId,
      login: teacher.login,
      currentTariff: teacher.currentTariff,
      publicTestLimit: teacher.publicTestLimit,
      privateTestLimit: teacher.privateTestLimit,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// O'qituvchi ma'lumotlari (bot uchun)
botRouter.post('/teacher-info', async (req, res) => {
  try {
    if (!checkSecret(req, res)) return;
    const { telegramId } = req.body;

    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.telegramId, String(telegramId)),
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Topilmadi', notRegistered: true });
    }

    const promo = await db.query.promocodes.findFirst({
      where: eq(promocodes.teacherId, teacher.id),
    });

    const myTests = await db.query.tests.findMany
      ? undefined
      : undefined;

    res.json({
      ok: true,
      name: teacher.name,
      teacherId: teacher.teacherId,
      login: teacher.login,
      currentTariff: teacher.currentTariff,
      publicTestLimit: teacher.publicTestLimit,
      privateTestLimit: teacher.privateTestLimit,
      isVerified: teacher.isVerified,
      promo: promo ? {
        code: promo.code,
        usageCount: promo.usageCount,
        publicLimitEarned: promo.publicLimitEarned,
        privateLimitEarned: promo.privateLimitEarned,
      } : null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── LIMIT QO'SHISH ──
botRouter.post('/add-limit', async (req, res) => {
  try {
    if (!checkSecret(req, res)) return;
    const { teacherId, publicLimit, privateLimit, tariffName } = req.body;

    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.teacherId, teacherId),
    });
    if (!teacher) return res.status(404).json({ error: "O'qituvchi topilmadi" });

    await db.update(teachers).set({
      publicTestLimit: teacher.publicTestLimit + (publicLimit || 0),
      privateTestLimit: teacher.privateTestLimit + (privateLimit || 0),
      currentTariff: tariffName || teacher.currentTariff,
    }).where(eq(teachers.teacherId, teacherId));

    res.json({
      ok: true,
      teacherName: teacher.name,
      newPublicLimit: teacher.publicTestLimit + (publicLimit || 0),
      newPrivateLimit: teacher.privateTestLimit + (privateLimit || 0),
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── PROMOKOD ──
botRouter.post('/promocode/validate', async (req, res) => {
  try {
    if (!checkSecret(req, res)) return;
    const { code } = req.body;

    const promo = await db.query.promocodes.findFirst({
      where: eq(promocodes.code, code.toUpperCase()),
      with: { teacher: true },
    });
    if (!promo) return res.status(404).json({ error: 'Promokod topilmadi' });

    res.json({
      ok: true,
      code: promo.code,
      teacherName: (promo as any).teacher.name,
      teacherId: (promo as any).teacher.teacherId,
      usageCount: promo.usageCount,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

botRouter.post('/promocode/apply', async (req, res) => {
  try {
    if (!checkSecret(req, res)) return;
    const { code } = req.body;

    const promo = await db.query.promocodes.findFirst({
      where: eq(promocodes.code, code.toUpperCase()),
      with: { teacher: true },
    });
    if (!promo) return res.status(404).json({ error: 'Promokod topilmadi' });

    const t = (promo as any).teacher;
    await db.update(teachers).set({
      publicTestLimit: t.publicTestLimit + 1,
      privateTestLimit: t.privateTestLimit + 1,
    }).where(eq(teachers.id, t.id));

    await db.update(promocodes).set({
      usageCount: promo.usageCount + 1,
      publicLimitEarned: promo.publicLimitEarned + 1,
      privateLimitEarned: promo.privateLimitEarned + 1,
    }).where(eq(promocodes.id, promo.id));

    res.json({
      ok: true,
      ownerName: t.name,
      ownerTelegramId: t.telegramId,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});
