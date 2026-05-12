const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

function getHeaders(extra?: Record<string, string>) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const teacherToken = localStorage.getItem('teacherToken');
  const adminToken = localStorage.getItem('adminToken');
  if (teacherToken) h['x-teacher-token'] = teacherToken;
  if (adminToken) h['x-admin-token'] = adminToken;
  return { ...h, ...extra };
}

async function req(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xato yuz berdi');
  return data;
}

export const api = {
  // Auth
  teacherLogin: (login: string, password: string) => req('POST', '/auth/teacher/login', { login, password }),
  teacherRegister: (login: string, password: string, name: string) => req('POST', '/auth/teacher/register', { login, password, name }),
  teacherLogout: () => req('POST', '/auth/teacher/logout'),
  adminLogin: (username: string) => req('POST', '/auth/admin/login', { username }),

  // Public
  getPublicTests: (subject?: string) => req('GET', `/public/tests${subject ? `?subject=${subject}` : ''}`),
  joinTest: (code: string, studentName: string, telegram?: string) => req('POST', `/public/tests/${code}/join`, { studentName, telegram }),
  submitTest: (code: string, sessionId: string, answers: (number | null)[]) => req('POST', `/public/tests/${code}/submit`, { sessionId, answers }),
  getReview: (code: string) => req('GET', `/public/tests/${code}/review`),

  // Teacher
  getMe: () => req('GET', '/teachers/me'),
  changePassword: (oldPassword: string, newPassword: string) => req('PATCH', '/teachers/me/password', { oldPassword, newPassword }),
  getMyTests: () => req('GET', '/teachers/tests'),
  createTest: (data: any) => req('POST', '/teachers/tests', data),
  getTest: (id: number) => req('GET', `/teachers/tests/${id}`),
  updateTest: (id: number, data: any) => req('PATCH', `/teachers/tests/${id}`, data),
  deleteTest: (id: number) => req('DELETE', `/teachers/tests/${id}`),
  cloneTest: (id: number) => req('POST', `/teachers/tests/${id}/clone`),
  stopTest: (id: number) => req('POST', `/teachers/tests/${id}/stop`),
  getTestResults: (id: number) => req('GET', `/teachers/tests/${id}/results`),

  // Promocode
  getPromocode: () => req('GET', '/teachers/promocode'),
  createPromocode: () => req('POST', '/teachers/promocode'),

  // Admin
  getStats: () => req('GET', '/admin/stats'),
  getTeachers: () => req('GET', '/admin/teachers'),
  addTeacher: (data: any) => req('POST', '/admin/teachers', data),
  deleteTeacher: (id: number) => req('DELETE', `/admin/teachers/${id}`),
  updateLimits: (id: number, publicTestLimit: number, privateTestLimit: number) =>
    req('PATCH', `/admin/teachers/${id}/limits`, { publicTestLimit, privateTestLimit }),
  getAllTests: () => req('GET', '/admin/tests'),
  adminStopTest: (id: number) => req('POST', `/admin/tests/${id}/stop`),
  adminRestartTest: (id: number) => req('POST', `/admin/tests/${id}/restart`),
  adminDeleteTest: (id: number) => req('DELETE', `/admin/tests/${id}`),

  // PDF download helper
  downloadPdf: async (url: string, filename: string) => {
    const token = localStorage.getItem('teacherToken') || localStorage.getItem('adminToken') || '';
    const header = localStorage.getItem('adminToken') ? 'x-admin-token' : 'x-teacher-token';
    const res = await fetch(`${BASE.replace('/api', '')}${url}`, { headers: { [header]: token } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
