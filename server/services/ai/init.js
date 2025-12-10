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
  // 动态读取最新的环境变量并更新配置
  const dynamicConfig = {
    ...AI_CONFIG,
    providers: {
      gemini: {
        ...AI_CONFIG.providers.gemini,
        apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '',
      },
      deepseek: {
        ...AI_CONFIG.providers.deepseek,
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        apiBase: process.env.DEEPSEEK_API_BASE || AI_CONFIG.providers.deepseek.apiBase,
      },
      qwen: {
        ...AI_CONFIG.providers.qwen,
        apiKey: process.env.QWEN_API_KEY || '',
        apiBase: process.env.QWEN_API_BASE || AI_CONFIG.providers.qwen.apiBase,
      },
      openai: {
        ...AI_CONFIG.providers.openai,
        apiKey: process.env.OPENAI_API_KEY || '',
      },
      claude: {
        ...AI_CONFIG.providers.claude,
        apiKey: process.env.CLAUDE_API_KEY || '',
      },
    },
  };

  const manager = new AIProviderManager(
    dynamicConfig,
    dynamicConfig.fallback
  );

  // 注册所有提供商
  const providerConfigs = dynamicConfig.providers;

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
