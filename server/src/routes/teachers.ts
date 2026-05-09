import { Router } from 'express';
import { db } from '../db';
import { tests, questions, results, teachers, teacherAuthTokens } from '../db/schema';
import { eq, and, count } from 'drizzle-orm';
import { teacherAuth } from '../middleware/auth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export const teachersRouter = Router();
teachersRouter.use(teacherAuth);

function genCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Me
teachersRouter.get('/me', async (req, res) => {
  const teacher = (req as any).teacher;
  const myTests = await db.query.tests.findMany({ where: eq(tests.teacherId, teacher.id) });
  const pubCount = myTests.filter(t => t.type === 'public').length;
  const privCount = myTests.filter(t => t.type === 'private').length;
  res.json({
    id: teacher.id,
    teacherId: teacher.teacherId,
    name: teacher.name,
    login: teacher.login,
    publicTestLimit: teacher.publicTestLimit,
    privateTestLimit: teacher.privateTestLimit,
    publicCount: pubCount,
    privateCount: privCount,
  });
});

// Change password
teachersRouter.patch('/me/password', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const { oldPassword, newPassword } = req.body;
    if (teacher.password !== oldPassword) return res.status(400).json({ error: "Eski parol noto'g'ri" });
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Yangi parol kamida 4 belgi' });
    await db.update(teachers).set({ password: newPassword }).where(eq(teachers.id, teacher.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get tests
teachersRouter.get('/tests', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const myTests = await db.query.tests.findMany({
      where: eq(tests.teacherId, teacher.id),
      with: {
        questions: { columns: { id: true } },
        results: { columns: { id: true } },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    res.json(myTests.map(t => ({
      ...t,
      questionCount: t.questions.length,
      attemptCount: t.results.length,
    })));
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Create test
teachersRouter.post('/tests', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const { title, subject, description, type, scoringType, durationSeconds, questions: qs } = req.body;

    // Limit check
    const myTests = await db.query.tests.findMany({ where: eq(tests.teacherId, teacher.id) });
    if (type === 'public') {
      const pubCount = myTests.filter(t => t.type === 'public').length;
      if (pubCount >= teacher.publicTestLimit) {
        return res.status(403).json({ error: `Ommaviy test limiti: ${teacher.publicTestLimit}` });
      }
    } else {
      const privCount = myTests.filter(t => t.type === 'private').length;
      if (privCount >= teacher.privateTestLimit) {
        return res.status(403).json({ error: `Shaxsiy test limiti: ${teacher.privateTestLimit}` });
      }
    }

    let code = genCode();
    // Unique code
    while (await db.query.tests.findFirst({ where: eq(tests.code, code) })) {
      code = genCode();
    }

    const [test] = await db.insert(tests).values({
      teacherId: teacher.id, title, subject, description, code,
      type, scoringType: scoringType || 'simple', durationSeconds,
    }).returning();

    if (qs && qs.length > 0) {
      await db.insert(questions).values(
        qs.map((q: any, i: number) => ({
          testId: test.id, text: q.text, imageUrl: q.imageUrl || null,
          options: q.options, correctAnswer: q.correctAnswer, orderIndex: i,
        }))
      );
    }

    res.json(test);
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Get one test
teachersRouter.get('/tests/:id', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, parseInt(req.params.id)), eq(tests.teacherId, teacher.id)),
      with: { questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] } },
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });
    res.json(test);
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Update test
teachersRouter.patch('/tests/:id', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)),
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    const { title, subject, description, type, scoringType, durationSeconds, questions: qs } = req.body;

    await db.update(tests).set({ title, subject, description, type, scoringType, durationSeconds }).where(eq(tests.id, testId));

    if (qs) {
      await db.delete(questions).where(eq(questions.testId, testId));
      if (qs.length > 0) {
        await db.insert(questions).values(
          qs.map((q: any, i: number) => ({
            testId, text: q.text, imageUrl: q.imageUrl || null,
            options: q.options, correctAnswer: q.correctAnswer, orderIndex: i,
          }))
        );
      }
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Delete test
teachersRouter.delete('/tests/:id', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)),
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });
    await db.delete(tests).where(eq(tests.id, testId));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Clone test
teachersRouter.post('/tests/:id/clone', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const original = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)),
      with: { questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] } },
    });
    if (!original) return res.status(404).json({ error: 'Topilmadi' });

    let code = genCode();
    while (await db.query.tests.findFirst({ where: eq(tests.code, code) })) code = genCode();

    const [cloned] = await db.insert(tests).values({
      teacherId: teacher.id,
      title: `${original.title} (nusxa)`,
      subject: original.subject,
      description: original.description,
      code,
      type: original.type,
      scoringType: original.scoringType,
      durationSeconds: original.durationSeconds,
    }).returning();

    if (original.questions.length > 0) {
      await db.insert(questions).values(
        original.questions.map(q => ({
          testId: cloned.id, text: q.text, imageUrl: q.imageUrl,
          options: q.options, correctAnswer: q.correctAnswer, orderIndex: q.orderIndex,
        }))
      );
    }

    res.json(cloned);
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Stop/Start test
teachersRouter.post('/tests/:id/stop', async (req, res) => {
  const teacher = (req as any).teacher;
  await db.update(tests).set({ isActive: false })
    .where(and(eq(tests.id, parseInt(req.params.id)), eq(tests.teacherId, teacher.id)));
  res.json({ ok: true });
});

teachersRouter.post('/tests/:id/restart', async (req, res) => {
  const teacher = (req as any).teacher;
  await db.update(tests).set({ isActive: true })
    .where(and(eq(tests.id, parseInt(req.params.id)), eq(tests.teacherId, teacher.id)));
  res.json({ ok: true });
});

// Results
teachersRouter.get('/tests/:id/results', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)),
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    const res2 = await db.query.results.findMany({
      where: eq(results.testId, testId),
      orderBy: (r, { desc }) => [desc(r.score)],
    });

    res.json({ test, results: res2 });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// DOCX export
teachersRouter.get('/tests/:id/docx', async (req, res) => {
  try {
    const teacher = (req as any).teacher;
    const testId = parseInt(req.params.id);
    const test = await db.query.tests.findFirst({
      where: and(eq(tests.id, testId), eq(tests.teacherId, teacher.id)),
      with: { questions: { orderBy: (q, { asc }) => [asc(q.orderIndex)] } },
    });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    const letters = ['A', 'B', 'C', 'D'];
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: test.title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: `Fan: ${test.subject}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `O'qituvchi: ${teacher.name}`, bold: true })] }),
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
