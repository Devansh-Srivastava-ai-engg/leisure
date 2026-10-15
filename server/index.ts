import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/database';
import apiRouter from './routes';
import { HealthController } from './controllers/HealthController';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Security: Helmet – sets secure HTTP headers with PWA-friendly CSP
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https://api.qrserver.com"],
        connectSrc: ["'self'", "*"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ---------------------------------------------------------------------------
// Security: CORS – restrict to permitted origins or allow same-origin
// ---------------------------------------------------------------------------
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];
const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : DEFAULT_ORIGINS;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin browser requests)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
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

// Backend Admin / Status Dashboard
app.get('/dashboard', HealthController.getDashboard);

// ---------------------------------------------------------------------------
// Static Assets & Single Page Application (SPA) Serving
// ---------------------------------------------------------------------------
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
} else {
  // If dist has not been built yet (e.g. backend-only dev)
  app.get('/', HealthController.getDashboard);
}

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
