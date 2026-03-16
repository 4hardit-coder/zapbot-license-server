import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import licenseRoutes  from './routes/license';
import webhookRoutes  from './routes/webhook';
import adminRoutes    from './routes/admin';

const app = express();

// ─── Middlewares globais ─────────────────────────────────
app.use(cors({
  origin:      process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy do Railway para pegar IP real
app.set('trust proxy', 1);

// ─── Health check ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: '4Hard Zap-Marketing License Server',
    version: '1.0.0',
    time:    new Date().toISOString(),
  });
});

// ─── Rotas da API ────────────────────────────────────────
app.use('/api/license',   licenseRoutes);
app.use('/api/webhook',   webhookRoutes);
app.use('/api/admin',     adminRoutes);

// ─── Painel admin (arquivos estaticos) ───────────────────
app.use('/admin', express.static(path.join(__dirname, '..', 'admin-panel')));

// Rota catch-all para o admin panel (SPA)
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin-panel', 'index.html'));
});

// ─── Handler de erros (deve ser o ultimo) ───────────────
app.use(errorHandler);

export default app;
