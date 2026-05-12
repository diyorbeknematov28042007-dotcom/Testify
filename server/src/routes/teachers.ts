import { Router } from 'express';
import { db } from '../db';
import { tests, questions, results, teachers, teacherAuthTokens, promocodes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { teacherAuth } from '../middleware/auth';

export const teachersRouter = Router();
teachersRouter.use(teacherAuth);

function genCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function genPromoCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

teachersRouter.get('/me', async (req, res) => {
  const teacher = (req as any).teacher;
  const myTests = await db.query.tests.findMany({ where: eq(tests.teacherId, teacher.id) });
  res.json({
    id: teacher.id, teacherId: teacher.teacherId, name: teacher.name, login: teacher.login,
    publicTestLimit: teacher.publicTestLimit, privateTestLimit: teacher.privateTestLimit,
    currentTariff: teacher.currentTariff,
    publicCount: myTests.filter(t => t.type === 'public').length,
    privateCount: myTests.filter(t => t.type === 'private').length,
  });
});

teachersRouter.patch('/me/password', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const { oldPassword, newPassword } = req.body;
    if (teacher.password !== oldPassword) return res.status(400).json({ error: "Eski parol noto'g'ri" });
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Yangi parol kamida 4 belgi' });
    await db.update(teachers).set({ password: newPassword }).where(eq(teachers.id, teacher.id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

teachersRouter.get('/tests', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const stopped = await db.query.tests.findMany({ where: and(eq(tests.teacherId, teacher.id), eq(tests.isActive, false)) });
    for (const t of stopped) {
      if (t.stoppedAt && new Date(t.stoppedAt) < fortyEightHoursAgo) {
        await db.delete(tests).where(eq(tests.id, t.id));
      }
    }
    const myTests = await db.query.tests.findMany({
      where: eq(tests.teacherId, teacher.id),
      with: { questions: { columns: { id: true } }, results: { columns: { id: true } } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    res.json(myTests.map(t => ({ ...t, questionCount: t.questions.length, attemptCount: t.results.length })));
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

teachersRouter.post('/tests', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const { title, subject, description, type, scoringType, durationSeconds, questions: qs } = req.body;
    const myTests = await db.query.tests.findMany({ where: eq(tests.teacherId, teacher.id) });
    if (type === 'public' && myTests.filter(t => t.type === 'public').length >= teacher.publicTestLimit)
      return res.status(403).json({ error: `Ommaviy test limiti: ${teacher.publicTestLimit}` });
    if (type === 'private' && myTests.filter(t => t.type === 'private').length >= teacher.privateTestLimit)
      return res.status(403).json({ error: `Shaxsiy test limiti: ${teacher.privateTestLimit}` });

    let code = genCode();
    while (await db.query.tests.findFirst({ where: eq(tests.code, code) })) code = genCode();

    const [test] = await db.insert(tests).values({ teacherId: teacher.id, title, subject, description, code, type, scoringType: scoringType || 'simple', durationSeconds }).returning();
    if (qs?.length > 0) {
      await db.insert(questions).values(qs.map((q: any, i: number) => ({ testId: test.id, text: q.text, imageUrl: q.imageUrl || null, options: q.options, correctAnswer: q.correctAnswer, orderIndex: i })));
    }
    res.json(test);
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

teachersRouter.get('/tests/:id', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, parseInt(req.params.id)), eq(tests.teacherId, teacher.id)),
      with: { questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] } },
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });
    res.json(test);
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

teachersRouter.patch('/tests/:id', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({ where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)) });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });
    const { title, subject, description, type, scoringType, durationSeconds, questions: qs } = req.body;
    await db.update(tests).set({ title, subject, description, type, scoringType, durationSeconds }).where(eq(tests.id, testId));
    if (qs) {
      await db.delete(questions).where(eq(questions.testId, testId));
      if (qs.length > 0) await db.insert(questions).values(qs.map((q: any, i: number) => ({ testId, text: q.text, imageUrl: q.imageUrl || null, options: q.options, correctAnswer: q.correctAnswer, orderIndex: i })));
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

teachersRouter.delete('/tests/:id', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const test = await db.query.tests.findFirst({ where: and(eq(tests.id, parseInt(req.params.id)), eq(tests.teacherId, teacher.id)) });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });
    await db.delete(tests).where(eq(tests.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

teachersRouter.post('/tests/:id/clone', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const original = await db.query.tests.findFirst({
      where: and(eq(tests.id, parseInt(req.params.id)), eq(tests.teacherId, teacher.id)),
      with: { questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] } },
    });
    if (!original) return res.status(404).json({ error: 'Topilmadi' });
    let code = genCode();
    while (await db.query.tests.findFirst({ where: eq(tests.code, code) })) code = genCode();
    const [cloned] = await db.insert(tests).values({ teacherId: teacher.id, title: `${original.title} (nusxa)`, subject: original.subject, description: original.description, code, type: original.type, scoringType: original.scoringType, durationSeconds: original.durationSeconds }).returning();
    if (original.questions.length > 0) await db.insert(questions).values(original.questions.map(q => ({ testId: cloned.id, text: q.text, imageUrl: q.imageUrl, options: q.options, correctAnswer: q.correctAnswer, orderIndex: q.orderIndex })));
    res.json(cloned);
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

teachersRouter.post('/tests/:id/stop', async (req, res) => {
  const teacher = (req as any).teacher;
  await db.update(tests).set({ isActive: false, stoppedAt: new Date() }).where(and(eq(tests.id, parseInt(req.params.id)), eq(tests.teacherId, teacher.id)));
  res.json({ ok: true, warning: "Test to'xtatildi. 48 soat ichida avtomatik o'chiriladi!" });
});

teachersRouter.get('/tests/:id/results', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({ where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)) });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });
    const res2 = await db.query.results.findMany({ where: eq(results.testId, testId), orderBy: (r, { desc }) => [desc(r.score)] });
    res.json({ test, results: res2 });
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

