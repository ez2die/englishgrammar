/**
 * AI服务初始化
 * 创建和配置所有AI提供商
 */

import { AI_CONFIG } from "./config/AIConfig.js";
import { AIProviderManager } from "./manager/AIProviderManager.js";
import { GeminiProvider } from "./providers/gemini/GeminiProvider.js";
import { DeepSeekProvider } from "./providers/deepseek/DeepSeekProvider.js";
import { QwenProvider } from "./providers/qwen/QwenProvider.js";
import { OpenAIProvider } from "./providers/openai/OpenAIProvider.js";

/**
 * 初始化AI服务
 * @returns {AIProviderManager}
 */
export function initAIService() {
  const manager = new AIProviderManager(
    AI_CONFIG,
    AI_CONFIG.fallback
  );

  // 注册所有提供商
  const providerConfigs = AI_CONFIG.providers;

  // Gemini
  if (providerConfigs.gemini.enabled) {
    try {
      const geminiProvider = new GeminiProvider({
        name: 'gemini',
        ...providerConfigs.gemini,
      });
      manager.registerProvider(geminiProvider);
      console.log('[AI Init] Gemini provider registered');
    } catch (error) {
      console.warn('[AI Init] Failed to register Gemini provider:', error.message);
    }
  }

  // DeepSeek
  if (providerConfigs.deepseek.enabled && providerConfigs.deepseek.apiKey) {
    try {
      const deepseekProvider = new DeepSeekProvider({
        name: 'deepseek',
        ...providerConfigs.deepseek,
      });
      manager.registerProvider(deepseekProvider);
      console.log('[AI Init] DeepSeek provider registered');
    } catch (error) {
      console.warn('[AI Init] Failed to register DeepSeek provider:', error.message);
    }
  }

  // Qwen
  if (providerConfigs.qwen.enabled && providerConfigs.qwen.apiKey) {
    try {
      const qwenProvider = new QwenProvider({
        name: 'qwen',
        ...providerConfigs.qwen,
      });
      manager.registerProvider(qwenProvider);
      console.log('[AI Init] Qwen provider registered');
    } catch (error) {
      console.warn('[AI Init] Failed to register Qwen provider:', error.message);
    }
  }

  // OpenAI
  if (providerConfigs.openai.enabled && providerConfigs.openai.apiKey) {
    try {
      const openaiProvider = new OpenAIProvider({
        name: 'openai',
        ...providerConfigs.openai,
      });
      manager.registerProvider(openaiProvider);
      console.log('[AI Init] OpenAI provider registered');
    } catch (error) {
      console.warn('[AI Init] Failed to register OpenAI provider:', error.message);
    }
  }

  // 输出注册状态
  const statuses = manager.getAllProviderStatus();
  console.log('[AI Init] Provider status:');
  statuses.forEach(({ name, status }) => {
    console.log(`  - ${name}: ${status.available ? '✅ Available' : '❌ Unavailable'}`);
  });

  return manager;
}
