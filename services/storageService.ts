import { SentenceAnalysisData, DifficultyLevel } from '../types';

const API_BASE_URL = '/api/questions';

export const storageService = {
  getBank: async (): Promise<SentenceAnalysisData[]> => {
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        throw new Error('Failed to load questions');
      }
      return await response.json();
    } catch (e) {
      console.error("Failed to load question bank", e);
      return [];
    }
  },

  saveQuestion: async (question: SentenceAnalysisData): Promise<void> => {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(question),
      });
      if (!response.ok) {
        throw new Error('Failed to save question');
      }
      const result = await response.json();
      console.log("Saved new question to bank. Total:", result.count);
    } catch (e) {
      console.error("Failed to save question", e);
    }
  },

  getRandomQuestion: async (level?: DifficultyLevel, excludeSentence?: string): Promise<SentenceAnalysisData | null> => {
    try {
      const params = new URLSearchParams();
      if (level) {
        params.append('level', level);
      }
      if (excludeSentence) {
        params.append('excludeSentence', excludeSentence);
      }
      
      const url = `${API_BASE_URL}/random${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to get random question');
      }
      
      const data = await response.json();
      return data;
    } catch (e) {
      console.error("Failed to get random question", e);
      return null;
    }
  },

  getBankSize: async (level?: DifficultyLevel): Promise<number> => {
    try {
      const params = new URLSearchParams();
      if (level) {
        params.append('level', level);
      }
      
      const url = `${API_BASE_URL}/size${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to get bank size');
      }
      
      const result = await response.json();
      return result.size || 0;
    } catch (e) {
      console.error("Failed to get bank size", e);
      return 0;
    }
  }
};