// PDF — Test
teachersRouter.get('/tests/:id/pdf', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)),
      with: { questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] } },
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const letters = ['A', 'B', 'C', 'D'];
    const W = 595, H = 842, M = 40;
    const colW = (W - M * 2 - 20) / 2;

    let page = pdfDoc.addPage([W, H]);
    let yL = H - M, yR = H - M;
    let col = 0;

    const drawHeader = () => {
      page.drawRectangle({ x: 0, y: H - 28, width: W, height: 28, color: rgb(0.31, 0.25, 0.85) });
      page.drawText('testifyuz.online', { x: M, y: H - 20, size: 11, font: boldFont, color: rgb(1,1,1) });
      const tw = boldFont.widthOfTextAtSize(teacher.name, 11);
      page.drawText(teacher.name, { x: W - M - tw, y: H - 20, size: 11, font: boldFont, color: rgb(1,1,1) });
      page.drawText(test.title, { x: M, y: H - 50, size: 13, font: boldFont });
      page.drawText(`${test.subject} | ${test.questions.length} savol | ${Math.floor(test.durationSeconds/60)} daqiqa`, { x: M, y: H - 66, size: 9, font, color: rgb(0.5,0.5,0.5) });
      page.drawLine({ start: {x: M, y: H-76}, end: {x: W-M, y: H-76}, thickness: 0.5, color: rgb(0.8,0.8,0.8) });
      yL = H - 92; yR = H - 92;
    };
    drawHeader();

    const wrap = (txt: string, mw: number, sz: number) => {
      const ws = txt.split(' '); const ls: string[] = []; let cur = '';
      for (const w of ws) { const t2 = cur ? `${cur} ${w}` : w; if (font.widthOfTextAtSize(t2, sz) > mw && cur) { ls.push(cur); cur = w; } else cur = t2; }
      if (cur) ls.push(cur);
      return ls;
    };

    for (let i = 0; i < test.questions.length; i++) {
      const q = test.questions[i];
      const x = col === 0 ? M : M + colW + 20;
      let y = col === 0 ? yL : yR;
      const need = 16 + q.options.length * 13 + 8;
      if (y - need < M + 20) {
        if (col === 0) { col = 1; y = yR; if (y - need < M + 20) { page = pdfDoc.addPage([W,H]); drawHeader(); col = 0; y = yL; } }
        else { page = pdfDoc.addPage([W,H]); drawHeader(); col = 0; y = yL; }
      }
      const qLines = wrap(`${i+1}. ${q.text}`, colW - 4, 9);
      for (const l of qLines) { page.drawText(l, { x, y, size: 9, font: boldFont }); y -= 12; }
      for (let j = 0; j < q.options.length; j++) {
        const optLines = wrap(`${letters[j]}) ${(q.options as string[])[j]}`, colW - 12, 8.5);
        for (const l of optLines) { page.drawText(l, { x: x+8, y, size: 8.5, font }); y -= 11; }
      }
      y -= 5;
      if (col === 0) yL = y; else yR = y;
    }

    // Answers page
    const ap = pdfDoc.addPage([W, H]);
    ap.drawRectangle({ x: 0, y: H-28, width: W, height: 28, color: rgb(0.31,0.25,0.85) });
    ap.drawText('testifyuz.online', { x: M, y: H-20, size: 11, font: boldFont, color: rgb(1,1,1) });
    const tw2 = boldFont.widthOfTextAtSize(teacher.name, 11);
    ap.drawText(teacher.name, { x: W-M-tw2, y: H-20, size: 11, font: boldFont, color: rgb(1,1,1) });
    ap.drawText("TO'G'RI JAVOBLAR", { x: M, y: H-55, size: 13, font: boldFont });
    ap.drawText(test.title, { x: M, y: H-72, size: 10, font });

    const cw = 42, ch = 22;
    const cols2 = Math.floor((W - M*2) / cw);
    let tx = M, ty = H - 100;

    const rows = Math.ceil(test.questions.length / cols2);
    for (let r = 0; r < rows; r++) {
      const start = r * cols2;
      const end = Math.min(start + cols2, test.questions.length);
      for (let i = start; i < end; i++) {
        const ci = i - start;
        ap.drawRectangle({ x: tx + ci*cw, y: ty-ch, width: cw, height: ch, borderColor: rgb(0.8,0.8,0.8), borderWidth: 0.5, color: rgb(0.95,0.95,0.95) });
        ap.drawText(`${i+1}`, { x: tx+ci*cw+cw/2-5, y: ty-ch+7, size: 9, font: boldFont });
      }
      ty -= ch;
      for (let i = start; i < end; i++) {
        const ci = i - start;
        ap.drawRectangle({ x: tx+ci*cw, y: ty-ch, width: cw, height: ch, borderColor: rgb(0.8,0.8,0.8), borderWidth: 0.5, color: rgb(0.9,1,0.9) });
        ap.drawText(letters[test.questions[i].correctAnswer], { x: tx+ci*cw+cw/2-4, y: ty-ch+7, size: 10, font: boldFont, color: rgb(0.1,0.5,0.1) });
      }
      ty -= ch + 6;
    }

    const bytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${test.code}_test.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (e: any) { res.status(500).json({ error: 'PDF xatosi' }); }
});

