import { Router } from 'express';
import { db } from '../db';
import { tests, questions, results, teachers, teacherAuthTokens, promocodes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { teacherAuth } from '../middleware/auth';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, BorderStyle, WidthType, ShadingType, convertInchesToTwip,
} from 'docx';

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

// DOCX — Test
teachersRouter.get('/tests/:id/docx', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)),
      with: { questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] } },
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    // docx imported at top

    const letters = ['A', 'B', 'C', 'D'];
    const qs = (test as any).questions;

    // Header paragraphs
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 6, color: '4F46E5' },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [new Paragraph({ children: [new TextRun({ text: 'testifyuz.online', bold: true, size: 24, color: '4F46E5' })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: teacher.name, bold: true, size: 24, color: '4F46E5' })] })],
            }),
          ],
        }),
      ],
    });

    const titlePara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: test.title, bold: true, size: 32 })],
    });
    const infoPara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `${test.subject}  |  ${qs.length} ta savol  |  ${Math.floor(test.durationSeconds / 60)} daqiqa`, size: 20, color: '666666' }),
      ],
    });

    // Questions in 2 columns
    const questionRows: any[] = [];
    for (let i = 0; i < qs.length; i += 2) {
      const makeQCell = (q: any, idx: number) => {
        const children: any[] = [
          new Paragraph({
            spacing: { before: 60, after: 40 },
            children: [new TextRun({ text: `${idx + 1}. ${q.text}`, bold: true, size: 18 })],
          }),
          ...q.options.map((opt: string, j: number) =>
            new Paragraph({
              spacing: { before: 20, after: 20 },
              indent: { left: convertInchesToTwip(0.15) },
              children: [new TextRun({ text: `${letters[j]}) ${opt}`, size: 18 })],
            })
          ),
        ];
        return new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.DOTTED, size: 1, color: 'CCCCCC' },
            left: { style: BorderStyle.NONE }, right: { style: i + 1 < qs.length ? BorderStyle.DOTTED : BorderStyle.NONE, size: 1, color: 'CCCCCC' },
          },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children,
        });
      };

      const cells: any[] = [makeQCell(qs[i], i)];
      if (i + 1 < qs.length) cells.push(makeQCell(qs[i + 1], i + 1));
      else cells.push(new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        children: [new Paragraph({ children: [] })],
      }));

      questionRows.push(new TableRow({ children: cells }));
    }

    const questionsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: questionRows,
    });

    // Answers table
    const answerHeader = new Paragraph({
      spacing: { before: 400, after: 120 },
      children: [new TextRun({ text: "TO'G'RI JAVOBLAR", bold: true, size: 24 })],
    });

    const COLS = 20;
    const answerRows: any[] = [];
    for (let start = 0; start < qs.length; start += COLS) {
      const end = Math.min(start + COLS, qs.length);
      const numCells = [];
      const ansCells = [];
      for (let i = start; i < end; i++) {
        const cellBorder = { top: { style: BorderStyle.SINGLE, size: 4, color: '999999' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' }, left: { style: BorderStyle.SINGLE, size: 4, color: '999999' }, right: { style: BorderStyle.SINGLE, size: 4, color: '999999' } };
        numCells.push(new TableCell({
          borders: cellBorder,
          shading: { type: ShadingType.SOLID, color: 'F1F5F9' },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${i + 1}`, bold: true, size: 16 })] })],
        }));
        ansCells.push(new TableCell({
          borders: cellBorder,
          shading: { type: ShadingType.SOLID, color: 'F0FDF4' },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: letters[qs[i].correctAnswer], bold: true, size: 18, color: '16A34A' })] })],
        }));
      }
      answerRows.push(new TableRow({ children: numCells }));
      answerRows.push(new TableRow({ children: ansCells }));
    }

    const answersTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: answerRows,
    });

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [headerTable, titlePara, infoPara, questionsTable, answerHeader, answersTable],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${test.code}_test.docx"`);
    res.send(buffer);
  } catch (e: any) {
    console.error('DOCX error:', e);
    res.status(500).json({ error: 'DOCX xatosi: ' + e.message });
  }
});

// DOCX — Results
teachersRouter.get('/tests/:id/results/docx', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)),
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    const resultsList = await db.query.results.findMany({
      where: eq(results.testId, testId),
      orderBy: (r, { desc }) => [desc(r.score)],
    });

// docx imported at top

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 6, color: '4F46E5' },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [new Paragraph({ children: [new TextRun({ text: 'testifyuz.online', bold: true, size: 24, color: '4F46E5' })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: teacher.name, bold: true, size: 24, color: '4F46E5' })] })],
            }),
          ],
        }),
      ],
    });

    const titlePara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: 'NATIJALAR', bold: true, size: 32 })],
    });
    const subPara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `${test.title}  |  Jami: ${resultsList.length} ta`, size: 20, color: '666666' })],
    });

    const cellBorder = {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
    };
    const cellMargins = { top: 60, bottom: 60, left: 80, right: 80 };

    const makeCell = (text: string, bold = false, color = '111111', shade = 'FFFFFF') =>
      new TableCell({
        borders: cellBorder,
        shading: { type: ShadingType.SOLID, color: shade },
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold, size: 17, color })] })],
      });

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        makeCell('#', true, 'FFFFFF', '4F46E5'),
        makeCell('F.I.SH', true, 'FFFFFF', '4F46E5'),
        makeCell('Ball', true, 'FFFFFF', '4F46E5'),
        makeCell("To'g'ri", true, 'FFFFFF', '4F46E5'),
        makeCell('Jami', true, 'FFFFFF', '4F46E5'),
        makeCell('Foiz', true, 'FFFFFF', '4F46E5'),
        makeCell('Vaqt', true, 'FFFFFF', '4F46E5'),
        makeCell('Sana', true, 'FFFFFF', '4F46E5'),
      ],
    });

    const dataRows = resultsList.map((r, i) => {
      const pct = Math.round((r.correctAnswers / r.totalQuestions) * 100);
      const timeStr = r.timeSpent ? `${Math.floor(r.timeSpent / 60)}:${String(r.timeSpent % 60).padStart(2, '0')}` : '—';
      const shade = i % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      return new TableRow({
        children: [
          makeCell(`${i + 1}`, false, '555555', shade),
          makeCell(r.studentName.substring(0, 25), false, '111111', shade),
          makeCell(parseFloat(r.score.toString()).toFixed(1), true, '4F46E5', shade),
          makeCell(`${r.correctAnswers}`, false, '16A34A', shade),
          makeCell(`${r.totalQuestions}`, false, '555555', shade),
          makeCell(`${pct}%`, false, pct >= 60 ? '16A34A' : 'DC2626', shade),
          makeCell(timeStr, false, '555555', shade),
          makeCell(new Date(r.createdAt).toLocaleDateString('uz-UZ'), false, '555555', shade),
        ],
      });
    });

    const resultsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    });

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [headerTable, titlePara, subPara, resultsTable],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${test.code}_results.docx"`);
    res.send(buffer);
  } catch (e: any) {
    console.error('DOCX error:', e);
    res.status(500).json({ error: 'DOCX xatosi: ' + e.message });
  }
});

// Promocode
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
