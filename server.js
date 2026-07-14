// Load environment FIRST so every module below sees a populated process.env
// (ESM evaluates sibling imports in source order, before this module's body).
import './server/loadEnv.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import lockfile from 'proper-lockfile';
import rateLimit from 'express-rate-limit';

// Multi-AI support
import { initAIService } from './server/services/ai/init.js';
import { SentenceAnalysisService } from './server/services/application/SentenceAnalysisService.js';

// Database, config, middleware, routes
import { initDB } from './server/db/database.js';
import { ALLOWED_ORIGINS, TRUST_PROXY } from './server/config/env.js';
import { optionalAuth } from './server/middleware/optionalAuth.js';
import { markExploration } from './server/services/achievements/evaluate.js';
import authRoutes from './server/routes/auth.js';
import userRoutes from './server/routes/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const QUESTIONS_DIR = path.join(__dirname, 'questions');
const QUESTIONS_FILE = path.join(QUESTIONS_DIR, 'bank.json');
const DIST_DIR = path.join(__dirname, 'dist');
const isProduction = process.env.NODE_ENV === 'production';
const MAX_BANK_SIZE = 20000; // safety cap on the file-based question store

// 初始化AI服务
let aiProviderManager = null;
let sentenceAnalysisService = null;

try {
  aiProviderManager = initAIService();
  sentenceAnalysisService = new SentenceAnalysisService(aiProviderManager);
  console.log('[Server] AI service initialized successfully');
} catch (error) {
  console.error('[Server] Failed to initialize AI service:', error);
  // 继续启动服务器，但AI功能可能不可用
}

// CORS: allow non-browser requests, same-origin (the SPA calling its own API,
// incl. behind a proxy/tunnel), and any allowlisted origin. A disallowed origin
// is simply not granted CORS headers (browser blocks it) — never a 500.
const corsDelegate = (req, callback) => {
  const origin = req.headers.origin;
  if (!origin) return callback(null, { origin: true });
  if (!isProduction) return callback(null, { origin: true });
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, { origin: true });
  try {
    const originHost = new URL(origin).host;
    const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
    if (originHost === reqHost) return callback(null, { origin: true });
  } catch { /* malformed Origin */ }
  return callback(null, { origin: false });
};

// Middleware
// CSP is disabled for now because index.html still loads Tailwind + an importmap
// from CDNs; re-enable it once those assets are self-hosted.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsDelegate));
app.use(express.json({ limit: '1mb' }));

// Only trust the proxy when actually behind one (otherwise a direct client can
// spoof X-Forwarded-For and defeat per-IP rate limiting).
if (TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Rate limiter for the (billable) AI endpoints.
const generateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 分钟
  max: 30, // 每个 IP 最多 30 次请求（5分钟内）
  message: {
    error: '请求过于频繁，请稍后再试。',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: '请求过于频繁，请稍后再试。',
      message: '为了确保服务质量，请稍等片刻后再试。',
      retryAfter: 300
    });
  }
});

