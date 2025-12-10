import { config } from 'dotenv';
// 加载.env.local文件（优先于.env）
config({ path: '.env.local' });
// 如果.env.local不存在，回退到.env
config();
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import lockfile from 'proper-lockfile';
import rateLimit from 'express-rate-limit';
// 旧版导入（保留用于向后兼容）
// import { generateSentenceAnalysis } from './server/services/geminiService.js';

// 新版多AI支持
import { initAIService } from './server/services/ai/init.js';
import { SentenceAnalysisService } from './server/services/application/SentenceAnalysisService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const QUESTIONS_DIR = path.join(__dirname, 'questions');
const QUESTIONS_FILE = path.join(QUESTIONS_DIR, 'bank.json');
const DIST_DIR = path.join(__dirname, 'dist');
const isProduction = process.env.NODE_ENV === 'production';

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

// Middleware
app.use(cors());
app.use(express.json());

// 信任代理（如果使用 Nginx 反向代理）
app.set('trust proxy', 1);

// API 限流中间件 - 限制 Gemini API 调用频率
// 调整为更宽松的限制：每5分钟30次请求，更适合正常使用
const generateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 分钟
  max: 30, // 每个 IP 最多 30 次请求（5分钟内）
  message: { 
    error: '请求过于频繁，请稍后再试。',
    retryAfter: 300 // 建议等待时间（秒）
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 如果有有效的 session token，可以考虑放宽限制
    return false;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: '请求过于频繁，请稍后再试。',
      message: '为了确保服务质量，请稍等片刻后再试。',
      retryAfter: 300
    });
  }
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

// Write questions to file (使用文件锁确保并发安全)
async function writeQuestions(questions) {
  let release;
  try {
    // 获取文件锁，最多等待 10 秒
    release = await lockfile.lock(QUESTIONS_FILE, {
      retries: {
        retries: 20,
        minTimeout: 100,
        maxTimeout: 500
      },
      lockfilePath: QUESTIONS_FILE + '.lock'
    });
    
    // 重新读取最新数据（防止在等待锁期间数据已更新）
    const currentQuestions = await readQuestions();
    
    // 合并数据（去重）
    const questionMap = new Map();
    currentQuestions.forEach(q => {
      questionMap.set(q.originalSentence, q);
    });
    
    // 添加新问题
    if (Array.isArray(questions)) {
      questions.forEach(q => {
        if (!questionMap.has(q.originalSentence)) {
          questionMap.set(q.originalSentence, q);
        }
      });
    } else {
      // 单个问题
      if (!questionMap.has(questions.originalSentence)) {
        questionMap.set(questions.originalSentence, questions);
      }
    }
    
    const updatedQuestions = Array.from(questionMap.values());
    
    // 原子写入：先写入临时文件，然后原子性地重命名（避免写入过程中文件损坏）
    const tempFile = QUESTIONS_FILE + '.' + Date.now() + '.tmp';
    try {
      await fs.writeFile(tempFile, JSON.stringify(updatedQuestions, null, 2), 'utf-8');
      await fs.rename(tempFile, QUESTIONS_FILE);
    } catch (writeError) {
      // 如果写入失败，清理临时文件
      try {
        await fs.unlink(tempFile).catch(() => {});
      } catch {}
      throw writeError;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to write questions:', error);
    return false;
  } finally {
    if (release) {
      try {
        await release();
      } catch (e) {
        console.error('Failed to release lock:', e);
      }
    }
  }
}

// API Routes

// GET /api/questions - Get all questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await readQuestions();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load questions' });
  }
});

// POST /api/questions - Save a new question (优化版本，使用原子操作)
app.post('/api/questions', async (req, res) => {
  let release;
  try {
    const newQuestion = req.body;
    
    // 获取文件锁
    release = await lockfile.lock(QUESTIONS_FILE, {
      retries: {
        retries: 20,
        minTimeout: 100,
        maxTimeout: 500
      },
      lockfilePath: QUESTIONS_FILE + '.lock'
    });
    
    // 读取最新数据（在锁保护下读取，确保数据是最新的）
    const questions = await readQuestions();
    
    // 检查是否已存在
    const exists = questions.some(q => q.originalSentence === newQuestion.originalSentence);
    if (exists) {
      return res.json({ message: 'Question already exists', count: questions.length });
    }
    
    // 添加新问题
    questions.push(newQuestion);
    
    // 原子写入：先写入临时文件，然后原子性地重命名
    const tempFile = QUESTIONS_FILE + '.' + Date.now() + '.tmp';
    try {
      await fs.writeFile(tempFile, JSON.stringify(questions, null, 2), 'utf-8');
      await fs.rename(tempFile, QUESTIONS_FILE);
    } catch (writeError) {
      // 如果写入失败，清理临时文件
      try {
        await fs.unlink(tempFile).catch(() => {});
      } catch {}
      throw writeError;
    }
    
    res.json({ message: 'Question saved', count: questions.length });
  } catch (error) {
    console.error('Failed to save question:', error);
    res.status(500).json({ error: 'Failed to save question', details: error.message });
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
    const result = await sentenceAnalysisService.generateSentenceAnalysis(level, {
      preferredProvider: preferredProvider || null,
      enableFallback: true,
    });

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
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Start server
async function startServer() {
  await ensureQuestionsDir();
  
  // Serve static files in production
  if (isProduction) {
    // Check if dist directory exists
    try {
      await fs.access(DIST_DIR);
      app.use(express.static(DIST_DIR));
      
      // Handle React Router - serve index.html for all non-API routes
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(DIST_DIR, 'index.html'));
        }
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
    console.log(`🚦 API rate limiting enabled (30 requests per 5 minutes per IP)`);
    console.log(`🔒 Trust proxy enabled for Nginx compatibility`);
  });
}

startServer().catch(console.error);

