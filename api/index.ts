import express from 'express';
import dotenv from 'dotenv';
import { handleProxyImage } from './controllers/proxyController.ts';
import { handleSearchMedia } from './controllers/mediaController.ts';
import { handleGenerateImage } from './controllers/imageController.ts';
import { handleGenerateCarousel } from './controllers/generateController.ts';

dotenv.config();

const app = express();

// Universal CORS configuration for AI Studio iframe & mobile browsers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-gemini-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  // Restore rewritten path if served by Vercel serverless
  const matchedPath =
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-forwarded-uri'] as string) ||
    req.originalUrl;
  if (matchedPath && matchedPath.startsWith('/api/')) {
    req.url = matchedPath;
  }

  next();
});

app.use(express.json({ limit: '50mb' }));

// Quick healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Mounted API Controller Handlers
app.get('/api/proxy-image', handleProxyImage);
app.get('/api/search-media', handleSearchMedia);
app.post('/api/generate-image', handleGenerateImage);
app.post('/api/generate', handleGenerateCarousel);

export default app;
export { app };
