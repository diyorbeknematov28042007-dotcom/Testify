import { Router } from 'express';
import { db } from '../db';
import { teachers, promocodes } from '../db/schema';
import { eq } from 'drizzle-orm';

export const botRouter = Router();

const BOT_SECRET = process.env.BOT_SECRET || '';

botRouter.post('/add-limit', async (req, res) => {
  try {
    const { teacherId, publicLimit, privateLimit, tariffName, secret } = req.body;
    if (!secret || secret !== BOT_SECRET) return res.status(401).json({ error: "Ruxsat yo'q" });

    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.teacherId, teacherId) });
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

botRouter.post('/promocode/validate', async (req, res) => {
  try {
    const { code, secret } = req.body;
    if (!secret || secret !== BOT_SECRET) return res.status(401).json({ error: "Ruxsat yo'q" });

    const promo = await db.query.promocodes.findFirst({
      where: eq(promocodes.code, code.toUpperCase()),
      with: { teacher: true },
    });

    if (!promo) return res.status(404).json({ error: "Promokod topilmadi" });

    res.json({
      ok: true,
      code: promo.code,
      teacherName: promo.teacher.name,
      teacherId: promo.teacher.teacherId,
      usageCount: promo.usageCount,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

botRouter.post('/promocode/apply', async (req, res) => {
  try {
    const { code, secret } = req.body;
    if (!secret || secret !== BOT_SECRET) return res.status(401).json({ error: "Ruxsat yo'q" });

    const promo = await db.query.promocodes.findFirst({
      where: eq(promocodes.code, code.toUpperCase()),
      with: { teacher: true },
    });

    if (!promo) return res.status(404).json({ error: "Promokod topilmadi" });

    await db.update(teachers).set({
      publicTestLimit: promo.teacher.publicTestLimit + 1,
      privateTestLimit: promo.teacher.privateTestLimit + 1,
    }).where(eq(teachers.id, promo.teacher.id));

    await db.update(promocodes).set({
      usageCount: promo.usageCount + 1,
      publicLimitEarned: promo.publicLimitEarned + 1,
      privateLimitEarned: promo.privateLimitEarned + 1,
    }).where(eq(promocodes.id, promo.id));

    res.json({ ok: true, ownerName: promo.teacher.name, ownerTeleacherId: promo.teacher.teacherId });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});
