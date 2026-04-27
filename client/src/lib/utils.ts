import { format } from 'date-fns';

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd.MM.yyyy HH:mm');
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export async function downloadDocxFile(res: Response, filename: string) {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseTestFromText(text: string) {
  const questions: { text: string; options: string[]; correctAnswer: number }[] = [];
  const blocks = text.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 6) continue;

    const qText = lines[0];
    const opts: string[] = [];
    let correctAnswer = -1;
    const labels = ['A)', 'B)', 'C)', 'D)'];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const idx = labels.findIndex(l => line.toUpperCase().startsWith(l));
      if (idx !== -1) {
        opts.push(line.substring(2).trim());
      } else if (line.toLowerCase().startsWith('javob:')) {
        const ans = line.split(':')[1]?.trim().toUpperCase();
        correctAnswer = ['A', 'B', 'C', 'D'].indexOf(ans);
      }
    }

    if (opts.length === 4 && correctAnswer !== -1) {
      questions.push({ text: qText, options: opts, correctAnswer });
    }
  }

  return questions;
}

export const SUBJECTS = [
  'Matematika', 'Huquq', "Chet tili", 'Tarix', 'Biologiya',
  'Mantiq', 'Kimyo', 'Fizika', 'DTM', 'Boshqa'
];
