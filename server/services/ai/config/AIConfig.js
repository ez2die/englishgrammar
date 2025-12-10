/**
 * AI配置管理
 * 使用 getter 延迟读取环境变量，确保在 dotenv 加载后读取
 */

function createAIConfig() {
  return {
    // 默认提供商
    get defaultProvider() {
      return 'qwen';
    },
    
    // 提供商配置
    get providers() {
      return {
        qwen: {
          enabled: true,
          priority: 1,
          get apiKey() { return process.env.QWEN_API_KEY || ''; },
          model: 'qwen-flash',
          fallbackModel: 'qwen-turbo',
          options: {
            temperature: 0.7,
            maxTokens: 2000,
          },
          get apiBase() { return process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1'; },
        },
        deepseek: {
          enabled: true,
          priority: 2,
          get apiKey() { return process.env.DEEPSEEK_API_KEY || ''; },
          model: 'deepseek-v3.2',
          fallbackModel: 'deepseek-chat',
          options: {
            temperature: 0.7,
            maxTokens: 2000,
          },
          get apiBase() { return process.env.DEEPSEEK_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1'; },
        },
        gemini: {
          enabled: true,
          priority: 3,
          get apiKey() { return process.env.API_KEY || process.env.GEMINI_API_KEY || ''; },
          model: 'gemini-2.5-flash-lite',
          fallbackModel: 'gemini-1.5-flash',
          options: {
            temperature: 0.7,
            maxTokens: 2000,
          },
          rateLimit: {
            requestsPerMinute: 15,
            requestsPerDay: 20,
          },
        },
        openai: {
          enabled: true,
          priority: 3,
          get apiKey() { return process.env.OPENAI_API_KEY || ''; },
          model: 'gpt-4o-mini',
          fallbackModel: 'gpt-3.5-turbo',
          options: {
            temperature: 0.7,
            maxTokens: 2000,
          },
        },
        claude: {
          enabled: false,
          priority: 4,
          get apiKey() { return process.env.CLAUDE_API_KEY || ''; },
          model: 'claude-3-haiku-20240307',
          options: {
            temperature: 0.7,
            maxTokens: 2000,
          },
        },
      };
    },
    
    // 降级配置
    get fallback() {
      return {
        enabled: true,
        strategy: 'priority', // 'priority' | 'round-robin' | 'random'
        retryCount: 2,
        retryDelay: 1000, // ms
      };
    },
  };
}

// 导出配置对象（使用 getter 延迟读取环境变量）
export const AI_CONFIG = createAIConfig();

/**
 * 获取提供商配置
 * @param {string} providerName
 * @returns {object|null}
 */
export function getProviderConfig(providerName) {
  return AI_CONFIG.providers[providerName] || null;
}

/**
 * 获取所有启用的提供商配置（按优先级排序）
 * @returns {Array<{name: string, config: object}>}
 */
export function getEnabledProviders() {
  return Object.entries(AI_CONFIG.providers)
    .filter(([name, config]) => config.enabled && config.apiKey)
    .map(([name, config]) => ({ name, config }))
    .sort((a, b) => a.config.priority - b.config.priority);
}

/**
 * 获取默认提供商配置
 * @returns {object|null}
 */
export function getDefaultProviderConfig() {
  const defaultName = AI_CONFIG.defaultProvider;
  const config = AI_CONFIG.providers[defaultName];
  if (config && config.enabled && config.apiKey) {
    return { name: defaultName, config };
  }
  // 如果没有默认提供商，返回第一个可用的
  const enabled = getEnabledProviders();
  return enabled.length > 0 ? enabled[0] : null;
}
