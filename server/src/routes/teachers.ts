import { Router } from 'express';
import { db } from '../db';
import { teachers, tests, results } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { adminAuth } from '../middleware/auth';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, BorderStyle, WidthType, ShadingType, convertInchesToTwip,
} from 'docx';

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

// ── DOCX ──
adminRouter.get('/tests/:id/docx', async (req, res) => {
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

// docx imported at top

    const letters = ['A', 'B', 'C', 'D'];
    const qs = (test as any).questions;
    const teacherName = (test as any).teacher?.name || 'Admin';

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 6, color: '4F46E5' },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      },
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [new Paragraph({ children: [new TextRun({ text: 'testifyuz.online', bold: true, size: 24, color: '4F46E5' })] })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: teacherName, bold: true, size: 24, color: '4F46E5' })] })],
          }),
        ],
      })],
    });

    const titlePara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: test.title, bold: true, size: 32 })],
    });
    const infoPara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `${test.subject}  |  ${qs.length} ta savol  |  ${Math.floor(test.durationSeconds / 60)} daqiqa`, size: 20, color: '666666' })],
    });

    const questionRows: any[] = [];
    for (let i = 0; i < qs.length; i += 2) {
      const makeQCell = (q: any, idx: number) => new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.DOTTED, size: 1, color: 'CCCCCC' },
          left: { style: BorderStyle.NONE },
          right: { style: i + 1 < qs.length ? BorderStyle.DOTTED : BorderStyle.NONE, size: 1, color: 'CCCCCC' },
        },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [
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
        ],
      });

      const cells: any[] = [makeQCell(qs[i], i)];
      if (i + 1 < qs.length) {
        cells.push(makeQCell(qs[i + 1], i + 1));
      } else {
        cells.push(new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          children: [new Paragraph({ children: [] })],
        }));
      }
      questionRows.push(new TableRow({ children: cells }));
    }

    const questionsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: questionRows,
    });

    const answerHeader = new Paragraph({
      spacing: { before: 400, after: 120 },
      children: [new TextRun({ text: "TO'G'RI JAVOBLAR", bold: true, size: 24 })],
    });

    const COLS = 20;
    const answerRows: any[] = [];
    for (let start = 0; start < qs.length; start += COLS) {
      const end = Math.min(start + COLS, qs.length);
      const cellBorder = {
        top: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      };
      const numCells = [];
      const ansCells = [];
      for (let i = start; i < end; i++) {
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
