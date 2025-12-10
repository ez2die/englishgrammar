import { SentenceAnalysisData, DifficultyLevel } from "../types";

const API_BASE_URL = '/api/generate';

export const generateSentenceAnalysis = async (level: DifficultyLevel): Promise<SentenceAnalysisData> => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ level }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: '连接失败，请检查网络连接',
        message: '无法连接到服务器，请稍后再试。'
      }));
      
      // 处理限流错误（应用层限流）
      if (response.status === 429) {
        const error = new Error(errorData.message || errorData.error || '请求过于频繁，请稍后再试');
        (error as any).status = 429;
        (error as any).retryAfter = errorData.retryAfter;
        (error as any).isRateLimit = true;
        throw error;
      }
      
      // 处理服务不可用（Gemini API 配额问题）
      if (response.status === 503) {
        const error = new Error(errorData.message || errorData.error || '生成服务暂时不可用');
        (error as any).status = 503;
        (error as any).code = errorData.code;
        (error as any).isQuotaExceeded = true;
        (error as any).shouldFallback = true; // 标记应该降级
        throw error;
      }
      
      // 处理服务器错误
      if (response.status >= 500) {
        const error = new Error(errorData.message || errorData.error || '服务器错误，请稍后再试');
        (error as any).status = response.status;
        throw error;
      }
      
      throw new Error(errorData.message || errorData.error || '生成失败');
    }

    const data = await response.json();
    return data as SentenceAnalysisData;
  } catch (error: any) {
    console.error("Failed to generate sentence analysis", error);
    
    // 如果是网络错误，提供更友好的消息
    if (error.message && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch'))) {
      const networkError = new Error('网络连接失败，请检查您的网络连接');
      (networkError as any).isNetworkError = true;
      throw networkError;
    }
    
    throw error;
  }
};
