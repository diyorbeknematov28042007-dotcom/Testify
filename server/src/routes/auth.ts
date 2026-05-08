import { Router } from 'express';
import { db } from '../db';
import { teachers, teacherAuthTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { setAdminToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

export const authRouter = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
authRouter.use(limiter);

authRouter.post('/teacher/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.login, login) });
    if (!teacher || teacher.password !== password) {
      return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
    }
    const token = uuidv4();
    await db.insert(teacherAuthTokens).values({ token, teacherId: teacher.id });
    res.json({ token, name: teacher.name });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

authRouter.post('/teacher/register', async (req, res) => {
  try {
    const { login, password, name } = req.body;
    if (!login || login.length < 3) return res.status(400).json({ error: 'Login kamida 3 belgi' });
    if (!password || password.length < 4) return res.status(400).json({ error: 'Parol kamida 4 belgi' });
    if (!name) return res.status(400).json({ error: 'Ism kerak' });

    const existing = await db.query.teachers.findFirst({ where: eq(teachers.login, login) });
    if (existing) return res.status(409).json({ error: 'Bu login band' });

   const [teacher] = await db.insert(teachers).values({ 
  login, password, name,
  publicTestLimit: 3,
  privateTestLimit: 1
}).returning();
    const token = uuidv4();
    await db.insert(teacherAuthTokens).values({ token, teacherId: teacher.id });
    res.json({ token, name: teacher.name });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

authRouter.post('/teacher/logout', async (req, res) => {
  const token = req.headers['x-teacher-token'] as string;
  if (token) await db.delete(teacherAuthTokens).where(eq(teacherAuthTokens.token, token));
  res.json({ ok: true });
});

authRouter.post('/admin/login', (req, res) => {
  const { username } = req.body;
  if (username !== 'D1yoRBeK') return res.status(401).json({ error: "Noto'g'ri username" });
  const token = uuidv4();
  setAdminToken(token);
  res.json({ token });
});
