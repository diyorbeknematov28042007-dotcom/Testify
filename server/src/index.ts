import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { teachersRouter } from './routes/teachers';
import { adminRouter } from './routes/admin';
import { botRouter } from './routes/bot';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(compression() as any);
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/bot', botRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Server: http://localhost:${PORT}`);
});
