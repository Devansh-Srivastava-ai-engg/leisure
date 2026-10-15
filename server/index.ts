import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initDatabase } from './config/database';
import apiRouter from './routes';
import { HealthController } from './controllers/HealthController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Security: Helmet – sets secure HTTP headers (XSS, HSTS, CSP defaults, etc.)
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// Security: CORS – restrict to explicitly permitted origins
// ---------------------------------------------------------------------------
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];
const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : DEFAULT_ORIGINS;

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ---------------------------------------------------------------------------
// Security: Body size limit – prevent memory-exhaustion / DoS via large payloads
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '100kb' }));

// ---------------------------------------------------------------------------
// Security: Rate-limit API traffic – 300 requests per 15 min per IP
// ---------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true, // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// ---------------------------------------------------------------------------
// Initialize SQLite database
// ---------------------------------------------------------------------------
initDatabase();

// ---------------------------------------------------------------------------
// Mount MVC API Routes
// ---------------------------------------------------------------------------
app.use('/api', apiRouter);

// ---------------------------------------------------------------------------
// Root Route: Render MVC Server Dashboard View
// ---------------------------------------------------------------------------
app.get('/', HealthController.getDashboard);

// ---------------------------------------------------------------------------
// Global error-handling middleware (must be registered last)
// Prevents stack traces and internal details from leaking to the client.
// ---------------------------------------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode =
    err instanceof Error && 'statusCode' in err
      ? (err as Error & { statusCode: number }).statusCode
      : 500;

  console.error('[Unhandled Error]', err);

  res.status(statusCode).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err instanceof Error
          ? err.message
          : 'Internal Server Error',
  });
});

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`
=====================================================
  🏪 DukaanKhata MVC Backend Server Online
  🚀 Port: ${PORT}
  📡 URL:  http://localhost:${PORT}
  🏥 Health: http://localhost:${PORT}/api/health
  ⚡ Sync:   http://localhost:${PORT}/api/sync
=====================================================
`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown on SIGINT / SIGTERM
// ---------------------------------------------------------------------------
const shutdown = (signal: string) => {
  console.log(`\n[Backend] Received ${signal}. Shutting down gracefully…`);
  server.close(() => {
    console.log('[Backend] Server terminated gracefully.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
