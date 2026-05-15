import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { teacherAuthTokens } from '../db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'D1yoRBeK';

// Stable admin token — server qayta ishga tushsa ham o'zgarmaydi
function getExpectedAdminToken(): string {
  return `admin_${Buffer.from(ADMIN_USERNAME).toString('base64')}`;
}

export async function teacherAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-teacher-token'] as string;
  if (!token) return res.status(401).json({ error: 'Token kerak' });

  const found = await db.query.teacherAuthTokens.findFirst({
    where: eq(teacherAuthTokens.token, token),
    with: { teacher: true },
  });

  if (!found) return res.status(401).json({ error: "Token noto'g'ri" });
  (req as any).teacher = found.teacher;
  next();
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'] as string;
  if (!token) return res.status(401).json({ error: 'Admin token kerak' });

  const expected = getExpectedAdminToken();
  if (token !== expected) {
    return res.status(401).json({ error: 'Admin token noto\'g\'ri' });
  }
  next();
}
