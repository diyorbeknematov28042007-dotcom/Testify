import { Router } from 'express';
import { db } from '../db';
import { teachers } from '../db/schema';
import { eq } from 'drizzle-orm';

export const botRouter = Router();

const BOT_SECRET = process.env.BOT_SECRET || '';

botRouter.post('/add-limit', async (req, res) => {
  try {
    const { teacherId, publicLimit, privateLimit, secret } = req.body;

    if (!secret || secret !== BOT_SECRET) {
      return res.status(401).json({ error: 'Ruxsat yo\'q' });
    }

    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId kerak' });
    }

    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.teacherId, teacherId),
    });

    if (!teacher) {
      return res.status(404).json({ error: 'O\'qituvchi topilmadi' });
    }

    await db.update(teachers).set({
      publicTestLimit: teacher.publicTestLimit + (publicLimit || 0),
      privateTestLimit: teacher.privateTestLimit + (privateLimit || 0),
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
