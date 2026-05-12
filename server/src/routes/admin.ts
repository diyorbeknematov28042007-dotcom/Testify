import { Router } from 'express';
import { db } from '../db';
import { teachers, tests, results } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { adminAuth } from '../middleware/auth';

export const adminRouter = Router();
adminRouter.use(adminAuth);

// ── STATS ──
adminRouter.get('/stats', async (req, res) => {
  try {
    const teacherCount = await db.select({ count: count() }).from(teachers).then(r => Number(r[0].count));
    const testCount = await db.select({ count: count() }).from(tests).then(r => Number(r[0].count));
    const attemptCount = await db.select({ count: count() }).from(results).then(r => Number(r[0].count));
    const allTests = await db.query.tests.findMany();
    const publicCount = allTests.filter(t => t.type === 'public').length;
    const privateCount = allTests.filter(t => t.type === 'private').length;
    const activeCount = allTests.filter(t => t.isActive).length;
    res.json({ teacherCount, testCount, attemptCount, publicCount, privateCount, activeCount });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── TEACHERS ──
adminRouter.get('/teachers', async (req, res) => {
  try {
    const allTeachers = await db.query.teachers.findMany({
      with: { tests: { columns: { id: true, type: true } } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    res.json(allTeachers.map(t => ({
      id: t.id,
      teacherId: t.teacherId,
      name: t.name,
      login: t.login,
      password: t.password,
      publicTestLimit: t.publicTestLimit,
      privateTestLimit: t.privateTestLimit,
      currentTariff: t.currentTariff,
      createdAt: t.createdAt,
      publicCount: (t.tests as any[]).filter(x => x.type === 'public').length,
      privateCount: (t.tests as any[]).filter(x => x.type === 'private').length,
    })));
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

adminRouter.post('/teachers', async (req, res) => {
  try {
    const { login, password, name } = req.body;
    if (!login || !password || !name)
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
    const existing = await db.query.teachers.findFirst({ where: eq(teachers.login, login) });
    if (existing) return res.status(400).json({ error: 'Bu login band' });
    const teacherId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const [teacher] = await db.insert(teachers).values({ login, password, name, teacherId }).returning();
    res.json(teacher);
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

adminRouter.delete('/teachers/:id', async (req, res) => {
  try {
    await db.delete(teachers).where(eq(teachers.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

adminRouter.patch('/teachers/:id/limits', async (req, res) => {
  try {
    const { publicTestLimit, privateTestLimit, currentTariff } = req.body;
    const updateData: any = {};
    if (publicTestLimit !== undefined) updateData.publicTestLimit = publicTestLimit;
    if (privateTestLimit !== undefined) updateData.privateTestLimit = privateTestLimit;
    if (currentTariff !== undefined) updateData.currentTariff = currentTariff;
    await db.update(teachers).set(updateData).where(eq(teachers.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── TESTS ──
adminRouter.get('/tests', async (req, res) => {
  try {
    const allTests = await db.query.tests.findMany({
      with: {
        teacher: { columns: { name: true } },
        questions: { columns: { id: true } },
        results: { columns: { id: true } },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    res.json(allTests.map(t => ({
      ...t,
      teacherName: (t as any).teacher?.name || '—',
      questionCount: (t as any).questions?.length || 0,
      attemptCount: (t as any).results?.length || 0,
    })));
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

adminRouter.post('/tests/:id/stop', async (req, res) => {
  try {
    await db.update(tests)
      .set({ isActive: false, stoppedAt: new Date() })
      .where(eq(tests.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

adminRouter.post('/tests/:id/restart', async (req, res) => {
  try {
    await db.update(tests)
      .set({ isActive: true, stoppedAt: null })
      .where(eq(tests.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

adminRouter.delete('/tests/:id', async (req, res) => {
  try {
    await db.delete(tests).where(eq(tests.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ── PDF ──
adminRouter.get('/tests/:id/pdf', async (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({
      where: eq(tests.id, testId),
      with: {
        questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] },
        teacher: { columns: { name: true } },
      },
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfLib = require('pdf-lib');
    const PDFDocument = pdfLib.PDFDocument;
    const rgb = pdfLib.rgb;
    const StandardFonts = pdfLib.StandardFonts;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const letters = ['A', 'B', 'C', 'D'];
    const W = 595, H = 842, M = 40;
    const colW = (W - M * 2 - 20) / 2;
    const teacherName = (test as any).teacher?.name || 'Admin';

    let page = pdfDoc.addPage([W, H]);
    let yL = H - M, yR = H - M;
    let col = 0;

    const drawHeader = () => {
      page.drawRectangle({ x: 0, y: H - 28, width: W, height: 28, color: rgb(0.31, 0.25, 0.85) });
      page.drawText('testifyuz.online', { x: M, y: H - 20, size: 11, font: boldFont, color: rgb(1, 1, 1) });
      const tw = boldFont.widthOfTextAtSize(teacherName, 11);
      page.drawText(teacherName, { x: W - M - tw, y: H - 20, size: 11, font: boldFont, color: rgb(1, 1, 1) });
      page.drawText(test.title, { x: M, y: H - 50, size: 13, font: boldFont });
      page.drawText(`${test.subject} | ${(test as any).questions.length} savol | ${Math.floor(test.durationSeconds / 60)} daqiqa`, { x: M, y: H - 66, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
      page.drawLine({ start: { x: M, y: H - 76 }, end: { x: W - M, y: H - 76 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      yL = H - 92; yR = H - 92;
    };
    drawHeader();

    const wrap = (txt: string, mw: number, sz: number) => {
      const ws = txt.split(' '); const ls: string[] = []; let cur = '';
      for (const w of ws) {
        const t2 = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(t2, sz) > mw && cur) { ls.push(cur); cur = w; } else cur = t2;
      }
      if (cur) ls.push(cur);
      return ls;
    };

    for (let i = 0; i < (test as any).questions.length; i++) {
      const q = (test as any).questions[i];
      const x = col === 0 ? M : M + colW + 20;
      let y = col === 0 ? yL : yR;
      const need = 16 + q.options.length * 13 + 8;
      if (y - need < M + 20) {
        if (col === 0) {
          col = 1; y = yR;
          if (y - need < M + 20) { page = pdfDoc.addPage([W, H]); drawHeader(); col = 0; y = yL; }
        } else {
          page = pdfDoc.addPage([W, H]); drawHeader(); col = 0; y = yL;
        }
      }
      const qLines = wrap(`${i + 1}. ${q.text}`, colW - 4, 9);
      for (const l of qLines) { page.drawText(l, { x, y, size: 9, font: boldFont }); y -= 12; }
      for (let j = 0; j < q.options.length; j++) {
        const optLines = wrap(`${letters[j]}) ${(q.options as string[])[j]}`, colW - 12, 8.5);
        for (const l of optLines) { page.drawText(l, { x: x + 8, y, size: 8.5, font }); y -= 11; }
      }
      y -= 5;
      if (col === 0) yL = y; else yR = y;
    }

    // Javoblar sahifasi
    const ap = pdfDoc.addPage([W, H]);
    ap.drawRectangle({ x: 0, y: H - 28, width: W, height: 28, color: rgb(0.31, 0.25, 0.85) });
    ap.drawText('testifyuz.online', { x: M, y: H - 20, size: 11, font: boldFont, color: rgb(1, 1, 1) });
    const tw2 = boldFont.widthOfTextAtSize(teacherName, 11);
    ap.drawText(teacherName, { x: W - M - tw2, y: H - 20, size: 11, font: boldFont, color: rgb(1, 1, 1) });
    ap.drawText("TO'G'RI JAVOBLAR", { x: M, y: H - 55, size: 13, font: boldFont });
    ap.drawText(test.title, { x: M, y: H - 72, size: 10, font });

    const cw = 42, ch = 22;
    const cols2 = Math.floor((W - M * 2) / cw);
    let tx = M, ty = H - 100;
    const qs = (test as any).questions;
    const rows = Math.ceil(qs.length / cols2);

    for (let r = 0; r < rows; r++) {
      const start = r * cols2;
      const end = Math.min(start + cols2, qs.length);
      for (let i = start; i < end; i++) {
        const ci = i - start;
        ap.drawRectangle({ x: tx + ci * cw, y: ty - ch, width: cw, height: ch, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5, color: rgb(0.95, 0.95, 0.95) });
        ap.drawText(`${i + 1}`, { x: tx + ci * cw + cw / 2 - 5, y: ty - ch + 7, size: 9, font: boldFont });
      }
      ty -= ch;
      for (let i = start; i < end; i++) {
        const ci = i - start;
        ap.drawRectangle({ x: tx + ci * cw, y: ty - ch, width: cw, height: ch, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5, color: rgb(0.9, 1, 0.9) });
        ap.drawText(letters[qs[i].correctAnswer], { x: tx + ci * cw + cw / 2 - 4, y: ty - ch + 7, size: 10, font: boldFont, color: rgb(0.1, 0.5, 0.1) });
      }
      ty -= ch + 6;
    }

    const bytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${test.code}_test.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (e: any) {
    console.error('PDF error:', e);
    res.status(500).json({ error: 'PDF xatosi: ' + e.message });
  }
});
