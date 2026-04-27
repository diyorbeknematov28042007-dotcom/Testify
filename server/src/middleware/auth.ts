import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { teacherAuthTokens } from '../db/schema';
import { eq } from 'drizzle-orm';

const adminTokens = new Set<string>();

export function setAdminToken(token: string) { adminTokens.add(token); }
export function removeAdminToken(token: string) { adminTokens.delete(token); }
export function isValidAdminToken(token: string) { return adminTokens.has(token); }

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
  if (!token || !isValidAdminToken(token)) {
    return res.status(401).json({ error: 'Admin token kerak' });
  }
  next();
}
