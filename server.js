import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const QUESTIONS_DIR = path.join(__dirname, 'questions');
const QUESTIONS_FILE = path.join(QUESTIONS_DIR, 'bank.json');

// Middleware
app.use(cors());
app.use(express.json());

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

// Read questions from file
async function readQuestions() {
  try {
    const data = await fs.readFile(QUESTIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read questions:', error);
    return [];
  }
}

// Write questions to file
async function writeQuestions(questions) {
  try {
    await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to write questions:', error);
    return false;
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

// POST /api/questions - Save a new question
app.post('/api/questions', async (req, res) => {
  try {
    const newQuestion = req.body;
    const questions = await readQuestions();
    
    // Avoid duplicates based on the sentence string
    const exists = questions.some(q => q.originalSentence === newQuestion.originalSentence);
    if (exists) {
      return res.json({ message: 'Question already exists', count: questions.length });
    }
    
    questions.push(newQuestion);
    const success = await writeQuestions(questions);
    
    if (success) {
      res.json({ message: 'Question saved', count: questions.length });
    } else {
      res.status(500).json({ error: 'Failed to save question' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save question' });
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

// Start server
async function startServer() {
  await ensureQuestionsDir();
  app.listen(PORT, () => {
    console.log(`📚 Question Bank API server running on http://localhost:${PORT}`);
    console.log(`📁 Questions stored in: ${QUESTIONS_DIR}`);
  });
}

startServer().catch(console.error);

