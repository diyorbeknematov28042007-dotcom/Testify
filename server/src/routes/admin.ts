import { Router } from 'express';
import { db } from '../db';
import { tests, questions, results, teachers, sessions } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { adminAuth } from '../middleware/auth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export const adminRouter = Router();
adminRouter.use(adminAuth);

// Stats
adminRouter.get('/stats', async (req, res) => {
  try {
    const allTeachers = await db.query.teachers.findMany();
    const allTests = await db.query.tests.findMany();
    const allResults = await db.query.results.findMany({ columns: { id: true } });

    res.json({
      teacherCount: allTeachers.length,
      testCount: allTests.length,
      attemptCount: allResults.length,
      publicCount: allTests.filter(t => t.type === 'public').length,
      privateCount: allTests.filter(t => t.type === 'private').length,
      activeCount: allTests.filter(t => t.isActive).length,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get all teachers
adminRouter.get('/teachers', async (req, res) => {
  try {
    const allTeachers = await db.query.teachers.findMany({
      with: {
        tests: { columns: { id: true, type: true } },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    res.json(allTeachers.map(t => ({
      id: t.id, login: t.login, password: t.password, name: t.name,
      publicTestLimit: t.publicTestLimit, privateTestLimit: t.privateTestLimit,
      createdAt: t.createdAt,
      publicCount: t.tests.filter(x => x.type === 'public').length,
      privateCount: t.tests.filter(x => x.type === 'private').length,
    })));
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Add teacher
adminRouter.post('/teachers', async (req, res) => {
  try {
    const { login, password, name } = req.body;
    if (!login || login.length < 3) return res.status(400).json({ error: 'Login kamida 3 belgi' });
    if (!password || password.length < 4) return res.status(400).json({ error: 'Parol kamida 4 belgi' });
    if (!name) return res.status(400).json({ error: 'Ism kerak' });

    const existing = await db.query.teachers.findFirst({ where: eq(teachers.login, login) });
    if (existing) return res.status(409).json({ error: 'Bu login band' });

    const [teacher] = await db.insert(teachers).values({ login, password, name }).returning();
    res.json(teacher);
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Delete teacher
adminRouter.delete('/teachers/:id', async (req, res) => {
  try {
    await db.delete(teachers).where(eq(teachers.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Update limits
adminRouter.patch('/teachers/:id/limits', async (req, res) => {
  try {
    const { publicTestLimit, privateTestLimit } = req.body;
    await db.update(teachers).set({ publicTestLimit, privateTestLimit })
      .where(eq(teachers.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get all tests
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
      teacherName: t.teacher?.name,
      questionCount: t.questions.length,
      attemptCount: t.results.length,
    })));
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get test with questions
adminRouter.get('/tests/:id', async (req, res) => {
  try {
    const test = await db.query.tests.findFirst({
      where: eq(tests.id, parseInt(req.params.id)),
      with: {
        questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] },
        teacher: { columns: { name: true } },
      },
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });
    res.json(test);
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Stop/Start test
adminRouter.post('/tests/:id/stop', async (req, res) => {
  await db.update(tests).set({ isActive: false }).where(eq(tests.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

adminRouter.post('/tests/:id/restart', async (req, res) => {
  await db.update(tests).set({ isActive: true }).where(eq(tests.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

// Delete test
adminRouter.delete('/tests/:id', async (req, res) => {
  try {
    await db.delete(tests).where(eq(tests.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// DOCX export
adminRouter.get('/tests/:id/docx', async (req, res) => {
  try {
    const test = await db.query.tests.findFirst({
      where: eq(tests.id, parseInt(req.params.id)),
      with: {
        questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] },
        teacher: { columns: { name: true } },
      },
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    const letters = ['A', 'B', 'C', 'D'];
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: test.title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: `Fan: ${test.subject}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `O'qituvchi: ${test.teacher?.name}`, bold: true })] }),
          new Paragraph({ text: '' }),
          ...test.questions.flatMap((q, i) => [
            new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${q.text}`, bold: true })] }),
            ...(q.options as string[]).map((opt, j) =>
              new Paragraph({
                children: [new TextRun({
                  text: `${letters[j]}) ${opt}`,
                  color: j === q.correctAnswer ? '16a34a' : undefined,
                  bold: j === q.correctAnswer,
                })],
                indent: { left: 400 },
              })
            ),
            new Paragraph({ children: [new TextRun({ text: `Javob: ${letters[q.correctAnswer]}`, bold: true, color: '16a34a' })] }),
            new Paragraph({ text: '' }),
          ]),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${test.code}.docx"`);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});
