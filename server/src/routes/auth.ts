import { Router } from 'express';
import { db } from '../db';
import { teachers, teacherAuthTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const authRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'D1yoRBeK';

function genVerifyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function genTeacherId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// ── TEACHER AUTH ──
authRouter.post('/teacher/register', async (req, res) => {
  try {
    const { login, password, name } = req.body;
    if (!login || !password || !name)
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
    if (login.length < 4)
      return res.status(400).json({ error: 'Login kamida 4 belgi' });
    if (password.length < 4)
      return res.status(400).json({ error: 'Parol kamida 4 belgi' });

    const existing = await db.query.teachers.findFirst({ where: eq(teachers.login, login) });
    if (existing) return res.status(400).json({ error: 'Bu login allaqachon band' });

    const teacherId = genTeacherId();
    const verifyCode = genVerifyCode();
    const verifyCodeExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 daqiqa

    const [teacher] = await db.insert(teachers).values({
      login, password, name, teacherId,
      verifyCode, verifyCodeExpiry,
      isVerified: false,
    }).returning();

    res.json({
      ok: true,
      teacherId: teacher.teacherId,
      verifyCode: teacher.verifyCode,
      message: `Ro'yxatdan o'tdingiz! Botga quyidagi kodni yuboring: ${verifyCode}`,
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

authRouter.post('/teacher/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.login, login) });

    if (!teacher || teacher.password !== password)
      return res.status(401).json({ error: "Login yoki parol noto'g'ri" });

    if (!teacher.isVerified)
      return res.status(403).json({
        error: 'Akkaunt tasdiqlanmagan',
        needsVerification: true,
        verifyCode: teacher.verifyCode,
        teacherId: teacher.teacherId,
        login: teacher.login,
      });

    const token = uuidv4();
    await db.insert(teacherAuthTokens).values({ token, teacherId: teacher.id });

    res.json({
      ok: true,
      token,
      teacher: {
        id: teacher.id,
        teacherId: teacher.teacherId,
        name: teacher.name,
        login: teacher.login,
        currentTariff: teacher.currentTariff,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

authRouter.post('/teacher/logout', async (req, res) => {
  const token = req.headers['x-teacher-token'] as string;
  if (token) await db.delete(teacherAuthTokens).where(eq(teacherAuthTokens.token, token));
  res.json({ ok: true });
});

// Yangi verify code olish
authRouter.post('/teacher/resend-code', async (req, res) => {
  try {
    const { login } = req.body;
    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.login, login) });
    if (!teacher) return res.status(404).json({ error: 'Topilmadi' });
    if (teacher.isVerified) return res.status(400).json({ error: 'Allaqachon tasdiqlangan' });

    const verifyCode = genVerifyCode();
    const verifyCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await db.update(teachers).set({ verifyCode, verifyCodeExpiry }).where(eq(teachers.id, teacher.id));

    res.json({ ok: true, verifyCode });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── ADMIN AUTH ──
authRouter.post('/admin/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (username !== ADMIN_USERNAME)
      return res.status(401).json({ error: "Noto'g'ri username" });

    const token = `admin_${uuidv4()}`;
    res.json({ ok: true, token });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});
