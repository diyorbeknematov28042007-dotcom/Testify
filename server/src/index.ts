import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { teachersRouter } from './routes/teachers';
import { adminRouter } from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(compression() as any);
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Server: http://localhost:${PORT}`);
});
