import {
  pgTable, serial, text, integer, boolean,
  timestamp, jsonb, decimal, uuid
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  login: text('login').unique().notNull(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  publicTestLimit: integer('public_test_limit').default(10).notNull(),
  privateTestLimit: integer('private_test_limit').default(5).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tests = pgTable('tests', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  description: text('description'),
  code: text('code').unique().notNull(),
  type: text('type', { enum: ['public', 'private'] }).notNull(),
  scoringType: text('scoring_type', { enum: ['simple', 'dtm'] }).default('simple').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  testId: integer('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  imageUrl: text('image_url'),
  options: jsonb('options').$type<string[]>().notNull(),
  correctAnswer: integer('correct_answer').notNull(),
  orderIndex: integer('order_index').notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  sessionId: uuid('session_id').defaultRandom().notNull(),
  testId: integer('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  studentName: text('student_name').notNull(),
  telegram: text('telegram'),
  answers: jsonb('answers').$type<(number | null)[]>().default([]).notNull(),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const results = pgTable('results', {
  id: serial('id').primaryKey(),
  testId: integer('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  studentName: text('student_name').notNull(),
  telegram: text('telegram'),
  score: decimal('score', { precision: 10, scale: 2 }).notNull(),
  totalQuestions: integer('total_questions').notNull(),
  correctAnswers: integer('correct_answers').notNull(),
  wrongAnswers: jsonb('wrong_answers').$type<number[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teacherAuthTokens = pgTable('teacher_auth_tokens', {
  id: serial('id').primaryKey(),
  token: text('token').unique().notNull(),
  teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const teachersRelations = relations(teachers, ({ many }) => ({
  tests: many(tests),
  authTokens: many(teacherAuthTokens),
}));

export const testsRelations = relations(tests, ({ one, many }) => ({
  teacher: one(teachers, { fields: [tests.teacherId], references: [teachers.id] }),
  questions: many(questions),
  sessions: many(sessions),
  results: many(results),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  test: one(tests, { fields: [questions.testId], references: [tests.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  test: one(tests, { fields: [sessions.testId], references: [tests.id] }),
}));

export const resultsRelations = relations(results, ({ one }) => ({
  test: one(tests, { fields: [results.testId], references: [tests.id] }),
}));

export const teacherAuthTokensRelations = relations(teacherAuthTokens, ({ one }) => ({
  teacher: one(teachers, { fields: [teacherAuthTokens.teacherId], references: [teachers.id] }),
}));
