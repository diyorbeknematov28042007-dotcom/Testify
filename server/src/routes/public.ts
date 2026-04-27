import { Router } from 'express';
import { db } from '../db';
import { tests, questions, sessions, results, teachers } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const publicRouter = Router();

function calcScore(answers: (number | null)[], qs: any[], scoringType: string) {
  let score = 0;
  const wrong: number[] = [];
  qs.forEach((q, i) => {
    if (answers[i] === q.correctAnswer) {
      if (scoringType === 'dtm') {
        const n = i + 1;
        score += n <= 30 ? 1.1 : n <= 60 ? 2.1 : 3.1;
      } else {
        score += 1;
      }
    } else {
      wrong.push(i + 1);
    }
  });
  return { score: parseFloat(score.toFixed(2)), wrong };
}

// Ommaviy testlar
publicRouter.get('/tests', async (req, res) => {
  try {
    const subject = req.query.subject as string | undefined;

    const allTests = await db.query.tests.findMany({
      where: and(
        eq(tests.type, 'public'),
        eq(tests.isActive, true),
        subject && subject !== 'all' ? eq(tests.subject, subject) : undefined
      ),
      with: {
        teacher: { columns: { name: true } },
        questions: { columns: { id: true } },
        results: { columns: { id: true } },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    const formatted = allTests.map(t => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      code: t.code,
      durationSeconds: t.durationSeconds,
      createdAt: t.createdAt,
      teacherName: t.teacher?.name,
      questionCount: t.questions.length,
      attemptCount: t.results.length,
    }));

    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Test join
publicRouter.post('/tests/:code/join', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { studentName, telegram } = req.body;
    if (!studentName?.trim()) return res.status(400).json({ error: 'Ism kerak' });

    const test = await db.query.tests.findFirst({
      where: and(eq(tests.code, code), eq(tests.isActive, true)),
    });
    if (!test) return res.status(404).json({ error: 'Test topilmadi yoki faol emas' });

    const sessionId = uuidv4();
    await db.insert(sessions).values({
      sessionId, testId: test.id,
      studentName: studentName.trim(),
      telegram: telegram?.trim() || null,
      answers: [],
    });

    const qs = await db.query.questions.findMany({
      where: eq(questions.testId, test.id),
      orderBy: (q, { asc }) => [asc(q.orderIndex)],
    });

    res.json({
      sessionId,
      test: {
        id: test.id, title: test.title, subject: test.subject,
        durationSeconds: test.durationSeconds, scoringType: test.scoringType,
        description: test.description,
      },
      questions: qs.map(q => ({
        id: q.id, text: q.text, imageUrl: q.imageUrl,
        options: q.options, orderIndex: q.orderIndex,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Test topshirish
publicRouter.post('/tests/:code/submit', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { sessionId, answers } = req.body;

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.sessionId, sessionId),
    });
    if (!session) return res.status(404).json({ error: 'Sessiya topilmadi' });
    if (session.submittedAt) return res.status(409).json({ message: 'Allaqachon topshirilgan' });

    const test = await db.query.tests.findFirst({ where: eq(tests.id, session.testId) });
    if (!test) return res.status(404).json({ error: 'Test topilmadi' });

    const qs = await db.query.questions.findMany({
      where: eq(questions.testId, test.id),
      orderBy: (q, { asc }) => [asc(q.orderIndex)],
    });

    const { score, wrong } = calcScore(answers, qs, test.scoringType);

    await db.insert(results).values({
      testId: test.id,
      studentName: session.studentName,
      telegram: session.telegram,
      score: score.toString(),
      totalQuestions: qs.length,
      correctAnswers: qs.length - wrong.length,
      wrongAnswers: wrong,
    });

    await db.update(sessions)
      .set({ submittedAt: new Date(), answers })
      .where(eq(sessions.sessionId, sessionId));

    res.json({
      score, totalQuestions: qs.length,
      correctAnswers: qs.length - wrong.length,
      wrongAnswers: wrong,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Review
publicRouter.get('/tests/:code/review', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const test = await db.query.tests.findFirst({ where: eq(tests.code, code) });
    if (!test) return res.status(404).json({ error: 'Topilmadi' });

    const qs = await db.query.questions.findMany({
      where: eq(questions.testId, test.id),
      orderBy: (q, { asc }) => [asc(q.orderIndex)],
    });

    res.json(qs.map(q => ({
      correctAnswer: q.correctAnswer,
      orderIndex: q.orderIndex,
      options: q.options,
      text: q.text,
      imageUrl: q.imageUrl,
    })));
  } catch (e) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});