// Stricter limiter for auth endpoints (brute-force / enumeration protection).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '尝试过于频繁，请稍后再试。' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient limiter for shared question-bank writes (paired with generate calls).
const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: { error: '请求过于频繁，请稍后再试。' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Ensure questions directory exists
async function ensureQuestionsDir() {
  try {
    await fs.mkdir(QUESTIONS_DIR, { recursive: true });
    // Initialize empty bank if file doesn't exist
    try {
      await fs.access(QUESTIONS_FILE);
    } catch {
      await fs.writeFile(QUESTIONS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Failed to initialize questions directory:', error);
  }
}

// Read questions from file (添加重试机制)
async function readQuestions() {
  let retries = 3;
  while (retries > 0) {
    try {
      const data = await fs.readFile(QUESTIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('Failed to read questions after retries:', error);
        // 如果文件不存在，返回空数组
        if (error.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Validate a question payload before persisting it.
function isValidQuestion(q) {
  return (
    q && typeof q === 'object' &&
    typeof q.originalSentence === 'string' &&
    q.originalSentence.trim().length > 0 &&
    q.originalSentence.length <= 2000 &&
    Array.isArray(q.words)
  );
}

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);

// GET /api/questions - Get all questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await readQuestions();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load questions' });
  }
});

// POST /api/questions - Save a generated question to the SHARED bank (an app-level
// cache write, not a per-user action). Open by design, but rate-limited, shape-
// validated, size-capped, and written atomically under a file lock.
app.post('/api/questions', writeLimiter, async (req, res) => {
  let release;
  try {
    const newQuestion = req.body;

    if (!isValidQuestion(newQuestion)) {
      return res.status(400).json({ error: 'Invalid question payload' });
    }

    // 获取文件锁（锁独立的 .lock 文件，不锁会被 rename 替换的数据文件本身）
    release = await lockfile.lock(QUESTIONS_FILE, {
      retries: { retries: 20, minTimeout: 100, maxTimeout: 500 },
      lockfilePath: QUESTIONS_FILE + '.lock',
      realpath: false,
    });

    // 读取最新数据（在锁保护下读取，确保数据是最新的）
    const questions = await readQuestions();

    if (questions.length >= MAX_BANK_SIZE) {
      return res.status(507).json({ error: 'Question bank is full' });
    }

    // 检查是否已存在
    const exists = questions.some(q => q.originalSentence === newQuestion.originalSentence);
    if (exists) {
      return res.json({ message: 'Question already exists', count: questions.length });
    }

    // 添加新问题
    questions.push(newQuestion);

    // 原子写入：先写入临时文件，然后原子性地重命名
    const tempFile = `${QUESTIONS_FILE}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(tempFile, JSON.stringify(questions, null, 2), 'utf-8');
      await fs.rename(tempFile, QUESTIONS_FILE);
    } catch (writeError) {
      await fs.unlink(tempFile).catch(() => { });
      throw writeError;
    }

    res.json({ message: 'Question saved', count: questions.length });
  } catch (error) {
    console.error('Failed to save question:', error);
    res.status(500).json({
      error: 'Failed to save question',
      details: isProduction ? undefined : error.message,
    });
  } finally {
    if (release) {
      try {
        await release();
      } catch (e) {
        console.error('Failed to release lock:', e);
      }
    }
  }
});

// GET /api/questions/random - Get a random question
app.get('/api/questions/random', async (req, res) => {
  try {
    const { level, excludeSentence } = req.query;
    const questions = await readQuestions();

    if (questions.length === 0) {
      return res.json(null);
    }

    let candidates = questions;

    // Filter by level if provided
    if (level) {
      candidates = questions.filter(q => {
        const qLevel = q.level || 'Advanced';
        return qLevel === level;
      });
    }

    // Exclude specific sentence if provided
    if (excludeSentence) {
      const filtered = candidates.filter(q => q.originalSentence !== excludeSentence);
      if (filtered.length > 0) {
        candidates = filtered;
      } else {
        return res.json(null);
      }
    }

    if (candidates.length === 0) {
      return res.json(null);
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    res.json(candidates[randomIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get random question' });
  }
});

// GET /api/questions/size - Get bank size
app.get('/api/questions/size', async (req, res) => {
  try {
    const { level } = req.query;
    const questions = await readQuestions();

    if (!level) {
      return res.json({ size: questions.length });
    }

    const filtered = questions.filter(q => {
      const qLevel = q.level || 'Advanced';
      return qLevel === level;
    });

    res.json({ size: filtered.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bank size' });
  }
});

// POST /api/generate - Generate sentence analysis using multi-AI providers (添加限流保护)
app.post('/api/generate', generateLimiter, async (req, res) => {
  try {
    const { level, preferredProvider } = req.body;

    if (!level) {
      return res.status(400).json({ error: 'Level is required' });
    }

    // 检查AI服务是否已初始化
    if (!sentenceAnalysisService) {
      return res.status(503).json({
        error: 'AI服务未初始化',
        message: 'AI服务初始化失败，请检查配置。',
        fallback: '请从问题库中选择问题'
      });
    }

    // 使用新的SentenceAnalysisService
    const startTime = Date.now();
    const result = await sentenceAnalysisService.generateSentenceAnalysis(level, {
      preferredProvider: preferredProvider || null,
      enableFallback: true,
    });
    const duration = Date.now() - startTime;
    console.log(`[API] /api/generate completed in ${duration}ms for level: ${level}`);

    res.json(result);

  } catch (error) {
    console.error("Failed to generate sentence analysis:", error);

    // 处理AllProvidersFailedError
    if (error.name === 'AllProvidersFailedError') {
      return res.status(503).json({
        error: '所有AI提供商都不可用',
        message: '所有AI服务暂时不可用，建议使用已保存的问题。',
        code: 'ALL_PROVIDERS_FAILED',
        fallback: '请从问题库中选择问题',
        triedProviders: error.providers,
      });
    }

    // 检查是否是配额错误
    if (error.type === 'QUOTA_EXCEEDED' || error.status === 503 || (error.message && error.message.includes('quota'))) {
      return res.status(503).json({
        error: 'API 配额已用完',
        message: '生成服务暂时不可用，建议使用已保存的问题。',
        code: 'QUOTA_EXCEEDED',
        provider: error.provider,
        fallback: '请从问题库中选择问题'
      });
    }

    // 检查是否是限流错误
    if (error.type === 'RATE_LIMIT' || error.status === 429) {
      return res.status(429).json({
        error: '请求过于频繁',
        message: '请稍后再试。',
        provider: error.provider,
        retryAfter: 60,
      });
    }

    // 检查是否是连接错误
    if (error.type === 'NETWORK_ERROR' || error.type === 'TIMEOUT' ||
      (error.message && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')))) {
      return res.status(503).json({
        error: '连接失败',
        message: '无法连接到生成服务，请检查网络连接或稍后再试。',
        provider: error.provider,
        fallback: '您可以尝试从问题库中选择已有问题。'
      });
    }

    res.status(500).json({
      error: '生成失败',
      message: '生成句子分析时出错，请稍后再试。',
      provider: error.provider || 'unknown',
      details: isProduction ? undefined : error.message
    });
  }
});

// POST /api/analyze-sentence - Analyze custom sentence from OCR (添加限流保护)
app.post('/api/analyze-sentence', generateLimiter, optionalAuth, async (req, res) => {
  try {
    const { sentence, level } = req.body;

    if (!sentence || typeof sentence !== 'string' || sentence.trim().length === 0) {
      return res.status(400).json({ error: 'Sentence is required and must be a non-empty string' });
    }
    if (sentence.length > 2000) {
      return res.status(400).json({ error: 'Sentence is too long (max 2000 chars)' });
    }

    // 检查AI服务是否已初始化
    if (!sentenceAnalysisService) {
      return res.status(503).json({
        error: 'AI服务未初始化',
        message: 'AI服务初始化失败，请检查配置。',
      });
    }

    // 使用默认难度级别（Intermediate）如果未指定
    const analysisLevel = level || 'Intermediate';

    // 使用SentenceAnalysisService分析自定义句子
    const startTime = Date.now();
    const result = await sentenceAnalysisService.analyzeCustomSentence(
      sentence.trim(),
      analysisLevel,
      {
        preferredProvider: null,
        enableFallback: true,
      }
    );
    const duration = Date.now() - startTime;
    console.log(`[API] /api/analyze-sentence completed in ${duration}ms for sentence: "${sentence.substring(0, 50)}..."`);

    // Credit the "自定义大师" exploration star server-side (fire-and-forget).
    if (req.user) markExploration(req.user.id, 'custom').catch(() => { });

    res.json(result);

  } catch (error) {
    console.error("Failed to analyze sentence:", error);

    // 处理AllProvidersFailedError
    if (error.name === 'AllProvidersFailedError') {
      return res.status(503).json({
        error: '所有AI提供商都不可用',
        message: '所有AI服务暂时不可用，请稍后再试。',
        code: 'ALL_PROVIDERS_FAILED',
        triedProviders: error.providers,
      });
    }

    // 检查是否是配额错误
    if (error.type === 'QUOTA_EXCEEDED' || error.status === 503 || (error.message && error.message.includes('quota'))) {
      return res.status(503).json({
        error: 'API 配额已用完',
        message: '分析服务暂时不可用，请稍后再试。',
        code: 'QUOTA_EXCEEDED',
        provider: error.provider,
      });
    }

    // 检查是否是限流错误
    if (error.type === 'RATE_LIMIT' || error.status === 429) {
      return res.status(429).json({
        error: '请求过于频繁',
        message: '请稍后再试。',
        provider: error.provider,
        retryAfter: 60,
      });
    }

    // 检查是否是连接错误
    if (error.type === 'NETWORK_ERROR' || error.type === 'TIMEOUT' ||
      (error.message && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')))) {
      return res.status(503).json({
        error: '连接失败',
        message: '无法连接到分析服务，请检查网络连接或稍后再试。',
        provider: error.provider,
      });
    }

    res.status(500).json({
      error: '分析失败',
      message: '分析句子时出错，请稍后再试。',
      provider: error.provider || 'unknown',
      details: isProduction ? undefined : error.message
    });
  }
});

// POST /api/ocr-normalize - Normalize OCR text to a clean sentence
app.post('/api/ocr-normalize', generateLimiter, optionalAuth, async (req, res) => {
  try {
    const { sentence } = req.body;

    if (!sentence || typeof sentence !== 'string' || sentence.trim().length === 0) {
      return res.status(400).json({ error: 'Sentence is required and must be a non-empty string' });
    }
    if (sentence.length > 4000) {
      return res.status(400).json({ error: 'Text is too long (max 4000 chars)' });
    }

    if (!sentenceAnalysisService) {
      return res.status(503).json({
        error: 'AI服务未初始化',
        message: 'AI服务初始化失败，请检查配置。',
      });
    }

    const startTime = Date.now();
    const normalized = await sentenceAnalysisService.normalizeOCRSentence(sentence, {
      preferredProvider: null,
      enableFallback: true,
    });
    const duration = Date.now() - startTime;
    console.log(`[API] /api/ocr-normalize completed in ${duration}ms`);

    // Credit the "火眼金睛" (OCR) exploration star server-side (fire-and-forget).
    if (req.user) markExploration(req.user.id, 'ocr').catch(() => { });

    res.json({ sentence: normalized });

  } catch (error) {
    console.error("Failed to normalize OCR text:", error);

    if (error.name === 'AllProvidersFailedError') {
      return res.status(503).json({
        error: '所有AI提供商都不可用',
        message: '所有AI服务暂时不可用，请稍后再试。',
        code: 'ALL_PROVIDERS_FAILED',
        triedProviders: error.providers,
      });
    }

    if (error.type === 'QUOTA_EXCEEDED' || error.status === 503 || (error.message && error.message.includes('quota'))) {
      return res.status(503).json({
        error: 'API 配额已用完',
        message: '分析服务暂时不可用，请稍后再试。',
        code: 'QUOTA_EXCEEDED',
        provider: error.provider,
      });
    }

    if (error.type === 'RATE_LIMIT' || error.status === 429) {
      return res.status(429).json({
        error: '请求过于频繁',
        message: '请稍后再试。',
        provider: error.provider,
        retryAfter: 60,
      });
    }

    if (error.type === 'NETWORK_ERROR' || error.type === 'TIMEOUT' ||
      (error.message && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')))) {
      return res.status(503).json({
        error: '连接失败',
        message: '无法连接到分析服务，请检查网络连接或稍后再试。',
        provider: error.provider,
      });
    }

    res.status(500).json({
      error: '规范化失败',
      message: '规范化OCR文本时出错，请稍后再试。',
      provider: error.provider || 'unknown',
      details: isProduction ? undefined : error.message
    });
  }
});

// Any unmatched /api/* path returns JSON 404 (never falls through to the SPA).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  initDB(); // Initialize SQLite database
  await ensureQuestionsDir();

  // Serve static files in production
  if (isProduction) {
    // Check if dist directory exists
    try {
      await fs.access(DIST_DIR);
      app.use(express.static(DIST_DIR));

      // SPA fallback: serve index.html for all non-API routes (/api handled above).
      app.get('*', (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
      });
      console.log(`📦 Serving static files from: ${DIST_DIR}`);
    } catch (error) {
      console.warn(`⚠️  Dist directory not found. Run 'npm run build' first.`);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📚 Question Bank API server running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Questions stored in: ${QUESTIONS_DIR}`);
    if (isProduction) {
      console.log(`🌐 Production mode enabled`);
    }
    console.log(`🔒 File locking enabled for concurrent safety`);
    console.log(`🚦 API rate limiting enabled`);
    if (TRUST_PROXY) console.log(`🔀 Trust proxy enabled`);
  });
}

startServer().catch(console.error);