// PDF — Results
teachersRouter.get('/tests/:id/results/pdf', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({ where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)) });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    const resultsList = await db.query.results.findMany({ where: eq(results.testId, testId), orderBy: (r, { desc }) => [desc(r.score)] });
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const W = 595, H = 842, M = 40;

    let page = pdfDoc.addPage([W, H]);
    let y = H - M;

    const drawHeader = () => {
      page.drawRectangle({ x: 0, y: H-28, width: W, height: 28, color: rgb(0.31,0.25,0.85) });
      page.drawText('testifyuz.online', { x: M, y: H-20, size: 11, font: boldFont, color: rgb(1,1,1) });
      const tw = boldFont.widthOfTextAtSize(teacher.name, 11);
      page.drawText(teacher.name, { x: W-M-tw, y: H-20, size: 11, font: boldFont, color: rgb(1,1,1) });
      page.drawText('NATIJALAR', { x: M, y: H-50, size: 13, font: boldFont });
      page.drawText(`${test.title} | Jami: ${resultsList.length} ta`, { x: M, y: H-66, size: 9, font, color: rgb(0.5,0.5,0.5) });
      page.drawLine({ start: {x:M, y:H-76}, end: {x:W-M, y:H-76}, thickness: 0.5, color: rgb(0.8,0.8,0.8) });
      y = H - 95;
    };
    drawHeader();

    const cols3 = [
      { l: '#', x: M, w: 22 }, { l: 'F.I.SH', x: M+22, w: 155 },
      { l: 'Ball', x: M+177, w: 50 }, { l: "To'g'ri", x: M+227, w: 48 },
      { l: 'Jami', x: M+275, w: 40 }, { l: '%', x: M+315, w: 38 },
      { l: 'Vaqt', x: M+353, w: 48 }, { l: 'Sana', x: M+401, w: 90 },
    ];

    const drawTH = () => {
      page.drawRectangle({ x: M, y: y-18, width: W-M*2, height: 18, color: rgb(0.31,0.25,0.85) });
      for (const c of cols3) page.drawText(c.l, { x: c.x+2, y: y-13, size: 8, font: boldFont, color: rgb(1,1,1) });
      y -= 18;
    };
    drawTH();

    for (let i = 0; i < resultsList.length; i++) {
      if (y < M+20) { page = pdfDoc.addPage([W,H]); y = H-M; drawHeader(); drawTH(); }
      const r = resultsList[i];
      const pct = Math.round((r.correctAnswers / r.totalQuestions) * 100);
      const timeStr = r.timeSpent ? `${Math.floor(r.timeSpent/60)}:${String(r.timeSpent%60).padStart(2,'0')}` : '—';
      page.drawRectangle({ x: M, y: y-16, width: W-M*2, height: 16, color: i%2===0 ? rgb(1,1,1) : rgb(0.97,0.97,0.97), borderColor: rgb(0.9,0.9,0.9), borderWidth: 0.3 });
      const row = [`${i+1}`, r.studentName.substring(0,22), parseFloat(r.score.toString()).toFixed(1), `${r.correctAnswers}`, `${r.totalQuestions}`, `${pct}%`, timeStr, new Date(r.createdAt).toLocaleDateString('uz-UZ')];
      for (let ci = 0; ci < cols3.length; ci++) page.drawText(row[ci], { x: cols3[ci].x+2, y: y-11, size: 8, font });
      y -= 16;
    }

    const bytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${test.code}_results.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (e: any) { res.status(500).json({ error: 'PDF xatosi' }); }
});

// Promocode
teachersRouter.get('/promocode', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const promo = await db.query.promocodes.findFirst({ where: eq(promocodes.teacherId, teacher.id) });
    res.json(promo || null);
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});

teachersRouter.post('/promocode', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const existing = await db.query.promocodes.findFirst({ where: eq(promocodes.teacherId, teacher.id) });
    if (existing) return res.json(existing);
    let code = genPromoCode();
    while (await db.query.promocodes.findFirst({ where: eq(promocodes.code, code) })) code = genPromoCode();
    const [promo] = await db.insert(promocodes).values({ code, teacherId: teacher.id }).returning();
    res.json(promo);
  } catch (e) { res.status(500).json({ error: 'Server xatosi' }); }
});
